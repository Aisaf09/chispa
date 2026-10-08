// Agenda y hábitos del día: la PWA (JS) debe entender y calcular exactamente lo mismo que Chispa en Windows (Python).
//   node test/test_agenda.mjs
import { readFileSync } from "node:fs";
import * as A from "../js/agenda.js";
import * as S from "../js/store.js";

const esp = JSON.parse(readFileSync(new URL("./esperado.json", import.meta.url), "utf-8"));
let ok = 0; const fallos = [];
const check = (n, c, extra = "") => { if (c) ok++; else fallos.push(`${n} ${extra}`); };
const local = (s) => new Date(s);                                   // "2026-10-08T12:00:00" = hora local
const hm = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// ---------- mismo resultado que Python ----------
for (const c of esp.agenda) {
  const r = A.parsear(c.texto, local(c.ahora));
  check(`parsear «${c.texto}» @${c.ahora}`, JSON.stringify(r) === JSON.stringify(c.esperado), `\n   JS:     ${JSON.stringify(r)}\n   Python: ${JSON.stringify(c.esperado)}`);
}
for (const o of esp.orden) {
  const r = A.ordenar(o.agenda, local(o.ahora)).map((p) => ({ id: p.r.id, cuando: hm(p.cuando), txt: A.etiquetaCuando(p.cuando, local(o.ahora)) }));
  check(`ordenar @${o.ahora}`, JSON.stringify(r) === JSON.stringify(o.esperado), `\n   JS:     ${JSON.stringify(r)}\n   Python: ${JSON.stringify(o.esperado)}`);
}
for (const h of esp.habitos) {
  const dia = local(h.fecha + "T12:00:00");
  const ent = (h.entregas || []).map((e) => ({ start: local(e.start).getTime(), titulo: e.titulo }));
  const r = A.habitosDelDia(dia, ent);
  check(`habitos ${h.fecha}${h.entregas ? " con entrega" : ""}`, JSON.stringify(r) === JSON.stringify(h.esperado), `\n   JS:     ${JSON.stringify(r)}\n   Python: ${JSON.stringify(h.esperado)}`);
}
console.log(`comparados con Python: ${esp.agenda.length} textos, ${esp.orden.length} órdenes, ${esp.habitos.length} días de hábitos`);

// ---------- lógica de la agenda en el teléfono ----------
check("esRecordatorio", A.esRecordatorio("recuérdame algo") && A.esRecordatorio("r algo") && !A.esRecordatorio("reunión mañana"));

const ms = (s) => local(s).getTime();
let e = S.nuevoEstado();
const r1 = S.añadirRecordatorio(e, "recuérdame llamar al médico hoy a las 17:30", local("2026-10-08T12:00:00"));
const r2 = S.añadirRecordatorio(e, "recuérdame beber agua todos los días a las 11", local("2026-10-08T12:00:00"));
check("se guardan con ids correlativos", r1.id === 1 && r2.id === 2 && e.agenda.length === 2);
check("un texto sin «recuérdame» no crea nada", S.añadirRecordatorio(e, "hola") === null && e.agenda.length === 2);

e.ultimo_chequeo = ms("2026-10-08T17:29:30");
check("suena en su minuto: 1 aviso", S.procesarAvisos(e, ms("2026-10-08T17:30:01")) === 1 && e.alertas.length === 1 && e.alertas[0].texto === "llamar al médico");
check("el de una sola vez sale de la agenda y el repetido se queda", e.agenda.length === 1 && e.agenda[0].id === 2);
check("no se repite en el siguiente segundo", S.procesarAvisos(e, ms("2026-10-08T17:30:02")) === 0 && e.alertas.length === 1);

// la app estaba cerrada: al abrir avisa de lo que pasó (máx. 24 h)
e = S.nuevoEstado();
S.añadirRecordatorio(e, "recuérdame beber agua todos los días a las 11", local("2026-10-08T05:00:00"));
S.añadirRecordatorio(e, "recuérdame tomar la medicina hoy a las 9", local("2026-10-08T05:00:00"));
e.ultimo_chequeo = ms("2026-10-08T07:00:00");
check("con la app cerrada 5 h: se perdió el de las 9 y el de las 11", S.procesarAvisos(e, ms("2026-10-08T12:00:00")) === 2);
check("quedan ordenados por hora", e.alertas[0].texto === "tomar la medicina" && e.alertas[1].texto === "beber agua");
e = S.nuevoEstado();
S.añadirRecordatorio(e, "recuérdame beber agua todos los días a las 11", local("2026-10-01T05:00:00"));
e.ultimo_chequeo = ms("2026-10-01T07:00:00");
check("una semana cerrada: solo cuenta lo de las últimas 24 h (no inunda)", S.procesarAvisos(e, ms("2026-10-08T12:00:00")) === 1);
e = S.nuevoEstado();
S.añadirRecordatorio(e, "recuérdame beber agua todos los días a las 11", local("2026-10-08T05:00:00"));
check("la primera vez (sin chequeo previo) no avisa de nada del pasado", S.procesarAvisos(e, ms("2026-10-08T12:00:00")) === 0 && e.ultimo_chequeo === ms("2026-10-08T12:00:00"));

// descartar y posponer
e = S.nuevoEstado();
S.añadirRecordatorio(e, "recuérdame hacer la compra hoy a las 10", local("2026-10-08T08:00:00"));
e.ultimo_chequeo = ms("2026-10-08T09:59:00");
S.procesarAvisos(e, ms("2026-10-08T10:00:30"));
const id = e.alertas[0].id;
const nuevo = S.posponerAviso(e, id, 10, local("2026-10-08T10:00:30"));
check("«+10 min» quita el aviso y crea un recordatorio para dentro de 10 min", e.alertas.length === 0 && nuevo.hora === "10:10" && nuevo.fecha === "2026-10-08" && e.agenda.length === 1);
e.ultimo_chequeo = ms("2026-10-08T10:09:59");
check("…y a las 10:10 vuelve a sonar", S.procesarAvisos(e, ms("2026-10-08T10:10:01")) === 1);
S.descartarAviso(e, e.alertas[0].id);
check("«Hecho» descarta el aviso", e.alertas.length === 0);
check("borrar un recordatorio", (S.añadirRecordatorio(e, "r algo mañana", local("2026-10-08T08:00:00")), S.borrarRecordatorio(e, e.agenda[0].id), e.agenda.length === 0));

// ---------- hábitos del día en el estado ----------
e = S.nuevoEstado();
const jue = local("2026-10-08T12:00:00");
const h1 = S.habitosHoy(e, jue);
check("5 hábitos y se guardan por día", h1.length === 5 && JSON.stringify(e.habitos_dia["2026-10-08"]) === JSON.stringify(h1));
const conEntrega = S.habitosHoy(e, jue, [{ start: ms("2026-10-09T14:00:00"), titulo: "Entrega SO" }]);
check("mientras no marques ninguno se recalcula con las entregas", conEntrega[2][0] === "entrega");
S.alternarCheck(e, "sueno", "2026-10-08");
check("al marcar uno la lista queda fija", S.habitosHoy(e, jue)[2][0] === "entrega" && S.habitosHoy(e, jue, [])[2][0] === "entrega");
for (const [c] of S.habitosHoy(e, jue)) if (!(e.checks["2026-10-08"] || []).includes(c)) S.alternarCheck(e, c, "2026-10-08");
check("completar los 5 hábitos del día da racha 1", S.racha(e, jue) === 1);
check("progreso 5 de 10 con 0 rezos y total 10", S.progresoDia(e, "2026-10-08", jue) === 5 && S.totalDia(e, "2026-10-08", jue) === 10);
e.checks["2026-10-07"] = ["sueno", "ejercicio", "trabajo", "comida", "prioridades"];
check("un día antiguo sin lista usa los 5 de siempre", S.racha(e, jue) === 2);
e.habitos_dia["2026-10-07"] = [["a", "A"], ["b", "B"]];
check("un día antiguo con su lista propia se cuenta con esa lista", S.racha(e, jue) === 1);
const viejo = S.migrar({ checks: { a: ["x"] } });
check("un estado antiguo se completa con agenda, alertas y hábitos", Array.isArray(viejo.agenda) && Array.isArray(viejo.alertas) && typeof viejo.habitos_dia === "object");

console.log(`${ok} comprobaciones correctas, ${fallos.length} fallos`);
if (fallos.length) { console.log("FALLAN:\n" + fallos.slice(0, 10).join("\n")); process.exit(1); }

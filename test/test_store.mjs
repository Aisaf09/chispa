// Lógica de hábitos, racha, tareas, Tasbih y temporizador (sin navegador).
//   node test/test_store.mjs
import * as S from "../js/store.js";

let ok = 0; const fallos = [];
const check = (n, c) => { if (c) ok++; else fallos.push(n); };
const d = (s) => new Date(s + "T12:00:00");

// --- racha: igual que Chispa ---
let e = S.nuevoEstado();
const todos = S.CHECKS.map((c) => c[0]);
check("sin datos la racha es 0", S.racha(e, d("2026-10-02")) === 0);
for (const f of ["2026-09-29", "2026-09-30", "2026-10-01"]) e.checks[f] = [...todos];
check("tres días completos terminando ayer: racha 3 (hoy aún incompleto no la rompe)", S.racha(e, d("2026-10-02")) === 3);
e.checks["2026-10-02"] = [...todos];
check("si hoy también está completo: racha 4", S.racha(e, d("2026-10-02")) === 4);
e.checks["2026-09-30"] = todos.slice(0, 4);
check("un día incompleto en medio corta la racha", S.racha(e, d("2026-10-02")) === 2);
check("progreso del día: hábitos + rezos de 10", (e.rezos["2026-10-02"] = ["fajr", "asr"], S.progresoDia(e, "2026-10-02")) === 7);

// --- marcar y desmarcar ---
e = S.nuevoEstado();
check("marcar devuelve true", S.alternarCheck(e, "sueno", "2026-10-02") === true);
check("desmarcar devuelve false", S.alternarCheck(e, "sueno", "2026-10-02") === false);
check("los rezos se guardan ordenados y sin duplicados", (S.alternarRezo(e, "asr", "x"), S.alternarRezo(e, "fajr", "x"),
      S.alternarRezo(e, "asr", "x"), S.alternarRezo(e, "asr", "x"), JSON.stringify(e.rezos.x)) === '["asr","fajr"]');

// --- tareas ---
e = S.nuevoEstado();
check("una tarea vacía no se crea", S.añadirTarea(e, "   ") === null && e.tareas.length === 0);
const t1 = S.añadirTarea(e, "  Preparar informe  ", "2026-10-02");
const t2 = S.añadirTarea(e, "Llamar", "2026-10-02");
check("las tareas se crean con ids correlativos y texto limpio", t1.id === 1 && t2.id === 2 && t1.texto === "Preparar informe");
S.alternarTarea(e, 1, "2026-10-02");
check("completar guarda la fecha", e.tareas[0].hecha && e.tareas[0].hecha_fecha === "2026-10-02");
S.alternarTarea(e, 1);
check("desmarcar la limpia", !e.tareas[0].hecha && e.tareas[0].hecha_fecha === null);
S.borrarTarea(e, 1);
check("borrar elimina solo esa tarea y el siguiente id no se repite", e.tareas.length === 1 && S.añadirTarea(e, "x").id === 3);

// --- tasbih ---
e = S.nuevoEstado();
for (let i = 0; i < 32; i++) S.sumarTasbih(e, "2026-10-02");
check("32 repeticiones: ciclo 32, total 32", e.tasbih.ciclo === 32 && e.tasbih.total === 32);
check("la 33 completa la meta y el ciclo vuelve a 0", S.sumarTasbih(e, "2026-10-02") === true && e.tasbih.ciclo === 0 && e.tasbih.total === 33);
S.ciclarMeta(e); check("la meta cambia 33 → 99", e.tasbih.meta === 99);
S.ciclarMeta(e); S.ciclarMeta(e); check("… → 100 → 33", e.tasbih.meta === 33);
S.sumarTasbih(e, "2026-10-03");
check("al cambiar de día el contador empieza de cero", e.tasbih.total === 1 && e.tasbih.fecha === "2026-10-03");

// --- temporizador ---
e = S.nuevoEstado();
const t0 = new Date("2026-10-02T10:00:00").getTime();
S.iniciarTimer(e, t0);
check("al iniciar corre y calcula el fin (90 min)", e.timer.corre && e.timer.fin === t0 + S.POMO.foco);
check("el restante baja con el tiempo", S.restante(e.timer, t0 + 60000) === S.POMO.foco - 60000);
S.pausarTimer(e, t0 + 10 * 60000);
check("pausar guarda lo que queda y suma 10 min de foco", !e.timer.corre && e.timer.resta === S.POMO.foco - 600000 &&
      e.foco["2026-10-02"] === 600);
check("en pausa el restante no cambia", S.restante(e.timer, t0 + 99999999) === e.timer.resta);
S.iniciarTimer(e, t0 + 20 * 60000);
check("no hay fin antes de tiempo", S.comprobarFinTimer(e, t0 + 30 * 60000) === null);
const fin = e.timer.fin;
check("al llegar a 0 termina el foco y pasa a descanso (20 min)", S.comprobarFinTimer(e, fin + 5) === "foco" &&
      e.timer.modo === "descanso" && !e.timer.corre && e.timer.resta === S.POMO.descanso);
check("el foco acumulado cuenta los 90 min totales (10 + 80)", e.foco["2026-10-02"] === 5400);
S.iniciarTimer(e, fin + 1000); S.reiniciarTimer(e, fin + 2000);
check("reiniciar vuelve a la duración completa del modo y no suma descanso", e.timer.resta === S.POMO.descanso && e.foco["2026-10-02"] === 5400);
// el tiempo sigue corriendo aunque el teléfono se bloquee: se calcula por la hora de fin, no por ticks
e = S.nuevoEstado(); S.iniciarTimer(e, t0);
check("tras 2 h con la pantalla bloqueada el foco ya está terminado", S.comprobarFinTimer(e, t0 + 2 * 3600000) === "foco");

// --- persistencia y migración ---
const viejo = S.migrar({ checks: { a: ["x"] } });
check("un estado antiguo se completa sin perder datos", viejo.checks.a[0] === "x" && viejo.timer.resta === S.POMO.foco && viejo.ajustes.fajr === 18);

console.log(`${ok} comprobaciones correctas, ${fallos.length} fallos`);
if (fallos.length) { console.log("FALLAN:", fallos.join(" | ")); process.exit(1); }

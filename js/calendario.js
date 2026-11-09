// Calendario: cuadrícula del mes y eventos de cada día. Usa los mismos recordatorios de la agenda (E.agenda, que se
// sincroniza con Chispa en el PC) más las entregas de Moodle. Sin estado propio: solo funciones puras.
import * as A from "./agenda.js";

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const INICIALES = ["L", "M", "X", "J", "V", "S", "D"];
export const REPETIR = [["nunca", "Nunca"], ["diario", "Cada día"], ["laborables", "Entre semana"], ["semanal", "Cada semana"], ["pers", "Personalizar"]];

const dos = (n) => String(n).padStart(2, "0");
export const diaSemana = (d) => (d.getDay() + 6) % 7;                       // lunes = 0
export const aFecha = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };

/** Semanas (lunes a domingo) que cubren el mes `mes` (0-11) de `anio`: [[Date x7], ...], 4 a 6 filas. */
export function semanasMes(anio, mes) {
  const primero = new Date(anio, mes, 1), ultimo = new Date(anio, mes + 1, 0);
  const out = [];
  for (let i = 1 - diaSemana(primero); i <= ultimo.getDate(); i += 7)
    out.push(Array.from({ length: 7 }, (_, k) => new Date(anio, mes, i + k)));
  return out;
}

/** Los 7 días (lunes a domingo) de la semana que contiene `dia`. */
export function semanaDe(dia) {
  const ini = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - diaSemana(dia));
  return Array.from({ length: 7 }, (_, i) => new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + i));
}

const tipoRec = (r) => (r.dias && r.dias.length ? "rep" : "rec");

/** Eventos del día `dia` (Date): [{tipo: "rec"|"rep"|"entrega", texto, cuando: Date, id?}], por hora. */
export function eventosDia(agenda, entregas, dia) {
  const out = [];
  for (const r of agenda) {
    const c = A.enDia(r, dia);
    if (c) out.push({ tipo: tipoRec(r), texto: r.texto, cuando: c, id: r.id });
  }
  const iso = A.isoDe(dia);
  for (const e of entregas) {
    const c = new Date(e.start);
    if (A.isoDe(c) === iso) out.push({ tipo: "entrega", texto: e.titulo, cuando: c });
  }
  return out.sort((a, b) => a.cuando - b.cuando);
}

/** { "2026-11-04": Set(["rec","entrega"]) } para pintar los puntos de cada día de las semanas dadas. */
export function marcasMes(agenda, entregas, semanas) {
  const out = {};
  for (const sem of semanas) for (const d of sem) {
    const tipos = new Set(eventosDia(agenda, entregas, d).map((e) => e.tipo));
    if (tipos.size) out[A.isoDe(d)] = tipos;
  }
  return out;
}

/** Lo que va a pasar desde `ahora` durante `dias` días, agrupado por día: [[isoDia, [eventos]], ...]. */
export function proximosPorDia(agenda, entregas, ahora, dias = 60) {
  const out = [];
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  for (let i = 0; i < dias; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    const ev = eventosDia(agenda, entregas, d).filter((e) => e.cuando >= ahora || e.tipo === "entrega" && e.cuando > ahora - 3600000);
    if (ev.length) out.push([A.isoDe(d), ev]);
  }
  return out;
}

/** Días de la semana (lunes = 0) según la opción de «Repetir» del formulario. */
export function diasDeRepetir(opcion, fecha, personalizados = []) {
  if (opcion === "diario") return [0, 1, 2, 3, 4, 5, 6];
  if (opcion === "laborables") return [0, 1, 2, 3, 4];
  if (opcion === "semanal") return [diaSemana(aFecha(fecha))];
  if (opcion === "pers") return [...new Set(personalizados.map(Number))].filter((n) => n >= 0 && n <= 6).sort((a, b) => a - b);
  return [];
}

/** Al revés: qué opción de «Repetir» corresponde a un recordatorio ya guardado. */
export function opcionDeDias(dias) {
  const s = (dias || []).join(",");
  if (!s) return "nunca";
  if (s === "0,1,2,3,4,5,6") return "diario";
  if (s === "0,1,2,3,4") return "laborables";
  return dias.length === 1 ? "semanal" : "pers";
}

/** Texto corto de la repetición: «Cada día», «Entre semana», «lun, jue»… ("" si no se repite). */
export function textoRepetir(dias) {
  const op = opcionDeDias(dias);
  if (op === "nunca") return "";
  if (op === "diario") return "Cada día";
  if (op === "laborables") return "Entre semana";
  return (dias.length === 1 ? "Cada " : "") + dias.map((i) => A.DIAS[i].slice(0, 3)).join(", ");
}

export const hhmmDe = (d) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

/** Valida los campos del formulario y devuelve el recordatorio (sin id) en el formato de la agenda, o un error. */
export function eventoDesdeFormulario({ texto, fecha, hora, repetir, dias }) {
  texto = (texto || "").trim().slice(0, 120);
  if (!texto) return { error: "Escribe un título" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) return { error: "Elige una fecha" };
  if (!/^\d{2}:\d{2}$/.test(hora || "")) return { error: "Elige una hora" };
  const d = diasDeRepetir(repetir, fecha, dias);
  if (repetir === "pers" && !d.length) return { error: "Elige al menos un día" };
  return { r: { texto, fecha: d.length ? null : fecha, hora, dias: d } };       // mismo formato que «recuérdame…»
}

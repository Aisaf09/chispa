// Estado de la app (hábitos, rezos marcados, tareas, Tasbih, foco). Todo se guarda en el propio teléfono.
// Las formas de los datos son las mismas que usa Chispa en Windows (estado.json), para sincronizar en la fase 2.

import * as A from "./agenda.js";

export const CHECKS = [["sueno", "Dormí 7 h o más"], ["ejercicio", "Ejercicio"], ["trabajo", "2 bloques de trabajo"],
                       ["comida", "Comí bien"], ["prioridades", "Prioridades de mañana"]];
export const POMO = { foco: 90 * 60 * 1000, descanso: 20 * 60 * 1000 };       // milisegundos
const CLAVE = "chispa.estado.v1";

const dos = (n) => String(n).padStart(2, "0");
export const iso = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

export function nuevoEstado() {
  return {
    version: 1,
    checks: {},                                        // { "2026-10-02": ["sueno", ...] }
    rezos: {},                                         // { "2026-10-02": ["fajr", ...] }
    tareas: [],                                        // { id, texto, hecha, creada, hecha_fecha }
    foco: {},                                          // { "2026-10-02": segundos de foco }
    tasbih: { fecha: "", ciclo: 0, total: 0, meta: 33 },
    timer: { modo: "foco", corre: false, fin: 0, resta: POMO.foco, tramo: 0 },
    agenda: [],                                        // recordatorios: { id, texto, fecha|null, hora, dias[] }
    habitos_dia: {},                                   // { "2026-10-08": [["sueno","…"], …] } los 5 hábitos elegidos ese día
    alertas: [],                                       // avisos pendientes de leer: { id, texto, cuando, k }
    ultimo_chequeo: 0,                                 // ms: hasta cuándo se han revisado los recordatorios
    ajustes: { lat: 41.851, lon: 2.708, gps: false, gps_ts: 0, fajr: 18, isha: 17, asr: "standard" },
  };
}

export function migrar(e) {                            // rellena lo que falte si el estado viene de una versión antigua
  const base = nuevoEstado();
  const r = { ...base, ...e };
  r.tasbih = { ...base.tasbih, ...(e.tasbih || {}) };
  r.timer = { ...base.timer, ...(e.timer || {}) };
  r.ajustes = { ...base.ajustes, ...(e.ajustes || {}) };
  for (const k of ["agenda", "alertas"]) if (!Array.isArray(r[k])) r[k] = [];
  if (!r.habitos_dia || typeof r.habitos_dia !== "object") r.habitos_dia = {};
  return r;
}

export function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? migrar(JSON.parse(raw)) : nuevoEstado();
  } catch { return nuevoEstado(); }
}

export function guardar(e) {
  try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch { /* modo privado o lleno: la app sigue */ }
}

// ---------- hábitos y rezos ----------
function alternar(mapa, dia, id) {
  const cur = new Set(mapa[dia] || []);
  if (cur.has(id)) cur.delete(id); else cur.add(id);
  mapa[dia] = [...cur].sort();
  return mapa[dia].includes(id);
}
export const alternarCheck = (e, id, dia = iso()) => alternar(e.checks, dia, id);
export const alternarRezo = (e, id, dia = iso()) => alternar(e.rezos, dia, id);

/** Los 5 hábitos de hoy, elegidos según el día y las entregas. Se recalculan hasta que marcas el primero; después
 *  quedan fijos todo el día. (Mismo criterio que Chispa en Windows.) */
export function habitosHoy(e, ahora = new Date(), entregas = []) {
  const dia = iso(ahora);
  if (!e.habitos_dia[dia] || !(e.checks[dia] || []).length) {
    e.habitos_dia[dia] = A.habitosDelDia(ahora, entregas);
    for (const k of Object.keys(e.habitos_dia).sort().slice(0, -60)) delete e.habitos_dia[k];
  }
  return e.habitos_dia[dia];
}
const idsDia = (e, dia, hoy) => {
  const lista = dia === iso(hoy) ? habitosHoy(e, hoy) : e.habitos_dia[dia];
  return (lista || CHECKS).map((h) => h[0]);
};

/** Racha de días con todos sus hábitos completos (si hoy aún no está completo, cuenta desde ayer). */
export function racha(e, hoy = new Date()) {
  const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const completo = (d) => { const hechos = new Set(e.checks[iso(d)] || []); return idsDia(e, iso(d), hoy).every((c) => hechos.has(c)); };
  if (!completo(dia)) dia.setDate(dia.getDate() - 1);
  let n = 0;
  while (completo(dia)) { n++; dia.setDate(dia.getDate() - 1); }
  return n;
}

/** Puntos del día hechos: hábitos de ese día + rezos. El total es siempre hábitos + 5 rezos. */
export const progresoDia = (e, dia = iso(), hoy = new Date()) => {
  const hechos = new Set(e.checks[dia] || []);
  return idsDia(e, dia, hoy).filter((c) => hechos.has(c)).length + (e.rezos[dia] || []).length;
};
export const totalDia = (e, dia = iso(), hoy = new Date()) => idsDia(e, dia, hoy).length + 5;

// ---------- agenda y avisos ----------
export function añadirRecordatorio(e, texto, ahora = new Date()) {
  const r = A.parsear(texto, ahora);
  if (!r) return null;
  r.id = Math.max(0, ...e.agenda.map((x) => x.id || 0)) + 1;
  e.agenda.push(r);
  return r;
}
export const borrarRecordatorio = (e, id) => { e.agenda = e.agenda.filter((r) => r.id !== id); };

/** Convierte en avisos lo que ha sonado desde la última revisión (en directo, o con la app cerrada, hasta 24 h).
 *  Los recordatorios de una sola vez se quitan de la agenda al convertirse en aviso. Devuelve cuántos avisos nuevos. */
export function procesarAvisos(e, ahora = Date.now()) {
  const desde = e.ultimo_chequeo || ahora;
  let nuevos = 0;
  for (const { r, cuando } of A.ocurridos(e.agenda, desde, ahora)) {
    const k = `${r.id}|${cuando.getTime()}`;
    if (e.alertas.some((a) => a.k === k)) continue;
    e.alertas.push({ id: Math.max(0, ...e.alertas.map((a) => a.id)) + 1, texto: r.texto, cuando: cuando.getTime(), k });
    nuevos++;
    if (!(r.dias && r.dias.length)) e.agenda = e.agenda.filter((x) => x.id !== r.id);
  }
  e.ultimo_chequeo = ahora;
  return nuevos;
}
export const descartarAviso = (e, id) => { e.alertas = e.alertas.filter((a) => a.id !== id); };
/** «+10 min»: el aviso se quita y vuelve a sonar dentro de `min` minutos como recordatorio de una sola vez. */
export function posponerAviso(e, id, min = 10, ahora = new Date()) {
  const a = e.alertas.find((x) => x.id === id);
  if (!a) return null;
  descartarAviso(e, id);
  const cuando = new Date(ahora.getTime() + min * 60000);
  const r = { id: Math.max(0, ...e.agenda.map((x) => x.id || 0)) + 1, texto: a.texto, fecha: iso(cuando),
    hora: `${dos(cuando.getHours())}:${dos(cuando.getMinutes())}`, dias: [] };
  e.agenda.push(r);
  return r;
}

// ---------- tareas ----------
export function añadirTarea(e, texto, hoy = iso()) {
  texto = (texto || "").trim();
  if (!texto) return null;
  const t = { id: Math.max(0, ...e.tareas.map((x) => x.id)) + 1, texto, hecha: false, creada: hoy, hecha_fecha: null };
  e.tareas.push(t);
  return t;
}
export function alternarTarea(e, id, hoy = iso()) {
  const t = e.tareas.find((x) => x.id === id);
  if (!t) return;
  t.hecha = !t.hecha;
  t.hecha_fecha = t.hecha ? hoy : null;
}
export const borrarTarea = (e, id) => { e.tareas = e.tareas.filter((x) => x.id !== id); };

// ---------- Tasbih ----------
export function tasbih(e, hoy = iso()) {
  if (e.tasbih.fecha !== hoy) Object.assign(e.tasbih, { fecha: hoy, ciclo: 0, total: 0 });
  return e.tasbih;
}
/** Suma una repetición. Devuelve true si se completó la meta (el ciclo vuelve a 0). */
export function sumarTasbih(e, hoy = iso()) {
  const t = tasbih(e, hoy);
  t.ciclo++; t.total++;
  if (t.ciclo >= t.meta) { t.ciclo = 0; return true; }
  return false;
}
export function ciclarMeta(e) {
  const t = tasbih(e);
  t.meta = { 33: 99, 99: 100 }[t.meta] || 33;
  t.ciclo = Math.min(t.ciclo, t.meta - 1);
}

// ---------- temporizador de foco (guarda la hora de fin, así no se descuadra si el teléfono bloquea la pantalla) ----------
export function restante(timer, ahora = Date.now()) {
  return timer.corre ? Math.max(0, timer.fin - ahora) : timer.resta;
}
function sumarFoco(e, timer, ahora) {
  if (timer.modo === "foco" && timer.tramo) {
    const dia = iso(new Date(ahora));
    e.foco[dia] = (e.foco[dia] || 0) + Math.max(0, Math.round((ahora - timer.tramo) / 1000));
  }
  timer.tramo = 0;
}
export function iniciarTimer(e, ahora = Date.now()) {
  const t = e.timer;
  if (t.corre) return;
  t.corre = true; t.fin = ahora + t.resta; t.tramo = ahora;
}
export function pausarTimer(e, ahora = Date.now()) {
  const t = e.timer;
  if (!t.corre) return;
  t.resta = Math.max(0, t.fin - ahora);
  sumarFoco(e, t, ahora);
  t.corre = false;
}
export function reiniciarTimer(e, ahora = Date.now()) {
  const t = e.timer;
  if (t.corre) sumarFoco(e, t, ahora);
  Object.assign(t, { corre: false, resta: POMO[t.modo], fin: 0, tramo: 0 });
}
/** Si el tiempo llegó a 0 pasa al otro modo. Devuelve el modo que acaba de terminar o null. */
export function comprobarFinTimer(e, ahora = Date.now()) {
  const t = e.timer;
  if (!t.corre || ahora < t.fin) return null;
  const terminado = t.modo;
  sumarFoco(e, t, t.fin);
  t.modo = terminado === "foco" ? "descanso" : "foco";
  Object.assign(t, { corre: false, resta: POMO[t.modo], fin: 0 });
  return terminado;
}

// Tareas con fecha, prioridad y repetición. Es el mismo algoritmo que isla/chispa_tareas.py (Chispa en Windows):
// los dos se prueban con los mismos casos (test/esperado.json), así que «entregar informe viernes !!» se entiende igual.
// Una tarea es {id, texto, hecha, creada, hecha_fecha} y, opcionalmente, {fecha, prio (0-2), repetir}.

export const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const GRUPOS = [["atrasada", "Atrasadas"], ["hoy", "Hoy"], ["manana", "Mañana"], ["semana", "Esta semana"],
  ["despues", "Más adelante"], ["sin_fecha", "Sin fecha"]];
export const REPETIR = [["diaria", "Cada día"], ["laborables", "Entre semana"], ["semanal", "Cada semana"], ["mensual", "Cada mes"]];
export const HORAS_AVISO = ["11:00", "18:00"];

const DN = { lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4, sabado: 5, domingo: 6 };
const sinAcentos = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const dos = (n) => String(n).padStart(2, "0");
export const isoDe = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const aFecha = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const soloDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const suma = (d, n) => { const r = soloDia(d); r.setDate(r.getDate() + n); return r; };
const diaSemana = (d) => (d.getDay() + 6) % 7;                        // lunes = 0, como en Python
const difDias = (a, b) => Math.round((soloDia(a) - soloDia(b)) / 86400000);

const REP = [[/\b(?:cada d[ií]a|todos los d[ií]as|a diario)\b/i, "diaria"],
  [/\b(?:entre semana|d[ií]as laborables|de lunes a viernes)\b/i, "laborables"],
  [/\b(?:cada semana|semanalmente)\b/i, "semanal"],
  [/\b(?:cada mes|mensualmente)\b/i, "mensual"]];
const F_PAS = /\bpasado ma[ñn][aá]na\b/i, F_MAN = /(?<!la )\bma[ñn][aá]na\b/i, F_HOY = /\bhoy\b/i;
const F_DDMM = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, F_DIA = /\b(?:el\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)(?![\wáéíóúñ])/i;
const PRIO = /(?:^|\s)(!{1,3})(?=\s|$)/;
const quitar = (t, m) => t.slice(0, m.index) + " " + t.slice(m.index + m[0].length);
const sigLaborable = (d) => { let r = soloDia(d); while (diaSemana(r) >= 5) r = suma(r, 1); return r; };

/** {texto, fecha (AAAA-MM-DD|null), prio (0-2), repetir (null|clave)} o null si queda vacío. */
export function parsear(texto, hoy) {
  let t = (texto || "").trim();
  if (!t) return null;
  hoy = soloDia(hoy);
  let prio = 0, repetir = null, fecha = null, m;
  if ((m = PRIO.exec(t))) { prio = Math.min(2, m[1].length); t = quitar(t, m); }
  for (const [pat, clave] of REP) if ((m = pat.exec(t))) { repetir = clave; t = quitar(t, m); break; }
  if ((m = F_PAS.exec(t))) { fecha = suma(hoy, 2); t = quitar(t, m); }
  else if ((m = F_MAN.exec(t))) { fecha = suma(hoy, 1); t = quitar(t, m); }
  else if ((m = F_HOY.exec(t))) { fecha = hoy; t = quitar(t, m); }
  else if ((m = F_DDMM.exec(t))) {
    let y = m[3] ? Number(m[3]) : hoy.getFullYear();
    if (y < 100) y += 2000;
    const f = new Date(y, Number(m[2]) - 1, Number(m[1]));
    if (f.getMonth() === Number(m[2]) - 1 && f.getDate() === Number(m[1])) {             // descarta el 31/02
      fecha = !m[3] && f < hoy ? new Date(y + 1, Number(m[2]) - 1, Number(m[1])) : f;
      t = quitar(t, m);
    }
  } else if ((m = F_DIA.exec(t))) {
    const delta = (((DN[sinAcentos(m[1])] - diaSemana(hoy)) % 7) + 7) % 7;
    fecha = suma(hoy, delta || 7); t = quitar(t, m);
  }
  if (repetir && !fecha) fecha = repetir === "laborables" ? sigLaborable(hoy) : hoy;
  let limpio = t.replace(/\s{2,}/g, " ").replace(/\s+(?:el|para|de|a)\s*$/i, "").replace(/^[ ,.;:-]+|[ ,.;:-]+$/g, "");
  if (!limpio) return null;
  return { texto: limpio.slice(0, 200), fecha: fecha ? isoDe(fecha) : null, prio, repetir };
}

// ---------- grupos y orden ----------
export function grupo(t, hoy) {
  if (!t.fecha) return "sin_fecha";
  const d = difDias(aFecha(t.fecha), hoy);
  return d < 0 ? "atrasada" : d === 0 ? "hoy" : d === 1 ? "manana" : d <= 6 ? "semana" : "despues";
}
const ORDEN = Object.fromEntries(GRUPOS.map(([g], i) => [g, i]));

/** Pendientes, de lo más urgente a lo menos: grupo, prioridad (alta primero), fecha y orden de creación. */
export function ordenar(tareas, hoy) {
  const clave = (t) => [ORDEN[grupo(t, hoy)], -(t.prio || 0), t.fecha || "", t.id || 0];
  return tareas.filter((t) => !t.hecha).sort((a, b) => {
    const x = clave(a), y = clave(b);
    for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  });
}
/** [[clave, título, [tareas]]] solo con los grupos que tienen algo. */
export function agrupar(tareas, hoy) {
  const o = ordenar(tareas, hoy);
  return GRUPOS.map(([g, n]) => [g, n, o.filter((t) => grupo(t, hoy) === g)]).filter((x) => x[2].length);
}
export function etiqueta(t, hoy) {
  const partes = [];
  if (t.fecha) {
    const f = aFecha(t.fecha), g = grupo(t, hoy);
    partes.push(g === "atrasada" ? `Atrasada · ${f.getDate()}/${f.getMonth() + 1}` : g === "hoy" ? "Hoy" : g === "manana" ? "Mañana"
      : `${DIAS[diaSemana(f)].slice(0, 3)} ${f.getDate()}/${f.getMonth() + 1}`);
  }
  if (t.repetir) partes.push(Object.fromEntries(REPETIR)[t.repetir].toLowerCase());
  return partes.join(" · ");
}

// ---------- completar ----------
function paso(d, repetir, diaMes) {
  if (repetir === "diaria") return suma(d, 1);
  if (repetir === "laborables") return sigLaborable(suma(d, 1));
  if (repetir === "semanal") return suma(d, 7);
  const y = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear(), m = (d.getMonth() + 1) % 12;
  return new Date(y, m, Math.min(diaMes, new Date(y, m + 1, 0).getDate()));
}
export function siguienteFecha(fecha, repetir, hoy) {
  const f = aFecha(fecha);
  let n = paso(f, repetir, f.getDate());
  while (n <= soloDia(hoy)) n = paso(n, repetir, f.getDate());
  return isoDe(n);
}
/** Marca o desmarca. Una tarea que se repite pasa a su siguiente fecha. Devuelve "hecha", "pendiente" o "repetida". */
export function completar(t, hoy) {
  if (!t.hecha && t.repetir && t.fecha) {
    t.fecha = siguienteFecha(t.fecha, t.repetir, hoy);
    t.ultima = isoDe(hoy);
    return "repetida";
  }
  t.hecha = !t.hecha;
  t.hecha_fecha = t.hecha ? isoDe(hoy) : null;
  return t.hecha ? "hecha" : "pendiente";
}

// ---------- avisos ----------
/** [título, texto] con lo que queda para `hoy` (incluidas las atrasadas) o null. */
export function resumen(tareas, hoy) {
  const pend = ordenar(tareas, hoy).filter((t) => ["atrasada", "hoy"].includes(grupo(t, hoy)));
  if (!pend.length) return null;
  const atr = pend.filter((t) => grupo(t, hoy) === "atrasada").length, n = pend.length;
  const titulo = `${n} tarea${n !== 1 ? "s" : ""} para hoy` + (atr ? ` · ${atr} atrasada${atr !== 1 ? "s" : ""}` : "");
  const nombres = pend.slice(0, 3).map((t) => (t.prio ? "!".repeat(t.prio) + " " : "") + t.texto);
  return [titulo, nombres.join(", ") + (n > 3 ? ` y ${n - 3} más` : "")];
}
/** [clave, título, texto] si toca el aviso de tareas (2 min tras cada hora) o null. `ya` = claves ya avisadas. */
export function aviso(tareas, ahora, ya, horas = HORAS_AVISO) {
  for (const h of horas) {
    const [hh, mm] = h.split(":").map(Number);
    const t0 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hh, mm);
    const clave = `${isoDe(ahora)}|${h}`, dif = ahora - t0;
    if (dif >= 0 && dif < 120000 && !ya.includes(clave)) {
      const r = resumen(tareas, ahora);
      return r ? [clave, r[0], r[1]] : null;
    }
  }
  return null;
}

// Agenda y hábitos del día. Es el mismo algoritmo que isla/chispa_agenda.py (Chispa en Windows): los dos se
// prueban con los mismos casos (test/esperado.json), así que «recuérdame…» se entiende igual en el iPhone y en el PC.

export const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const BASE = [["sueno", "Dormí 7 h o más"], ["ejercicio", "Ejercicio"]];

const dos = (n) => String(n).padStart(2, "0");
export const isoDe = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const sinAcentos = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const diaSemana = (d) => (d.getDay() + 6) % 7;                         // lunes = 0, como en Python
const soloDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sumaDias = (d, n) => { const r = soloDia(d); r.setDate(r.getDate() + n); return r; };
const aFecha = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const DIAS_N = Object.fromEntries(DIAS.map((d, i) => [sinAcentos(d), i]));
const PREFIJO = /^\s*(?:recu[eé]rdame|recuerda(?:me)?|r)(?::\s*|\s+)(.+)$/is;

export const esRecordatorio = (texto) => PREFIJO.test(texto || "");

/** «recuérdame llamar al médico mañana a las 17:30» → {texto, fecha, hora, dias} (null si no empieza por recuérdame / r). */
export function parsear(texto, ahora) {
  const m = PREFIJO.exec(texto || "");
  if (!m) return null;
  let t = m[1].trim(), low = sinAcentos(t), hora = null;
  const hm = /\b(?:a las|a la|sobre las)\s+(\d{1,2})(?:[:.h](\d{2}))?\b/.exec(low) || /\b(\d{1,2})[:.](\d{2})\b/.exec(low);
  if (hm) {
    let h = Number(hm[1]); const mi = Number(hm[2] || 0);
    if (h < 24 && mi < 60) {
      if (/\b(de la tarde|de la noche|pm)\b/.test(low) && h < 12) h += 12;
      hora = `${dos(h)}:${dos(mi)}`;
      const a = hm.index, b = hm.index + hm[0].length;
      low = low.slice(0, a) + " " + low.slice(b);
      t = t.slice(0, a) + " " + t.slice(b);
    }
  }
  let dias = [], fecha = null;
  const hoy = soloDia(ahora);
  if (/\btodos los dias\b|\bcada dia\b|\ba diario\b/.test(low)) dias = [0, 1, 2, 3, 4, 5, 6];
  else {
    const mm = /\b(?:los|cada)\s+((?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)(?:\s*(?:,|y|e)\s*(?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?))*)/.exec(low);
    if (mm) {
      const nombres = (mm[1].match(/[a-z]+/g) || []).map((d) => (d in DIAS_N ? d : d.replace(/s$/, "")));
      dias = [...new Set(nombres.filter((d) => d in DIAS_N).map((d) => DIAS_N[d]))].sort((x, y) => x - y);
    }
  }
  if (!dias.length) {
    if (/\bpasado manana\b/.test(low)) fecha = sumaDias(hoy, 2);
    else if (/\bmanana\b/.test(low)) fecha = sumaDias(hoy, 1);
    else if (/\bhoy\b/.test(low)) fecha = hoy;
    else {
      const d1 = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(low);
      const d2 = /\b(?:el\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.exec(low);
      if (d1) {
        let y = d1[3] ? Number(d1[3]) : hoy.getFullYear();
        if (y < 100) y += 2000;
        const f = new Date(y, Number(d1[2]) - 1, Number(d1[1]));
        if (f.getMonth() === Number(d1[2]) - 1 && f.getDate() === Number(d1[1])) {   // descarta el 31/02
          fecha = f;
          if (!d1[3] && f < hoy) fecha = new Date(y + 1, Number(d1[2]) - 1, Number(d1[1]));
        }
      } else if (d2) {
        const delta = (((DIAS_N[d2[1]] - diaSemana(hoy)) % 7) + 7) % 7;
        fecha = sumaDias(hoy, delta || 7);
      }
    }
  }
  if (!dias.length && !fecha) {
    const [h, mi] = (hora || "09:00").split(":").map(Number);
    const cand = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), h, mi);
    fecha = cand > ahora ? hoy : sumaDias(hoy, 1);
  }
  let limpio = t;
  for (const pat of [/\b(?:los|cada)\s+(?:(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\s*(?:,|y|e)?\s*)+/gi,
    /\b(?:todos los d[ií]as|cada d[ií]a|a diario)\b/gi, /\bpasado ma[ñn]ana\b/gi, /\bma[ñn]ana\b/gi, /\bhoy\b/gi,
    /\b(?:el\s+)?(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gi, /\b(?:de la tarde|de la noche|pm)\b/gi]) limpio = limpio.replace(pat, " ");
  limpio = limpio.replace(/\s{2,}/g, " ").replace(/\s+(?:a|el|de|para)\s*$/, "").replace(/^[ ,.;:-]+|[ ,.;:-]+$/g, "");
  limpio = limpio || t.trim();
  return { texto: limpio.slice(0, 120), fecha: fecha ? isoDe(fecha) : null, hora: hora || "09:00", dias };
}

const aHora = (r) => (r.hora || "09:00").split(":").map(Number);

/** Cuándo suena el recordatorio el día `dia` (Date) o null si ese día no toca. */
function enDia(r, dia) {
  const [h, mi] = aHora(r);
  const suena = r.dias && r.dias.length ? r.dias.includes(diaSemana(dia)) : r.fecha === isoDe(dia);
  return suena ? new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, mi) : null;
}

/** Próxima vez que suena (>= el minuto actual) o null si ya pasó uno de una sola vez. */
export function proximaOcurrencia(r, ahora) {
  const minuto = new Date(ahora); minuto.setSeconds(0, 0);
  const [h, mi] = aHora(r);
  if (r.dias && r.dias.length) {
    for (let i = 0; i < 8; i++) {
      const d = sumaDias(ahora, i);
      if (!r.dias.includes(diaSemana(d))) continue;
      const c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
      if (c >= minuto) return c;
    }
    return null;
  }
  if (!r.fecha) return null;
  const f = aFecha(r.fecha), c = new Date(f.getFullYear(), f.getMonth(), f.getDate(), h, mi);
  return c >= minuto ? c : null;
}

export function etiquetaCuando(cuando, ahora) {
  const d = Math.round((soloDia(cuando) - soloDia(ahora)) / 86400000);
  const hh = `${dos(cuando.getHours())}:${dos(cuando.getMinutes())}`;
  if (d === 0) return `hoy ${hh}`;
  if (d === 1) return `mañana ${hh}`;
  return `${DIAS[diaSemana(cuando)].slice(0, 3)} ${dos(cuando.getDate())}/${dos(cuando.getMonth() + 1)} ${hh}`;
}

/** [{cuando, r}] de lo que aún va a sonar, lo más cercano primero. */
export function ordenar(agenda, ahora) {
  return agenda.map((r) => ({ cuando: proximaOcurrencia(r, ahora), r })).filter((p) => p.cuando)
    .sort((a, b) => a.cuando - b.cuando);
}

/** Apariciones de recordatorios en el intervalo (desde, hasta] (ms), como máximo las últimas 24 h.
 *  Sirve para sonar en directo (intervalo de 1 s) y para avisar de lo que pasó con la app cerrada. */
export function ocurridos(agenda, desde, hasta) {
  desde = Math.max(desde, hasta - 24 * 3600 * 1000);
  const out = [];
  for (let d = soloDia(new Date(desde)); d.getTime() <= hasta; d = sumaDias(d, 1)) {
    for (const r of agenda) {
      const c = enDia(r, d);
      if (c && c.getTime() > desde && c.getTime() <= hasta) out.push({ r, cuando: c });
    }
  }
  return out.sort((a, b) => a.cuando - b.cuando);
}

/** Los 5 hábitos de `dia` (Date): dormir y ejercicio siempre; el resto según el día de la semana y las entregas. */
export function habitosDelDia(dia, entregas = []) {
  const lista = BASE.map((h) => [...h]);
  const pool = [];
  const ini = soloDia(dia).getTime();
  const prox = entregas.filter((e) => e.start - ini >= 0 && e.start - ini <= 3 * 86400000);
  if (prox.length) {
    const e = prox.reduce((a, b) => (b.start < a.start ? b : a));
    pool.push(["entrega", `Avanzar: ${(e.titulo || "").slice(0, 24)}`]);
  }
  if (diaSemana(dia) === 4) pool.push(["repaso", "Repaso semanal"]);
  if (diaSemana(dia) === 6) pool.push(["planificar", "Planificar la semana"]);
  pool.push(diaSemana(dia) < 5 ? ["trabajo", "2 bloques de trabajo"] : ["estudio", "1 bloque de estudio"]);
  pool.push(["comida", "Comí bien"], ["prioridades", "Prioridades de mañana"], ["agua", "Beber 2 L de agua"]);
  return lista.concat(pool.slice(0, 3));
}

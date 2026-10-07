// Horarios de oración y Qibla, calculados en el propio dispositivo (sin red ni claves).
// Es un port fiel de isla/rezos.py (Chispa en Windows): misma matemática, mismos resultados.

export const SALAT = [["fajr", "Fajr"], ["shuruq", "Shuruq"], ["dhuhr", "Dhuhr"], ["asr", "Asr"],
                      ["maghrib", "Maghrib"], ["isha", "Isha"]];
export const REZOS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];            // los cinco marcables
export const NOMBRES = Object.fromEntries(SALAT);
export const TITULOS = { fajr: "Salat Al-Fajr", shuruq: "Salida del sol (Shuruq)", dhuhr: "Salat Adh-Dhuhr",
                         asr: "Salat Al-Asr", maghrib: "Salat Al-Maghrib", isha: "Salat Al-Isha" };

// Vilobí d'Onyar (Girona). Liga Mundial Musulmana (Fajr 18°, Isha 17°), Asr estándar.
export const DEFAULT = { lat: 41.851, lon: 2.708, fajr: 18, isha: 17, asr: "standard", ajuste_min: {} };

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const sin = (d) => Math.sin(rad(d));
const cos = (d) => Math.cos(rad(d));
const tan = (d) => Math.tan(rad(d));
const mod = (a, n) => ((a % n) + n) % n;               // módulo "de Python" (siempre positivo)
const fixAngle = (a) => a - 360 * Math.floor(a / 360);
const fixHour = (h) => h - 24 * Math.floor(h / 24);

function roundHalfEven(x) {                            // como el round() de Python
  const f = Math.floor(x), diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

function sun(jd) {                                     // declinación (grados) y ecuación del tiempo (horas)
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const e = 23.439 - 0.00000036 * d;
  const ra = fixHour(deg(Math.atan2(cos(e) * sin(L), cos(L))) / 15);
  const eqt = mod(q / 15 - ra + 12, 24) - 12;
  const decl = deg(Math.asin(sin(e) * sin(L)));
  return [decl, eqt];
}

const midday = (jd, t) => fixHour(12 - sun(jd + t)[1]);

function angleTime(jd, lat, angle, t, ccw = false) {
  const decl = sun(jd + t)[0];
  const x = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
  if (Math.abs(x) > 1) return null;                    // latitudes extremas: el sol no alcanza ese ángulo
  const h = deg(Math.acos(x)) / 15;
  return midday(jd, t) + (ccw ? -h : h);
}

function asrTime(jd, lat, factor, t) {
  const decl = sun(jd + t)[0];
  const angle = -deg(Math.atan(1 / (factor + tan(Math.abs(lat - decl)))));
  return angleTime(jd, lat, angle, t);
}

/** Horas de oración de un día. Devuelve { fajr: Date, shuruq: Date, ... }.
 *  y, m (1-12), d: fecha local. tz: desfase horario en horas (por defecto el del dispositivo a mediodía). */
export function horarios(y, m, d, cfg = {}, tz = null) {
  const c = { ...DEFAULT, ...cfg };
  const lat = Number(c.lat), lon = Number(c.lon);
  if (tz === null) tz = -new Date(y, m - 1, d, 12).getTimezoneOffset() / 60;
  const jd = julian(y, m, d) - lon / (15 * 24);
  const factor = ["hanafi", "2"].includes(String(c.asr).toLowerCase()) ? 2 : 1;
  let t = { fajr: 5 / 24, shuruq: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, maghrib: 18 / 24, isha: 18 / 24 };
  let h = {};
  for (let i = 0; i < 3; i++) {                        // el sol se mueve: se refina el cálculo
    h = {
      fajr: angleTime(jd, lat, Number(c.fajr), t.fajr, true),
      shuruq: angleTime(jd, lat, 0.833, t.shuruq, true),
      dhuhr: midday(jd, t.dhuhr),
      asr: asrTime(jd, lat, factor, t.asr),
      maghrib: angleTime(jd, lat, 0.833, t.maghrib),
      isha: angleTime(jd, lat, Number(c.isha), t.isha),
    };
    t = Object.fromEntries(Object.entries(h).map(([k, v]) => [k, (v !== null ? v : t[k] * 24) / 24]));
  }
  const out = {};
  for (const [k, v0] of Object.entries(h)) {
    if (v0 === null) continue;
    const v = v0 + tz - lon / 15 + Number((c.ajuste_min || {})[k] || 0) / 60;
    const minutos = roundHalfEven(fixHour(v) * 60);
    out[k] = new Date(y, m - 1, d, 0, minutos);        // hora "de reloj" local, como el naive de Python
  }
  return out;
}

export const horariosDe = (fecha, cfg, tz = null) => horarios(fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate(), cfg, tz);

/** Próximo rezo u hito: { id, cuando } o null. `ids` limita cuáles cuentan (por defecto todos). */
export function proximo(ahora, cfg = {}, ids = null, tz = null) {
  for (let add = 0; add < 3; add++) {
    const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + add);
    const h = horariosDe(dia, cfg, tz);
    for (const [id] of SALAT) {
      if ((!ids || ids.includes(id)) && h[id] && h[id] > ahora) return { id, cuando: h[id] };
    }
  }
  return null;
}

/** Recorrido actual: { noche, frac, desde, hasta }. De día es el sol (Shuruq→Maghrib); de noche, la luna. */
export function posicionSol(ahora, cfg = {}, tz = null) {
  const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hoy = horariosDe(dia, cfg, tz);
  const sr = hoy.shuruq, ms = hoy.maghrib;
  if (!sr || !ms) return { noche: false, frac: 0.5, desde: null, hasta: null };
  if (sr <= ahora && ahora < ms) return { noche: false, frac: (ahora - sr) / (ms - sr), desde: sr, hasta: ms };
  if (ahora >= ms) {
    const sig = horariosDe(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1), cfg, tz).shuruq;
    if (sig) return { noche: true, frac: Math.min(1, (ahora - ms) / (sig - ms)), desde: ms, hasta: sig };
  }
  const ayer = horariosDe(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - 1), cfg, tz).maghrib;
  if (ayer) return { noche: true, frac: Math.max(0, Math.min(1, (ahora - ayer) / (sr - ayer))), desde: ayer, hasta: sr };
  return { noche: false, frac: 0, desde: null, hasta: null };
}

// ---------- Qibla ----------
export const KAABA = [21.4225, 39.8262];
const PUNTOS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

/** { rumbo: grados desde el norte hacia la Kaaba, km: distancia } */
export function qibla(lat, lon) {
  const p1 = rad(lat), p2 = rad(KAABA[0]), dl = rad(KAABA[1] - lon);
  const x = Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dl);
  const rumbo = (deg(Math.atan2(Math.sin(dl), x)) + 360) % 360;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return { rumbo, km: 2 * 6371 * Math.asin(Math.sqrt(a)) };
}

export const puntoCardinal = (g) => PUNTOS[Math.floor((g + 11.25) / 22.5) % 16];

// Sincronización con Supabase (REST, sin dependencias) y avisos push. Conflictos: gana el último cambio de cada bloque.
// Chispa en Windows hace lo mismo desde isla/chispa_sync.py con las mismas reglas.
import CFG from "../config.js";
import * as S from "./store.js";
import * as R from "./rezos.js";
import * as A from "./agenda.js";

export const CLAVES = ["checks", "rezos", "tareas", "foco", "tasbih", "agenda", "habitos_dia"];
const K_SES = "chispa.sync.sesion.v1", K_META = "chispa.sync.meta.v1", K_ENT = "chispa.sync.entregas.v1", K_PUSH = "chispa.push.firma.v1";

const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const poner = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const quitar = (k) => { try { localStorage.removeItem(k); } catch { /* idem */ } };
const canon = (v) => JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));

export const configurado = () => !!(CFG.supabaseUrl && CFG.anonKey);
export const conectado = () => configurado() && !!leer(K_SES, null);
export const estado = { ultimo: 0, error: "" };

// ---------- acceso ----------
async function pedir(ruta, { metodo = "GET", cuerpo, cab = {}, sinSesion = false } = {}) {
  const h = { apikey: CFG.anonKey, "Content-Type": "application/json", ...cab };
  if (!sinSesion) h.Authorization = "Bearer " + (await token());
  const r = await fetch(CFG.supabaseUrl + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  if (r.status === 401 && !sinSesion) { quitar(K_SES); throw new Error("La sesión caducó: vuelve a entrar"); }
  if (!r.ok) {
    let m = "";
    try { const j = await r.json(); m = j.message || j.msg || j.error_description || ""; } catch { /* sin cuerpo */ }
    throw new Error(m || `Error ${r.status}`);
  }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
function guardarSesion(d) {
  poner(K_SES, { access: d.access_token, refresh: d.refresh_token, exp: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600) });
}
async function token() {
  const s = leer(K_SES, null);
  if (!s) throw new Error("Sin sesión");
  if (s.exp - 60 > Date.now() / 1000) return s.access;
  const d = await pedir("/auth/v1/token?grant_type=refresh_token", { metodo: "POST", cuerpo: { refresh_token: s.refresh }, sinSesion: true });
  guardarSesion(d);
  return d.access_token;
}
export async function entrar(email, clave) {
  const d = await pedir("/auth/v1/token?grant_type=password", { metodo: "POST", cuerpo: { email, password: clave }, sinSesion: true });
  guardarSesion(d);
}
export function salir() { for (const k of [K_SES, K_META, K_ENT, K_PUSH]) quitar(k); }

// ---------- sincronización ----------
function aplicar(E, clave, valor) {
  E[clave] = clave === "tasbih" ? { ...S.nuevoEstado().tasbih, ...valor } : valor;
}

/** Baja lo que cambió en el otro lado y sube lo que cambió aquí. Devuelve true si se aplicó algo de fuera (hay que repintar). */
export async function sincronizar(E) {
  if (!conectado()) return false;
  try {
    const filas = await pedir("/rest/v1/estado?select=clave,valor,t");
    const remoto = Object.fromEntries(filas.map((f) => [f.clave, f]));
    if (remoto.moodle_eventos) poner(K_ENT, remoto.moodle_eventos.valor);
    const meta = leer(K_META, {}), ahora = Date.now(), subir = [];
    let cambiado = false;
    for (const clave of CLAVES) {
      const r = remoto[clave], loc = canon(E[clave]);
      let m = meta[clave];
      if (!m) {                                            // primera vez: lo que ya hay en la nube manda (el PC sube primero)
        if (!r) { m = meta[clave] = { h: loc, t: ahora }; subir.push({ clave, valor: E[clave], t: m.t }); }
        else { aplicar(E, clave, r.valor); meta[clave] = { h: canon(E[clave]), t: r.t }; cambiado = true; }
        continue;
      }
      if (loc !== m.h) { m.h = loc; m.t = ahora; }          // lo cambié aquí
      if (r && r.t > m.t) { aplicar(E, clave, r.valor); m.h = canon(E[clave]); m.t = r.t; cambiado = true; }
      else if (!r || m.t > r.t) subir.push({ clave, valor: E[clave], t: m.t });
    }
    if (subir.length) await pedir("/rest/v1/estado?on_conflict=clave", { metodo: "POST", cuerpo: subir, cab: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    poner(K_META, meta);
    estado.ultimo = Date.now(); estado.error = "";
    return cambiado;
  } catch (e) { estado.error = e.message || String(e); return false; }
}

/** Entregas de Moodle que sube Chispa (solo título y fecha): [{titulo, start(ms)}]. */
export const entregas = () => (leer(K_ENT, []) || []).map((e) => ({ titulo: e.titulo, start: Date.parse(e.inicio) })).filter((e) => e.start);

// ---------- avisos push (con la app cerrada) ----------
const b64 = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
export const pushDisponible = () => !!CFG.vapidPublic && "serviceWorker" in navigator && "PushManager" in window;

export async function activarPush(E) {
  if (!conectado()) throw new Error("Primero conecta la sincronización");
  if (!pushDisponible()) throw new Error("Este navegador no admite push (en iPhone: abre la app desde la pantalla de inicio)");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Permiso de avisos denegado");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(CFG.vapidPublic) }));
  await pedir("/rest/v1/suscripciones?on_conflict=endpoint", { metodo: "POST", cuerpo: [{ endpoint: sub.endpoint, datos: sub.toJSON() }],
    cab: { Prefer: "resolution=merge-duplicates,return=minimal" } });
  E.ajustes.push = true;
  quitar(K_PUSH);
  await programarPush(E);
}

/** Sube los próximos 14 días de oraciones y recordatorios para que el servidor los envíe aunque la app esté cerrada. */
export async function programarPush(E, ahora = new Date()) {
  if (!conectado() || !E.ajustes.push) return;
  const items = [], cfg = { lat: E.ajustes.lat, lon: E.ajustes.lon, fajr: E.ajustes.fajr, isha: E.ajustes.isha, asr: E.ajustes.asr };
  const hhmm = (d) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
  for (let i = 0; i < 14; i++) {
    const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i);
    const h = R.horariosDe(dia, cfg);
    for (const id of R.REZOS) {
      if (h[id] && h[id] > ahora) items.push({ id: `p-${S.iso(dia)}-${id}`, cuando: h[id].toISOString(), titulo: `Hora de ${R.NOMBRES[id]}`, cuerpo: hhmm(h[id]) });
    }
    for (const { r, cuando } of A.ocurridos(E.agenda, Math.max(dia.getTime() - 1, ahora.getTime()), dia.getTime() + 86400000 - 1)) {
      items.push({ id: `a-${r.id}-${cuando.getTime()}`, cuando: cuando.toISOString(), titulo: "Chispa · Recordatorio", cuerpo: r.texto });
    }
  }
  const firma = canon(items.map((x) => x.id)) + "|" + Math.floor(ahora.getTime() / (12 * 3600000));
  if (leer(K_PUSH, "") === firma) return;
  try {
    await pedir(`/rest/v1/avisos_push?enviado=eq.false&cuando=gte.${encodeURIComponent(ahora.toISOString())}`, { metodo: "DELETE", cab: { Prefer: "return=minimal" } });
    if (items.length) await pedir("/rest/v1/avisos_push?on_conflict=id", { metodo: "POST", cuerpo: items, cab: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    poner(K_PUSH, firma);
  } catch (e) { estado.error = e.message || String(e); }
}

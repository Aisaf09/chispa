// Chispa en el iPhone (fase 1: todo local). Sin dependencias ni compilación.
import * as R from "./rezos.js";
import * as S from "./store.js";

const E = S.cargar();
let tab = "hoy";
const orient = { heading: null, activa: false };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rad = (d) => (d * Math.PI) / 180;
const cfg = () => ({ lat: E.ajustes.lat, lon: E.ajustes.lon, fajr: E.ajustes.fajr, isha: E.ajustes.isha, asr: E.ajustes.asr });
const hhmm = (d) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
const guardar = () => S.guardar(E);

function cuenta(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")} min`;
  if (s >= 60) return `${Math.floor(s / 60)} min`;
  return `${s} s`;
}
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const durTxt = (seg) => { const m = Math.floor(seg / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`; };

let toastT;
function aviso(texto) {
  const t = $("#toast");
  t.textContent = texto; t.classList.add("ver");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("ver"), 2600);
}

// ---------- gráficos SVG ----------
function segmentos(n, total, size, stroke = 5) {
  const c = size / 2, r = c - stroke, gap = 10, span = 360 / total - gap;
  let p = "";
  for (let i = 0; i < total; i++) {
    const a0 = -90 + (i * 360) / total + gap / 2, a1 = a0 + span;
    p += `<path class="seg${i < n ? " on" : ""}" d="M${(c + r * Math.cos(rad(a0))).toFixed(2)} ${(c + r * Math.sin(rad(a0))).toFixed(2)}A${r} ${r} 0 0 1 ${(c + r * Math.cos(rad(a1))).toFixed(2)} ${(c + r * Math.sin(rad(a1))).toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${p}</svg>`;
}

function aro(frac, size, stroke, color, id = "") {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="aro-fondo" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>` +
    `<circle ${id ? `id="${id}"` : ""} class="aro-prog" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, frac)))}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

function arcoSol(frac, noche, w = 340, h = 86) {
  const y0 = h - 14, rx = (w - 28) / 2, ry = h - 30, cx = w / 2;
  const pt = (f) => [cx - rx * Math.cos(Math.PI * f), y0 - ry * Math.sin(Math.PI * f)];
  const pts = (hasta) => Array.from({ length: Math.max(2, Math.round(hasta * 80)) + 1 }, (_, i) => pt((i / Math.max(2, Math.round(hasta * 80))) * hasta));
  const linea = (a) => a.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const col = noche ? "#b0c4ec" : `rgb(255,${Math.round(150 + 70 * Math.sin(Math.PI * frac))},${Math.round(90 + 40 * Math.sin(Math.PI * frac))})`;
  const [sx, sy] = pt(frac);
  return `<svg class="arco" viewBox="0 0 ${w} ${h}" aria-label="${noche ? "Luna" : "Sol"}">
    <line x1="6" x2="${w - 6}" y1="${y0}" y2="${y0}" stroke="#2c2c2e" stroke-width="1.5"/>
    <path class="base" d="${linea(pts(1))}"/>
    <path class="prog" stroke="${col}" d="${linea(pts(Math.max(frac, 0.01)))}"/>
    <circle cx="${sx}" cy="${sy}" r="11" fill="${col}" opacity=".22"/><circle cx="${sx}" cy="${sy}" r="5.2" fill="${col}"/>
    ${noche ? `<circle cx="${sx + 2.6}" cy="${sy - 2.2}" r="4.4" fill="#1c1c1e"/>` : ""}</svg>`;
}

function brujulaSvg(rumbo) {
  let marcas = "";
  for (let a = 0; a < 360; a += 15) {
    const largo = a % 90 === 0 ? 14 : a % 45 === 0 ? 9 : 5, r1 = 92, r2 = r1 - largo;
    marcas += `<line x1="${100 + r1 * Math.sin(rad(a))}" y1="${100 - r1 * Math.cos(rad(a))}" x2="${100 + r2 * Math.sin(rad(a))}" y2="${100 - r2 * Math.cos(rad(a))}" stroke="${a === 0 ? "#f5f5f7" : "#636366"}" stroke-width="${a % 90 === 0 ? 2.2 : 1.4}"/>`;
  }
  const t = rad(rumbo), kx = 100 + 80 * Math.sin(t), ky = 100 - 80 * Math.cos(t);
  return `<svg viewBox="0 0 200 200" id="bru-svg" role="img" aria-label="Brújula hacia la Qibla">
    <circle cx="100" cy="100" r="94" fill="none" stroke="#3a3a3e" stroke-width="2"/>
    <g id="bru-dial">${marcas}<text x="100" y="40" text-anchor="middle" fill="#f5f5f7" font-size="15" font-weight="700">N</text>
      <line class="aguja" x1="100" y1="100" x2="${100 + 66 * Math.sin(t)}" y2="${100 - 66 * Math.cos(t)}" stroke="#d97757" stroke-width="3.2" stroke-linecap="round"/>
      <rect class="kaaba" x="${kx - 7}" y="${ky - 7}" width="14" height="14" rx="3" fill="#e8be5c" transform="rotate(${rumbo} ${kx} ${ky})"/></g>
    <polygon points="100,2 94,-10 106,-10" fill="#f5f5f7"/><circle cx="100" cy="100" r="4" fill="#f5f5f7"/></svg>`;
}

const ICONOS = {
  hoy: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
  tareas: '<path d="M5 7l2 2 3-3M13 8h6M5 16l2 2 3-3M13 17h6"/>',
  fe: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  foco: '<circle cx="12" cy="13.5" r="7"/><path d="M12 9.5v4l2.6 1.6M9.5 3h5"/>',
  ajustes: '<path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2.2" fill="#000"/><circle cx="15" cy="16" r="2.2" fill="#000"/>',
};
const TABS = [["hoy", "Hoy"], ["tareas", "Tareas"], ["fe", "Fe"], ["foco", "Foco"], ["ajustes", "Ajustes"]];
const OK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.8"/></svg>';

// ---------- vistas ----------
function vistaHoy() {
  const ahora = new Date(), hoy = S.iso(ahora), h = R.horariosDe(ahora, cfg()), prox = R.proximo(ahora, cfg());
  const rez = new Set(E.rezos[hoy] || []), chk = new Set(E.checks[hoy] || []);
  const sigRezo = R.proximo(ahora, cfg(), R.REZOS);
  const f0 = ahora.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const fecha = f0.charAt(0).toUpperCase() + f0.slice(1);
  return `<div class="cab"><div><h1>Hoy</h1><p class="sub">${esc(fecha)}</p></div>
    <div class="racha"><div class="num">${segmentos(S.progresoDia(E, hoy), 10, 56)}<div><div><b>${S.racha(E)}</b><span>días</span></div></div></div></div></div>
    <div class="card sig"><div class="et">Siguiente</div>
      <div class="sig-nom">${prox ? esc(R.NOMBRES[prox.id]) : "—"}</div>
      <div class="sig-cuenta" data-cuenta="${prox ? prox.cuando.getTime() : 0}"></div>
      <div class="sig-hora">${prox ? hhmm(prox.cuando) : ""}</div></div>
    <div class="chips">${R.REZOS.map((id) => `<button class="chip${rez.has(id) ? " hecho" : ""}${sigRezo && sigRezo.id === id && !rez.has(id) ? " sig2" : ""}" data-a="rezo" data-id="${id}" aria-pressed="${rez.has(id)}">
      <span class="n">${R.NOMBRES[id]}</span><span class="h">${h[id] ? hhmm(h[id]) : "--:--"}</span></button>`).join("")}</div>
    <h2>Hábitos</h2><div class="card">${S.CHECKS.map(([id, txt]) => `<button class="fila${chk.has(id) ? " hecha" : ""}" data-a="check" data-id="${id}" role="checkbox" aria-checked="${chk.has(id)}">
      <span class="chk">${OK}</span><span class="tx">${esc(txt)}</span></button>`).join("")}</div>
    <button class="card foco-mini" data-a="tab" data-id="foco"><div><div class="et">Foco · hoy ${durTxt(E.foco[hoy] || 0)}</div>
      <div class="t" id="mini-timer">${mmss(S.restante(E.timer))}</div></div>
      <span class="btn${E.timer.corre ? "" : " pri"}">${E.timer.corre ? "En marcha" : "Iniciar"}</span></button>`;
}

function vistaTareas() {
  const pend = E.tareas.filter((t) => !t.hecha), hechas = E.tareas.filter((t) => t.hecha);
  const fila = (t) => `<div class="fila${t.hecha ? " hecha" : ""}"><button class="fila" style="padding:0;flex:1" data-a="tarea" data-id="${t.id}" role="checkbox" aria-checked="${t.hecha}">
    <span class="chk">${OK}</span><span class="tx">${esc(t.texto)}</span></button><button class="borrar" data-a="tarea-borrar" data-id="${t.id}" aria-label="Borrar">×</button></div>`;
  return `<div class="cab"><div><h1>Tareas</h1><p class="sub">${pend.length} pendiente${pend.length === 1 ? "" : "s"}</p></div></div>
    <form class="form-tarea" data-form="tarea"><input type="text" name="texto" placeholder="Nueva tarea" autocomplete="off" enterkeyhint="done" maxlength="200"><button class="btn pri" type="submit">Añadir</button></form>
    ${pend.length ? `<div class="card">${pend.map(fila).join("")}</div>` : `<p class="vacio">Sin tareas pendientes.</p>`}
    ${hechas.length ? `<h2>Hechas</h2><div class="card">${hechas.slice(-8).reverse().map(fila).join("")}</div>` : ""}`;
}

function vistaFe() {
  const ahora = new Date(), h = R.horariosDe(ahora, cfg()), prox = R.proximo(ahora, cfg());
  const sol = R.posicionSol(ahora, cfg()), t = S.tasbih(E), q = R.qibla(E.ajustes.lat, E.ajustes.lon);
  const km = Math.round(q.km).toLocaleString("es-ES");
  const sol1 = sol.desde ? `${sol.noche ? "Maghrib" : "Shuruq"} ${hhmm(sol.desde)}` : "", sol2 = sol.hasta ? `${sol.noche ? "Shuruq" : "Maghrib"} ${hhmm(sol.hasta)}` : "";
  return `<div class="cab"><div><h1>Fe</h1><p class="sub">${E.ajustes.gps ? "Ubicación del iPhone" : "Ubicación manual"}</p></div></div>
    <div class="card">${arcoSol(sol.frac, sol.noche)}<div style="display:flex;justify-content:space-between;color:var(--g);font-size:13px;margin-top:2px"><span>${sol1}</span><span data-cuenta="${sol.hasta ? sol.hasta.getTime() : 0}" data-pre="${sol.noche ? "Shuruq" : "Maghrib"} en " style="color:var(--t)"></span><span>${sol2}</span></div></div>
    <h2>Horarios</h2><div class="card"><div class="horario">${R.SALAT.map(([id, n]) => `<div class="${prox && prox.id === id ? "sig3" : ""}">${n}<b>${h[id] ? hhmm(h[id]) : "--:--"}</b></div>`).join("")}</div></div>
    <h2>Qibla</h2><div class="card brujula">${brujulaSvg(q.rumbo)}
      <div class="estado-bru" id="bru-estado">${Math.round(q.rumbo)}° ${R.puntoCardinal(q.rumbo)} · ${km} km</div>
      <button class="btn peq" data-a="brujula">${orient.activa ? "Brújula activada" : "Activar la brújula del iPhone"}</button></div>
    <h2>Tasbih</h2><div class="card tasbih"><button class="aro" data-a="tasbih" aria-label="Sumar una repetición">${aro(t.ciclo / t.meta, 150, 10, "#ff9f64", "tas-aro")}<div class="n"><div><span id="tas-n">${t.ciclo}</span><small>de ${t.meta}</small></div></div></button>
      <div><div class="et">Hoy</div><div style="font-size:30px;font-weight:700" id="tas-total">${t.total}</div>
        <div class="fila-btn" style="margin-top:10px"><button class="btn peq" data-a="tasbih-meta">Meta ${t.meta}</button><button class="btn peq" data-a="tasbih-reset">Reiniciar</button></div></div></div>`;
}

function vistaFoco() {
  const t = E.timer, hoy = S.iso(), total = S.POMO[t.modo], rest = S.restante(t);
  return `<div class="cab"><div><h1>Foco</h1><p class="sub">Hoy ${durTxt(E.foco[hoy] || 0)}</p></div></div>
    <div class="timer">${aro(1 - rest / total, 260, 14, t.modo === "foco" ? "#ff9f64" : "#32d74b", "timer-aro")}<div class="txt"><div><b id="timer-txt">${mmss(rest)}</b><span>${t.modo === "foco" ? "Foco" : "Descanso"}</span></div></div></div>
    <div class="centro"><button class="btn pri" data-a="timer-toggle" style="min-width:140px">${t.corre ? "Pausa" : "Iniciar"}</button><button class="btn" data-a="timer-reset">Reiniciar</button></div>
    <div class="card" style="margin-top:22px"><p class="nota">Bloques de 90 min de foco y 20 de descanso. El tiempo se calcula por la hora de fin, así que sigue contando aunque la pantalla se bloquee.</p></div>`;
}

function vistaAjustes() {
  const a = E.ajustes, hace = a.gps_ts ? cuenta(Date.now() - a.gps_ts) : "";
  const metodo = `${a.fajr}/${a.isha}`;
  return `<div class="cab"><div><h1>Ajustes</h1><p class="sub">Chispa · fase 1 (todo en este teléfono)</p></div></div>
    <h2>Ubicación</h2><div class="card"><p class="nota">${a.gps ? `Del GPS del iPhone${hace ? `, hace ${hace}` : ""}.` : "Manual."} Lat ${a.lat}, lon ${a.lon}</p>
      <div class="fila-btn" style="margin-top:12px"><button class="btn pri" data-a="gps">Usar la ubicación del iPhone</button></div>
      <form data-form="ubic" style="margin-top:14px"><div class="doble"><div class="campo"><label>Latitud</label><input type="number" name="lat" step="any" value="${a.lat}"></div><div class="campo"><label>Longitud</label><input type="number" name="lon" step="any" value="${a.lon}"></div></div>
        <button class="btn peq" type="submit">Guardar ubicación manual</button></form></div>
    <h2>Cálculo de las oraciones</h2><div class="card"><div class="campo"><label>Método (ángulos de Fajr / Isha)</label><select data-sel="metodo">
        ${[["18/17", "Liga Mundial Musulmana (18° / 17°)"], ["15/15", "ISNA (15° / 15°)"], ["12/12", "UOIF (12° / 12°)"]].map(([v, n]) => `<option value="${v}"${v === metodo ? " selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="campo" style="margin:0"><label>Asr</label><select data-sel="asr"><option value="standard"${a.asr === "standard" ? " selected" : ""}>Estándar (Shafi'i, Maliki, Hanbali)</option><option value="hanafi"${a.asr === "hanafi" ? " selected" : ""}>Hanafí</option></select></div></div>
    <h2>Instalar en el iPhone</h2><div class="card"><p class="nota">En Safari: botón Compartir → <b>Añadir a pantalla de inicio</b>. Así se abre como una app a pantalla completa y funciona sin conexión.</p>
      <p class="nota">La sincronización con Chispa en Windows y los avisos de oración llegarán en las siguientes fases.</p></div>
    <h2>Datos</h2><div class="card"><div class="fila-btn"><button class="btn peligro" data-a="borrar">Borrar todos los datos de este teléfono</button></div></div>`;
}

const VISTAS = { hoy: vistaHoy, tareas: vistaTareas, fe: vistaFe, foco: vistaFoco, ajustes: vistaAjustes };

function render() {
  $("#vista").innerHTML = VISTAS[tab]();
  $("#tabs").innerHTML = TABS.map(([id, n]) => `<button class="${id === tab ? "act" : ""}" data-a="tab" data-id="${id}" aria-label="${n}"><svg viewBox="0 0 24 24">${ICONOS[id]}</svg>${n}</button>`).join("");
  tick();
  if (tab === "fe") pintarBrujula();
}

// ---------- brújula (sensor del iPhone) ----------
function pintarBrujula() {
  const dial = $("#bru-dial"), est = $("#bru-estado"), svg = $("#bru-svg");
  if (!dial) return;
  const q = R.qibla(E.ajustes.lat, E.ajustes.lon);
  if (orient.heading === null) { dial.style.transform = "rotate(0deg)"; return; }
  dial.style.transform = `rotate(${-orient.heading}deg)`;
  const diff = Math.abs(((q.rumbo - orient.heading + 540) % 360) - 180);
  const ok = diff < 4;
  svg.parentElement.classList.toggle("ok", ok);
  est.classList.toggle("ok", ok);
  est.textContent = ok ? "Estás mirando hacia la Qibla" : `Gira ${Math.round(diff)}° hasta que la flecha apunte arriba`;
}
function alOrientar(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;       // iOS: grados desde el norte
  else if (e.absolute && e.alpha != null) h = (360 - e.alpha) % 360;                  // Android / otros
  if (h === null) return;
  orient.heading = h;
  if (tab === "fe") pintarBrujula();
}
async function activarBrujula() {
  const D = window.DeviceOrientationEvent;
  if (!D) return aviso("Este dispositivo no tiene brújula");
  if (typeof D.requestPermission === "function") {                                    // iOS 13+: hay que pedir permiso con un toque
    try { if ((await D.requestPermission()) !== "granted") return aviso("Permiso de brújula denegado"); }
    catch { return aviso("No se pudo activar la brújula"); }
  }
  if (!orient.activa) {
    window.addEventListener("deviceorientationabsolute", alOrientar, true);
    window.addEventListener("deviceorientation", alOrientar, true);
    orient.activa = true;
  }
  aviso("Brújula activada: gira el teléfono");
  render();
}

// ---------- ubicación ----------
function usarGPS(silencioso = false) {
  if (!navigator.geolocation) return silencioso || aviso("Este navegador no tiene geolocalización");
  if (!silencioso) aviso("Buscando tu ubicación…");
  navigator.geolocation.getCurrentPosition((pos) => {
    Object.assign(E.ajustes, { lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4), gps: true, gps_ts: Date.now() });
    guardar(); render(); if (!silencioso) aviso("Ubicación actualizada");
  }, (err) => {
    if (silencioso) return;
    aviso(err.code === 1 ? "Permiso de ubicación denegado (Ajustes → Safari → Ubicación)" : "No se pudo obtener la ubicación");
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
}

// ---------- reloj ----------
function tick() {
  const ahora = Date.now();
  const fin = S.comprobarFinTimer(E, ahora);
  if (fin) {
    guardar(); aviso(fin === "foco" ? "Bloque de foco terminado: descansa 20 min" : "Descanso terminado: vuelve al foco");
    navigator.vibrate?.([200, 100, 200]); render(); return;
  }
  for (const el of $$("[data-cuenta]")) {
    const t = Number(el.dataset.cuenta);
    if (!t) continue;
    if (t - ahora <= 0 && (tab === "hoy" || tab === "fe")) { render(); return; }      // pasó la hora: recalcula el siguiente
    el.textContent = (el.dataset.pre || "") + cuenta(t - ahora);
  }
  const rest = S.restante(E.timer, ahora), total = S.POMO[E.timer.modo];
  const txt = $("#timer-txt"), ar = $("#timer-aro");
  if (txt) txt.textContent = mmss(rest);
  if (ar) { const c = 2 * Math.PI * (260 - 14) / 2; ar.setAttribute("stroke-dashoffset", c * (rest / total)); }
  const mini = $("#mini-timer");
  if (mini) mini.textContent = mmss(rest);
}

// ---------- acciones ----------
function accion(a, id) {
  switch (a) {
    case "tab": tab = id; window.scrollTo(0, 0); render(); return;
    case "rezo": S.alternarRezo(E, id); break;
    case "check": S.alternarCheck(E, id); break;
    case "tarea": S.alternarTarea(E, Number(id)); break;
    case "tarea-borrar": S.borrarTarea(E, Number(id)); break;
    case "tasbih": {
      const completo = S.sumarTasbih(E);
      guardar(); navigator.vibrate?.(completo ? [60, 40, 60] : 12);
      const t = E.tasbih, n = $("#tas-n"), tot = $("#tas-total"), ar = $("#tas-aro"), btn = $(".tasbih .aro");
      if (n) {
        n.textContent = t.ciclo; tot.textContent = t.total;
        ar.setAttribute("stroke-dashoffset", 2 * Math.PI * 70 * (1 - t.ciclo / t.meta));
        btn.classList.remove("pulso"); void btn.offsetWidth; btn.classList.add("pulso");
      }
      if (completo) aviso(`Tasbih completado: ${t.meta}. Subhan Allah`);
      return;
    }
    case "tasbih-meta": S.ciclarMeta(E); break;
    case "tasbih-reset": S.tasbih(E).ciclo = 0; break;
    case "timer-toggle": E.timer.corre ? S.pausarTimer(E) : S.iniciarTimer(E); break;
    case "timer-reset": S.reiniciarTimer(E); break;
    case "gps": usarGPS(); return;
    case "brujula": activarBrujula(); return;
    case "borrar":
      if (!confirm("¿Borrar todos los datos de Chispa en este teléfono?")) return;
      localStorage.removeItem("chispa.estado.v1"); Object.assign(E, S.nuevoEstado()); aviso("Datos borrados"); break;
    default: return;
  }
  guardar(); render();
}

document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-a]");
  if (el) accion(el.dataset.a, el.dataset.id);
});
document.addEventListener("submit", (ev) => {
  const f = ev.target.closest("[data-form]");
  if (!f) return;
  ev.preventDefault();
  if (f.dataset.form === "tarea") {
    const inp = f.elements.texto;
    if (S.añadirTarea(E, inp.value)) { guardar(); render(); $("[name=texto]")?.focus(); }
  } else if (f.dataset.form === "ubic") {
    const lat = parseFloat(f.elements.lat.value), lon = parseFloat(f.elements.lon.value);
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return aviso("Latitud (−90 a 90) y longitud (−180 a 180)");
    Object.assign(E.ajustes, { lat, lon, gps: false }); guardar(); render(); aviso("Ubicación guardada");
  }
});
document.addEventListener("change", (ev) => {
  const s = ev.target.closest("[data-sel]");
  if (!s) return;
  if (s.dataset.sel === "metodo") { const [f, i] = s.value.split("/").map(Number); Object.assign(E.ajustes, { fajr: f, isha: i }); }
  else E.ajustes.asr = s.value;
  guardar(); aviso("Horarios recalculados");
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) { tick(); if (tab !== "fe") render(); } });

// ---------- arranque ----------
render();
setInterval(tick, 1000);
if (E.ajustes.gps && Date.now() - E.ajustes.gps_ts > 3 * 3600 * 1000) usarGPS(true);   // refresca la ubicación del iPhone
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { /* sin HTTPS/localhost no hay modo sin conexión */ });

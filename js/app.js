// Chispa en el iPhone. Sin dependencias ni compilación. Aspecto iOS (claro/oscuro automático).
import * as R from "./rezos.js";
import * as S from "./store.js";
import * as A from "./agenda.js";
import * as Y from "./sync.js";
import * as C from "./calendario.js";
import * as T from "./tareas.js";
import * as K from "./cuidado.js";
import { ico, cuadro } from "./iconos.js";

const E = S.cargar();
let tab = "hoy";
const orient = { heading: null, activa: false };
const hoyD = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const cal = { sel: A.isoDe(new Date()), anio: new Date().getFullYear(), mes: new Date().getMonth(), modo: "mes" };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rad = (d) => (d * Math.PI) / 180;
const cfg = () => ({ lat: E.ajustes.lat, lon: E.ajustes.lon, fajr: E.ajustes.fajr, isha: E.ajustes.isha, asr: E.ajustes.asr });
const hhmm = (d) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
const may = (s) => s.charAt(0).toUpperCase() + s.slice(1);
let sucio = false;
const guardar = () => { S.guardar(E); sucio = true; };

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
function aro(frac, size, stroke, color, id = "") {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="aro-fondo" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>` +
    `<circle ${id ? `id="${id}"` : ""} class="aro-prog" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" style="stroke:${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, frac)))}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

function arcoSol(frac, noche, w = 340, h = 86) {
  const y0 = h - 14, rx = (w - 28) / 2, ry = h - 30, cx = w / 2;
  const pt = (f) => [cx - rx * Math.cos(Math.PI * f), y0 - ry * Math.sin(Math.PI * f)];
  const pts = (hasta) => Array.from({ length: Math.max(2, Math.round(hasta * 80)) + 1 }, (_, i) => pt((i / Math.max(2, Math.round(hasta * 80))) * hasta));
  const linea = (a) => a.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const col = noche ? "#8e9cff" : `rgb(255,${Math.round(150 + 50 * Math.sin(Math.PI * frac))},${Math.round(10 + 30 * Math.sin(Math.PI * frac))})`;
  const [sx, sy] = pt(frac);
  return `<svg class="arco" viewBox="0 0 ${w} ${h}" aria-label="${noche ? "Luna" : "Sol"}">
    <line class="linea" x1="6" x2="${w - 6}" y1="${y0}" y2="${y0}" stroke-width="1"/>
    <path class="base" d="${linea(pts(1))}"/>
    <path class="prog" style="stroke:${col}" d="${linea(pts(Math.max(frac, 0.01)))}"/>
    <circle cx="${sx}" cy="${sy}" r="12" style="fill:${col}" opacity=".22"/><circle cx="${sx}" cy="${sy}" r="5.6" style="fill:${col}"/>
    ${noche ? `<circle class="hueco" cx="${sx + 2.8}" cy="${sy - 2.4}" r="4.6"/>` : ""}</svg>`;
}

function brujulaSvg(rumbo) {
  let marcas = "";
  for (let a = 0; a < 360; a += 15) {
    const largo = a % 90 === 0 ? 14 : a % 45 === 0 ? 9 : 5, r1 = 92, r2 = r1 - largo;
    marcas += `<line class="marca${a === 0 ? " n" : ""}" x1="${100 + r1 * Math.sin(rad(a))}" y1="${100 - r1 * Math.cos(rad(a))}" x2="${100 + r2 * Math.sin(rad(a))}" y2="${100 - r2 * Math.cos(rad(a))}" stroke-width="${a % 90 === 0 ? 2.2 : 1.4}"/>`;
  }
  const t = rad(rumbo), kx = 100 + 80 * Math.sin(t), ky = 100 - 80 * Math.cos(t);
  return `<svg viewBox="0 0 200 200" id="bru-svg" role="img" aria-label="Brújula hacia la Qibla">
    <circle class="aro-ext" cx="100" cy="100" r="94"/>
    <g id="bru-dial">${marcas}<text class="letra" x="100" y="40" text-anchor="middle" font-size="15" font-weight="700">N</text>
      <line class="aguja" x1="100" y1="100" x2="${100 + 66 * Math.sin(t)}" y2="${100 - 66 * Math.cos(t)}" stroke-width="3.2" stroke-linecap="round"/>
      <rect class="kaaba" x="${kx - 7}" y="${ky - 7}" width="14" height="14" rx="3" transform="rotate(${rumbo} ${kx} ${ky})"/></g>
    <polygon class="tri" points="100,2 94,-10 106,-10"/><circle class="centro" cx="100" cy="100" r="4"/></svg>`;
}

const TABS = [["hoy", "Hoy"], ["calendario", "Calendario"], ["tareas", "Tareas"], ["fe", "Fe"], ["foco", "Foco"]];
const CHK = `<span class="chk">${ico("ok")}</span>`;
const COLOR_TIPO = { rec: "var(--naranja)", rep: "var(--indigo)", entrega: "var(--rojo)" };

/** Barra de navegación (el título pequeño aparece al bajar, como en iOS). */
const nav = (titulo, izq = "", der = "") => `<div class="nav"><div class="izq">${izq}</div><div class="t">${esc(titulo)}</div><div class="der">${der}</div></div>`;
const btnNav = (a, contenido, extra = "") => `<button class="btn-nav${extra}" data-a="${a.split(":")[0]}"${a.includes(":") ? ` data-id="${a.split(":")[1]}"` : ""}>${contenido}</button>`;

// ---------- Hoy ----------
function vistaHoy() {
  const ahora = new Date(), hoy = S.iso(ahora), h = R.horariosDe(ahora, cfg()), prox = R.proximo(ahora, cfg());
  const rez = new Set(E.rezos[hoy] || []), chk = new Set(E.checks[hoy] || []), habitos = S.habitosHoy(E, ahora, Y.entregas());
  const sigRezo = R.proximo(ahora, cfg(), R.REZOS), sol = R.posicionSol(ahora, cfg());
  const fecha = ahora.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const evHoy = C.eventosDia(E.agenda, Y.entregas(), hoyD()).filter((e) => e.cuando > ahora - 3600000);
  const hechos = S.progresoDia(E, hoy, ahora), total = S.totalDia(E, hoy, ahora), racha = S.racha(E);
  const ent = Y.entregas().filter((e) => e.start > ahora.getTime() && e.start - ahora.getTime() < 3 * 86400000).sort((a, b) => a.start - b.start);
  const t = E.timer, cui = Y.cuidado(), mCui = cuiMomento || K.momentoActual(ahora), pasosCui = cui.rutina[mCui];
  const hechosCui = pasosCui.filter((p) => (E.cuidado[hoy] || []).includes(p[0])).length;
  const nHab = habitos.filter(([id]) => chk.has(id)).length;
  // «Ahora»: el próximo rezo y, debajo, lo siguiente del calendario de hoy y la entrega más cercana
  const sigEv = evHoy.find((e) => e.cuando > ahora && e.tipo !== "entrega");
  const lineas = [
    sigEv && `<div class="ah-l" style="--c:${COLOR_TIPO[sigEv.tipo]}"><i></i><b>${esc(sigEv.texto)}</b><span>${hhmm(sigEv.cuando)}</span></div>`,
    ent[0] && `<div class="ah-l" style="--c:var(--rojo)"><i></i><b>${esc(ent[0].titulo)}</b><span>${esc(A.etiquetaCuando(new Date(ent[0].start), ahora))}</span></div>`,
  ].filter(Boolean).join("") || `<div class="ah-nada">Nada más en el calendario hoy</div>`;
  const anillo = (frac, color, n, total, nombre, accion) => `<button class="anillo" ${accion}><span class="a-aro">${aro(frac, 58, 7, color)}<b>${n}<small>/${total}</small></b></span><span class="a-nom">${nombre}</span></button>`;
  // sin elegir: Cuidado cuando toca la rutina (7-10 h y desde las 21 h) si queda algo; si no, Hábitos
  const horaCui = ahora.getHours() >= 7 && ahora.getHours() < 10 || ahora.getHours() >= 21;
  const seg = (hoySeg || (horaCui && hechosCui < pasosCui.length ? "cuidado" : "habitos")) === "cuidado" && pasosCui.length ? "cuidado" : "habitos";
  return nav("Hoy", "", btnNav("tab:ajustes", ico("ajustes"), " redondo")) +
    `<div class="cab"><div class="fecha">${esc(fecha)}</div><h1>Hoy</h1></div>
    <button class="ahora${sol.noche ? "" : " dia"}" data-a="tab" data-id="calendario">
      <div class="ah-cab"><span class="et">${ico(sol.noche ? "luna" : "hoy")}Ahora</span><span class="ah-hora">${prox ? hhmm(prox.cuando) : ""}</span></div>
      <div class="ah-rezo">${prox ? esc(R.NOMBRES[prox.id]) : "—"} <span data-cuenta="${prox ? prox.cuando.getTime() : 0}" data-pre="en "></span></div>
      <div class="ah-lineas">${lineas}</div></button>
    <div class="anillos">
      ${anillo(rez.size / 5, "var(--verde)", rez.size, 5, "Rezos", "")}
      ${anillo(nHab / habitos.length, "var(--naranja)", nHab, habitos.length, "Hábitos", 'data-a="hoy-seg" data-id="habitos"')}
      ${pasosCui.length ? anillo(hechosCui / pasosCui.length, "var(--rosa)", hechosCui, pasosCui.length, "Cuidado", 'data-a="hoy-seg" data-id="cuidado"') : ""}
      <div class="racha">${ico("llama")}<b>${racha}</b><span>${racha === 1 ? "día" : "días"} de racha</span></div>
    </div>
    ${t.corre ? `<button class="foco-chip" data-a="tab" data-id="foco">${ico("foco", 1)}<span>Foco en marcha</span><b id="mini-timer">${mmss(S.restante(t))}</b></button>` : ""}
    <h2>Oraciones</h2>
    <div class="rezos">${R.REZOS.map((id) => `<button class="rezo${rez.has(id) ? " hecha" : ""}${sigRezo && sigRezo.id === id && !rez.has(id) ? " sig" : ""}" data-a="rezo" data-id="${id}" aria-pressed="${rez.has(id)}">
      <span class="n">${R.NOMBRES[id]}</span><span class="h">${h[id] ? hhmm(h[id]) : "--:--"}</span>${CHK}</button>`).join("")}</div>
    ${bloqueTareasHoy(ahora)}
    <div class="segm segm-hoy" role="tablist"><button class="${seg === "habitos" ? "act" : ""}" data-a="hoy-seg" data-id="habitos" role="tab" aria-selected="${seg === "habitos"}">Hábitos · ${nHab}/${habitos.length}</button>
      ${pasosCui.length ? `<button class="${seg === "cuidado" ? "act" : ""}" data-a="hoy-seg" data-id="cuidado" role="tab" aria-selected="${seg === "cuidado"}">Cuidado · ${hechosCui}/${pasosCui.length}</button>` : ""}</div>
    ${seg === "habitos"
      ? `<div class="grupo">${habitos.map(([id, txt]) => `<button class="fila chkf${chk.has(id) ? " hecha" : ""}" data-a="check" data-id="${id}" role="checkbox" aria-checked="${chk.has(id)}">
      ${CHK}<span class="tx">${esc(txt)}</span></button>`).join("")}</div>`
      : bloqueCuidado(ahora)}`;
}
let hoySeg = null;                                       // "habitos" | "cuidado" (null = según la hora)

/** «Tareas de hoy» en Hoy: atrasadas y de hoy, lo más urgente primero. */
function bloqueTareasHoy(ahora) {
  const lista = T.ordenar(E.tareas, ahora).filter((t) => ["atrasada", "hoy"].includes(T.grupo(t, ahora)));
  const cab = `<h2 class="h2-acc">Tareas${lista.length ? `<span class="h2-val">${lista.length} para hoy</span>` : ""}<button class="btn-txt" data-a="tab" data-id="tareas">Ver todas</button></h2>`;
  if (!lista.length) return cab + `<div class="grupo"><button class="fila accion" data-a="tarea-nueva"><span class="tx">Nada pendiente hoy · Añadir tarea</span>${ico("mas", 0, "chev")}</button></div>`;
  return cab + `<div class="grupo">${lista.slice(0, 3).map((t) => filaTarea(t, ahora)).join("")}
    ${lista.length > 3 ? `<button class="fila accion" data-a="tab" data-id="tareas"><span class="tx">${lista.length - 3} más</span>${ico("chevron", 0, "chev")}</button>` : ""}</div>`;
}

// ---------- Cuidado (rutina de mañana y de noche) ----------
let cuiMomento = null;                                  // null = según la hora
function bloqueCuidado(ahora) {
  const { rutina } = Y.cuidado(), m = cuiMomento || K.momentoActual(ahora), hoy = S.iso(ahora);
  const hechos = (E.cuidado[hoy] || []), pasos = rutina[m];
  if (!pasos.length) return "";
  const otro = m === "manana" ? "noche" : "manana";
  return `<div class="grupo"><div class="fila cui-cab"><span class="tx">Rutina de ${K.TITULOS[m].toLowerCase()}</span><button class="btn-txt" data-a="cui-momento" data-id="${otro}">Ver ${K.TITULOS[otro].toLowerCase()}</button></div>${pasos.map(([id, txt, , color]) => `<button class="fila chkf cui${hechos.includes(id) ? " hecha" : ""}" data-a="cui" data-id="${id}" role="checkbox" aria-checked="${hechos.includes(id)}" style="--cui:${K.COLORES[color] || "var(--acento)"}">
      ${CHK}<span class="tx">${esc(txt)}</span><i class="cui-pt"></i></button>`).join("")}</div>`;
}

// ---------- Calendario ----------
function filaEvento(e, ahora) {
  const editable = e.tipo !== "entrega";
  const rep = e.tipo === "rep" ? C.textoRepetir((E.agenda.find((r) => r.id === e.id) || {}).dias) : "";
  const detalle = e.tipo === "entrega" ? `${ico("libro")}Entrega de Moodle` : rep ? `${ico("repetir")}${esc(rep)}`
    : e.cuando < ahora ? "Ya pasó" : `en ${cuenta(e.cuando - ahora)}`;
  return `<${editable ? `button data-a="ev-editar" data-id="${e.id}"` : "div"} class="fila ev-fila c-${e.tipo}">
    <span class="hora">${hhmm(e.cuando)}</span><span class="barra"></span>
    <span class="tx">${esc(e.texto)}<small>${detalle}</small></span>${editable ? ico("chevron", 0, "chev") : ""}</${editable ? "button" : "div"}>`;
}

function vistaCalendario() {
  const ahora = new Date(), hoyIso = A.isoDe(ahora), ent = Y.entregas();
  const sem = C.semanasMes(cal.anio, cal.mes), marcas = C.marcasMes(E.agenda, ent, sem);
  const selD = C.aFecha(cal.sel), evs = C.eventosDia(E.agenda, ent, selD), h = R.horariosDe(selD, cfg());
  const der = btnNav("cal-modo", ico(cal.modo === "mes" ? "lista" : "calendario")) + btnNav("ev-nuevo", ico("mas"));
  const izq = cal.sel !== hoyIso || cal.mes !== ahora.getMonth() || cal.anio !== ahora.getFullYear() ? btnNav("cal-hoy", "Hoy") : "";
  const cab = `<div class="cal-cab"><h1>${C.MESES[cal.mes]} <span>${cal.anio}</span></h1>
      <div class="cal-flechas">${btnNav("cal-mes:-1", ico("izq"))}${btnNav("cal-mes:1", ico("der"))}</div></div>`;
  const rapido = `<form class="buscador" data-form="rapido">${ico("destello")}<input type="text" name="texto" placeholder="Añadir rápido: dentista viernes 17:30" autocomplete="off" enterkeyhint="done" maxlength="200"></form>`;

  if (cal.modo === "lista") {
    const grupos = C.proximosPorDia(E.agenda, ent, ahora, 90);
    return nav("Próximos", izq, der) + `<div class="cab"><h1>Próximos</h1></div>${rapido}` +
      (grupos.length ? grupos.map(([iso, lista]) => {
        const d = C.aFecha(iso), diff = Math.round((d - hoyD()) / 86400000);
        const nom = diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : may(d.toLocaleDateString("es-ES", { weekday: "long" }));
        return `<div class="lista-dia${diff === 0 ? " hoy" : ""}">${nom}<span>${d.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</span></div>
          <div class="grupo">${lista.map((e) => filaEvento(e, ahora)).join("")}</div>`;
      }).join("") : `<p class="vacio">No hay nada en los próximos 3 meses.<br>Toca + para crear un evento.</p>`);
  }

  const semanas = sem.map((s) => `<div class="cal-sem">${s.map((d) => {
    const iso = A.isoDe(d), m = marcas[iso];
    const cls = ["cal-d", d.getMonth() !== cal.mes && "fuera", iso === hoyIso && "hoy", iso === cal.sel && "sel", C.diaSemana(d) >= 5 && "finde"].filter(Boolean).join(" ");
    const pts = m ? ["rec", "rep", "entrega"].filter((k) => m.has(k)).map((k) => `<i style="--c:${COLOR_TIPO[k]}"></i>`).join("") : "";
    return `<button class="${cls}" data-a="cal-dia" data-id="${iso}" aria-label="${d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}${m ? ", con eventos" : ""}"><span class="num">${d.getDate()}</span><span class="pts">${pts}</span></button>`;
  }).join("")}</div>`).join("");
  const titDia = selD.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return nav(`${may(C.MESES[cal.mes])} ${cal.anio}`, izq, der) + cab + rapido +
    `<div class="cal-dias">${C.INICIALES.map((l) => `<span>${l}</span>`).join("")}</div>
    <div class="cal-mes" id="cal-mes">${semanas}</div>
    <div class="cal-dia-cab"><b>${esc(titDia)}</b><span>${evs.length ? `${evs.length} evento${evs.length === 1 ? "" : "s"}` : ""}</span></div>
    ${evs.length ? `<div class="grupo">${evs.map((e) => filaEvento(e, ahora)).join("")}</div>`
      : `<div class="grupo"><button class="fila accion" data-a="ev-nuevo"><span class="tx">Sin eventos · Añadir uno</span>${ico("mas", 0, "chev")}</button></div>`}
    <div class="grupo caja" style="margin-top:14px;padding:12px 10px"><div class="franja-rezos" style="margin:0">${R.SALAT.map(([id, n]) => `<div>${n}<b>${h[id] ? hhmm(h[id]) : "--:--"}</b></div>`).join("")}</div></div>
    <div class="leyenda"><span class="c-rec"><i></i>Recordatorio</span><span class="c-rep"><i></i>Se repite</span><span class="c-entrega"><i></i>Entrega</span></div>`;
}

// ---------- hoja «Nuevo evento» ----------
const hoja = { id: null };
function abrirHoja(id = null) {
  hoja.id = id; hoja.tipo = "evento"; hojaTurno++;
  const r = id != null ? E.agenda.find((x) => x.id === id) : null;
  const ahora = new Date();
  let fecha = cal.sel, hora;
  if (r) { const p = A.proximaOcurrencia(r, ahora); fecha = r.fecha || (p ? A.isoDe(p) : cal.sel); hora = r.hora; }
  else { const d = new Date(ahora.getTime() + 3600000); hora = `${String(d.getHours()).padStart(2, "0")}:00`; }
  const op = r ? C.opcionDeDias(r.dias) : "nunca", dias = new Set(r ? r.dias : []);
  const antes = r ? ((r.antes || [])[0] || 0) : A.ANTES_DEF;
  $("#hoja").innerHTML = `<div class="velo" data-a="hoja-cerrar"></div>
    <div class="panel" role="dialog" aria-modal="true" aria-label="${r ? "Editar evento" : "Nuevo evento"}">
      <div class="hoja-cab"><button type="button" class="btn-nav izq" data-a="hoja-cerrar">Cancelar</button><b>${r ? "Editar evento" : "Nuevo evento"}</b>
        <button type="submit" form="f-evento" class="btn-nav der">${r ? "Guardar" : "Añadir"}</button></div>
      <form id="f-evento" data-form="evento">
        <div class="grupo"><div class="fila con-campo"><input type="text" name="texto" placeholder="Título" value="${r ? esc(r.texto) : ""}" maxlength="120" autocomplete="off" enterkeyhint="done"></div></div>
        <div class="grupo" style="margin-top:22px">
          <label class="fila icono">${cuadro("calendario", "var(--rojo)")}<span class="tx">Fecha</span><input type="date" name="fecha" value="${fecha}" required></label>
          <label class="fila icono">${cuadro("reloj", "var(--azul)")}<span class="tx">Hora</span><input type="time" name="hora" value="${hora}" required></label>
          <label class="fila icono">${cuadro("repetir", "var(--gris)")}<span class="tx">Repetir</span>
            <select name="repetir" data-sel="repetir">${C.REPETIR.map(([v, n]) => `<option value="${v}"${v === op ? " selected" : ""}>${n}</option>`).join("")}</select></label>
          <div class="dias-elegir" ${op === "pers" ? "" : "hidden"}>${C.INICIALES.map((l, i) => `<button type="button" class="${dias.has(i) ? "act" : ""}" data-a="dia-tog" data-id="${i}" aria-label="${A.DIAS[i]}" aria-pressed="${dias.has(i)}">${l}</button>`).join("")}</div>
          <label class="fila icono">${cuadro("campana", "var(--naranja)")}<span class="tx">Aviso</span>
            <select name="antes">${A.ANTES.map(([v, n]) => `<option value="${v}"${v === antes ? " selected" : ""}>${n}</option>`).join("")}</select></label>
        </div>
        <p class="pie">Te aviso a esa hora${antes ? " y también antes" : ""} dentro de la app${E.ajustes.push ? " y con la app cerrada" : ""}. Se sincroniza con Chispa en el PC.</p>
        <p class="hoja-error" id="hoja-error"></p>
        ${r ? `<div class="grupo" style="margin-top:18px"><button type="button" class="fila peligro" data-a="ev-borrar" data-id="${r.id}" style="justify-content:center"><span class="tx" style="flex:none">Eliminar evento</span></button></div>` : ""}
      </form></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $("#hoja").classList.add("abierta")));
  if (!r) setTimeout(() => $("#f-evento [name=texto]")?.focus(), 380);
}
let hojaTurno = 0;                                     // una limpieza pendiente no puede vaciar una hoja abierta después
function cerrarHoja() {
  const h = $("#hoja");
  if (!h.classList.contains("abierta") && !h.innerHTML) return;
  h.classList.remove("abierta");
  document.activeElement?.blur?.();
  const turno = ++hojaTurno;
  setTimeout(() => { if (turno === hojaTurno && !h.classList.contains("abierta")) h.innerHTML = ""; }, 400);
}

// ---------- Tareas ----------
/** Fila de tarea: casilla (marca), texto con fecha / prioridad (abre la edición). */
function filaTarea(t, ahora) {
  const g = t.hecha ? "" : T.grupo(t, ahora), et = t.hecha ? "" : T.etiqueta(t, ahora);
  const prio = t.prio ? `<b class="prio p${t.prio}">${"!".repeat(t.prio)}</b>` : "";
  return `<div class="fila chkf tarea${t.hecha ? " hecha" : ""}">
    <button class="chk-btn" data-a="tarea" data-id="${t.id}" role="checkbox" aria-checked="${!!t.hecha}" aria-label="${t.hecha ? "Desmarcar" : "Completar"}: ${esc(t.texto)}">${CHK}</button>
    <button class="tx tx-btn" data-a="tarea-editar" data-id="${t.id}">${prio}${esc(t.texto)}${et ? `<small class="g-${g}">${t.repetir ? ico("repetir") : ""}${esc(et)}</small>` : ""}</button></div>`;
}

function vistaTareas() {
  const ahora = new Date(), grupos = T.agrupar(E.tareas, ahora);
  const pend = E.tareas.filter((t) => !t.hecha), hechas = E.tareas.filter((t) => t.hecha);
  const atr = pend.filter((t) => T.grupo(t, ahora) === "atrasada").length;
  const sub = pend.length ? `${pend.length} pendiente${pend.length === 1 ? "" : "s"}${atr ? ` · <span style="color:var(--rojo)">${atr} atrasada${atr === 1 ? "" : "s"}</span>` : ""}` : "Todo hecho";
  return nav("Tareas", "", btnNav("tarea-nueva", ico("mas"))) + `<div class="cab"><h1>Tareas</h1><p class="sub">${sub}</p></div>
    <form class="buscador" data-form="tarea">${ico("mas")}<input type="text" name="texto" placeholder="Nueva: entregar informe viernes !!" autocomplete="off" enterkeyhint="done" maxlength="200"></form>
    ${grupos.map(([g, n, lista]) => `<h2 class="g-${g}">${n}<span class="h2-val">${lista.length}</span></h2><div class="grupo">${lista.map((t) => filaTarea(t, ahora)).join("")}</div>`).join("")}
    ${!pend.length ? `<p class="vacio">No tienes tareas pendientes.<br>Escribe una arriba: «llamar al banco mañana», «gimnasio cada día», «informe viernes !!».</p>` : ""}
    <p class="pie">Pon <b>!</b> o <b>!!</b> para la prioridad, y una fecha («hoy», «mañana», «viernes», «12/11») o «cada día / cada semana / entre semana». A las ${T.HORAS_AVISO.join(" y a las ")} te recuerdo lo que queda para hoy.</p>
    ${hechas.length ? `<h2>Completadas</h2><div class="grupo">${hechas.slice(-8).reverse().map((t) => filaTarea(t, ahora)).join("")}</div>` : ""}`;
}

// ---------- hoja «Tarea» (editar o crear con todos los campos) ----------
function abrirHojaTarea(id = null) {
  hoja.id = id; hoja.tipo = "tarea"; hojaTurno++;
  const t = id != null ? E.tareas.find((x) => x.id === id) : null;
  $("#hoja").innerHTML = `<div class="velo" data-a="hoja-cerrar"></div>
    <div class="panel" role="dialog" aria-modal="true" aria-label="${t ? "Editar tarea" : "Nueva tarea"}">
      <div class="hoja-cab"><button type="button" class="btn-nav izq" data-a="hoja-cerrar">Cancelar</button><b>${t ? "Tarea" : "Nueva tarea"}</b>
        <button type="submit" form="f-tarea" class="btn-nav der">${t ? "Guardar" : "Añadir"}</button></div>
      <form id="f-tarea" data-form="tarea-hoja">
        <div class="grupo"><div class="fila con-campo"><input type="text" name="texto" placeholder="Qué hay que hacer" value="${t ? esc(t.texto) : ""}" maxlength="200" autocomplete="off" enterkeyhint="done"></div></div>
        <div class="grupo" style="margin-top:22px">
          <label class="fila icono">${cuadro("calendario", "var(--rojo)")}<span class="tx">Fecha</span><input type="date" name="fecha" value="${t && t.fecha ? t.fecha : ""}"></label>
          <label class="fila icono">${cuadro("destello", "var(--naranja)")}<span class="tx">Prioridad</span>
            <select name="prio">${[[0, "Normal"], [1, "Alta  !"], [2, "Urgente  !!"]].map(([v, n]) => `<option value="${v}"${t && (t.prio || 0) === v ? " selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="fila icono">${cuadro("repetir", "var(--gris)")}<span class="tx">Repetir</span>
            <select name="repetir"><option value="">Nunca</option>${T.REPETIR.map(([v, n]) => `<option value="${v}"${t && t.repetir === v ? " selected" : ""}>${n}</option>`).join("")}</select></label>
        </div>
        <p class="pie">Sin fecha va a «Sin fecha». Si se repite y no tiene fecha, empieza hoy. Se sincroniza con Chispa en el PC.</p>
        <p class="hoja-error" id="hoja-error"></p>
        ${t ? `<div class="grupo" style="margin-top:18px"><button type="button" class="fila peligro" data-a="tarea-borrar" data-id="${t.id}" style="justify-content:center"><span class="tx" style="flex:none">Eliminar tarea</span></button></div>` : ""}
      </form></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $("#hoja").classList.add("abierta")));
  if (!t) setTimeout(() => $("#f-tarea [name=texto]")?.focus(), 380);
}

// ---------- Fe ----------
function vistaFe() {
  const ahora = new Date(), h = R.horariosDe(ahora, cfg()), prox = R.proximo(ahora, cfg());
  const sol = R.posicionSol(ahora, cfg()), t = S.tasbih(E), q = R.qibla(E.ajustes.lat, E.ajustes.lon);
  return nav("Fe") + `<div class="cab"><h1>Fe</h1><p class="sub">${E.ajustes.gps ? "Ubicación del iPhone" : "Ubicación manual"}</p></div>
    ${prox ? `<div class="ahora fe-prox${sol.noche ? "" : " dia"}"><div class="ah-cab"><span class="et">${ico(sol.noche ? "luna" : "hoy")}Siguiente</span><span class="ah-hora">${hhmm(prox.cuando)}</span></div>
      <div class="ah-rezo">${esc(R.NOMBRES[prox.id])} <span data-cuenta="${prox.cuando.getTime()}" data-pre="en "></span></div></div>` : ""}
    <h2>Horarios de hoy</h2><div class="grupo horario">${R.SALAT.map(([id, n]) => `<div class="fila${prox && prox.id === id ? " sig" : h[id] && h[id] < ahora ? " pasado" : ""}"><span class="tx">${n}</span><span class="val">${h[id] ? hhmm(h[id]) : "--:--"}</span></div>`).join("")}</div>
    <div class="grupo" style="margin-top:14px"><button class="fila icono" data-a="qibla">${cuadro("ubicacion", "var(--verde)")}<span class="tx">Brújula Qibla<small>${Math.round(q.rumbo)}° ${R.puntoCardinal(q.rumbo)} · sol y luna</small></span>${ico("chevron", 0, "chev")}</button></div>
    <h2>Tasbih</h2><div class="grupo tasbih"><button class="aro" data-a="tasbih" aria-label="Sumar una repetición">${aro(t.ciclo / t.meta, 150, 10, "var(--naranja)", "tas-aro")}<div class="n"><div><span id="tas-n">${t.ciclo}</span><small>de ${t.meta}</small></div></div></button>
      <div><div class="sub" style="font-size:13px">Hoy</div><div class="total" id="tas-total">${t.total}</div>
        <div class="fila-btn" style="margin-top:10px"><button class="btn peq" data-a="tasbih-meta">Meta ${t.meta}</button><button class="btn peq" data-a="tasbih-reset">Reiniciar</button></div></div></div>`;
}

// ---------- hoja «Brújula Qibla» (con el arco del sol) ----------
function abrirHojaQibla() {
  hoja.id = null; hoja.tipo = "qibla"; hojaTurno++;
  const ahora = new Date(), sol = R.posicionSol(ahora, cfg()), q = R.qibla(E.ajustes.lat, E.ajustes.lon);
  const km = Math.round(q.km).toLocaleString("es-ES");
  const sol1 = sol.desde ? `${sol.noche ? "Maghrib" : "Shuruq"} ${hhmm(sol.desde)}` : "", sol2 = sol.hasta ? `${sol.noche ? "Shuruq" : "Maghrib"} ${hhmm(sol.hasta)}` : "";
  $("#hoja").innerHTML = `<div class="velo" data-a="hoja-cerrar"></div>
    <div class="panel" role="dialog" aria-modal="true" aria-label="Brújula Qibla">
      <div class="hoja-cab"><span></span><b>Qibla</b><button type="button" class="btn-nav der" data-a="hoja-cerrar">Listo</button></div>
      <div class="grupo brujula">${brujulaSvg(q.rumbo)}
        <div class="estado-bru" id="bru-estado">${Math.round(q.rumbo)}° ${R.puntoCardinal(q.rumbo)} · ${km} km</div>
        <button class="btn peq" data-a="brujula">${orient.activa ? "Brújula activada" : "Activar la brújula"}</button></div>
      <h2>${sol.noche ? "Luna" : "Sol"}</h2>
      <div class="grupo caja">${arcoSol(sol.frac, sol.noche)}<div class="sol-pie"><span>${sol1}</span><span data-cuenta="${sol.hasta ? sol.hasta.getTime() : 0}" data-pre="${sol.noche ? "Shuruq" : "Maghrib"} en "></span><span>${sol2}</span></div></div>
      <p class="pie">Pon el iPhone en horizontal y gíralo hasta que la flecha apunte arriba.</p></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $("#hoja").classList.add("abierta")));
  pintarBrujula();
}

// ---------- Foco ----------
const TIMER = { size: 290, stroke: 12 };
function vistaFoco() {
  const t = E.timer, hoy = S.iso(), total = S.POMO[t.modo], rest = S.restante(t);
  let semana = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); semana += E.foco[S.iso(d)] || 0; }
  const fin = t.corre ? new Date(t.fin) : null;
  return nav("Foco") + `<div class="cab"><h1>Foco</h1></div>
    <div class="timer">${aro(1 - rest / total, TIMER.size, TIMER.stroke, t.modo === "foco" ? "var(--naranja)" : "var(--verde)", "timer-aro")}<div class="txt"><div><b id="timer-txt">${mmss(rest)}</b><span>${t.modo === "foco" ? "Foco · 90 min" : "Descanso · 20 min"}</span>
      ${fin ? `<span style="margin-top:2px">Termina a las ${hhmm(fin)}</span>` : ""}</div></div></div>
    <div class="relojes"><button class="redondo-g gris" data-a="timer-reset">Reiniciar</button>
      <button class="redondo-g ${t.corre ? "naranja" : "verde"}" data-a="timer-toggle">${t.corre ? "Pausa" : rest < total ? "Seguir" : "Iniciar"}</button></div>
    <h2>Tiempo de foco</h2><div class="grupo"><div class="fila"><span class="tx">Hoy</span><span class="val">${durTxt(E.foco[hoy] || 0)}</span></div>
      <div class="fila"><span class="tx">Últimos 7 días</span><span class="val">${durTxt(semana)}</span></div></div>
    <p class="pie">Bloques de 90 min de foco y 20 de descanso. El tiempo se calcula por la hora de fin, así que sigue contando aunque bloquees la pantalla.</p>`;
}

// ---------- Ajustes ----------
function vistaAjustes() {
  const a = E.ajustes, hace = a.gps_ts ? cuenta(Date.now() - a.gps_ts) : "";
  const metodo = `${a.fajr}/${a.isha}`, notif = typeof Notification !== "undefined" && Notification.permission === "granted";
  let sync;
  const nube = (val, extra = "") => `<div class="fila icono">${cuadro("nube", "var(--azul)")}<span class="tx">Sincronización${extra}</span>${val ? `<span class="val">${val}</span>` : ""}</div>`;
  const hueco = `<span class="cuadro"></span>`;
  if (!Y.configurado()) sync = `<div class="grupo">${nube("", "<small>Falta config.js (mira GUIA-FINAL.md)</small>")}</div>`;
  else if (!Y.conectado()) sync = `<div class="grupo">${nube("Sin conectar")}</div>
    <form data-form="login"><div class="grupo" style="margin-top:12px"><div class="fila con-campo"><span class="etq">Correo</span><input type="email" name="email" autocomplete="username" placeholder="tu@correo.com" required></div>
      <div class="fila con-campo"><span class="etq">Contraseña</span><input type="password" name="clave" autocomplete="current-password" placeholder="Obligatoria" required></div>
      <button class="fila accion" type="submit"><span class="tx">Conectar con Chispa del PC</span></button></div></form>`;
  else sync = `<div class="grupo">${nube("Conectada")}
      <div class="fila icono">${hueco}<span class="tx">Última vez</span><span class="val">${Y.estado.ultimo ? `hace ${cuenta(Date.now() - Y.estado.ultimo)}` : "pendiente"}</span></div>
      <button class="fila icono accion" data-a="sync-ahora">${hueco}<span class="tx">Sincronizar ahora</span></button>
      <button class="fila icono peligro" data-a="sync-salir">${hueco}<span class="tx">Desconectar</span></button></div>`;
  return nav("Ajustes", btnNav("tab:hoy", `${ico("izq")}Hoy`)) + `<div class="cab"><h1>Ajustes</h1></div>
    <h2>Ubicación</h2><div class="grupo">
      <button class="fila icono" data-a="gps">${cuadro("ubicacion", "var(--azul)")}<span class="tx">Usar la ubicación del iPhone</span><span class="val">${a.gps ? "Activada" : "Manual"}</span>${ico("chevron", 0, "chev")}</button>
    </div><p class="pie">${a.gps ? `Del GPS${hace ? `, hace ${hace}` : ""}.` : "Introducida a mano."} Lat ${a.lat}, lon ${a.lon}.</p>
    <form data-form="ubic"><div class="grupo" style="margin-top:12px"><div class="fila con-campo"><span class="etq">Latitud</span><input type="number" name="lat" step="any" value="${a.lat}" inputmode="decimal"></div>
      <div class="fila con-campo"><span class="etq">Longitud</span><input type="number" name="lon" step="any" value="${a.lon}" inputmode="decimal"></div>
      <button class="fila accion" type="submit"><span class="tx">Guardar ubicación manual</span></button></div></form>
    <h2>Oraciones</h2><div class="grupo">
      <label class="fila icono">${cuadro("luna", "var(--indigo)")}<span class="tx">Método</span><select data-sel="metodo">
        ${[["18/17", "Liga Mundial"], ["15/15", "ISNA"], ["12/12", "UOIF"]].map(([v, n]) => `<option value="${v}"${v === metodo ? " selected" : ""}>${n} (${v.replace("/", "° / ")}°)</option>`).join("")}</select>${ico("chevron", 0, "chev")}</label>
      <label class="fila icono">${cuadro("hoy", "var(--naranja)")}<span class="tx">Asr</span><select data-sel="asr"><option value="standard"${a.asr === "standard" ? " selected" : ""}>Estándar</option><option value="hanafi"${a.asr === "hanafi" ? " selected" : ""}>Hanafí</option></select>${ico("chevron", 0, "chev")}</label></div>
    <h2>Avisos</h2><div class="grupo">
      <button class="fila icono" data-a="avisos-permiso">${cuadro("campana", "var(--rojo)")}<span class="tx">Avisos del sistema</span><span class="val">${notif ? "Permitidos" : "Permitir"}</span>${ico("chevron", 0, "chev")}</button>
      ${Y.conectado() && Y.pushDisponible() ? `<button class="fila icono" data-a="push-activar">${cuadro("campana", "var(--naranja)")}<span class="tx">Con la app cerrada</span><span class="val">${a.push ? "Activados" : "Activar"}</span>${ico("chevron", 0, "chev")}</button>` : ""}
    </div><p class="pie">${a.push ? "Te llegan las oraciones y recordatorios de los próximos 14 días aunque la app esté cerrada." : "Dentro de la app los recordatorios suenan siempre; si estaba cerrada, al abrirla ves lo de las últimas 24 h. Para avisos con la app cerrada hace falta tenerla en la pantalla de inicio y la sincronización conectada."}</p>
    <h2>Chispa en el PC</h2>${sync}${Y.estado.error ? `<p class="pie" style="color:var(--rojo)">${esc(Y.estado.error)}</p>` : ""}
    <h2>Instalar</h2><div class="grupo"><div class="fila icono">${cuadro("compartir", "var(--azul)")}<span class="tx">Añadir a pantalla de inicio<small>Safari → Compartir → Añadir a pantalla de inicio</small></span></div></div>
    <h2>Datos</h2><div class="grupo"><button class="fila icono peligro" data-a="borrar">${cuadro("papelera", "var(--rojo)")}<span class="tx">Borrar los datos de este teléfono</span></button></div>
    <p class="pie" style="text-align:center;margin-top:24px">Chispa · ${Y.conectado() ? "sincronizada con el PC" : "datos en este teléfono"}</p>`;
}

const VISTAS = { hoy: vistaHoy, calendario: vistaCalendario, tareas: vistaTareas, fe: vistaFe, foco: vistaFoco, ajustes: vistaAjustes };

function pintarAlertas() {
  const c = $("#alertas");
  if (!c) return;
  const botones = (a) => a.tipo === "tareas" || a.tipo === "cuidado"
    ? `<button class="btn" data-a="alerta-ver" data-id="${a.id}">${a.tipo === "tareas" ? "Ver tareas" : "Ver rutina"}</button><button class="btn pri" data-a="alerta-ok" data-id="${a.id}">OK</button>`
    : `<button class="btn" data-a="alerta-mas" data-id="${a.id}">+10 min</button><button class="btn" data-a="alerta-1h" data-id="${a.id}">+1 h</button>` +
      `<button class="btn" data-a="alerta-manana" data-id="${a.id}">Mañana</button><button class="btn pri" data-a="alerta-ok" data-id="${a.id}">Hecho</button>`;
  c.innerHTML = E.alertas.slice(0, 3).map((a) => `<div class="alerta" role="alert"><div class="cab-a"><img src="icons/icon-192.png" alt=""><span>Chispa</span>${esc(A.etiquetaCuando(new Date(a.cuando), new Date()))}</div>
    <div class="tx"><b>${esc(a.titulo || "Recordatorio")}</b>${esc(a.texto)}</div>
    <div class="acc">${botones(a)}</div></div>`).join("") +
    (E.alertas.length > 3 ? `<p class="sub" style="text-align:center;margin-bottom:8px">+${E.alertas.length - 3} más</p>` : "");
}

/** Repinta. Las llamadas automáticas (reloj, nube) pasan `forzar=false` y esperan si estás escribiendo en un campo. */
let pendiente = false;
function render(forzar = true) {
  const act = document.activeElement;
  if (!forzar && act && act.matches("input, select") && (act.closest("#vista") || act.closest("#hoja"))) { pendiente = true; return; }
  pendiente = false;
  pintarAlertas();
  $("#vista").innerHTML = VISTAS[tab]();
  const actual = tab === "ajustes" ? "hoy" : tab;
  $("#tabs").innerHTML = TABS.map(([id, n]) => `<button class="${id === actual ? "act" : ""}" data-a="tab" data-id="${id}" aria-label="${n}"${id === actual ? ' aria-current="page"' : ""}>${ico(id, id === actual ? 1 : 0)}${n}</button>`).join("");
  alScroll();
  tick();
  if (tab === "fe") pintarBrujula();
}
document.addEventListener("focusout", () => setTimeout(() => { if (pendiente) render(false); }, 50));

function alScroll() { $("#app").classList.toggle("encogido", window.scrollY > 38); }
window.addEventListener("scroll", alScroll, { passive: true });

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
  for (const b of $$("[data-a=brujula]")) b.textContent = "Brújula activada";
  pintarBrujula();
}

// ---------- ubicación ----------
function usarGPS(silencioso = false) {
  if (!navigator.geolocation) return silencioso || aviso("Este navegador no tiene geolocalización");
  if (!silencioso) aviso("Buscando tu ubicación…");
  navigator.geolocation.getCurrentPosition((pos) => {
    Object.assign(E.ajustes, { lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4), gps: true, gps_ts: Date.now() });
    guardar(); render(false); if (!silencioso) aviso("Ubicación actualizada");
  }, (err) => {
    if (silencioso) return;
    aviso(err.code === 1 ? "Permiso de ubicación denegado (Ajustes → Safari → Ubicación)" : "No se pudo obtener la ubicación");
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
}

// ---------- reloj ----------
let ultimoGuardado = 0;
/** Aviso de tareas (11:00 y 18:00) y de la rutina de cuidado, con la app abierta. Devuelve cuántos avisos nuevos. */
function avisosDelDia(ms) {
  const ahora = new Date(ms), dia = S.iso(ahora);
  let n = 0;
  const marcar = (k) => { E.avisos_ya.push(k); E.avisos_ya = E.avisos_ya.slice(-60); };
  const t = T.aviso(E.tareas, ahora, E.avisos_ya);
  if (t) { marcar(t[0]); if (S.añadirAlerta(E, { titulo: t[1], texto: t[2], cuando: ms, k: "t|" + t[0], tipo: "tareas" })) n++; }
  else for (const h of T.HORAS_AVISO) { const k = `${dia}|${h}`; if (!E.avisos_ya.includes(k) && hhmm(ahora) === h) marcar(k); }  // nada pendiente: no avisa
  const cui = Y.cuidado(), hechos = E.cuidado[dia] || [];
  const c = K.aviso(ahora, cui.rutina, hechos, cui.horas, E.avisos_ya, dia);
  if (c) {
    const [m, num] = c, k = `${dia}|cuidado|${m}|${num}`;
    marcar(k);
    if (S.añadirAlerta(E, { titulo: `Rutina de ${K.TITULOS[m].toLowerCase()}${num > 1 ? " · aún pendiente" : ""}`, texto: K.textoAviso(cui.rutina, hechos, m), cuando: ms, k, tipo: "cuidado", momento: m })) n++;
  }
  return n;
}

function revisarAvisos(ahora) {
  const nuevos = S.procesarAvisos(E, ahora) + avisosDelDia(ahora);
  if (nuevos) {
    guardar(); ultimoGuardado = ahora; pintarAlertas();
    const a = E.alertas[E.alertas.length - 1];
    navigator.vibrate?.([120, 80, 120]);
    aviso(`${a.titulo || "Recordatorio"}: ${a.texto}`);
    if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
      navigator.serviceWorker?.ready.then((r) => r.showNotification(a.titulo || "Chispa · Recordatorio", { body: a.texto, tag: "chispa-" + a.id })).catch(() => {});
    }
    if (tab === "hoy" || tab === "tareas" || tab === "calendario") render(false);
  } else if (ahora - ultimoGuardado > 30000) { guardar(); ultimoGuardado = ahora; }
}

function tick() {
  const ahora = Date.now();
  revisarAvisos(ahora);
  const fin = S.comprobarFinTimer(E, ahora);
  if (fin) {
    guardar(); aviso(fin === "foco" ? "Bloque de foco terminado: descansa 20 min" : "Descanso terminado: vuelve al foco");
    navigator.vibrate?.([200, 100, 200]); render(false); return;
  }
  for (const el of $$("[data-cuenta]")) {
    const t = Number(el.dataset.cuenta);
    if (!t) continue;
    if (t - ahora <= 0 && (tab === "hoy" || tab === "fe")) { render(false); return; }   // pasó la hora: recalcula el siguiente
    el.textContent = (el.dataset.pre || "") + cuenta(t - ahora);
  }
  const rest = S.restante(E.timer, ahora), total = S.POMO[E.timer.modo];
  const txt = $("#timer-txt"), ar = $("#timer-aro");
  if (txt) txt.textContent = mmss(rest);
  if (ar) ar.setAttribute("stroke-dashoffset", Number(ar.getAttribute("stroke-dasharray")) * (rest / total));
  const mini = $("#mini-timer");
  if (mini) mini.textContent = mmss(rest);
}

// ---------- acciones ----------
function irAMes(delta) {
  const d = new Date(cal.anio, cal.mes + delta, 1);
  cal.anio = d.getFullYear(); cal.mes = d.getMonth();
  const sel = C.aFecha(cal.sel);
  if (sel.getMonth() !== cal.mes || sel.getFullYear() !== cal.anio) {             // conserva el día si existe en el mes nuevo
    const ult = new Date(cal.anio, cal.mes + 1, 0).getDate();
    cal.sel = A.isoDe(new Date(cal.anio, cal.mes, Math.min(sel.getDate(), ult)));
  }
}

function accion(a, id, el) {
  switch (a) {
    case "tab": cerrarHoja(); tab = id; window.scrollTo(0, 0); render(); return;
    case "rezo": S.alternarRezo(E, id); navigator.vibrate?.(8); break;
    case "check": S.alternarCheck(E, id); navigator.vibrate?.(8); break;
    case "tarea": {
      const res = S.alternarTarea(E, Number(id)); navigator.vibrate?.(8);
      if (res === "repetida") { const t = E.tareas.find((x) => x.id === Number(id)); aviso(`Hecha. Siguiente: ${T.etiqueta(t, new Date()).split(" · ")[0]}`); }
      break;
    }
    case "tarea-borrar": S.borrarTarea(E, Number(id)); if ($("#hoja").classList.contains("abierta")) { cerrarHoja(); aviso("Tarea eliminada"); } break;
    case "tarea-editar": abrirHojaTarea(Number(id)); return;
    case "tarea-nueva": abrirHojaTarea(null); return;
    case "cui": K.alternar(E, id, S.iso()); navigator.vibrate?.(8); break;
    case "cui-momento": cuiMomento = id; render(); return;
    case "hoy-seg": hoySeg = id; render(); return;
    case "qibla": abrirHojaQibla(); return;
    case "cal-dia": {
      const d = C.aFecha(id);
      cal.sel = id;
      if (d.getMonth() !== cal.mes || d.getFullYear() !== cal.anio) { cal.anio = d.getFullYear(); cal.mes = d.getMonth(); }
      render(); return;
    }
    case "cal-mes": irAMes(Number(id)); render(); return;
    case "cal-hoy": { const d = new Date(); cal.sel = A.isoDe(d); cal.anio = d.getFullYear(); cal.mes = d.getMonth(); render(); return; }
    case "cal-modo": cal.modo = cal.modo === "mes" ? "lista" : "mes"; window.scrollTo(0, 0); render(); return;
    case "ev-nuevo": abrirHoja(null); return;
    case "ev-editar": abrirHoja(Number(id)); return;
    case "hoja-cerrar": cerrarHoja(); return;
    case "dia-tog": el.classList.toggle("act"); el.setAttribute("aria-pressed", el.classList.contains("act")); return;
    case "ev-borrar":
      if (!confirm("¿Eliminar este evento?")) return;
      S.borrarRecordatorio(E, Number(id)); cerrarHoja(); aviso("Evento eliminado"); break;
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
    case "alerta-ok": S.descartarAviso(E, Number(id)); break;
    case "alerta-mas": S.posponerAviso(E, Number(id), 10); aviso("Te lo recuerdo en 10 min"); break;
    case "alerta-1h": S.posponerAviso(E, Number(id), 60); aviso("Te lo recuerdo en 1 hora"); break;
    case "alerta-manana": S.posponerAviso(E, Number(id), S.minHastaMañana()); aviso("Te lo recuerdo mañana a las 09:00"); break;
    case "alerta-ver": {
      const a = E.alertas.find((x) => x.id === Number(id));
      S.descartarAviso(E, Number(id));
      if (a && a.tipo === "cuidado") { cuiMomento = a.momento || null; hoySeg = "cuidado"; tab = "hoy"; } else tab = "tareas";
      window.scrollTo(0, 0); break;
    }
    case "avisos-permiso":
      if (typeof Notification === "undefined") return aviso("Este navegador no admite avisos del sistema");
      Notification.requestPermission().then((p) => { aviso(p === "granted" ? "Avisos del sistema permitidos" : "Avisos no permitidos"); render(); });
      return;
    case "sync-ahora": aviso("Sincronizando…"); sincronizarYa(true); return;
    case "sync-salir": Y.salir(); aviso("Desconectada de la nube"); break;
    case "push-activar":
      Y.activarPush(E).then(() => { guardar(); render(); aviso("Avisos con la app cerrada activados"); }).catch((e) => aviso(e.message));
      return;
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
  if (el) accion(el.dataset.a, el.dataset.id, el);
});
document.addEventListener("submit", (ev) => {
  const f = ev.target.closest("[data-form]");
  if (!f) return;
  ev.preventDefault();
  const tipo = f.dataset.form;
  if (tipo === "tarea") {
    const t = S.añadirTarea(E, f.elements.texto.value);
    if (t) {
      guardar(); render(); $("[data-form=tarea] [name=texto]")?.focus();
      const et = T.etiqueta(t, new Date());
      aviso(et ? `Tarea añadida · ${et}` : "Tarea añadida");
    }
  } else if (tipo === "tarea-hoja") {
    const texto = f.elements.texto.value.trim();
    if (!texto) { $("#hoja-error").textContent = "Escribe qué hay que hacer"; navigator.vibrate?.([30, 40, 30]); return; }
    const repetir = f.elements.repetir.value || null;
    let fecha = f.elements.fecha.value || null;
    if (repetir && !fecha) fecha = S.iso();
    const campos = { fecha, prio: Number(f.elements.prio.value) || 0, repetir };
    if (hoja.id != null) S.editarTarea(E, hoja.id, { texto: texto.slice(0, 200), ...campos });
    else {
      const t = S.añadirTarea(E, texto, new Date());
      if (t) {                                             // lo que se elige en la hoja manda sobre lo que se deduzca del texto
        Object.assign(t, { fecha: campos.fecha || t.fecha, prio: campos.prio || t.prio, repetir: campos.repetir || t.repetir });
        if (t.repetir && !t.fecha) t.fecha = S.iso();
      }
    }
    const editando = hoja.id != null;
    cerrarHoja(); guardar(); render(); aviso(editando ? "Tarea guardada" : "Tarea añadida");
  } else if (tipo === "rapido") {
    const txt = f.elements.texto.value.trim();
    if (!txt) return;
    const r = S.añadirRecordatorio(E, A.esRecordatorio(txt) ? txt : "recuérdame " + txt);
    if (!r) return;
    const p = A.proximaOcurrencia(r, new Date());
    if (p) { cal.sel = A.isoDe(p); cal.anio = p.getFullYear(); cal.mes = p.getMonth(); }
    document.activeElement?.blur?.();
    guardar(); render(); aviso(p ? `Añadido: ${A.etiquetaCuando(p, new Date())}` : "Añadido");
  } else if (tipo === "evento") {
    const dias = $$(".dias-elegir button.act", f).map((b) => Number(b.dataset.id));
    const res = C.eventoDesdeFormulario({ texto: f.elements.texto.value, fecha: f.elements.fecha.value, hora: f.elements.hora.value, repetir: f.elements.repetir.value, dias });
    if (res.error) { $("#hoja-error").textContent = res.error; navigator.vibrate?.([30, 40, 30]); return; }
    const editando = hoja.id != null, antes = Number(f.elements.antes.value) || 0;
    S.guardarEvento(E, { ...res.r, antes: antes ? [antes] : [] }, hoja.id);
    if (res.r.fecha) { const d = C.aFecha(res.r.fecha); cal.sel = res.r.fecha; cal.anio = d.getFullYear(); cal.mes = d.getMonth(); }
    cerrarHoja(); guardar(); render(); aviso(editando ? "Evento guardado" : "Evento añadido");
  } else if (tipo === "login") {
    aviso("Conectando…");
    Y.entrar(f.elements.email.value.trim(), f.elements.clave.value).then(() => sincronizarYa(true))
      .catch((e) => { Y.estado.error = e.message; render(); aviso("No se pudo conectar"); });
  } else if (tipo === "ubic") {
    const lat = parseFloat(f.elements.lat.value), lon = parseFloat(f.elements.lon.value);
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return aviso("Latitud (−90 a 90) y longitud (−180 a 180)");
    Object.assign(E.ajustes, { lat, lon, gps: false }); document.activeElement?.blur?.(); guardar(); render(); aviso("Ubicación guardada");
  }
});
document.addEventListener("change", (ev) => {
  const s = ev.target.closest("[data-sel]");
  if (!s) return;
  if (s.dataset.sel === "repetir") { const d = $(".dias-elegir"); if (d) d.hidden = s.value !== "pers"; return; }
  if (s.dataset.sel === "metodo") { const [f, i] = s.value.split("/").map(Number); Object.assign(E.ajustes, { fajr: f, isha: i }); }
  else E.ajustes.asr = s.value;
  guardar(); aviso("Horarios recalculados");
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && $("#hoja").classList.contains("abierta")) cerrarHoja(); });

// deslizar el mes a izquierda / derecha, como en el Calendario de iOS
let toque = null;
document.addEventListener("touchstart", (ev) => {
  const m = ev.target.closest("#cal-mes");
  toque = m ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener("touchend", (ev) => {
  if (!toque) return;
  const dx = ev.changedTouches[0].clientX - toque.x, dy = ev.changedTouches[0].clientY - toque.y;
  toque = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { irAMes(dx < 0 ? 1 : -1); render(); }
}, { passive: true });

document.addEventListener("visibilitychange", () => { if (!document.hidden) { tick(); if (tab !== "fe") render(false); sincronizarYa(); } });

// ---------- sincronización con la nube ----------
let sincronizando = false;
async function sincronizarYa(avisar = false) {
  if (sincronizando || !Y.conectado()) return;
  sincronizando = true;
  try {
    if (await Y.sincronizar(E)) { S.guardar(E); render(false); }
    else if (tab === "ajustes") render(false);
    if (avisar) aviso(Y.estado.error ? "Error: " + Y.estado.error : "Sincronizado");
    if (!Y.estado.error) await Y.programarPush(E);
  } finally { sincronizando = false; sucio = false; }
}
setInterval(() => { if (!document.hidden && (sucio || Date.now() - Y.estado.ultimo > 60000)) sincronizarYa(); }, 15000);

// ---------- arranque ----------
render();
setInterval(tick, 1000);
if (E.ajustes.gps && Date.now() - E.ajustes.gps_ts > 3 * 3600 * 1000) usarGPS(true);   // refresca la ubicación del iPhone
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { /* sin HTTPS/localhost no hay modo sin conexión */ });
sincronizarYa();

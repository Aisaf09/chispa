// Iconos dibujados a imitación de SF Symbols (los originales de Apple no se pueden usar fuera de sus dispositivos).
// Rejilla de 24 x 24. Clases: .s = trazo, .f = relleno, .k = «hueco» (trazo del color del fondo, para recortar).

function engranaje(cx, cy, rExt, rInt, dientes) {
  const p = [], paso = (Math.PI * 2) / dientes;
  for (let i = 0; i < dientes; i++) {
    const a = i * paso - Math.PI / 2;
    for (const [da, r] of [[-0.3, rInt], [-0.17, rExt], [0.17, rExt], [0.3, rInt]])
      p.push(`${(cx + r * Math.cos(a + da * paso * 1.6)).toFixed(2)} ${(cy + r * Math.sin(a + da * paso * 1.6)).toFixed(2)}`);
  }
  return "M" + p.join("L") + "Z";
}
const GEAR = engranaje(12, 12, 9.6, 7.4, 8);
const rayos = (r1, r2) => Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return `M${(12 + r1 * Math.cos(a)).toFixed(2)} ${(12 + r1 * Math.sin(a)).toFixed(2)}L${(12 + r2 * Math.cos(a)).toFixed(2)} ${(12 + r2 * Math.sin(a)).toFixed(2)}`;
}).join("");
const LUNA = "M19.6 14.6A8 8 0 1 1 9.4 4.4a6.4 6.4 0 0 0 10.2 10.2z";
const DESTELLO = (x, y, r) => `M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}z`;
const PUNTOS_CAL = [[8, 13.6], [12, 13.6], [16, 13.6], [8, 17.2], [12, 17.2]].map(([x, y]) => `<circle class="f" cx="${x}" cy="${y}" r="1.15"/>`).join("");

const G = {
  // ---- barra de pestañas: [contorno, relleno] ----
  hoy: [`<circle class="s" cx="12" cy="12" r="4.3"/><path class="s" d="${rayos(7.4, 9.6)}"/>`,
        `<circle class="f" cx="12" cy="12" r="5.2"/><path class="s g" d="${rayos(7.6, 9.8)}"/>`],
  calendario: [`<rect class="s" x="3.4" y="4.6" width="17.2" height="15.9" rx="3.6"/><path class="s" d="M3.4 9.6h17.2M8 2.6v3.6M16 2.6v3.6"/>${PUNTOS_CAL}`,
               `<rect class="s" x="3.4" y="4.6" width="17.2" height="15.9" rx="3.6"/><path class="f" d="M7 4.6h10a3.6 3.6 0 0 1 3.6 3.6v1.9H3.4V8.2A3.6 3.6 0 0 1 7 4.6z"/><path class="s g" d="M8 2.6v3.6M16 2.6v3.6"/>${PUNTOS_CAL}`],
  tareas: [`<circle class="s" cx="5.6" cy="7" r="2.3"/><circle class="s" cx="5.6" cy="17" r="2.3"/><path class="s" d="M11 7h9.4M11 17h9.4"/>`,
           `<circle class="f" cx="5.6" cy="7" r="3"/><path class="k" d="M4.3 7.1l.95.95 1.75-1.9"/><circle class="f" cx="5.6" cy="17" r="3"/><path class="k" d="M4.3 17.1l.95.95 1.75-1.9"/><path class="s g" d="M11 7h9.4M11 17h9.4"/>`],
  fe: [`<path class="s" d="${LUNA}"/><path class="f" d="${DESTELLO(17.2, 5.6, 2.6)}"/>`,
       `<path class="f" d="${LUNA}"/><path class="f" d="${DESTELLO(17.4, 5.4, 2.9)}"/>`],
  foco: [`<circle class="s" cx="12" cy="13.3" r="7.6"/><path class="s" d="M12 9.2v4.3l2.8 1.7M9.6 2.9h4.8M18.4 6.3l1.3-1.3"/>`,
         `<circle class="f" cx="12" cy="13.3" r="8.1"/><path class="k" d="M12 9.2v4.3l2.8 1.7"/><path class="s g" d="M9.6 2.9h4.8M18.6 6.1l1.3-1.3"/>`],
  ajustes: [`<path class="s" d="${GEAR}"/><circle class="s" cx="12" cy="12" r="3.2"/>`,
            `<path class="f" fill-rule="evenodd" d="${GEAR}M15.2 12a3.2 3.2 0 1 0-6.4 0a3.2 3.2 0 1 0 6.4 0z"/>`],

  // ---- glifos sueltos (se usan rellenos o con trazo según la clase) ----
  mas: `<path class="s g" d="M12 5v14M5 12h14"/>`,
  izq: `<path class="s g" d="M15 4.5L7.5 12l7.5 7.5"/>`,
  der: `<path class="s g" d="M9 4.5l7.5 7.5L9 19.5"/>`,
  chevron: `<path class="s g" d="M9.5 5.5L16 12l-6.5 6.5"/>`,
  ok: `<path class="s g" d="M5 12.5l4.4 4.3L19 7.2"/>`,
  equis: `<path class="s g" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
  lista: `<path class="s g" d="M9 6.5h11M9 12h11M9 17.5h11"/><circle class="f" cx="4.6" cy="6.5" r="1.4"/><circle class="f" cx="4.6" cy="12" r="1.4"/><circle class="f" cx="4.6" cy="17.5" r="1.4"/>`,
  ubicacion: `<path class="f" d="M20.6 3.4L3.6 10.6c-.8.35-.7 1.5.15 1.7l6.9 1.1 1.1 6.9c.15.85 1.35.95 1.7.15l7.2-17c.25-.6-.35-1.2-1-.95z"/>`,
  luna: `<path class="f" d="${LUNA}"/>`,
  campana: `<path class="f" d="M12 2.6c-3.4 0-5.6 2.6-5.6 5.9v3.6L4.6 15c-.4.7.1 1.5.9 1.5h13c.8 0 1.3-.8.9-1.5l-1.8-2.9V8.5c0-3.3-2.2-5.9-5.6-5.9z"/><path class="f" d="M9.4 18h5.2a2.6 2.6 0 0 1-5.2 0z"/>`,
  nube: `<path class="f" d="M7 19.5h10.2a4.3 4.3 0 0 0 .7-8.55A6 6 0 0 0 6.4 9.6 4.95 4.95 0 0 0 7 19.5z"/>`,
  compartir: `<path class="s g" d="M12 3v11M8 6.8L12 3l4 3.8M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5"/>`,
  papelera: `<path class="f" d="M9 2.8h6l.6 1.7H20v2H4v-2h4.4zM5.4 7.8h13.2l-1 11.6a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z"/>`,
  llama: `<path class="f" d="M12.3 2.4c.5 3-1.6 4.6-3.2 6.3-1.5 1.6-2.7 3.4-2.7 5.8a5.6 5.6 0 0 0 11.2 0c0-2.3-1-4-2-5.2-.2 1.3-.9 2.2-1.8 2.6.6-3.6-.3-7-1.5-9.5z"/>`,
  reloj: `<circle class="s g" cx="12" cy="12" r="8.6"/><path class="s g" d="M12 7v5.3l3.4 2"/>`,
  libro: `<path class="f" d="M3 5.2c2.9-1.1 5.9-1 8.3.6V20c-2.4-1.5-5.4-1.6-8.3-.6zM21 5.2c-2.9-1.1-5.9-1-8.3.6V20c2.4-1.5 5.4-1.6 8.3-.6z"/>`,
  repetir: `<path class="s g" d="M4.5 11V9.5a3 3 0 0 1 3-3h11M15.5 3.5l3 3-3 3M19.5 13v1.5a3 3 0 0 1-3 3h-11M8.5 20.5l-3-3 3-3"/>`,
  destello: `<path class="f" d="${DESTELLO(12, 12, 9.5)}"/>`,
};

/** `<svg>` del icono. `variante` 1 = relleno (solo pestañas). */
export function ico(nombre, variante = 0, clase = "") {
  const g = G[nombre];
  const cuerpo = Array.isArray(g) ? g[variante] : g;
  return `<svg class="ico${clase ? " " + clase : ""}" viewBox="0 0 24 24" aria-hidden="true">${cuerpo}</svg>`;
}

/** Cuadradito de color estilo Ajustes de iOS con un glifo blanco. */
export const cuadro = (nombre, color) => `<span class="cuadro" style="background:${color}">${ico(nombre)}</span>`;

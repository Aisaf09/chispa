// Compara la PWA (JavaScript) con Chispa (Python): deben dar los mismos minutos exactos.
//   TZ=Europe/Madrid node test/test_rezos.mjs
import { readFileSync } from "node:fs";
import { horarios, posicionSol, proximo, qibla, puntoCardinal } from "../js/rezos.js";

const esp = JSON.parse(readFileSync(new URL("./esperado.json", import.meta.url), "utf-8"));
let ok = 0, fallos = [];
const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const check = (nombre, cond, extra = "") => { if (cond) ok++; else fallos.push(`${nombre} ${extra}`); };

for (const c of esp.casos) {
  const h = horarios(c.y, c.m, c.d, c.cfg);
  const obtenido = Object.fromEntries(Object.entries(h).map(([k, v]) => [k, hhmm(v)]));
  check(`horarios ${c.ciudad} ${c.y}-${c.m}-${c.d}`, JSON.stringify(obtenido) === JSON.stringify(c.esperado),
        `\n   JS:     ${JSON.stringify(obtenido)}\n   Python: ${JSON.stringify(c.esperado)}`);
}
console.log(`horarios: ${esp.casos.length} casos comparados`);
for (const s of esp.sol) {
  const r = posicionSol(new Date(s.ahora));
  check(`sol ${s.ahora}`, r.noche === s.noche && Math.abs(r.frac - s.frac) < 1e-6, `JS ${r.noche}/${r.frac} Python ${s.noche}/${s.frac}`);
}
for (const p of esp.proximo) {
  const r = proximo(new Date(p.ahora));
  const cuando = `${r.cuando.getFullYear()}-${String(r.cuando.getMonth() + 1).padStart(2, "0")}-${String(r.cuando.getDate()).padStart(2, "0")}T${hhmm(r.cuando)}`;
  check(`proximo ${p.ahora}`, r.id === p.id && cuando === p.cuando, `JS ${r.id} ${cuando} Python ${p.id} ${p.cuando}`);
}
for (const q of esp.qibla) {
  const r = qibla(q.lat, q.lon);
  check(`qibla ${q.ciudad}`, Math.abs(r.rumbo - q.rumbo) < 1e-6 && Math.abs(r.km - q.km) < 1e-3 && puntoCardinal(r.rumbo) === q.punto,
        `JS ${r.rumbo.toFixed(3)} Python ${q.rumbo.toFixed(3)}`);
}
console.log(`${ok} comprobaciones correctas, ${fallos.length} fallos`);
if (fallos.length) { console.log(fallos.slice(0, 8).join("\n")); process.exit(1); }

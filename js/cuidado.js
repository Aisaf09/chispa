// Rutina de cuidado (higiene y skincare) de mañana y de noche. Mismo criterio que isla/chispa_cuidado.py.
// Lo marcado se guarda en E.cuidado["AAAA-MM-DD"] = [ids] y se sincroniza con el PC. La rutina y las horas las sube
// Chispa del PC (clave «cuidado_rutina»), así coinciden con lo que tengas en ajustes.json; si no hay, se usa esta.

export const RUTINA = {
  manana: [["m_dientes", "Lavarme los dientes", "tooth", "blue"], ["m_ducha", "Ducha", "shower", "indigo"],
    ["m_limpiador", "Limpiador facial", "drop", "teal"], ["m_hidratante", "Crema hidratante", "jar", "pink"],
    ["m_protector", "Protector solar", "sunfill", "yellow"], ["m_desodorante", "Desodorante", "sparkles", "purple"]],
  noche: [["n_dientes", "Lavarme los dientes", "tooth", "blue"], ["n_hilo", "Hilo dental", "floss", "cyan"],
    ["n_limpiador", "Limpiador facial", "drop", "teal"], ["n_hidratante", "Crema hidratante", "jar", "pink"]],
};
export const TITULOS = { manana: "Mañana", noche: "Noche" };
export const HORAS = { manana: "08:00", noche: "22:30" };
export const REPETIR_MIN = 45;
export const COLORES = { blue: "var(--azul)", indigo: "var(--indigo)", teal: "#30b0c7", pink: "#ff2d55", yellow: "#ffcc00",
  purple: "#af52de", cyan: "#32ade6", red: "var(--rojo)", orange: "var(--naranja)", green: "var(--verde)" };

/** {rutina, horas} a partir de lo que subió el PC (o lo de por defecto). */
export function config(remoto) {
  const r = (remoto && remoto.rutina) || RUTINA, h = (remoto && remoto.horas) || {};
  return { rutina: { manana: r.manana || [], noche: r.noche || [] }, horas: { ...HORAS, ...h } };
}
export const pendientes = (rut, hechos, m) => rut[m].filter((p) => !hechos.includes(p[0]));
export const momentoActual = (ahora) => (ahora.getHours() < 15 ? "manana" : "noche");

export function alternar(E, id, dia) {
  const cur = new Set(E.cuidado[dia] || []);
  if (cur.has(id)) cur.delete(id); else cur.add(id);
  E.cuidado[dia] = [...cur].sort();
  for (const k of Object.keys(E.cuidado).sort().slice(0, -60)) delete E.cuidado[k];       // guarda 60 días
}

const aHora = (txt, ahora) => { const [h, m] = txt.split(":").map(Number); return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m); };

/** [momento, n] si toca recordar ahora (aviso 1 a su hora, aviso 2 REPETIR_MIN después si queda algo), o null. */
export function aviso(ahora, rut, hechos, horas, ya, dia) {
  for (const m of ["manana", "noche"]) {
    if (!pendientes(rut, hechos, m).length) continue;
    const t0 = aHora(horas[m] || HORAS[m], ahora);
    for (const [n, t] of [[1, t0], [2, new Date(t0.getTime() + REPETIR_MIN * 60000)]]) {
      const d = ahora - t;
      if (d >= 0 && d < 120000 && !ya.includes(`${dia}|cuidado|${m}|${n}`)) return [m, n];
    }
  }
  return null;
}
export function textoAviso(rut, hechos, m) {
  const nombres = pendientes(rut, hechos, m).map((p) => p[1].replace("Lavarme los dientes", "dientes").toLowerCase());
  return nombres.slice(0, 4).join(", ") + (nombres.length > 4 ? ` y ${nombres.length - 4} más` : "");
}

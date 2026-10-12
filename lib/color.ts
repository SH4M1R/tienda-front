/** Mezcla `hex` (pct %) con `other`. */
export function mix(hex: string, other: string, pct: number): string {
  const a = toRgb(hex), b = toRgb(other);
  const k = pct / 100;
  const c = a.map((v, i) => Math.round(v * k + b[i] * (1 - k)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
function toRgb(hex: string): number[] {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
}
export const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);

/** Paleta para gráficos, derivada del color primario. */
export function palette(hex: string): string[] {
  return [hex, mix(hex, "#000000", 62), mix(hex, "#ffffff", 62), mix(hex, "#000000", 40), mix(hex, "#ffffff", 40), mix(hex, "#64748b", 55)];
}

export const PRESET_COLORS = [
  { name: "Azul", value: "#2563eb" }, { name: "Índigo", value: "#4f46e5" },
  { name: "Rosa", value: "#db2777" }, { name: "Rojo", value: "#dc2626" }, { name: "Naranja", value: "#ea580c" },
  { name: "Ámbar", value: "#d97706" }, { name: "Verde", value: "#16a34a" }, { name: "Negro", value: "#334155" },
];

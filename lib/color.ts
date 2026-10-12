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
  { name: "Azul", value: "oklch(37.9% 0.146 265.522)" }, { name: "Índigo", value: "oklch(35.9% 0.144 278.697)" },
  { name: "Rosa", value: "oklch(59.2% 0.249 0.584)" }, { name: "Rojo", value: "oklch(44.4% 0.177 26.899)" }, { name: "Cyan", value: "oklch(71.5% 0.143 215.221)" },
  { name: "Ámbar", value: "oklch(55.5% 0.163 48.998)" }, { name: "Verde", value: "oklch(62.7% 0.194 149.214)" }, { name: "Negro", value: "oklch(20.5% 0 none)" },
];

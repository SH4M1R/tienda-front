import type { Producto } from "@/api/productos";

/** Productos por peso: la unidad base es el GRAMO (stock, stock mínimo y peso del saco), y los precios son por KG. */
export const esPeso = (p: Pick<Producto, "porPeso">): boolean => !!p.porPeso;

const trim = (n: number, d: number) => String(Number(n.toFixed(d)));

/** 1500 -> "1.5 kg", 250 -> "250 g". */
export function fmtPeso(gramos: number): string {
  const g = Math.round(gramos);
  if (Math.abs(g) >= 1000) return `${trim(g / 1000, 3)} kg`;
  return `${g} g`;
}

/** Stock (en la unidad base) con su unidad: "1.5 kg" si es por peso, o el número tal cual. */
export const fmtStock = (p: Pick<Producto, "porPeso">, n: number): string => (esPeso(p) ? fmtPeso(n) : String(n));

/** Gramos × precio por kg -> soles (2 decimales, igual que el backend: HALF_UP). */
export const gramosAPrecio = (precioKg: number, gramos: number): number =>
  Math.round((precioKg * gramos) / 10) / 100;

/** Soles -> gramos que se llevan al precio por kg dado (redondeado al gramo). */
export const precioAGramos = (precioKg: number, soles: number): number =>
  precioKg > 0 ? Math.round((soles / precioKg) * 1000) : 0;

/** Definición declarativa de un reporte: una sola descripción alimenta POS 80, A4 y Excel. */
export interface Col<T> {
  header: string;
  /** Peso relativo del ancho de la columna. */
  width: number;
  align?: "left" | "right" | "center";
  /** Texto mostrado en PDF y Excel (si no hay `value`). */
  render: (fila: T) => string;
  /** Valor crudo para Excel (números como número, para poder operar). */
  value?: (fila: T) => string | number;
  /** false = la columna no se imprime en ticket POS 80 (ancho limitado). */
  pos?: boolean;
}

export interface Resumen { label: string; value: string; bold?: boolean }

export interface ReportDef<T = unknown> {
  titulo: string;
  /** Líneas bajo el título (periodo, filtros, etc.). */
  subtitulo?: string[];
  columnas: Col<T>[];
  filas: T[];
  resumen?: Resumen[];
  /** Nombre del archivo sin extensión. */
  archivo: string;
}

export interface EmpresaDoc {
  nombre: string;
  ruc?: string | null;
  direccion?: string | null;
  ubicacion?: string | null;
  telefono?: string | null;
  logo?: string | null;
}

export type Formato = "pos80" | "a4" | "excel";

import { api } from "@/lib/api";
import { fmtStock } from "@/lib/peso";
import { medioLabel } from "@/lib/types";
import type {
  Asistencia, CierreCaja, ComprasReporte, CuentasPorPagar, FlujoCaja, InventarioReporte, Lote, PageResponse,
  Producto, ProductoInventario, ProductoVenta, VentasReporte,
} from "@/lib/types";
import { fmtFechaCorta, fmtFechaHora, fmtMoneda, type Col, type Grafico, type ReportDef } from "./index";

export type GrupoReporte = "Ventas" | "Caja" | "Compras" | "Inventario" | "Personal" | "General";

export interface ReporteItem {
  id: string;
  grupo: GrupoReporte;
  titulo: string;
  descripcion: string;
  /** true = el reporte usa el rango de fechas elegido. */
  periodo: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  construir: (desde: string, hasta: string, dias?: number) => Promise<ReportDef<any>>;
  /** Gráfico que se muestra sobre la tabla (opcional). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  grafico?: (filas: any[]) => Grafico | null;
}

const rango = (d: string, h: string) => [`Periodo: ${fmtFechaCorta(d)} al ${fmtFechaCorta(h)}`];
const sumar = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

interface Fila { etiqueta: string; cantidad: number; total: number }
function colsMonto(primera: string, cantidadLabel: string, formatoEtiqueta: (s: string) => string = (s) => s): Col<Fila>[] {
  return [
    { header: primera, width: 5, render: (r) => formatoEtiqueta(r.etiqueta) },
    { header: cantidadLabel, width: 2, align: "right", render: (r) => String(r.cantidad), value: (r) => r.cantidad },
    { header: "Total", width: 3, align: "right", render: (r) => fmtMoneda(r.total), value: (r) => r.total },
  ];
}

const top = (xs: { name: string; value: number }[], n = 10) => [...xs].sort((a, b) => b.value - a.value).slice(0, n);
const agrupar = (xs: { name: string; value: number }[]) => {
  const m = new Map<string, number>();
  xs.forEach((x) => m.set(x.name, (m.get(x.name) ?? 0) + x.value));
  return [...m.entries()].map(([name, value]) => ({ name, value }));
};
const conDatos = (g: Grafico): Grafico | null => (g.datos.length ? g : null);

export const REPORTES: ReporteItem[] = [
  {
    id: "ventas-periodo", grupo: "Ventas", titulo: "Ventas por periodo", periodo: true,
    descripcion: "Total vendido día por día con número de ventas.",
    grafico: (f: { fecha: string; total: number }[]) => conDatos({ tipo: "linea", etiqueta: "Ventas", dinero: true, datos: f.map((x) => ({ name: fmtFechaCorta(x.fecha), value: x.total })) }),
    construir: async (d, h) => {
      const r = await api<VentasReporte>("/api/reportes/ventas", { params: { desde: d, hasta: h } });
      const cols: Col<(typeof r.porDia)[number]>[] = [
        { header: "Fecha", width: 3, render: (x) => fmtFechaCorta(x.fecha) },
        { header: "Ventas", width: 2, align: "right", render: (x) => String(x.cantidad), value: (x) => x.cantidad },
        { header: "Total", width: 3, align: "right", render: (x) => fmtMoneda(x.total), value: (x) => x.total },
      ];
      return {
        titulo: "Ventas por periodo", subtitulo: rango(d, h), columnas: cols, filas: r.porDia, archivo: `ventas_${d}_${h}`,
        resumen: [
          { label: "N.º de ventas", value: String(r.cantidad) },
          { label: "Ticket promedio", value: fmtMoneda(r.ticketPromedio) },
          { label: "TOTAL VENDIDO", value: fmtMoneda(r.total), bold: true },
        ],
      };
    },
  },
  {
    id: "ventas-empleado", grupo: "Ventas", titulo: "Ventas por empleado", periodo: true,
    descripcion: "Rendimiento de cada vendedor en el periodo.",
    grafico: (f: Fila[]) => conDatos({ tipo: "barras", etiqueta: "Ventas", dinero: true, datos: top(f.map((x) => ({ name: x.etiqueta, value: x.total }))) }),
    construir: async (d, h) => {
      const r = await api<VentasReporte>("/api/reportes/ventas", { params: { desde: d, hasta: h } });
      return {
        titulo: "Ventas por empleado", subtitulo: rango(d, h), columnas: colsMonto("Empleado", "Ventas"),
        filas: r.porEmpleado, archivo: `ventas_empleado_${d}_${h}`,
        resumen: [{ label: "TOTAL", value: fmtMoneda(sumar(r.porEmpleado.map((x) => x.total))), bold: true }],
      };
    },
  },
  {
    id: "ventas-medio", grupo: "Ventas", titulo: "Ventas por medio de pago", periodo: true,
    descripcion: "Efectivo, tarjeta, transferencia y Yape/Plin.",
    grafico: (f: Fila[]) => conDatos({ tipo: "torta", etiqueta: "Total", dinero: true, datos: f.map((x) => ({ name: medioLabel(x.etiqueta), value: x.total })) }),
    construir: async (d, h) => {
      const r = await api<VentasReporte>("/api/reportes/ventas", { params: { desde: d, hasta: h } });
      return {
        titulo: "Ventas por medio de pago", subtitulo: rango(d, h), columnas: colsMonto("Medio de pago", "Ventas", medioLabel),
        filas: r.porMedioPago, archivo: `ventas_medio_pago_${d}_${h}`,
        resumen: [{ label: "TOTAL", value: fmtMoneda(r.total), bold: true }],
      };
    },
  },
  {
    id: "top-productos", grupo: "Ventas", titulo: "Top productos", periodo: true,
    descripcion: "Los 10 productos más vendidos por unidades.",
    grafico: (f: { nombre: string; unidadesVendidas: number }[]) => conDatos({ tipo: "barras-h", etiqueta: "Unidades", datos: f.map((x) => ({ name: x.nombre, value: x.unidadesVendidas })) }),
    construir: async (d, h) => {
      const r = await api<VentasReporte>("/api/reportes/ventas", { params: { desde: d, hasta: h } });
      const cols: Col<(typeof r.topProductos)[number] & { n: number }>[] = [
        { header: "#", width: 1, render: (x) => String(x.n) },
        { header: "Producto", width: 6, render: (x) => x.nombre },
        { header: "Unid.", width: 2, align: "right", render: (x) => String(x.unidadesVendidas), value: (x) => x.unidadesVendidas },
      ];
      return { titulo: "Top productos vendidos", subtitulo: rango(d, h), columnas: cols, archivo: `top_productos_${d}_${h}`,
        filas: r.topProductos.map((t, i) => ({ ...t, n: i + 1 })) };
    },
  },
  {
    id: "ventas-producto", grupo: "Ventas", titulo: "Ventas por producto", periodo: true,
    descripcion: "Unidades e importe vendido de cada producto, por categoría.",
    grafico: (f: ProductoVenta[]) => conDatos({ tipo: "barras-h", etiqueta: "Monto", dinero: true, datos: top(f.map((x) => ({ name: x.producto, value: x.monto }))) }),
    construir: async (d, h) => {
      const filas = await api<ProductoVenta[]>("/api/reportes/ventas/productos", { params: { desde: d, hasta: h } });
      const cols: Col<ProductoVenta>[] = [
        { header: "Producto", width: 5, render: (x) => x.producto },
        { header: "Categoría", width: 3, render: (x) => x.categoria, pos: false },
        { header: "Cant.", width: 1.5, align: "right", render: (x) => String(x.cantidad), value: (x) => x.cantidad },
        { header: "Monto", width: 2.5, align: "right", render: (x) => fmtMoneda(x.monto), value: (x) => x.monto },
      ];
      return { titulo: "Ventas por producto", subtitulo: rango(d, h), columnas: cols, filas, archivo: `ventas_producto_${d}_${h}`,
        resumen: [{ label: "TOTAL", value: fmtMoneda(sumar(filas.map((x) => x.monto))), bold: true }] };
    },
  },
  {
    id: "cierres-caja", grupo: "Caja", titulo: "Arqueo de caja", periodo: true,
    descripcion: "Aperturas y cierres de caja con efectivo esperado y diferencia.",
    grafico: (f: CierreCaja[]) => conDatos({ tipo: "barras", etiqueta: "Ventas", dinero: true, datos: f.slice(0, 15).map((x) => ({ name: `${fmtFechaCorta(x.fechaInicio)} · ${x.empleado}`, value: x.totalVentas })) }),
    construir: async (d, h) => {
      const filas = await api<CierreCaja[]>("/api/reportes/caja/cierres", { params: { desde: d, hasta: h } });
      const cols: Col<CierreCaja>[] = [
        { header: "Apertura", width: 3, render: (x) => fmtFechaHora(x.fechaInicio) },
        { header: "Cajero", width: 3, render: (x) => x.empleado },
        { header: "Inicial", width: 2, align: "right", render: (x) => fmtMoneda(x.montoInicial), value: (x) => x.montoInicial, pos: false },
        { header: "Ventas", width: 2, align: "right", render: (x) => fmtMoneda(x.totalVentas), value: (x) => x.totalVentas },
        { header: "Esperado", width: 2, align: "right", render: (x) => fmtMoneda(x.efectivoEsperado), value: (x) => x.efectivoEsperado, pos: false },
        { header: "Contado", width: 2, align: "right", render: (x) => (x.montoFinal == null ? "—" : fmtMoneda(x.montoFinal)), value: (x) => x.montoFinal ?? "", pos: false },
        { header: "Dif.", width: 2, align: "right", render: (x) => (x.diferencia == null ? "Abierta" : fmtMoneda(x.diferencia)), value: (x) => x.diferencia ?? "" },
      ];
      return { titulo: "Arqueo de caja", subtitulo: rango(d, h), columnas: cols, filas, archivo: `arqueo_caja_${d}_${h}`,
        resumen: [
          { label: "Cajas en el periodo", value: String(filas.length) },
          { label: "TOTAL VENTAS", value: fmtMoneda(sumar(filas.map((x) => x.totalVentas))), bold: true },
        ] };
    },
  },
  {
    id: "flujo-caja", grupo: "Caja", titulo: "Flujo de caja", periodo: true,
    descripcion: "Ingresos y egresos manuales registrados en caja.",
    grafico: (f: { tipo: string; monto: number }[]) => conDatos({ tipo: "barras", etiqueta: "Monto", dinero: true, datos: f.length ? [
      { name: "Ingresos", value: sumar(f.filter((x) => x.tipo === "INGRESO").map((x) => x.monto)) },
      { name: "Egresos", value: sumar(f.filter((x) => x.tipo !== "INGRESO").map((x) => x.monto)) },
    ] : [] }),
    construir: async (d, h) => {
      const r = await api<FlujoCaja>("/api/reportes/caja/flujo", { params: { desde: d, hasta: h } });
      const cols: Col<(typeof r.movimientos)[number]>[] = [
        { header: "Fecha", width: 3, render: (x) => fmtFechaHora(x.fecha) },
        { header: "Tipo", width: 2, render: (x) => (x.tipo === "INGRESO" ? "Ingreso" : "Egreso") },
        { header: "Descripción", width: 5, render: (x) => x.descripcion, pos: false },
        { header: "Medio", width: 2, render: (x) => medioLabel(x.medioPago), pos: false },
        { header: "Monto", width: 2, align: "right", render: (x) => fmtMoneda(x.tipo === "INGRESO" ? x.monto : -x.monto), value: (x) => (x.tipo === "INGRESO" ? x.monto : -x.monto) },
      ];
      return { titulo: "Flujo de caja", subtitulo: rango(d, h), columnas: cols, filas: r.movimientos, archivo: `flujo_caja_${d}_${h}`,
        resumen: [
          { label: "Ingresos", value: fmtMoneda(r.ingresos) },
          { label: "Egresos", value: fmtMoneda(r.egresos) },
          { label: "NETO", value: fmtMoneda(r.neto), bold: true },
        ] };
    },
  },
  {
    id: "compras-proveedor", grupo: "Compras", titulo: "Compras por proveedor", periodo: true,
    descripcion: "Monto comprado a cada proveedor en el periodo.",
    grafico: (f: Fila[]) => conDatos({ tipo: "barras-h", etiqueta: "Compras", dinero: true, datos: top(f.map((x) => ({ name: x.etiqueta, value: x.total }))) }),
    construir: async (d, h) => {
      const r = await api<ComprasReporte>("/api/reportes/compras", { params: { desde: d, hasta: h } });
      return { titulo: "Compras por proveedor", subtitulo: rango(d, h), columnas: colsMonto("Proveedor", "Compras"),
        filas: r.porProveedor, archivo: `compras_proveedor_${d}_${h}`,
        resumen: [{ label: "TOTAL COMPRADO", value: fmtMoneda(r.total), bold: true }] };
    },
  },
  {
    id: "cuentas-por-pagar", grupo: "Compras", titulo: "Cuentas por pagar", periodo: false,
    descripcion: "Compras a crédito pendientes de pago, con antigüedad.",
    grafico: (f: { proveedor: string; pendiente: number }[]) => conDatos({ tipo: "barras-h", etiqueta: "Pendiente", dinero: true, datos: top(agrupar(f.map((x) => ({ name: x.proveedor, value: x.pendiente })))) }),
    construir: async () => {
      const r = await api<CuentasPorPagar>("/api/reportes/compras/por-pagar");
      const cols: Col<(typeof r.items)[number]>[] = [
        { header: "Proveedor", width: 4, render: (x) => x.proveedor },
        { header: "Comprobante", width: 3, render: (x) => x.comprobante, pos: false },
        { header: "Emisión", width: 2.5, render: (x) => fmtFechaCorta(x.fechaEmision), pos: false },
        { header: "Días", width: 1.2, align: "right", render: (x) => String(x.diasAntiguedad), value: (x) => x.diasAntiguedad },
        { header: "Pendiente", width: 2.5, align: "right", render: (x) => fmtMoneda(x.pendiente), value: (x) => x.pendiente },
      ];
      return { titulo: "Cuentas por pagar", columnas: cols, filas: r.items, archivo: "cuentas_por_pagar",
        resumen: [{ label: "TOTAL PENDIENTE", value: fmtMoneda(r.totalPendiente), bold: true }] };
    },
  },
  {
    id: "inventario-valorizado", grupo: "Inventario", titulo: "Inventario valorizado", periodo: false,
    descripcion: "Stock y valor a costo de cada producto activo.",
    grafico: (f: ProductoInventario[]) => conDatos({ tipo: "torta", etiqueta: "Valor", dinero: true, datos: top(agrupar(f.map((x) => ({ name: x.categoria, value: x.valorizado }))), 8) }),
    construir: async () => {
      const filas = await api<ProductoInventario[]>("/api/reportes/inventario/detalle");
      const cols: Col<ProductoInventario>[] = [
        { header: "Producto", width: 5, render: (x) => x.producto },
        { header: "Categoría", width: 3, render: (x) => x.categoria, pos: false },
        { header: "Stock", width: 1.5, align: "right", render: (x) => fmtStock(x, x.stock), value: (x) => (x.porPeso ? x.stock / 1000 : x.stock) },
        { header: "Costo", width: 2, align: "right", render: (x) => fmtMoneda(x.precioCompra) + (x.porPeso ? " /kg" : ""), value: (x) => x.precioCompra, pos: false },
        { header: "Valor", width: 2.5, align: "right", render: (x) => fmtMoneda(x.valorizado), value: (x) => x.valorizado },
      ];
      return { titulo: "Inventario valorizado", columnas: cols, filas, archivo: "inventario_valorizado",
        resumen: [
          { label: "Unidades", value: String(sumar(filas.filter((x) => !x.porPeso).map((x) => x.stock))) },
          { label: "VALOR TOTAL", value: fmtMoneda(sumar(filas.map((x) => x.valorizado))), bold: true },
        ] };
    },
  },
  {
    id: "alerta-stock", grupo: "Inventario", titulo: "Alerta de stock", periodo: false,
    descripcion: "Productos con stock igual o inferior al mínimo.",
    construir: async () => {
      const filas = await api<Producto[]>("/api/productos/alertas/stock-bajo");
      const cols: Col<Producto>[] = [
        { header: "Producto", width: 5, render: (x) => x.nombre },
        { header: "Categoría", width: 3, render: (x) => x.categoriaNombre, pos: false },
        { header: "Stock", width: 1.5, align: "right", render: (x) => fmtStock(x, x.stockActual), value: (x) => x.stockActual },
        { header: "Mín.", width: 1.5, align: "right", render: (x) => fmtStock(x, x.stockMinimo), value: (x) => x.stockMinimo },
      ];
      return { titulo: "Alerta de stock bajo", columnas: cols, filas, archivo: "alerta_stock",
        resumen: [{ label: "Productos en alerta", value: String(filas.length), bold: true }] };
    },
  },
  {
    id: "por-vencer", grupo: "Inventario", titulo: "Productos por vencer", periodo: false,
    descripcion: "Lotes próximos a llegar a su fecha de vencimiento (días de margen configurables).",
    construir: async (_d, _h, dias = 30) => {
      const filas = await api<Lote[]>("/api/productos/alertas/por-vencer", { params: { dias } });
      const cols: Col<Lote>[] = [
        { header: "Producto", width: 5, render: (x) => x.productoNombre },
        { header: "Lote", width: 2, render: (x) => x.lote ?? "—", pos: false },
        { header: "Vence", width: 2.5, render: (x) => fmtFechaCorta(x.fechaVencimiento) },
        { header: "Días", width: 1.2, align: "right", render: (x) => String(x.diasParaVencer ?? ""), value: (x) => x.diasParaVencer ?? "" },
        { header: "Stock", width: 1.5, align: "right", render: (x) => fmtStock(x, x.stock), value: (x) => x.stock },
      ];
      return { titulo: `Productos por vencer (${dias} días)`, columnas: cols, filas, archivo: `productos_por_vencer_${dias}d`,
        resumen: [{ label: "Lotes por vencer", value: String(filas.length), bold: true }] };
    },
  },
  {
    id: "asistencia", grupo: "Personal", titulo: "Asistencia", periodo: true,
    descripcion: "Entradas, salidas y tardanzas del personal.",
    construir: async (d, h) => {
      const r = await api<PageResponse<Asistencia>>("/api/asistencia", { params: { desde: d, hasta: h, size: 2000 } });
      const hora = (s: string | null) => (s ? new Date(s).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—");
      const cols: Col<Asistencia>[] = [
        { header: "Fecha", width: 2.5, render: (x) => fmtFechaCorta(x.fecha) },
        { header: "Empleado", width: 4, render: (x) => x.empleadoNombre },
        { header: "Entrada", width: 2, render: (x) => hora(x.horaEntrada) },
        { header: "Salida", width: 2, render: (x) => hora(x.horaSalida), pos: false },
        { header: "Tard.", width: 1.5, align: "right", render: (x) => (x.tardanza ? `${x.minutosTardanza} min` : "—"), value: (x) => x.minutosTardanza },
      ];
      return { titulo: "Reporte de asistencia", subtitulo: rango(d, h), columnas: cols, filas: r.content, archivo: `asistencia_${d}_${h}`,
        resumen: [{ label: "Tardanzas", value: String(r.content.filter((x) => x.tardanza).length), bold: true }] };
    },
  },
  {
    id: "consolidado", grupo: "General", titulo: "Consolidado general", periodo: true,
    descripcion: "Ventas, compras, caja e inventario en un solo cuadro.",
    grafico: (f: { concepto: string; monto: number }[]) => conDatos({ tipo: "barras", etiqueta: "Monto", dinero: true, datos: f.map((x) => ({ name: x.concepto, value: x.monto })) }),
    construir: async (d, h) => {
      const [v, c, f, inv] = await Promise.all([
        api<VentasReporte>("/api/reportes/ventas", { params: { desde: d, hasta: h } }),
        api<ComprasReporte>("/api/reportes/compras", { params: { desde: d, hasta: h } }),
        api<FlujoCaja>("/api/reportes/caja/flujo", { params: { desde: d, hasta: h } }),
        api<InventarioReporte>("/api/reportes/inventario"),
      ]);
      const filas = [
        { concepto: "Ventas (importe)", detalle: `${v.cantidad} ventas`, monto: v.total },
        { concepto: "Compras (importe)", detalle: `${c.cantidad} compras`, monto: c.total },
        { concepto: "Ingresos de caja", detalle: "Movimientos manuales", monto: f.ingresos },
        { concepto: "Egresos de caja", detalle: "Movimientos manuales", monto: f.egresos },
        { concepto: "Inventario valorizado", detalle: `${inv.unidadesTotales} unidades`, monto: inv.valorTotal },
      ];
      const cols: Col<(typeof filas)[number]>[] = [
        { header: "Concepto", width: 4, render: (x) => x.concepto },
        { header: "Detalle", width: 3, render: (x) => x.detalle, pos: false },
        { header: "Monto", width: 3, align: "right", render: (x) => fmtMoneda(x.monto), value: (x) => x.monto },
      ];
      return { titulo: "Consolidado general", subtitulo: rango(d, h), columnas: cols, filas, archivo: `consolidado_${d}_${h}`,
        resumen: [{ label: "Ventas − Compras", value: fmtMoneda(v.total - c.total), bold: true }] };
    },
  },
];

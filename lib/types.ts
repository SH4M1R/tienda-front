export type Rol = "ADMIN" | "CAJERO" | "ALMACEN";
export type MedioPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "YAPE_PLIN";
export type TipoUnidad = "UNIDAD" | "CAJA";
export type TipoComprobante = "NOTA_VENTA" | "BOLETA" | "FACTURA";

export const COMPROBANTES: { value: TipoComprobante; label: string; serie: string; disponible: boolean }[] = [
  { value: "NOTA_VENTA", label: "Nota de Venta", serie: "NV001", disponible: true },
  { value: "BOLETA", label: "Boleta Electrónica", serie: "B001", disponible: false },
  { value: "FACTURA", label: "Factura Electrónica", serie: "F001", disponible: false },
];

export interface PageResponse<T> {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean;
}

export interface Empleado {
  id: number; nombre: string; username: string; rol: Rol; estado: boolean;
  horaEntrada: string | null; horaSalida: string | null; diaDescanso: string | null;
}
export interface LoginResponse {
  token: string | null; tipo: string; expiraEnMs: number; empleado: Empleado; permisos: string[];
}

export interface Categoria { id: number; nombre: string }
export interface Sucursal { id: number; nombre: string }

export interface Producto {
  id: number; nombre: string; precioCompra: number; precioVenta: number; stockMinimo: number; estado: boolean;
  barras: string | null; unidadesCaja: number | null; precioCaja: number | null; factor: number | null;
  categoriaId: number; categoriaNombre: string; stockActual: number; stockBajo: boolean;
}
export interface Lote {
  id: number; productoId: number; productoNombre: string; lote: string | null;
  fechaVencimiento: string | null; stock: number; diasParaVencer: number | null;
}

export interface Proveedor {
  id: number; tipoDocumento: string; numeroDocumento: string; nombres: string;
  departamento: string | null; provincia: string | null; distrito: string | null; direccion: string | null;
  telefono: string | null; correo: string | null; contactoNombres: string | null;
  contactoCelular: string | null; contactoCorreo: string | null;
}
export interface Cliente {
  id: number; nombres: string; apellidoPaterno: string | null; apellidoMaterno: string | null;
  dni: string | null; codVerifica: string | null; telefono: string | null; nombreCompleto: string;
}
export interface DniResponse {
  success: boolean; dni: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; codVerifica: string | null;
}

export interface DetalleVenta {
  id: number; productoId: number; productoNombre: string; cantidad: number; tipoVenta: TipoUnidad;
  precioUnitario: number; subtotal: number;
}
export interface Venta {
  id: number; fecha: string; total: number; estado: boolean; metodoPago: MedioPago; tipoVenta: TipoComprobante;
  serie: string | null; numeroComprobante: number | null; comprobante: string | null; vuelto: number | null;
  codigoIzipay: string | null; empleadoId: number; empleadoNombre: string; clienteId: number | null;
  clienteNombre: string | null; clienteDocumento: string | null; cajaId: number; detalles: DetalleVenta[];
}

export interface DetalleCompra {
  id: number; productoId: number; productoNombre: string; lote: string | null; fechaVencimiento: string | null;
  unidadMedida: string; cantidad: number; precioUnitario: number; importe: number;
}
export interface Compra {
  id: number; comprobante: string; serie: string | null; numero: string | null; fechaEmision: string;
  fechaRegistro: string; regularizar: boolean; proveedorId: number; proveedorNombre: string;
  empleadoId: number; empleadoNombre: string; precioIncluyeIgv: boolean; descripcion: string | null;
  subtotal: number; igv: number; total: number; percepcion: number; pagar: number; tipoPago: string;
  medioPago: string; estado: boolean; estadoPago: boolean; detalles: DetalleCompra[];
}

export interface Caja {
  id: number; empleadoId: number; empleadoNombre: string; fechaInicio: string; montoInicial: number;
  fechaFin: string | null; montoFinal: number | null; montoDejado: number | null; abierta: boolean;
}
export interface ResumenCaja {
  cajaId: number; abierta: boolean; montoInicial: number; ventasEfectivo: number; ventasTarjeta: number;
  ventasTransferencia: number; ventasYapePlin: number; totalVentas: number; ingresosEfectivo: number;
  egresosEfectivo: number; efectivoEsperado: number; montoFinal: number | null; montoDejado: number | null;
  diferencia: number | null;
}
export type TipoMovimiento = "INGRESO" | "EGRESO";
export type CategoriaMovimiento =
  | "RETIRO_EFECTIVO" | "PAGO_PROVEEDOR" | "PAGO_SERVICIOS" | "GASTO_VARIO" | "APORTE_CAPITAL" | "DEVOLUCION" | "OTRO";
export interface MovimientoCaja {
  id: number; cajaId: number; empleadoId: number; empleadoNombre: string; tipo: TipoMovimiento;
  categoria: CategoriaMovimiento; numero: string; fechaEmision: string; descripcion: string; monto: number;
  medioPago: MedioPago; fechaRegistro: string; anulado: boolean;
}

export interface Asistencia {
  id: number; empleadoId: number; empleadoNombre: string; fecha: string; horaEntrada: string | null;
  horaSalida: string | null; tardanza: boolean; minutosTardanza: number;
}

export interface DetalleTraslado {
  id: number; productoId: number; productoNombre: string; cantidad: number; precioUnitario: number; subtotal: number;
}
export interface Traslado {
  id: number; tipo: "INGRESO" | "EGRESO"; sucursalId: number; sucursalNombre: string; fecha: string;
  total: number; observacion: string | null; detalles: DetalleTraslado[];
}

export interface Empresa {
  id: number; ruc: string | null; razonSocial: string | null; nombreComercial: string | null; telefono: string | null;
  email: string | null; direccion: string | null; departamento: string | null; ciudad: string | null;
  logo: string | null; horaApertura: string | null; horaCierre: string | null; toleranciaMinutos: number | null;
  backupAutomaticoActivo: boolean | null; frecuenciaBackup: string | null; ultimoBackupEnviado: string | null;
  colorPrimario: string;
}
export interface EmpresaPublica {
  nombreComercial: string | null; razonSocial: string | null; logo: string | null; colorPrimario: string;
}

export interface TopProducto { productoId: number; nombre: string; unidadesVendidas: number }
export interface Dashboard {
  ventasHoy: number; cantidadVentasHoy: number; ventasMes: number; comprasMes: number;
  productosStockBajo: number; lotesPorVencer: number; cajaAbierta: boolean;
  topProductos: TopProducto[]; ventasUltimos7Dias: { fecha: string; total: number }[];
}
export interface Monto { etiqueta: string; total: number; cantidad: number }
export interface Dia { fecha: string; total: number; cantidad: number }
export interface VentasReporte {
  total: number; cantidad: number; ticketPromedio: number; porMedioPago: Monto[]; porDia: Dia[];
  porEmpleado: Monto[]; topProductos: TopProducto[];
}
export interface ComprasReporte { total: number; cantidad: number; porProveedor: Monto[]; porDia: Dia[] }
export interface InventarioReporte { valorTotal: number; unidadesTotales: number; porCategoria: Monto[] }

export interface KardexMovimiento {
  fecha: string; tipo: "COMPRA" | "VENTA" | "TRASLADO_INGRESO" | "TRASLADO_EGRESO"; documento: string;
  detalle: string; entrada: number; salida: number; saldo: number; costoUnitario: number;
}
export interface Kardex {
  productoId: number; productoNombre: string; stockActual: number; saldoInicial: number;
  totalEntradas: number; totalSalidas: number; costoActual: number; movimientos: KardexMovimiento[];
}

export const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "YAPE_PLIN", label: "Yape / Plin" },
];
export const medioLabel = (m: string) => MEDIOS_PAGO.find((x) => x.value === m)?.label ?? m;

export const CATEGORIAS_MOV: { value: CategoriaMovimiento; label: string; tipo: TipoMovimiento[] }[] = [
  { value: "RETIRO_EFECTIVO", label: "Retiro de efectivo", tipo: ["EGRESO"] },
  { value: "PAGO_PROVEEDOR", label: "Pago a proveedor", tipo: ["EGRESO"] },
  { value: "PAGO_SERVICIOS", label: "Pago de servicios", tipo: ["EGRESO"] },
  { value: "GASTO_VARIO", label: "Gasto vario", tipo: ["EGRESO"] },
  { value: "APORTE_CAPITAL", label: "Aporte de capital", tipo: ["INGRESO"] },
  { value: "DEVOLUCION", label: "Devolución", tipo: ["INGRESO", "EGRESO"] },
  { value: "OTRO", label: "Otro", tipo: ["INGRESO", "EGRESO"] },
];
export const catLabel = (c: string) => CATEGORIAS_MOV.find((x) => x.value === c)?.label ?? c;

export const ROLES: { value: Rol; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "CAJERO", label: "Cajero" },
  { value: "ALMACEN", label: "Almacén" },
];
export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export interface ProductoVenta { productoId: number; producto: string; categoria: string; cantidad: number; monto: number }
export interface CierreCaja {
  cajaId: number; empleado: string; fechaInicio: string; fechaFin: string | null; montoInicial: number; totalVentas: number;
  efectivoEsperado: number; montoFinal: number | null; montoDejado: number | null; diferencia: number | null; abierta: boolean;
}
export interface MovimientoFlujo { fecha: string; tipo: string; categoria: string; medioPago: string; descripcion: string; empleado: string; monto: number }
export interface FlujoCaja { ingresos: number; egresos: number; neto: number; movimientos: MovimientoFlujo[] }
export interface CuentaPorPagar { compraId: number; proveedor: string; comprobante: string; fechaEmision: string; total: number; pendiente: number; diasAntiguedad: number }
export interface CuentasPorPagar { totalPendiente: number; items: CuentaPorPagar[] }
export interface ProductoInventario { productoId: number; producto: string; categoria: string; stock: number; stockMinimo: number; precioCompra: number; valorizado: number }

export interface Horario { matriz: number[][]; maximo: number }

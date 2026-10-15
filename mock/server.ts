/**
 * Servidor simulado en memoria (modo demostración). Responde con las mismas formas JSON que el backend Spring
 * Boot, así que todas las pantallas funcionan igual pero sin conexión. Los cambios viven mientras la pestaña
 * esté abierta; al recargar la página los datos vuelven a su estado inicial.
 */
import { ApiError, tokenStore } from "../lib/api"
import type {
  Asistencia, Caja, Cliente, Compra, DetalleCompra, DetalleTraslado, DetalleVenta, Empleado, MovimientoCaja,
  Proveedor, Traslado, Venta,
} from "../lib/types";
import { addDays, crearDb, isoDate, isoDateTime, permisosDeRol, round2, type Db, type EmpleadoDb, type LoteDb, type ProductoDb } from "./seed";

type Q = Record<string, string | undefined>;
type Body = Record<string, unknown>;
type Handler = (m: string[], q: Q, b: Body, u: EmpleadoDb | null) => unknown;

/**
 * Los datos se guardan en localStorage para compartirse entre pestañas (el comprobante se abre en otra pestaña) y
 * sobrevivir a una recarga. Se regeneran cada día para que las fechas sigan siendo recientes. Para volver al estado
 * inicial en cualquier momento: abrir la app con `?reset-demo` en la URL o borrar los datos del sitio.
 */
const CLAVE_DB = "jps_demo_db_v1";
const CLAVE_STAMP = "jps_demo_stamp_v1";
let _db: Db | null = null;
let _stamp = "";

function leerAlmacen(): { db: Db; stamp: string } | null {
  try {
    const raw = localStorage.getItem(CLAVE_DB);
    if (!raw) return null;
    const x = JSON.parse(raw) as { dia: string; db: Db };
    if (x.dia !== isoDate(new Date())) return null;
    return { db: x.db, stamp: localStorage.getItem(CLAVE_STAMP) ?? "" };
  } catch { return null; }
}

function guardar() {
  if (!_db) return;
  try {
    _stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLAVE_DB, JSON.stringify({ dia: isoDate(new Date()), db: _db }));
    localStorage.setItem(CLAVE_STAMP, _stamp);
  } catch { /* sin almacenamiento disponible o cuota llena: se sigue en memoria */ }
}

/** Sincroniza con el almacenamiento (otra pestaña pudo cambiar los datos). Se llama una vez por petición. */
function sincronizar() {
  if (typeof window === "undefined") return;
  try {
    if (window.location.search.includes("reset-demo")) {
      localStorage.removeItem(CLAVE_DB);
      localStorage.removeItem(CLAVE_STAMP);
      _db = null;
    }
    const stamp = localStorage.getItem(CLAVE_STAMP) ?? "";
    if (_db && stamp === _stamp) return;
    const a = leerAlmacen();
    if (a) { _db = a.db; _stamp = a.stamp; } else { _db = null; }
  } catch { /* noop */ }
}

function db(): Db {
  if (!_db) { _db = crearDb(); guardar(); }
  return _db;
}

// ───────────── utilidades ─────────────
function err(status: number, message: string): never { throw new ApiError(status, message); }
const num = (v: unknown, d = 0) => (v === null || v === undefined || v === "" ? d : Number(v));
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pad = (n: number, l = 2) => String(n).padStart(l, "0");
const ahoraIso = () => isoDateTime(new Date());
const soloFecha = (s: string) => s.slice(0, 10);
const next = (k: string) => (db().seq[k] = (db().seq[k] ?? 0) + 1);

function enRango(fecha: string, q: Q) {
  const f = soloFecha(fecha);
  if (q.desde && f < q.desde) return false;
  if (q.hasta && f > q.hasta) return false;
  return true;
}

function pagina<T>(lista: T[], q: Q) {
  const size = Math.max(1, num(q.size, 10));
  const page = Math.max(0, num(q.page, 0));
  const totalElements = lista.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  return { content: lista.slice(page * size, page * size + size), page, size, totalElements, totalPages, last: page >= totalPages - 1 };
}

const factorDe = (p: ProductoDb) => (p.factor && p.factor > 0 ? p.factor : p.unidadesCaja && p.unidadesCaja > 0 ? p.unidadesCaja : 1);
const unidadesDe = (p: ProductoDb, tipo: string, cantidad: number) => (tipo.toUpperCase() === "CAJA" ? cantidad * factorDe(p) : cantidad);

const getProducto = (id: number) => db().productos.find((p) => p.id === id) ?? err(404, "Producto no encontrado");
const stockDe = (id: number) => db().lotes.filter((l) => l.productoId === id).reduce((s, l) => s + l.stock, 0);
const categoriaNombre = (id: number) => db().categorias.find((c) => c.id === id)?.nombre ?? "";

function productoRes(p: ProductoDb) {
  const stock = stockDe(p.id);
  return {
    id: p.id, nombre: p.nombre, precioCompra: p.precioCompra, precioVenta: p.precioVenta, stockMinimo: p.stockMinimo, estado: p.estado,
    barras: p.barras, unidadesCaja: p.unidadesCaja, precioCaja: p.precioCaja, factor: p.factor, categoriaId: p.categoriaId,
    categoriaNombre: categoriaNombre(p.categoriaId), stockActual: stock, stockBajo: stock <= p.stockMinimo, imagen: p.imagen,
  };
}

function loteRes(l: LoteDb) {
  const p = getProducto(l.productoId);
  const dias = l.fechaVencimiento ? Math.round((new Date(`${l.fechaVencimiento}T00:00:00`).getTime() - new Date(`${isoDate(new Date())}T00:00:00`).getTime()) / 86400000) : null;
  return { id: l.id, productoId: l.productoId, productoNombre: p.nombre, lote: l.lote, fechaVencimiento: l.fechaVencimiento, stock: l.stock, diasParaVencer: dias };
}

/** Lotes ordenados por vencimiento (FEFO): los que vencen antes salen primero, sin fecha al final. */
const lotesFefo = (productoId: number) =>
  db().lotes.filter((l) => l.productoId === productoId && l.stock > 0)
    .sort((a, b) => (a.fechaVencimiento ?? "9999-12-31").localeCompare(b.fechaVencimiento ?? "9999-12-31") || a.id - b.id);

function descontarStock(p: ProductoDb, unidades: number) {
  if (stockDe(p.id) < unidades) err(409, `Stock insuficiente para "${p.nombre}" (disponible: ${stockDe(p.id)}).`);
  let falta = unidades;
  for (const l of lotesFefo(p.id)) {
    const t = Math.min(l.stock, falta);
    l.stock -= t;
    falta -= t;
    if (falta === 0) break;
  }
}

function agregarStock(productoId: number, unidades: number, lote: string | null, vence: string | null) {
  const nombre = lote?.trim() || "SIN-LOTE";
  let l = db().lotes.find((x) => x.productoId === productoId && x.lote === nombre);
  if (!l) {
    l = { id: next("lote"), productoId, lote: nombre, fechaVencimiento: vence || null, stock: 0 };
    db().lotes.push(l);
  } else if (vence) l.fechaVencimiento = vence;
  l.stock += unidades;
}

function devolverStock(productoId: number, unidades: number) {
  const l = [...db().lotes.filter((x) => x.productoId === productoId)].sort((a, b) => (a.fechaVencimiento ?? "9999").localeCompare(b.fechaVencimiento ?? "9999"))[0];
  if (l) l.stock += unidades; else agregarStock(productoId, unidades, null, null);
}

const sacarStockSinFalla = (productoId: number, unidades: number) => {
  let falta = unidades;
  for (const l of lotesFefo(productoId)) { const t = Math.min(l.stock, falta); l.stock -= t; falta -= t; if (!falta) break; }
};

const sinPassword = ({ password: _p, ...e }: EmpleadoDb): Empleado => { void _p; return e; };

// ───────────── caja ─────────────
const cajaAbiertaDe = (empId: number) => db().cajas.find((c) => c.abierta && c.empleadoId === empId);

function resumenCaja(c: Caja) {
  const d = db();
  const ventas = d.ventas.filter((v) => v.cajaId === c.id && v.estado);
  const suma = (m: string) => round2(ventas.filter((v) => v.metodoPago === m).reduce((s, v) => s + v.total, 0));
  const movs = d.movimientos.filter((m) => m.cajaId === c.id && !m.anulado && m.medioPago === "EFECTIVO");
  const ingresosEfectivo = round2(movs.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0));
  const egresosEfectivo = round2(movs.filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + m.monto, 0));
  const ventasEfectivo = suma("EFECTIVO");
  const efectivoEsperado = round2(c.montoInicial + ventasEfectivo + ingresosEfectivo - egresosEfectivo);
  return {
    cajaId: c.id, abierta: c.abierta, montoInicial: c.montoInicial, ventasEfectivo, ventasTarjeta: suma("TARJETA"),
    ventasTransferencia: suma("TRANSFERENCIA"), ventasYapePlin: suma("YAPE_PLIN"),
    totalVentas: round2(ventas.reduce((s, v) => s + v.total, 0)), ingresosEfectivo, egresosEfectivo, efectivoEsperado,
    montoFinal: c.montoFinal, montoDejado: c.montoDejado,
    diferencia: c.montoFinal == null ? null : round2(c.montoFinal - efectivoEsperado),
  };
}

// ───────────── kardex ─────────────
function kardex(id: number, q: Q) {
  const d = db();
  const p = getProducto(id);
  interface Mov { fecha: string; tipo: string; documento: string; detalle: string; entrada: number; salida: number; costo: number }
  const todos: Mov[] = [];
  for (const c of d.compras.filter((x) => x.estado)) {
    for (const l of c.detalles.filter((x) => x.productoId === id)) {
      const u = unidadesDe(p, l.unidadMedida, l.cantidad);
      todos.push({ fecha: c.fechaRegistro, tipo: "COMPRA", documento: `${c.comprobante} ${c.serie ?? ""}-${c.numero ?? ""}`.trim(), detalle: c.proveedorNombre, entrada: u, salida: 0, costo: u ? round2(l.importe / u) : p.precioCompra });
    }
  }
  for (const v of d.ventas.filter((x) => x.estado)) {
    for (const l of v.detalles.filter((x) => x.productoId === id)) {
      todos.push({ fecha: v.fecha, tipo: "VENTA", documento: v.comprobante ?? `V-${v.id}`, detalle: v.clienteNombre ?? "Público general", entrada: 0, salida: unidadesDe(p, l.tipoVenta, l.cantidad), costo: p.precioCompra });
    }
  }
  for (const t of d.traslados) {
    for (const l of t.detalles.filter((x) => x.productoId === id)) {
      todos.push({ fecha: t.fecha, tipo: t.tipo === "INGRESO" ? "TRASLADO_INGRESO" : "TRASLADO_EGRESO", documento: `TRAS-${pad(t.id, 4)}`, detalle: t.sucursalNombre, entrada: t.tipo === "INGRESO" ? l.cantidad : 0, salida: t.tipo === "EGRESO" ? l.cantidad : 0, costo: l.precioUnitario ?? p.precioCompra });
    }
  }
  todos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  let saldo = d.inicial[id] ?? 0;
  const conSaldo = todos.map((m) => { saldo += m.entrada - m.salida; return { ...m, saldo }; });
  const antes = todos.filter((m) => q.desde && soloFecha(m.fecha) < q.desde);
  const saldoInicial = (d.inicial[id] ?? 0) + antes.reduce((s, m) => s + m.entrada - m.salida, 0);
  const movimientos = conSaldo.filter((m) => enRango(m.fecha, q)).map((m) => ({ fecha: m.fecha, tipo: m.tipo, documento: m.documento, detalle: m.detalle, entrada: m.entrada, salida: m.salida, saldo: m.saldo, costoUnitario: m.costo }));
  return {
    productoId: id, productoNombre: p.nombre, stockActual: stockDe(id), saldoInicial,
    totalEntradas: movimientos.reduce((s, m) => s + m.entrada, 0), totalSalidas: movimientos.reduce((s, m) => s + m.salida, 0),
    costoActual: p.precioCompra, movimientos,
  };
}

// ───────────── clientes / consultas ─────────────
const NOMBRES = ["Luis", "Marta", "Diego", "Carmen", "Raúl", "Elena", "Víctor", "Patricia", "Andrés", "Silvia", "Héctor", "Julia"];
const APELLIDOS = ["García", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez", "Chávez", "Ramos", "Silva", "Ruiz", "Cruz", "Medina"];
const hashStr = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function consultaDni(dni: string) {
  if (!/^\d{8}$/.test(dni)) err(400, "El DNI debe tener 8 dígitos");
  const h = hashStr(dni);
  return { success: true, dni, nombres: NOMBRES[h % 12], apellidoPaterno: APELLIDOS[(h >> 3) % 12], apellidoMaterno: APELLIDOS[(h >> 6) % 12], codVerifica: String(h % 10) };
}
function consultaRuc(ruc: string) {
  if (!/^\d{11}$/.test(ruc)) err(400, "El RUC debe tener 11 dígitos");
  const h = hashStr(ruc);
  const razon = `${["Comercial", "Inversiones", "Distribuidora", "Servicios"][h % 4]} ${APELLIDOS[(h >> 2) % 12]} S.A.C.`;
  return { success: true, ruc, razonSocial: razon, nombreComercial: razon, direccion: `Av. Principal ${100 + (h % 800)}`, departamento: "LIMA", provincia: "LIMA", distrito: "LIMA", estado: "ACTIVO", condicion: "HABIDO", telefonos: [] };
}

function nombreCompleto(c: { nombres: string; apellidoPaterno: string | null; apellidoMaterno: string | null }) {
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ").trim();
}

function guardarCliente(b: Body, id?: number): Cliente {
  const d = db();
  const dni = str(b.dni) || null;
  if (!str(b.nombres)) err(400, "Los nombres son obligatorios");
  if (dni && !/^(\d{8}|\d{11})$/.test(dni)) err(400, "El documento debe ser un DNI (8 dígitos) o un RUC (11 dígitos)");
  if (dni && d.clientes.some((c) => c.dni === dni && c.id !== id)) err(409, "Ya existe un cliente con ese documento");
  const datos = {
    nombres: str(b.nombres), apellidoPaterno: str(b.apellidoPaterno) || null, apellidoMaterno: str(b.apellidoMaterno) || null,
    dni, codVerifica: str(b.codVerifica) || null, telefono: str(b.telefono) || null,
  };
  if (id) {
    const c = d.clientes.find((x) => x.id === id) ?? err(404, "Cliente no encontrado");
    Object.assign(c, datos, { nombreCompleto: nombreCompleto(datos) });
    return c;
  }
  const c: Cliente = { id: next("cliente"), ...datos, nombreCompleto: nombreCompleto(datos) };
  d.clientes.push(c);
  return c;
}

// ───────────── ventas / compras ─────────────
function crearVenta(b: Body, u: EmpleadoDb): Venta {
  const d = db();
  const caja = cajaAbiertaDe(u.id) ?? err(409, "Debes abrir caja antes de registrar ventas.");
  const comp = str(b.tipoVenta) || "NOTA_VENTA";
  if (comp !== "NOTA_VENTA") err(400, "Por ahora solo se emite Nota de Venta. Boleta y Factura electrónicas se habilitarán con el SFS de SUNAT.");
  const lineas = (b.detalles as Body[] | undefined) ?? [];
  if (!lineas.length) err(400, "Debe agregar al menos un producto");
  const detalles: DetalleVenta[] = [];
  const consumo: [ProductoDb, number][] = [];
  lineas.forEach((l, i) => {
    const p = getProducto(num(l.productoId));
    const tipo = str(l.tipoVenta).toUpperCase() === "CAJA" ? "CAJA" : "UNIDAD";
    const cant = num(l.cantidad);
    if (cant <= 0) err(400, "La cantidad debe ser mayor a 0");
    if (!p.estado) err(409, `El producto "${p.nombre}" está inactivo.`);
    const precio = tipo === "CAJA" ? (p.precioCaja ?? err(409, `"${p.nombre}" no tiene precio por caja.`)) : p.precioVenta;
    detalles.push({ id: i + 1, productoId: p.id, productoNombre: p.nombre, cantidad: cant, tipoVenta: tipo, precioUnitario: precio, subtotal: round2(precio * cant) });
    consumo.push([p, unidadesDe(p, tipo, cant)]);
  });
  // verifica stock total por producto antes de descontar
  const porProd = new Map<number, number>();
  consumo.forEach(([p, u2]) => porProd.set(p.id, (porProd.get(p.id) ?? 0) + u2));
  porProd.forEach((u2, pid) => { const p = getProducto(pid); if (stockDe(pid) < u2) err(409, `Stock insuficiente para "${p.nombre}" (disponible: ${stockDe(pid)}).`); });
  const total = round2(detalles.reduce((s, x) => s + x.subtotal, 0));
  const metodo = str(b.metodoPago) || "EFECTIVO";
  let vuelto: number | null = null;
  if (metodo === "EFECTIVO") {
    const recibido = b.montoRecibido == null || b.montoRecibido === "" ? total : num(b.montoRecibido);
    if (recibido < total) err(400, "El monto recibido es menor al total de la venta");
    vuelto = round2(recibido - total);
  }
  consumo.forEach(([p, u2]) => descontarStock(p, u2));
  const cli = b.clienteId ? d.clientes.find((c) => c.id === num(b.clienteId)) ?? null : null;
  if (d.serie.ultimo >= 99_999_999) {
    d.serie = { serie: `NV${pad(Number(d.serie.serie.slice(2)) + 1, 3)}`, ultimo: 0 };
  }
  d.serie.ultimo += 1;
  const v: Venta = {
    id: next("venta"), fecha: ahoraIso(), total, estado: true, metodoPago: metodo as Venta["metodoPago"], tipoVenta: "NOTA_VENTA",
    serie: d.serie.serie, numeroComprobante: d.serie.ultimo, comprobante: `${d.serie.serie}-${pad(d.serie.ultimo, 8)}`, vuelto,
    codigoIzipay: str(b.codigoIzipay) || null, empleadoId: u.id, empleadoNombre: u.nombre, clienteId: cli?.id ?? null,
    clienteNombre: cli?.nombreCompleto ?? null, clienteDocumento: cli?.dni ?? null, cajaId: caja.id, detalles,
  };
  d.ventas.push(v);
  return v;
}

function crearCompra(b: Body, u: EmpleadoDb): Compra {
  const d = db();
  const prov = d.proveedores.find((p) => p.id === num(b.proveedorId)) ?? err(400, "El proveedor es obligatorio");
  const lineas = (b.detalles as Body[] | undefined) ?? [];
  if (!lineas.length) err(400, "Debe registrar al menos un producto");
  const incluye = b.precioIncluyeIgv !== false;
  const detalles: DetalleCompra[] = lineas.map((l, i) => {
    const p = getProducto(num(l.productoId));
    const tipo = str(l.unidadMedida).toUpperCase() === "CAJA" ? "CAJA" : "UNIDAD";
    const cantidad = num(l.cantidad);
    const precio = num(l.precioUnitario);
    if (cantidad <= 0) err(400, "La cantidad debe ser mayor a 0");
    return {
      id: i + 1, productoId: p.id, productoNombre: p.nombre, lote: str(l.lote) || null, fechaVencimiento: str(l.fechaVencimiento) || null,
      unidadMedida: tipo, cantidad, precioUnitario: precio, importe: round2(cantidad * precio),
    };
  });
  const suma = round2(detalles.reduce((s, x) => s + x.importe, 0));
  const total = incluye ? suma : round2(suma * 1.18);
  const subtotal = incluye ? round2(total / 1.18) : suma;
  const percepcion = num(b.percepcion);
  const credito = str(b.tipoPago) === "CREDITO";
  detalles.forEach((x) => agregarStock(x.productoId, unidadesDe(getProducto(x.productoId), x.unidadMedida, x.cantidad), x.lote, x.fechaVencimiento));
  const c: Compra = {
    id: next("compra"), comprobante: str(b.comprobante) || "FACTURA", serie: str(b.serie) || null, numero: str(b.numero) || null,
    fechaEmision: str(b.fechaEmision) || isoDate(new Date()), fechaRegistro: ahoraIso(), regularizar: b.regularizar === true,
    proveedorId: prov.id, proveedorNombre: prov.nombres, empleadoId: u.id, empleadoNombre: u.nombre, precioIncluyeIgv: incluye,
    descripcion: str(b.descripcion) || null, subtotal, igv: round2(total - subtotal), total, percepcion, pagar: round2(total + percepcion),
    tipoPago: credito ? "CREDITO" : "CONTADO", medioPago: str(b.medioPago) || "EFECTIVO", estado: true, estadoPago: !credito, detalles,
  };
  d.compras.push(c);
  return c;
}

// ───────────── reportes ─────────────
const dec = (n: number) => round2(n);
function agrupar<T>(items: T[], clave: (x: T) => string, valor: (x: T) => number) {
  const m = new Map<string, { total: number; cantidad: number }>();
  items.forEach((x) => { const k = clave(x); const e = m.get(k) ?? { total: 0, cantidad: 0 }; e.total += valor(x); e.cantidad += 1; m.set(k, e); });
  return [...m.entries()].map(([etiqueta, v]) => ({ etiqueta, total: dec(v.total), cantidad: v.cantidad })).sort((a, b) => b.total - a.total);
}
function porDia<T extends { fecha: string }>(items: T[], valor: (x: T) => number) {
  const m = new Map<string, { total: number; cantidad: number }>();
  items.forEach((x) => { const k = soloFecha(x.fecha); const e = m.get(k) ?? { total: 0, cantidad: 0 }; e.total += valor(x); e.cantidad += 1; m.set(k, e); });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([fecha, v]) => ({ fecha, total: dec(v.total), cantidad: v.cantidad }));
}
const ventasEnRango = (q: Q) => db().ventas.filter((v) => v.estado && enRango(v.fecha, q));

function topProductos(vs: Venta[], limite = 10) {
  const m = new Map<number, { nombre: string; unidades: number }>();
  vs.forEach((v) => v.detalles.forEach((l) => {
    const u = unidadesDe(getProducto(l.productoId), l.tipoVenta, l.cantidad);
    const e = m.get(l.productoId) ?? { nombre: l.productoNombre, unidades: 0 };
    e.unidades += u;
    m.set(l.productoId, e);
  }));
  return [...m.entries()].map(([productoId, e]) => ({ productoId, nombre: e.nombre, unidadesVendidas: e.unidades })).sort((a, b) => b.unidadesVendidas - a.unidadesVendidas).slice(0, limite);
}

function reporteVentas(q: Q) {
  const vs = ventasEnRango(q);
  const total = dec(vs.reduce((s, v) => s + v.total, 0));
  return {
    total, cantidad: vs.length, ticketPromedio: vs.length ? dec(total / vs.length) : 0,
    porMedioPago: agrupar(vs, (v) => v.metodoPago, (v) => v.total), porDia: porDia(vs, (v) => v.total),
    porEmpleado: agrupar(vs, (v) => v.empleadoNombre, (v) => v.total), topProductos: topProductos(vs),
  };
}

function reporteCompras(q: Q) {
  const cs = db().compras.filter((c) => c.estado && enRango(c.fechaEmision, q));
  const total = dec(cs.reduce((s, c) => s + c.total, 0));
  return {
    total, cantidad: cs.length, porProveedor: agrupar(cs, (c) => c.proveedorNombre, (c) => c.total),
    porDia: porDia(cs.map((c) => ({ ...c, fecha: c.fechaEmision })), (c) => c.total),
  };
}

function dashboard(u: EmpleadoDb) {
  const d = db();
  const hoy = isoDate(new Date());
  const mes = hoy.slice(0, 7);
  const vs = d.ventas.filter((v) => v.estado);
  const vHoy = vs.filter((v) => soloFecha(v.fecha) === hoy);
  const ult7 = Array.from({ length: 7 }, (_, i) => isoDate(addDays(new Date(), i - 6)));
  return {
    ventasHoy: dec(vHoy.reduce((s, v) => s + v.total, 0)), cantidadVentasHoy: vHoy.length,
    ventasMes: dec(vs.filter((v) => v.fecha.startsWith(mes)).reduce((s, v) => s + v.total, 0)),
    comprasMes: dec(d.compras.filter((c) => c.estado && c.fechaEmision.startsWith(mes)).reduce((s, c) => s + c.total, 0)),
    productosStockBajo: d.productos.filter((p) => p.estado && stockDe(p.id) <= p.stockMinimo).length,
    lotesPorVencer: d.lotes.filter((l) => l.stock > 0 && l.fechaVencimiento && loteRes(l).diasParaVencer! <= 30).length,
    cajaAbierta: !!cajaAbiertaDe(u.id), topProductos: topProductos(vs.filter((v) => v.fecha.startsWith(mes)), 5),
    ventasUltimos7Dias: ult7.map((f) => ({ fecha: f, total: dec(vs.filter((v) => soloFecha(v.fecha) === f).reduce((s, v) => s + v.total, 0)) })),
  };
}

// ───────────── tabla de rutas ─────────────
const rutas: { m: string; re: RegExp; h: Handler; publica?: boolean }[] = [];
const on = (m: string, ruta: string, h: Handler, publica = false) => {
  rutas.push({ m, re: new RegExp(`^${ruta.replace(/:(\w+)/g, "([^/]+)")}$`), h, publica });
};
const U = (u: EmpleadoDb | null) => u ?? err(401, "Sesión no válida");
const soloAdmin = (u: EmpleadoDb | null) => { if (U(u).rol !== "ADMIN") err(403, "No tienes permiso para esta acción"); };

// AUTH
on("POST", "/auth/login", (_m, _q, b) => {
  const e = db().empleados.find((x) => x.username === str(b.username));
  if (!e || e.password !== str(b.password)) err(401, "Usuario o contraseña incorrectos");
  if (!e.estado) err(403, "Tu usuario está inactivo");
  return { token: `mock.${e.id}`, tipo: "Bearer", expiraEnMs: 86_400_000, empleado: sinPassword(e), permisos: db().permisos[e.id] ?? permisosDeRol(e.rol) };
}, true);
on("GET", "/auth/me", (_m, _q, _b, u) => ({ token: null, tipo: "Bearer", expiraEnMs: 86_400_000, empleado: sinPassword(U(u)), permisos: db().permisos[U(u).id] ?? [] }));
on("PUT", "/auth/password", (_m, _q, b, u) => {
  if (U(u).password !== str(b.passwordActual)) err(400, "La contraseña actual es incorrecta");
  if (str(b.passwordNueva).length < 6) err(400, "La nueva contraseña debe tener al menos 6 caracteres");
  U(u).password = str(b.passwordNueva);
  return { success: true, message: "Contraseña actualizada", data: null };
});

// EMPRESA / BACKUP
on("GET", "/empresa/publica", () => ({ nombreComercial: db().empresa.nombreComercial, razonSocial: db().empresa.razonSocial, logo: db().empresa.logo }), true);
on("GET", "/empresa", () => db().empresa);
on("PUT", "/empresa", (_m, _q, b, u) => {
  soloAdmin(u);
  const e = db().empresa;
  const permitidos = ["ruc", "razonSocial", "nombreComercial", "telefono", "email", "direccion", "departamento", "ciudad", "logo", "horaApertura", "horaCierre", "toleranciaMinutos", "backupAutomaticoActivo", "frecuenciaBackup", "rutaImagenes"];
  for (const k of permitidos) if (k in b) (e as unknown as Body)[k] = b[k];
  return e;
});
on("POST", "/backup/enviar-correo", (_m, _q, _b, u) => {
  soloAdmin(u);
  const e = db().empresa;
  if (!e.email) err(400, "La empresa no tiene un correo registrado");
  const dt = new Date();
  e.ultimoBackupEnviado = `${isoDate(dt)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  return { success: true, message: `Copia de seguridad enviada a ${e.email}` };
});

// CATEGORÍAS
on("GET", "/categorias", () => [...db().categorias].sort((a, b) => a.nombre.localeCompare(b.nombre)));
on("GET", "/categorias/:id", (m) => db().categorias.find((c) => c.id === num(m[1])) ?? err(404, "Categoría no encontrada"));
on("POST", "/categorias", (_m, _q, b) => {
  const nombre = str(b.nombre);
  if (!nombre) err(400, "El nombre es obligatorio");
  if (db().categorias.some((c) => norm(c.nombre) === norm(nombre))) err(409, "Ya existe una categoría con ese nombre");
  const c = { id: next("categoria"), nombre };
  db().categorias.push(c);
  return c;
});
on("PUT", "/categorias/:id", (m, _q, b) => {
  const c = db().categorias.find((x) => x.id === num(m[1])) ?? err(404, "Categoría no encontrada");
  const nombre = str(b.nombre);
  if (!nombre) err(400, "El nombre es obligatorio");
  if (db().categorias.some((x) => x.id !== c.id && norm(x.nombre) === norm(nombre))) err(409, "Ya existe una categoría con ese nombre");
  c.nombre = nombre;
  return c;
});
on("DELETE", "/categorias/:id", (m) => {
  const id = num(m[1]);
  if (db().productos.some((p) => p.categoriaId === id)) err(409, "No se puede eliminar: la categoría tiene productos asociados");
  db().categorias = db().categorias.filter((c) => c.id !== id);
  return { success: true, message: "Categoría eliminada", data: null };
});

// SUCURSALES
on("GET", "/sucursales", () => db().sucursales);
on("GET", "/sucursales/:id", (m) => db().sucursales.find((s) => s.id === num(m[1])) ?? err(404, "Sucursal no encontrada"));
on("POST", "/sucursales", (_m, _q, b) => {
  if (!str(b.nombre)) err(400, "El nombre es obligatorio");
  const s = { id: next("sucursal"), nombre: str(b.nombre) };
  db().sucursales.push(s);
  return s;
});
on("PUT", "/sucursales/:id", (m, _q, b) => {
  const s = db().sucursales.find((x) => x.id === num(m[1])) ?? err(404, "Sucursal no encontrada");
  if (!str(b.nombre)) err(400, "El nombre es obligatorio");
  s.nombre = str(b.nombre);
  return s;
});
on("DELETE", "/sucursales/:id", (m) => {
  const id = num(m[1]);
  if (db().traslados.some((t) => t.sucursalId === id)) err(409, "No se puede eliminar: la sucursal tiene traslados registrados");
  db().sucursales = db().sucursales.filter((s) => s.id !== id);
  return { success: true, message: "Sucursal eliminada", data: null };
});

// PRODUCTOS
function guardarProducto(b: Body, id?: number): ProductoDb {
  const d = db();
  const nombre = str(b.nombre);
  if (!nombre) err(400, "El nombre es obligatorio");
  if (num(b.precioVenta) <= 0) err(400, "El precio de venta debe ser mayor a 0");
  if (!d.categorias.some((c) => c.id === num(b.categoriaId))) err(400, "La categoría es obligatoria");
  const barras = str(b.barras) || null;
  if (barras && d.productos.some((p) => p.barras === barras && p.id !== id)) err(409, "Ya existe un producto con ese código de barras");
  const datos = {
    nombre, precioCompra: num(b.precioCompra), precioVenta: num(b.precioVenta), stockMinimo: num(b.stockMinimo), estado: b.estado !== false,
    barras, unidadesCaja: b.unidadesCaja ? num(b.unidadesCaja) : null, precioCaja: b.precioCaja ? num(b.precioCaja) : null,
    factor: b.factor ? num(b.factor) : null, categoriaId: num(b.categoriaId),
  };
  if (id) { const p = getProducto(id); Object.assign(p, datos); return p; }
  const p: ProductoDb = { id: next("producto"), ...datos, imagen: null };
  d.productos.push(p);
  return p;
}
on("GET", "/productos", (_m, q) => {
  let l = db().productos.filter((p) => (q.categoriaId ? p.categoriaId === num(q.categoriaId) : true) && (q.estado ? String(p.estado) === q.estado : true));
  if (q.q) { const t = norm(q.q); l = l.filter((p) => norm(p.nombre).includes(t) || (p.barras ?? "").includes(q.q!)); }
  return pagina(l.sort((a, b) => a.nombre.localeCompare(b.nombre)).map(productoRes), q);
});
on("GET", "/productos/alertas/stock-bajo", () => db().productos.filter((p) => p.estado && stockDe(p.id) <= p.stockMinimo).map(productoRes));
on("GET", "/productos/alertas/por-vencer", (_m, q) => {
  const dias = num(q.dias, 30);
  return db().lotes.filter((l) => l.stock > 0 && l.fechaVencimiento).map(loteRes).filter((l) => l.diasParaVencer! <= dias)
    .sort((a, b) => a.diasParaVencer! - b.diasParaVencer!);
});
on("GET", "/productos/barras/:b", (m) => {
  const p = db().productos.find((x) => x.barras === decodeURIComponent(m[1]));
  return p ? productoRes(p) : err(404, "Producto no encontrado");
});
on("GET", "/productos/:id/lotes", (m) => db().lotes.filter((l) => l.productoId === num(m[1])).map(loteRes).sort((a, b) => (a.fechaVencimiento ?? "9999").localeCompare(b.fechaVencimiento ?? "9999")));
on("POST", "/productos/:id/lotes", (m, _q, b) => {
  const p = getProducto(num(m[1]));
  const nombre = str(b.lote) || "SIN-LOTE";
  if (db().lotes.some((l) => l.productoId === p.id && l.lote === nombre)) err(409, `Ya existe el lote "${nombre}" para este producto`);
  if (num(b.stock) < 0) err(400, "El stock no puede ser negativo");
  const l: LoteDb = { id: next("lote"), productoId: p.id, lote: nombre, fechaVencimiento: str(b.fechaVencimiento) || null, stock: num(b.stock) };
  db().lotes.push(l);
  return loteRes(l);
});
on("PUT", "/productos/:id/lotes/:l", (m, _q, b) => {
  const l = db().lotes.find((x) => x.id === num(m[2]) && x.productoId === num(m[1])) ?? err(404, "Lote no encontrado");
  const nombre = str(b.lote) || "SIN-LOTE";
  if (db().lotes.some((x) => x.productoId === l.productoId && x.lote === nombre && x.id !== l.id)) err(409, `Ya existe el lote "${nombre}" para este producto`);
  if (num(b.stock) < 0) err(400, "El stock no puede ser negativo");
  Object.assign(l, { lote: nombre, fechaVencimiento: str(b.fechaVencimiento) || null, stock: num(b.stock) });
  return loteRes(l);
});
on("GET", "/productos/:id/kardex", (m, q) => kardex(num(m[1]), q));
on("GET", "/productos/:id", (m) => productoRes(getProducto(num(m[1]))));
on("POST", "/productos", (_m, _q, b) => productoRes(guardarProducto(b)));
on("PUT", "/productos/:id", (m, _q, b) => productoRes(guardarProducto(b, num(m[1]))));
on("PATCH", "/productos/:id/estado", (m, q) => { const p = getProducto(num(m[1])); p.estado = q.activo === "true"; return productoRes(p); });
on("DELETE", "/productos/:id/imagen", (m) => { const p = getProducto(num(m[1])); p.imagen = null; return productoRes(p); });

// CLIENTES
on("GET", "/clientes", (_m, q) => {
  let l = [...db().clientes];
  if (q.q) { const t = norm(q.q); l = l.filter((c) => norm(c.nombreCompleto).includes(t) || (c.dni ?? "").includes(q.q!)); }
  return pagina(l.sort((a, b) => b.id - a.id), q);
});
on("GET", "/clientes/dni/:d", (m) => consultaDni(m[1]));
on("GET", "/clientes/ruc/:r", (m) => consultaRuc(m[1]));
on("POST", "/clientes/dni/:d/registrar", (m) => {
  const ex = db().clientes.find((c) => c.dni === m[1]);
  if (ex) return ex;
  const r = consultaDni(m[1]);
  return guardarCliente({ nombres: r.nombres, apellidoPaterno: r.apellidoPaterno, apellidoMaterno: r.apellidoMaterno, dni: r.dni, codVerifica: r.codVerifica });
});
on("POST", "/clientes/ruc/:r/registrar", (m) => {
  const ex = db().clientes.find((c) => c.dni === m[1]);
  if (ex) return ex;
  const r = consultaRuc(m[1]);
  return guardarCliente({ nombres: r.razonSocial, dni: r.ruc });
});
on("GET", "/clientes/:id", (m) => db().clientes.find((c) => c.id === num(m[1])) ?? err(404, "Cliente no encontrado"));
on("POST", "/clientes", (_m, _q, b) => guardarCliente(b));
on("PUT", "/clientes/:id", (m, _q, b) => guardarCliente(b, num(m[1])));
on("DELETE", "/clientes/:id", (m) => {
  const id = num(m[1]);
  if (db().ventas.some((v) => v.clienteId === id)) err(409, "No se puede eliminar: el cliente tiene ventas registradas");
  db().clientes = db().clientes.filter((c) => c.id !== id);
  return { success: true, message: "Cliente eliminado", data: null };
});

// PROVEEDORES
function guardarProveedor(b: Body, id?: number): Proveedor {
  const d = db();
  if (!str(b.tipoDocumento) || !str(b.numeroDocumento) || !str(b.nombres)) err(400, "Tipo, número de documento y razón social son obligatorios");
  if (d.proveedores.some((p) => p.numeroDocumento === str(b.numeroDocumento) && p.id !== id)) err(409, "Ya existe un proveedor con ese documento");
  const o = (k: string) => str(b[k]) || null;
  const datos = {
    tipoDocumento: str(b.tipoDocumento), numeroDocumento: str(b.numeroDocumento), nombres: str(b.nombres), departamento: o("departamento"),
    provincia: o("provincia"), distrito: o("distrito"), direccion: o("direccion"), telefono: o("telefono"), correo: o("correo"),
    contactoNombres: o("contactoNombres"), contactoCelular: o("contactoCelular"), contactoCorreo: o("contactoCorreo"),
  };
  if (id) { const p = d.proveedores.find((x) => x.id === id) ?? err(404, "Proveedor no encontrado"); Object.assign(p, datos); return p; }
  const p: Proveedor = { id: next("proveedor"), ...datos };
  d.proveedores.push(p);
  return p;
}
on("GET", "/proveedores", (_m, q) => {
  let l = [...db().proveedores];
  if (q.q) { const t = norm(q.q); l = l.filter((p) => norm(p.nombres).includes(t) || p.numeroDocumento.includes(q.q!)); }
  return pagina(l.sort((a, b) => b.id - a.id), q);
});
on("GET", "/proveedores/:id", (m) => db().proveedores.find((p) => p.id === num(m[1])) ?? err(404, "Proveedor no encontrado"));
on("POST", "/proveedores", (_m, _q, b) => guardarProveedor(b));
on("PUT", "/proveedores/:id", (m, _q, b) => guardarProveedor(b, num(m[1])));
on("DELETE", "/proveedores/:id", (m) => {
  const id = num(m[1]);
  if (db().compras.some((c) => c.proveedorId === id)) err(409, "No se puede eliminar: el proveedor tiene compras registradas");
  db().proveedores = db().proveedores.filter((p) => p.id !== id);
  return { success: true, message: "Proveedor eliminado", data: null };
});

// EMPLEADOS
function guardarEmpleado(b: Body, id?: number): Empleado {
  const d = db();
  if (!str(b.nombre) || !str(b.username)) err(400, "El nombre y el usuario son obligatorios");
  if (!["ADMIN", "CAJERO", "ALMACEN"].includes(str(b.rol))) err(400, "El rol no es válido");
  if (d.empleados.some((e) => e.username === str(b.username) && e.id !== id)) err(409, "Ya existe un empleado con ese usuario");
  const pass = str(b.password);
  if (!id && pass.length < 6) err(400, "La contraseña debe tener al menos 6 caracteres");
  if (pass && pass.length < 6) err(400, "La contraseña debe tener al menos 6 caracteres");
  const datos = {
    nombre: str(b.nombre), username: str(b.username), rol: str(b.rol) as Empleado["rol"], estado: b.estado !== false,
    horaEntrada: str(b.horaEntrada) || null, horaSalida: str(b.horaSalida) || null, diaDescanso: str(b.diaDescanso) || null,
  };
  if (id) {
    const e = d.empleados.find((x) => x.id === id) ?? err(404, "Empleado no encontrado");
    Object.assign(e, datos);
    if (pass) e.password = pass;
    return sinPassword(e);
  }
  const e: EmpleadoDb = { id: next("empleado"), ...datos, password: pass };
  d.empleados.push(e);
  d.permisos[e.id] = permisosDeRol(e.rol);
  return sinPassword(e);
}
on("GET", "/empleados", (_m, q, _b, u) => {
  soloAdmin(u);
  let l = [...db().empleados];
  if (q.q) { const t = norm(q.q); l = l.filter((e) => norm(e.nombre).includes(t) || norm(e.username).includes(t)); }
  return pagina(l.map(sinPassword), q);
});
on("GET", "/empleados/:id/permisos", (m) => db().permisos[num(m[1])] ?? []);
on("PUT", "/empleados/:id/permisos", (m, _q, b, u) => {
  soloAdmin(u);
  db().permisos[num(m[1])] = ((b.rutas as string[]) ?? []).map(String);
  return db().permisos[num(m[1])];
});
on("PATCH", "/empleados/:id/estado", (m, q) => {
  const e = db().empleados.find((x) => x.id === num(m[1])) ?? err(404, "Empleado no encontrado");
  e.estado = q.activo === "true";
  return sinPassword(e);
});
on("GET", "/empleados/:id", (m) => sinPassword(db().empleados.find((e) => e.id === num(m[1])) ?? err(404, "Empleado no encontrado")));
on("POST", "/empleados", (_m, _q, b, u) => { soloAdmin(u); return guardarEmpleado(b); });
on("PUT", "/empleados/:id", (m, _q, b, u) => { soloAdmin(u); return guardarEmpleado(b, num(m[1])); });
on("DELETE", "/empleados/:id", (m, _q, _b, u) => {
  soloAdmin(u);
  const id = num(m[1]);
  if (id === U(u).id) err(409, "No puedes eliminar tu propio usuario");
  if (db().ventas.some((v) => v.empleadoId === id) || db().compras.some((c) => c.empleadoId === id)) err(409, "No se puede eliminar: el empleado tiene movimientos registrados. Desactívalo en su lugar.");
  db().empleados = db().empleados.filter((e) => e.id !== id);
  return undefined;
});

// VENTAS
const visibles = (u: EmpleadoDb) => db().ventas.filter((v) => u.rol === "ADMIN" || v.empleadoId === u.id);
on("GET", "/ventas/dias", (_m, _q, _b, u) => [...new Set(visibles(U(u)).map((v) => soloFecha(v.fecha)))].sort().reverse());
on("GET", "/ventas", (_m, q, _b, u) => pagina(visibles(U(u)).filter((v) => enRango(v.fecha, q)).sort((a, b) => b.id - a.id), q));
on("GET", "/ventas/:id", (m, _q, _b, u) => visibles(U(u)).find((v) => v.id === num(m[1])) ?? err(404, "Venta no encontrada"));
on("POST", "/ventas", (_m, _q, b, u) => crearVenta(b, U(u)));
on("PATCH", "/ventas/:id/anular", (m, _q, _b, u) => {
  const v = visibles(U(u)).find((x) => x.id === num(m[1])) ?? err(404, "Venta no encontrada");
  if (!v.estado) err(409, "La venta ya está anulada");
  v.estado = false;
  v.detalles.forEach((l) => devolverStock(l.productoId, unidadesDe(getProducto(l.productoId), l.tipoVenta, l.cantidad)));
  return v;
});

// COMPRAS
on("GET", "/compras", (_m, q) => pagina(db().compras.filter((c) => enRango(c.fechaEmision, q)).sort((a, b) => b.id - a.id), q));
on("GET", "/compras/:id", (m) => db().compras.find((c) => c.id === num(m[1])) ?? err(404, "Compra no encontrada"));
on("POST", "/compras", (_m, _q, b, u) => crearCompra(b, U(u)));
on("PATCH", "/compras/:id/anular", (m) => {
  const c = db().compras.find((x) => x.id === num(m[1])) ?? err(404, "Compra no encontrada");
  if (!c.estado) err(409, "La compra ya está anulada");
  for (const l of c.detalles) {
    const u2 = unidadesDe(getProducto(l.productoId), l.unidadMedida, l.cantidad);
    if (stockDe(l.productoId) < u2) err(409, `No se puede anular: ya se vendió parte del stock de "${l.productoNombre}".`);
  }
  c.detalles.forEach((l) => sacarStockSinFalla(l.productoId, unidadesDe(getProducto(l.productoId), l.unidadMedida, l.cantidad)));
  c.estado = false;
  return c;
});
on("PATCH", "/compras/:id/pagar", (m) => {
  const c = db().compras.find((x) => x.id === num(m[1])) ?? err(404, "Compra no encontrada");
  if (!c.estado) err(409, "La compra está anulada");
  c.estadoPago = true;
  return c;
});

// CAJA
on("POST", "/caja/abrir", (_m, _q, b, u) => {
  if (cajaAbiertaDe(U(u).id)) err(409, "Ya tienes una caja abierta");
  const monto = num(b.montoInicial, -1);
  if (monto < 0) err(400, "El monto inicial es obligatorio");
  const c: Caja = { id: next("caja"), empleadoId: U(u).id, empleadoNombre: U(u).nombre, fechaInicio: ahoraIso(), montoInicial: monto, fechaFin: null, montoFinal: null, montoDejado: null, abierta: true };
  db().cajas.push(c);
  return c;
});
on("GET", "/caja/actual/resumen", (_m, _q, _b, u) => resumenCaja(cajaAbiertaDe(U(u).id) ?? err(404, "No tienes una caja abierta")));
on("GET", "/caja/actual", (_m, _q, _b, u) => cajaAbiertaDe(U(u).id));
on("POST", "/caja/cerrar", (_m, _q, b, u) => {
  const c = cajaAbiertaDe(U(u).id) ?? err(409, "No tienes una caja abierta");
  c.abierta = false;
  c.fechaFin = ahoraIso();
  c.montoFinal = num(b.montoFinal);
  c.montoDejado = num(b.montoDejado);
  return resumenCaja(c);
});
on("GET", "/caja/historial", (_m, q, _b, u) =>
  pagina(db().cajas.filter((c) => U(u).rol === "ADMIN" || c.empleadoId === U(u).id).sort((a, b) => b.id - a.id), q));
on("GET", "/caja/movimientos", (_m, q, _b, u) =>
  db().movimientos.filter((m) => (U(u).rol === "ADMIN" || m.empleadoId === U(u).id) && enRango(m.fechaRegistro, q)).sort((a, b) => b.id - a.id));
on("POST", "/caja/movimientos", (_m, _q, b, u) => {
  const c = cajaAbiertaDe(U(u).id) ?? err(409, "Debes abrir caja para registrar movimientos");
  if (!str(b.descripcion)) err(400, "La descripción es obligatoria");
  if (num(b.monto) <= 0) err(400, "El monto debe ser mayor a 0");
  const id = next("movimiento");
  const mv: MovimientoCaja = {
    id, cajaId: c.id, empleadoId: U(u).id, empleadoNombre: U(u).nombre, tipo: b.tipo as MovimientoCaja["tipo"], categoria: b.categoria as MovimientoCaja["categoria"],
    numero: str(b.numero) || `MOV-${pad(id, 4)}`, fechaEmision: str(b.fechaEmision) || isoDate(new Date()), descripcion: str(b.descripcion), monto: num(b.monto),
    medioPago: (str(b.medioPago) || "EFECTIVO") as MovimientoCaja["medioPago"], fechaRegistro: ahoraIso(), anulado: false,
  };
  db().movimientos.push(mv);
  return mv;
});
on("PATCH", "/caja/movimientos/:id/anular", (m) => {
  const mv = db().movimientos.find((x) => x.id === num(m[1])) ?? err(404, "Movimiento no encontrado");
  if (mv.anulado) err(409, "El movimiento ya está anulado");
  mv.anulado = true;
  return mv;
});
on("GET", "/caja/:id/resumen", (m) => resumenCaja(db().cajas.find((c) => c.id === num(m[1])) ?? err(404, "Caja no encontrada")));
on("GET", "/caja/:id/movimientos", (m) => db().movimientos.filter((x) => x.cajaId === num(m[1])).sort((a, b) => b.id - a.id));

// ASISTENCIA
const asistenciaHoy = (empId: number) => db().asistencias.find((a) => a.empleadoId === empId && a.fecha === isoDate(new Date()));
function marcar(tipo: "entrada" | "salida", empleado: EmpleadoDb): Asistencia {
  const d = db();
  const ahora = new Date();
  const hoy = asistenciaHoy(empleado.id);
  if (tipo === "entrada") {
    if (hoy) err(409, "Ya registraste tu entrada hoy");
    let tard = false, min = 0;
    if (empleado.horaEntrada) {
      const [h, mi] = empleado.horaEntrada.split(":").map(Number);
      const dif = Math.round((ahora.getTime() - new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, mi).getTime()) / 60000);
      if (dif > (d.empresa.toleranciaMinutos ?? 10)) { tard = true; min = dif; }
    }
    const a: Asistencia = { id: next("asistencia"), empleadoId: empleado.id, empleadoNombre: empleado.nombre, fecha: isoDate(ahora), horaEntrada: isoDateTime(ahora), horaSalida: null, tardanza: tard, minutosTardanza: min };
    d.asistencias.push(a);
    return a;
  }
  if (!hoy) err(409, "Primero debes registrar tu entrada");
  if (hoy.horaSalida) err(409, "Ya registraste tu salida hoy");
  hoy.horaSalida = isoDateTime(ahora);
  return hoy;
}
function credenciales(b: Body): EmpleadoDb {
  const e = db().empleados.find((x) => x.username === str(b.username));
  if (!e || e.password !== str(b.password)) err(401, "Usuario o contraseña incorrectos");
  if (!e.estado) err(403, "Tu usuario está inactivo");
  return e;
}
on("GET", "/asistencia/empleados", () => db().empleados.filter((e) => e.estado).map((e) => ({ id: e.id, nombre: e.nombre, username: e.username })), true);
on("GET", "/asistencia/hoy-todos", () => db().asistencias.filter((a) => a.fecha === isoDate(new Date())), true);
on("POST", "/asistencia/entrada", (_m, _q, b) => marcar("entrada", credenciales(b)), true);
on("POST", "/asistencia/salida", (_m, _q, b) => marcar("salida", credenciales(b)), true);
on("POST", "/asistencia/marcar", (_m, _q, _b, u) => marcar(asistenciaHoy(U(u).id) ? "salida" : "entrada", U(u)));
on("GET", "/asistencia/hoy", (_m, _q, _b, u) => asistenciaHoy(U(u).id));
on("GET", "/asistencia", (_m, q) => pagina(db().asistencias.filter((a) => enRango(a.fecha, q) && (q.empleadoId ? a.empleadoId === num(q.empleadoId) : true)).sort((a, b) => b.id - a.id), q));

// TRASLADOS
on("GET", "/traslados", (_m, q) => {
  let l = db().traslados.filter((t) => (q.tipo ? t.tipo === q.tipo : true) && enRango(t.fecha, q));
  if (q.q) { const t = norm(q.q); l = l.filter((x) => norm(x.sucursalNombre).includes(t) || norm(x.observacion).includes(t) || x.detalles.some((dd) => norm(dd.productoNombre).includes(t))); }
  return pagina(l.sort((a, b) => b.id - a.id), q);
});
on("GET", "/traslados/:id", (m) => db().traslados.find((t) => t.id === num(m[1])) ?? err(404, "Traslado no encontrado"));
on("POST", "/traslados", (_m, _q, b) => {
  const suc = db().sucursales.find((s) => s.id === num(b.sucursalId)) ?? err(400, "La sucursal es obligatoria");
  const tipo = b.tipo === "EGRESO" ? "EGRESO" : "INGRESO";
  const lineas = (b.detalles as Body[] | undefined) ?? [];
  if (!lineas.length) err(400, "Debe agregar al menos un producto");
  const id = next("traslado");
  const detalles: DetalleTraslado[] = lineas.map((l, i) => {
    const p = getProducto(num(l.productoId));
    const cantidad = num(l.cantidad);
    if (cantidad <= 0) err(400, "La cantidad debe ser mayor a 0");
    const precio = l.precioUnitario == null ? p.precioCompra : num(l.precioUnitario);
    return { id: i + 1, productoId: p.id, productoNombre: p.nombre, cantidad, precioUnitario: precio, subtotal: round2(cantidad * precio) };
  });
  if (tipo === "EGRESO") {
    const por = new Map<number, number>();
    detalles.forEach((x) => por.set(x.productoId, (por.get(x.productoId) ?? 0) + x.cantidad));
    por.forEach((u2, pid) => { if (stockDe(pid) < u2) err(409, `Stock insuficiente para "${getProducto(pid).nombre}" (disponible: ${stockDe(pid)}).`); });
    detalles.forEach((x) => descontarStock(getProducto(x.productoId), x.cantidad));
  } else detalles.forEach((x) => agregarStock(x.productoId, x.cantidad, `TRAS-${pad(id, 4)}`, null));
  const t: Traslado = { id, tipo, sucursalId: suc.id, sucursalNombre: suc.nombre, fecha: ahoraIso(), total: round2(detalles.reduce((s, x) => s + x.subtotal, 0)), observacion: str(b.observacion) || null, detalles };
  db().traslados.push(t);
  return t;
});

// DASHBOARD / REPORTES
on("GET", "/dashboard", (_m, _q, _b, u) => dashboard(U(u)));
on("GET", "/reportes/ventas/productos", (_m, q) => {
  const m = new Map<number, { producto: string; categoria: string; cantidad: number; monto: number }>();
  ventasEnRango(q).forEach((v) => v.detalles.forEach((l) => {
    const p = getProducto(l.productoId);
    const e = m.get(p.id) ?? { producto: p.nombre, categoria: categoriaNombre(p.categoriaId), cantidad: 0, monto: 0 };
    e.cantidad += unidadesDe(p, l.tipoVenta, l.cantidad);
    e.monto += l.subtotal;
    m.set(p.id, e);
  }));
  return [...m.entries()].map(([productoId, e]) => ({ productoId, ...e, monto: dec(e.monto) })).sort((a, b) => b.monto - a.monto);
});
on("GET", "/reportes/ventas/horario", (_m, q) => {
  const matriz = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  ventasEnRango(q).forEach((v) => {
    const f = new Date(v.fecha);
    matriz[(f.getDay() + 6) % 7][f.getHours()] += 1;
  });
  return { matriz, maximo: Math.max(0, ...matriz.flat()) };
});
on("GET", "/reportes/ventas", (_m, q) => reporteVentas(q));
on("GET", "/reportes/compras/por-pagar", () => {
  const items = db().compras.filter((c) => c.estado && !c.estadoPago).map((c) => ({
    compraId: c.id, proveedor: c.proveedorNombre, comprobante: `${c.comprobante} ${c.serie ?? ""}-${c.numero ?? ""}`.trim(), fechaEmision: c.fechaEmision,
    total: c.pagar, pendiente: c.pagar, diasAntiguedad: Math.max(0, Math.round((Date.now() - new Date(`${c.fechaEmision}T00:00:00`).getTime()) / 86400000)),
  }));
  return { totalPendiente: dec(items.reduce((s, x) => s + x.pendiente, 0)), items };
});
on("GET", "/reportes/compras", (_m, q) => reporteCompras(q));
on("GET", "/reportes/caja/cierres", (_m, q) => db().cajas.filter((c) => enRango(c.fechaInicio, q)).sort((a, b) => b.id - a.id).map((c) => {
  const r = resumenCaja(c);
  return {
    cajaId: c.id, empleado: c.empleadoNombre, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, montoInicial: c.montoInicial, totalVentas: r.totalVentas,
    efectivoEsperado: r.efectivoEsperado, montoFinal: c.montoFinal, montoDejado: c.montoDejado, diferencia: r.diferencia, abierta: c.abierta,
  };
}));
on("GET", "/reportes/caja/flujo", (_m, q) => {
  const movs = db().movimientos.filter((m) => !m.anulado && enRango(m.fechaRegistro, q)).sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  const ingresos = dec(movs.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0));
  const egresos = dec(movs.filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + m.monto, 0));
  return {
    ingresos, egresos, neto: dec(ingresos - egresos),
    movimientos: movs.map((m) => ({ fecha: m.fechaRegistro, tipo: m.tipo, categoria: m.categoria, medioPago: m.medioPago, descripcion: m.descripcion, empleado: m.empleadoNombre, monto: m.monto })),
  };
});
on("GET", "/reportes/inventario/detalle", () => db().productos.map((p) => {
  const stock = stockDe(p.id);
  return { productoId: p.id, producto: p.nombre, categoria: categoriaNombre(p.categoriaId), stock, stockMinimo: p.stockMinimo, precioCompra: p.precioCompra, valorizado: dec(stock * p.precioCompra) };
}).sort((a, b) => a.producto.localeCompare(b.producto)));
on("GET", "/reportes/inventario", () => {
  const filas = db().productos.map((p) => ({ cat: categoriaNombre(p.categoriaId), stock: stockDe(p.id), valor: stockDe(p.id) * p.precioCompra }));
  const m = new Map<string, { total: number; cantidad: number }>();
  filas.forEach((f) => { const e = m.get(f.cat) ?? { total: 0, cantidad: 0 }; e.total += f.valor; e.cantidad += f.stock; m.set(f.cat, e); });
  return {
    valorTotal: dec(filas.reduce((s, f) => s + f.valor, 0)), unidadesTotales: filas.reduce((s, f) => s + f.stock, 0),
    porCategoria: [...m.entries()].map(([etiqueta, v]) => ({ etiqueta, total: dec(v.total), cantidad: v.cantidad })).sort((a, b) => b.total - a.total),
  };
});

// ───────────── punto de entrada ─────────────
function usuarioActual(): EmpleadoDb | null {
  const t = tokenStore.get();
  const m = t ? /^mock\.(\d+)$/.exec(t) : null;
  if (!m) return null;
  return db().empleados.find((e) => e.id === Number(m[1]) && e.estado) ?? null;
}

const retardo = () => new Promise<void>((r) => setTimeout(r, 120));

export async function mockRequest<T>(method: string, path: string, params: Record<string, string | number | boolean | null | undefined> = {}, body?: unknown, auth = true): Promise<T> {
  await retardo();
  sincronizar();
  const limpia = path.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
  const q: Q = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") q[k] = String(v); });
  const m = method.toUpperCase();
  for (const r of rutas) {
    if (r.m !== m) continue;
    const mt = r.re.exec(limpia);
    if (!mt) continue;
    const u = usuarioActual();
    if (!r.publica && auth && !u) throw new ApiError(401, "Sesión no válida o expirada");
    const res = r.h(mt, q, (body as Body) ?? {}, u);
    if (m !== "GET") guardar();
    return (res === undefined ? undefined : JSON.parse(JSON.stringify(res))) as T;
  }
  throw new ApiError(404, `Ruta no disponible en el modo demostración: ${m} ${limpia}`);
}

/** Subida de imagen de producto: se guarda como data-URL en memoria. */
export async function mockSubirImagen(path: string, archivo: File): Promise<unknown> {
  await retardo();
  sincronizar();
  const mt = /^\/api\/productos\/(\d+)\/imagen$/.exec(path);
  if (!mt) throw new ApiError(404, "Ruta no disponible en el modo demostración");
  const p = getProducto(Number(mt[1]));
  p.imagen = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new ApiError(0, "No se pudo leer la imagen"));
    r.readAsDataURL(archivo);
  });
  guardar();
  return productoRes(p);
}

/** Copia de seguridad de demostración (texto SQL con el resumen de la base simulada). */
export function mockBackupSql(): { nombre: string; contenido: string } {
  sincronizar();
  const d = db();
  const f = isoDate(new Date()).replace(/-/g, "");
  const tablas: [string, unknown[]][] = [
    ["categoria", d.categorias], ["producto", d.productos], ["lote_producto", d.lotes], ["cliente", d.clientes], ["proveedor", d.proveedores],
    ["empleado", d.empleados.map(sinPassword)], ["venta", d.ventas], ["compra", d.compras], ["traslado", d.traslados], ["caja", d.cajas],
  ];
  const lineas = [`-- Copia de seguridad (DEMO) · ${d.empresa.nombreComercial} · ${ahoraIso()}`, "-- Datos simulados: este archivo no proviene de una base de datos real.", ""];
  tablas.forEach(([t, filas]) => lineas.push(`-- ${t}: ${filas.length} registro(s)`, ...filas.map((r) => `-- INSERT INTO ${t} VALUES ('${JSON.stringify(r).replace(/'/g, "''")}');`), ""));
  return { nombre: `backup_jps_market_${f}.sql`, contenido: lineas.join("\n") };
}

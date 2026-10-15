/**
 * Datos 100% estáticos de JPS Market (modo demostración, sin backend).
 * Se generan una sola vez, de forma determinista, y siempre relativos a la fecha actual para que los
 * gráficos del dashboard y de reportes tengan datos recientes.
 * 30 productos · 10 clientes · 100 ventas · 20 compras · 5 proveedores · 3 empleados.
 */
import type {
  Asistencia, Caja, Categoria, Cliente, Compra, DetalleCompra, DetalleVenta, Empleado, Empresa, MedioPago,
  MovimientoCaja, Proveedor, Sucursal, Traslado, Venta,
} from "../lib/types";
import { ALL_ITEMS } from "../lib/nav";

export interface ProductoDb {
  id: number; nombre: string; precioCompra: number; precioVenta: number; stockMinimo: number; estado: boolean;
  barras: string | null; unidadesCaja: number | null; precioCaja: number | null; factor: number | null;
  categoriaId: number; imagen: string | null;
}
export interface LoteDb { id: number; productoId: number; lote: string; fechaVencimiento: string | null; stock: number }
export type EmpleadoDb = Empleado & { password: string };

export interface Db {
  empresa: Empresa & { rutaImagenes: string };
  empleados: EmpleadoDb[];
  permisos: Record<number, string[]>;
  categorias: Categoria[];
  sucursales: Sucursal[];
  productos: ProductoDb[];
  lotes: LoteDb[];
  /** Stock de cada producto al inicio del historial (sirve para el saldo inicial del kardex). */
  inicial: Record<number, number>;
  clientes: Cliente[];
  proveedores: Proveedor[];
  ventas: Venta[];
  compras: Compra[];
  traslados: Traslado[];
  cajas: Caja[];
  movimientos: MovimientoCaja[];
  asistencias: Asistencia[];
  seq: Record<string, number>;
  /** Serie y correlativo actual de Notas de Venta. */
  serie: { serie: string; ultimo: number };
}

// ───────────── utilidades de fecha / números ─────────────
const p2 = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const isoDateTime = (d: Date) => `${isoDate(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const at = (d: Date, h: number, m: number, s = 0) => { const x = new Date(d); x.setHours(h, m, s, 0); return x; };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────── catálogos fijos ─────────────
const CATEGORIAS = ["Abarrotes", "Bebidas", "Snacks y golosinas", "Lácteos", "Limpieza", "Cuidado personal"];

// nombre, categoría(1-6), costo/unidad, venta/unidad, factor (unid./caja), precio caja (o null), perecible
type Fila = [string, number, number, number, number, number | null, boolean];
const PRODUCTOS: Fila[] = [
  ["Arroz Extra Costeño 5 kg", 1, 18.5, 22.9, 4, 88, false],
  ["Azúcar Rubia Cartavio 1 kg", 1, 3.4, 4.5, 20, 84, false],
  ["Aceite Primor Premium 1 L", 1, 8.2, 10.9, 12, 126, false],
  ["Fideo Spaghetti Don Vittorio 500 g", 1, 2.6, 3.8, 20, 72, false],
  ["Atún Florida en aceite 170 g", 1, 3.9, 5.5, 24, 126, true],
  ["Sal de mesa Emsal 1 kg", 1, 1.1, 1.8, 24, null, false],
  ["Lenteja bebé 500 g", 1, 3.2, 4.8, 1, null, false],
  ["Harina preparada Blanca Flor 1 kg", 1, 3.6, 5.2, 1, null, true],
  ["Inca Kola 500 ml", 2, 1.9, 3.0, 12, 33, true],
  ["Coca-Cola 1.5 L", 2, 4.6, 6.5, 6, 36, true],
  ["Agua San Luis sin gas 625 ml", 2, 1.0, 1.8, 15, 24, true],
  ["Cerveza Cusqueña 620 ml", 2, 4.9, 7.0, 12, 80, true],
  ["Gatorade Naranja 500 ml", 2, 2.4, 3.8, 12, 42, true],
  ["Galleta Soda Field 6 un.", 3, 1.6, 2.5, 12, 27, true],
  ["Galleta Oreo paquete", 3, 0.9, 1.5, 24, 33, true],
  ["Chocolate Sublime clásico", 3, 1.1, 1.8, 24, 40, true],
  ["Papas Lays Clásicas 150 g", 3, 4.3, 6.0, 12, 68, true],
  ["Chizitos 100 g", 3, 1.4, 2.2, 24, null, true],
  ["Leche Gloria Entera 400 g", 4, 3.5, 4.9, 24, 110, true],
  ["Yogurt Gloria Fresa 1 L", 4, 5.8, 8.0, 6, 44, true],
  ["Queso fresco paquete 250 g", 4, 5.5, 8.5, 1, null, true],
  ["Detergente Ariel 800 g", 5, 9.5, 13.5, 12, 150, false],
  ["Jabón Bolívar bar 190 g", 5, 2.0, 3.2, 24, null, false],
  ["Lejía Clorox 1 L", 5, 3.0, 4.5, 12, 50, false],
  ["Lavavajilla Sapolio 750 g", 5, 4.1, 6.0, 12, 66, false],
  ["Papel higiénico Elite x4", 5, 4.8, 6.9, 12, 78, false],
  ["Shampoo H&S sobre 12 ml", 6, 0.35, 0.8, 100, null, false],
  ["Pasta dental Colgate 75 ml", 6, 3.7, 5.5, 24, 120, false],
  ["Desodorante Rexona 50 g", 6, 6.5, 9.9, 12, 108, false],
  ["Toalla higiénica Nosotras x10", 6, 3.1, 4.9, 24, null, false],
];

const PROVEEDORES: [string, string, string, string, string][] = [
  ["Distribuidora Andina S.A.C.", "20512345671", "Lima", "Lima", "Ate"],
  ["Comercial Los Olivos E.I.R.L.", "20498765432", "Lima", "Lima", "Los Olivos"],
  ["Importaciones Pacífico S.A.C.", "20556781239", "Lima", "Callao", "Callao"],
  ["Mayorista El Sol S.R.L.", "20601928374", "Lima", "Lima", "La Victoria"],
  ["Bebidas del Norte S.A.C.", "20534219876", "Lima", "Lima", "San Juan de Lurigancho"],
];

const CLIENTES: [string, string, string, string | null, string][] = [
  ["Carlos", "Ramírez", "Vega", "45871236", "987654321"],
  ["Ana", "Torres", "Salas", "71234598", "976543210"],
  ["Jorge", "Huamán", "Quispe", "42316789", "965432109"],
  ["Rosa", "Flores", "Díaz", "40987654", "954321098"],
  ["Miguel", "Castillo", "Rojas", "46123987", "943210987"],
  ["Lucía", "Mendoza", "Paz", "72345619", "932109876"],
  ["Pedro", "Gonzales", "León", "43219876", "921098765"],
  ["Sofía", "Vargas", "Núñez", "70981234", "910987654"],
  ["Bodega San Martín E.I.R.L.", "", "", "20601234568", "014567890"],
  ["Restaurante El Buen Sabor S.A.C.", "", "", "20587654321", "013456789"],
];

const NOMBRES_EMPLEADOS: Omit<EmpleadoDb, "id">[] = [
  { nombre: "Juan Pérez Soto", username: "admin", password: "admin123", rol: "ADMIN", estado: true, horaEntrada: "08:00", horaSalida: "17:00", diaDescanso: "Domingo" },
  { nombre: "María Quispe Huamán", username: "cajero", password: "cajero123", rol: "CAJERO", estado: true, horaEntrada: "08:00", horaSalida: "15:00", diaDescanso: "Domingo" },
  { nombre: "Luis Mamani Condori", username: "almacen", password: "almacen123", rol: "ALMACEN", estado: true, horaEntrada: "09:00", horaSalida: "18:00", diaDescanso: "Domingo" },
];

export const PERMISOS_POR_ROL: Record<string, string[]> = {
  CAJERO: ["/caja/arqueo", "/caja/movimientos", "/ventas", "/ventas/nueva", "/ventas/clientes"],
  ALMACEN: ["/productos", "/productos/categorias", "/productos/kardex", "/compras", "/compras/nueva", "/compras/proveedores", "/traslados/ingresos", "/traslados/egresos"],
};
export const permisosDeRol = (rol: string) =>
  rol === "ADMIN" ? ALL_ITEMS.map((i) => i.href) : (PERMISOS_POR_ROL[rol] ?? []);

// ───────────── generación ─────────────
export function crearDb(): Db {
  const r = rng(907845855);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const hoy = at(new Date(), 0, 0);
  const ahora = new Date();

  const empresa: Empresa & { rutaImagenes: string } = {
    id: 1, ruc: "20607845855", razonSocial: "JPS MARKET E.I.R.L.", nombreComercial: "JPS Market", telefono: "907845855",
    email: "jpssystems907@gmail.com", direccion: "Av. Los Héroes 245", departamento: "Lima", ciudad: "Lima",
    logo: "/JPSMARKETBANNER.png", horaApertura: "08:00", horaCierre: "22:00", toleranciaMinutos: 10,
    backupAutomaticoActivo: true, frecuenciaBackup: "SEMANAL", ultimoBackupEnviado: null, rutaImagenes: "",
  };

  const empleados: EmpleadoDb[] = NOMBRES_EMPLEADOS.map((e, i) => ({ ...e, id: i + 1 }));
  const permisos: Record<number, string[]> = {};
  empleados.forEach((e) => { permisos[e.id] = permisosDeRol(e.rol); });
  const admin = empleados[0], cajero = empleados[1], almacen = empleados[2];

  const categorias: Categoria[] = CATEGORIAS.map((nombre, i) => ({ id: i + 1, nombre }));
  const sucursales: Sucursal[] = [{ id: 1, nombre: "Sucursal Centro" }, { id: 2, nombre: "Almacén Central" }];

  const productos: ProductoDb[] = PRODUCTOS.map((f, i) => ({
    id: i + 1, nombre: f[0], categoriaId: f[1], precioCompra: f[2], precioVenta: f[3],
    factor: f[4], unidadesCaja: f[5] ? f[4] : null, precioCaja: f[5], stockMinimo: between(8, 20), estado: true,
    barras: `775${String(1000000 + i * 137).padStart(7, "0")}${(i * 7) % 10}`, imagen: null,
  }));
  const prod = (id: number) => productos.find((p) => p.id === id)!;
  const factorDe = (p: ProductoDb) => (p.factor && p.factor > 0 ? p.factor : p.unidadesCaja && p.unidadesCaja > 0 ? p.unidadesCaja : 1);

  const proveedores: Proveedor[] = PROVEEDORES.map((p, i) => ({
    id: i + 1, tipoDocumento: "RUC", numeroDocumento: p[1], nombres: p[0], departamento: p[2], provincia: p[3], distrito: p[4],
    direccion: `Av. Industrial ${100 + i * 37}, ${p[4]}`, telefono: `01${between(4000000, 4999999)}`,
    correo: `ventas@${p[0].split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.pe`,
    contactoNombres: ["Ricardo Salas", "Patricia Núñez", "Hugo Cárdenas", "Elena Paredes", "Raúl Ortega"][i],
    contactoCelular: `9${between(10000000, 99999999)}`, contactoCorreo: null,
  }));

  const clientes: Cliente[] = CLIENTES.map((c, i) => ({
    id: i + 1, nombres: c[0], apellidoPaterno: c[1] || null, apellidoMaterno: c[2] || null, dni: c[3], codVerifica: null,
    telefono: c[4], nombreCompleto: [c[0], c[1], c[2]].filter(Boolean).join(" "),
  }));

  // ── Compras (20), de hace ~170 días hasta hace 2 días ──
  interface Ev { fecha: Date; tipo: "C" | "V" | "TI" | "TE"; ref: number }
  const compras: Compra[] = [];
  const fechasCompra = Array.from({ length: 20 }, (_, i) => addDays(hoy, -Math.round(170 - i * 8.4 - r() * 3)))
    .map((d) => at(d, between(9, 17), between(0, 59)));
  fechasCompra.sort((a, b) => a.getTime() - b.getTime());
  fechasCompra[19] = at(addDays(hoy, -2), 11, 20);
  let detCompraId = 1;
  fechasCompra.forEach((f, i) => {
    const prov = proveedores[i % proveedores.length];
    const incluye = r() < 0.6;
    const n = between(2, 5);
    const usados = new Set<number>();
    const detalles: DetalleCompra[] = [];
    while (detalles.length < n) {
      const p = pick(productos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      const fac = factorDe(p);
      const porCaja = fac > 1 && r() < 0.65;
      const cantidad = porCaja ? between(1, 4) : between(6, 24);
      const unitario = round2((porCaja ? p.precioCompra * fac : p.precioCompra) * (0.97 + r() * 0.06));
      const perecible = PRODUCTOS[p.id - 1][6];
      detalles.push({
        id: detCompraId++, productoId: p.id, productoNombre: p.nombre,
        lote: perecible ? `L${f.getFullYear()}${p2(f.getMonth() + 1)}-${p2(between(1, 28))}` : null,
        fechaVencimiento: perecible ? isoDate(addDays(f, between(120, 420))) : null,
        unidadMedida: porCaja ? "CAJA" : "UNIDAD", cantidad, precioUnitario: unitario, importe: round2(cantidad * unitario),
      });
    }
    const suma = round2(detalles.reduce((s, d) => s + d.importe, 0));
    const total = incluye ? suma : round2(suma * 1.18);
    const subtotal = incluye ? round2(total / 1.18) : suma;
    const igv = round2(total - subtotal);
    const credito = i % 5 === 3;
    compras.push({
      id: i + 1, comprobante: i % 4 === 0 ? "BOLETA" : "FACTURA", serie: i % 4 === 0 ? "B001" : "F001",
      numero: String(1200 + i * 17).padStart(8, "0"), fechaEmision: isoDate(f), fechaRegistro: isoDateTime(f),
      regularizar: false, proveedorId: prov.id, proveedorNombre: prov.nombres,
      empleadoId: i % 3 === 0 ? admin.id : almacen.id, empleadoNombre: i % 3 === 0 ? admin.nombre : almacen.nombre,
      precioIncluyeIgv: incluye, descripcion: null, subtotal, igv, total, percepcion: 0, pagar: total,
      tipoPago: credito ? "CREDITO" : "CONTADO", medioPago: credito ? "TRANSFERENCIA" : pick(["EFECTIVO", "TRANSFERENCIA"]),
      estado: i !== 6, estadoPago: credito ? i === 3 : true, detalles,
    });
  });

  // ── Ventas (100) en ~120 días, más densas hacia el presente ──
  const ventas: Venta[] = [];
  const fechasVenta: Date[] = [];
  for (let i = 0; i < 100; i++) {
    const frac = Math.pow(r(), 1.6); // más ventas recientes
    const dias = Math.floor(frac * 120);
    let f = at(addDays(hoy, -dias), between(8, 21), between(0, 59), between(0, 59));
    if (dias === 0) f = new Date(Math.max(hoy.getTime() + 60000, ahora.getTime() - between(5, 600) * 60000));
    fechasVenta.push(f);
  }
  fechasVenta.sort((a, b) => a.getTime() - b.getTime());
  // al menos 4 ventas hoy
  let hoyCount = fechasVenta.filter((f) => f >= hoy).length;
  for (let i = fechasVenta.length - 1; hoyCount < 4 && i >= 0; i--, hoyCount++) {
    fechasVenta[i] = new Date(Math.max(hoy.getTime() + 60000, ahora.getTime() - (hoyCount + 1) * 17 * 60000));
  }
  fechasVenta.sort((a, b) => a.getTime() - b.getTime());

  const cajeroDelDia = new Map<string, Empleado>();
  const cajasPorDia = new Map<string, Caja>();
  const cajas: Caja[] = [];
  const cajaDe = (f: Date, emp: Empleado): Caja => {
    const dia = isoDate(f);
    const hoyEs = dia === isoDate(hoy);
    const key = hoyEs ? `${dia}-${emp.id}` : dia;
    let c = cajasPorDia.get(key);
    if (!c) {
      c = {
        id: cajas.length + 1, empleadoId: emp.id, empleadoNombre: emp.nombre, fechaInicio: isoDateTime(at(f, 8, between(0, 20))),
        montoInicial: pick([100, 150, 200]), fechaFin: null, montoFinal: null, montoDejado: null, abierta: hoyEs,
      };
      cajasPorDia.set(key, c);
      cajas.push(c);
    }
    return c;
  };

  fechasVenta.forEach((f, i) => {
    const dia = isoDate(f);
    const hoyEs = dia === isoDate(hoy);
    let emp: Empleado;
    if (hoyEs) emp = r() < 0.65 ? cajero : admin;
    else {
      emp = cajeroDelDia.get(dia) ?? (r() < 0.75 ? cajero : admin);
      cajeroDelDia.set(dia, emp);
    }
    const caja = cajaDe(f, emp);
    const n = between(2, 6);
    const usados = new Set<number>();
    const detalles: DetalleVenta[] = [];
    let id = 1;
    while (detalles.length < n) {
      const p = pick(productos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      const porCaja = !!p.precioCaja && r() < 0.2;
      const cantidad = porCaja ? between(1, 2) : between(1, 6);
      const precio = porCaja ? p.precioCaja! : p.precioVenta;
      detalles.push({
        id: id++, productoId: p.id, productoNombre: p.nombre, cantidad, tipoVenta: porCaja ? "CAJA" : "UNIDAD",
        precioUnitario: precio, subtotal: round2(precio * cantidad),
      });
    }
    const total = round2(detalles.reduce((s, d) => s + d.subtotal, 0));
    const x = r();
    const metodo: MedioPago = x < 0.55 ? "EFECTIVO" : x < 0.75 ? "YAPE_PLIN" : x < 0.9 ? "TARJETA" : "TRANSFERENCIA";
    const cli = r() < 0.5 ? pick(clientes) : null;
    const recibido = metodo === "EFECTIVO" ? Math.ceil(total / 10) * 10 : null;
    ventas.push({
      id: i + 1, fecha: isoDateTime(f), total, estado: !(i === 14 || i === 41 || i === 63), metodoPago: metodo,
      tipoVenta: "NOTA_VENTA", serie: "NV001", numeroComprobante: i + 1, comprobante: `NV001-${String(i + 1).padStart(8, "0")}`,
      vuelto: recibido ? round2(recibido - total) : null, codigoIzipay: null, empleadoId: emp.id, empleadoNombre: emp.nombre,
      clienteId: cli?.id ?? null, clienteNombre: cli?.nombreCompleto ?? null, clienteDocumento: cli?.dni ?? null,
      cajaId: caja.id, detalles,
    });
  });

  // ── Traslados (8) ──
  const traslados: Traslado[] = [];
  let detTrasId = 1;
  for (let i = 0; i < 8; i++) {
    const tipo = i % 8 < 5 ? "INGRESO" : "EGRESO";
    const suc = sucursales[i % 2];
    const f = at(addDays(hoy, -Math.round(150 - i * 18 - r() * 4)), between(9, 16), between(0, 59));
    const lineas = between(1, 3);
    const usados = new Set<number>();
    const detalles = [];
    while (detalles.length < lineas) {
      const p = pick(productos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      const cantidad = between(6, 30);
      detalles.push({ id: detTrasId++, productoId: p.id, productoNombre: p.nombre, cantidad, precioUnitario: p.precioCompra, subtotal: round2(cantidad * p.precioCompra) });
    }
    traslados.push({
      id: i + 1, tipo, sucursalId: suc.id, sucursalNombre: suc.nombre, fecha: isoDateTime(f),
      total: round2(detalles.reduce((s, d) => s + d.subtotal, 0)),
      observacion: tipo === "INGRESO" ? `Reposición desde ${suc.nombre}` : `Envío a ${suc.nombre}`, detalles,
    });
  }

  // ── Simulación cronológica de stock (para stock inicial, kardex y lotes finales) ──
  const eventos: Ev[] = [
    ...compras.filter((c) => c.estado).map((c) => ({ fecha: new Date(c.fechaRegistro), tipo: "C" as const, ref: c.id })),
    ...ventas.filter((v) => v.estado).map((v) => ({ fecha: new Date(v.fecha), tipo: "V" as const, ref: v.id })),
    ...traslados.map((t) => ({ fecha: new Date(t.fecha), tipo: (t.tipo === "INGRESO" ? "TI" : "TE") as "TI" | "TE", ref: t.id })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const deltas = (e: Ev): [number, number][] => {
    if (e.tipo === "C") return compras[e.ref - 1].detalles.map((d) => [d.productoId, d.cantidad * (d.unidadMedida === "CAJA" ? factorDe(prod(d.productoId)) : 1)]);
    if (e.tipo === "V") return ventas[e.ref - 1].detalles.map((d) => [d.productoId, -d.cantidad * (d.tipoVenta === "CAJA" ? factorDe(prod(d.productoId)) : 1)]);
    const t = traslados[e.ref - 1];
    return t.detalles.map((d) => [d.productoId, t.tipo === "INGRESO" ? d.cantidad : -d.cantidad]);
  };

  const inicial: Record<number, number> = {};
  productos.forEach((p) => { inicial[p.id] = between(50, 140); });
  const final: Record<number, number> = {};
  for (let pass = 0; pass < 2; pass++) {
    const run: Record<number, number> = { ...inicial };
    const min: Record<number, number> = { ...inicial };
    for (const e of eventos) for (const [pid, q] of deltas(e)) { run[pid] += q; min[pid] = Math.min(min[pid], run[pid]); }
    productos.forEach((p) => { if (min[p.id] < 0) inicial[p.id] += -min[p.id] + between(2, 10); final[p.id] = run[p.id]; });
    if (pass === 1) productos.forEach((p) => { final[p.id] = run[p.id]; });
  }

  // ── Lotes finales a partir de las últimas compras de cada producto ──
  const lotes: LoteDb[] = [];
  let loteId = 1;
  productos.forEach((p, idx) => {
    let restante = final[p.id];
    const lineas = compras.filter((c) => c.estado).flatMap((c) => c.detalles.filter((d) => d.productoId === p.id && d.lote).map((d) => ({ d, c }))).reverse();
    for (const { d } of lineas) {
      if (restante <= 0) break;
      const unidades = d.cantidad * (d.unidadMedida === "CAJA" ? factorDe(p) : 1);
      const stock = Math.min(restante, unidades);
      lotes.push({ id: loteId++, productoId: p.id, lote: d.lote!, fechaVencimiento: d.fechaVencimiento ?? null, stock });
      restante -= stock;
    }
    if (restante > 0) {
      const perecible = PRODUCTOS[idx][6];
      lotes.push({ id: loteId++, productoId: p.id, lote: perecible ? "L-INICIAL" : "SIN-LOTE", fechaVencimiento: perecible ? isoDate(addDays(hoy, between(150, 500))) : null, stock: restante });
    }
  });
  // algunos lotes por vencer pronto (alertas del dashboard)
  [3, 8, 13, 18, 19, 24].forEach((idx, k) => {
    const l = lotes.find((x) => x.productoId === productos[idx].id && x.fechaVencimiento);
    if (l) l.fechaVencimiento = isoDate(addDays(hoy, [6, 12, 19, 25, 9, 28][k]));
  });
  // productos con stock bajo
  [1, 6, 10, 15, 21, 27].forEach((idx) => {
    productos[idx].stockMinimo = final[productos[idx].id] + between(1, 6);
  });

  // ── Cajas: cierre de las anteriores, movimientos manuales ──
  const movimientos: MovimientoCaja[] = [];
  const cajasPasadas = cajas.filter((c) => !c.abierta);
  const CAT_EGRESO = ["PAGO_SERVICIOS", "GASTO_VARIO", "RETIRO_EFECTIVO", "PAGO_PROVEEDOR"] as const;
  const DESC_EGRESO: Record<string, string> = {
    PAGO_SERVICIOS: "Pago de servicio de luz", GASTO_VARIO: "Compra de bolsas y útiles", RETIRO_EFECTIVO: "Retiro de efectivo",
    PAGO_PROVEEDOR: "Pago parcial a proveedor",
  };
  const nuevoMov = (caja: Caja, f: Date, tipo: "INGRESO" | "EGRESO", cat: MovimientoCaja["categoria"], descripcion: string, monto: number): MovimientoCaja => ({
    id: movimientos.length + 1, cajaId: caja.id, empleadoId: caja.empleadoId, empleadoNombre: caja.empleadoNombre, tipo, categoria: cat,
    numero: `MOV-${String(movimientos.length + 1).padStart(4, "0")}`, fechaEmision: isoDate(f), descripcion, monto, medioPago: "EFECTIVO",
    fechaRegistro: isoDateTime(f), anulado: false,
  });
  cajasPasadas.forEach((c, i) => {
    if (i % 4 === 0) {
      const cat = CAT_EGRESO[i % CAT_EGRESO.length];
      movimientos.push(nuevoMov(c, at(new Date(c.fechaInicio), 12, between(0, 59)), "EGRESO", cat, DESC_EGRESO[cat], between(2, 15) * 10));
    }
    if (i % 11 === 5) movimientos.push(nuevoMov(c, at(new Date(c.fechaInicio), 9, 30), "INGRESO", "APORTE_CAPITAL", "Aporte para sencillo", 100));
  });
  const cajeroHoy = cajas.find((c) => c.abierta && c.empleadoId === cajero.id);
  if (cajeroHoy) movimientos.push(nuevoMov(cajeroHoy, new Date(Math.max(hoy.getTime() + 60000, ahora.getTime() - 40 * 60000)), "EGRESO", "GASTO_VARIO", "Compra de bolsas", 20));
  // Garantiza una caja abierta para admin y cajero aunque hoy no haya ventas de uno de ellos
  for (const emp of [admin, cajero]) {
    if (!cajas.some((c) => c.abierta && c.empleadoId === emp.id)) {
      cajas.push({ id: cajas.length + 1, empleadoId: emp.id, empleadoNombre: emp.nombre, fechaInicio: isoDateTime(at(ahora, Math.min(8, ahora.getHours()), 0)), montoInicial: 100, fechaFin: null, montoFinal: null, montoDejado: null, abierta: true });
    }
  }

  // cierre de cajas pasadas: monto final = efectivo esperado (con pequeñas diferencias)
  cajasPasadas.forEach((c, i) => {
    const efectivo = ventas.filter((v) => v.cajaId === c.id && v.estado && v.metodoPago === "EFECTIVO").reduce((s, v) => s + v.total, 0);
    const ing = movimientos.filter((m) => m.cajaId === c.id && m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
    const egr = movimientos.filter((m) => m.cajaId === c.id && m.tipo === "EGRESO").reduce((s, m) => s + m.monto, 0);
    const esperado = c.montoInicial + efectivo + ing - egr;
    const dif = i % 9 === 4 ? -2 : i % 13 === 6 ? 1.5 : 0;
    c.montoFinal = round2(esperado + dif);
    c.montoDejado = c.montoInicial;
    c.fechaFin = isoDateTime(at(new Date(c.fechaInicio), 21, between(20, 55)));
  });

  // ── Asistencias (últimos 14 días) ──
  const asistencias: Asistencia[] = [];
  const hm = (s: string): [number, number] => { const [h, m] = s.split(":").map(Number); return [h, m]; };
  for (let d = 14; d >= 0; d--) {
    const dia = addDays(hoy, -d);
    if (dia.getDay() === 0) continue; // domingo = descanso
    for (const e of empleados) {
      const [he, me] = hm(e.horaEntrada!), [hs, ms] = hm(e.horaSalida!);
      const retraso = r() < 0.25 ? between(11, 35) : between(-8, 8);
      const entrada = at(dia, he, me + retraso);
      if (d === 0 && (entrada > ahora || e.id === almacen.id)) continue;
      const salida = d === 0 ? null : at(dia, hs, ms + between(0, 25));
      const tard = retraso > (empresa.toleranciaMinutos ?? 10);
      asistencias.push({
        id: asistencias.length + 1, empleadoId: e.id, empleadoNombre: e.nombre, fecha: isoDate(dia),
        horaEntrada: isoDateTime(entrada), horaSalida: salida ? isoDateTime(salida) : null, tardanza: tard, minutosTardanza: tard ? retraso : 0,
      });
    }
  }

  return {
    empresa, empleados, permisos, categorias, sucursales, productos, lotes, inicial, clientes, proveedores, ventas, compras,
    traslados, cajas, movimientos, asistencias,
    seq: {
      producto: productos.length, lote: loteId - 1, categoria: categorias.length, sucursal: sucursales.length, cliente: clientes.length,
      proveedor: proveedores.length, empleado: empleados.length, venta: ventas.length, compra: compras.length, traslado: traslados.length,
      caja: cajas.length, movimiento: movimientos.length, asistencia: asistencias.length,
    },
    serie: { serie: "NV001", ultimo: ventas.length },
  };
}

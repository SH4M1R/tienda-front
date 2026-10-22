"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, Trash2, PackagePlus, ExternalLink } from "lucide-react";
import { productosApi } from "@/api/productos";
import type { ProductoPayload } from "@/api/productos";
import { proveedorApi, type Proveedor, type ProveedorRequestDTO } from "@/api/proveedores";
import { comprasApi, IGV_RATE, type CompraRequest, type DetalleCompraItem } from "@/api/compras";
import { MEDIOS_PAGO } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";

// Modales
import CompraProductoModal from "../components/CompraProductoModal";
import CrearProductoModal from "@/app/(app)/productos/components/ProductoModal";
import ProveedorModal from "../proveedores/components/ProveedorModal";

const COMPROBANTES = [
  { value: "FACTURA", label: "Factura" },
  { value: "BOLETA", label: "Boleta" },
  { value: "NOTA DE VENTA", label: "Nota de Venta" },
  { value: "GUÍA DE REMISIÓN", label: "Guía de Remisión" },
  { value: "OTRO", label: "Otro" },
];

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function GenerarCompraPage() {
  const router = useRouter();

  // Cabecera
  const [comprobante, setComprobante] = useState("FACTURA");
  const [serie, setSerie] = useState("");
  const [numero, setNumero] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoy);

  // Proveedores (búsqueda en el servidor)
  const [proveedorQuery, setProveedorQuery] = useState("");
  const consultaProveedor = useDebounce(proveedorQuery.trim(), 250);
  const [opcionesProveedor, setOpcionesProveedor] = useState<Proveedor[]>([]);
  const [mostrarOpcionesProveedor, setMostrarOpcionesProveedor] = useState(false);
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);

  const [precioIncluyeIgv, setPrecioIncluyeIgv] = useState(false);
  const [regularizar, setRegularizar] = useState(false);
  const [percepcion, setPercepcion] = useState("");
  const [descripcion] = useState("");

  const [detalles, setDetalles] = useState<DetalleCompraItem[]>([]);

  // Modales de productos
  const [modalCompraProductoAbierto, setModalCompraProductoAbierto] = useState(false);
  const [modalCrearProductoAbierto, setModalCrearProductoAbierto] = useState(false);

  const [tipoPago, setTipoPago] = useState("CONTADO");
  const [medioPago, setMedioPago] = useState("EFECTIVO");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiereSerie = comprobante === "FACTURA" || comprobante === "BOLETA";

  useEffect(() => {
    const esPopup = window.opener !== null || new URLSearchParams(window.location.search).get("popup") === "true";
    if (esPopup) document.body.classList.add("is-pos-popup");
    return () => { document.body.classList.remove("is-pos-popup"); };
  }, []);

  const abrirVentanaFlotante = () => {
    const width = 1280;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const popupUrl = `${window.location.origin}${window.location.pathname}?popup=true`;
    window.open(
      popupUrl,
      "GenerarCompraPOS",
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
    );
  };

  useEffect(() => {
    if (consultaProveedor.length < 2 || proveedor) { setOpcionesProveedor([]); return; }
    let activo = true;
    proveedorApi.pagina(0, 8, consultaProveedor)
      .then((r) => { if (activo) setOpcionesProveedor(r.data); })
      .catch(() => { if (activo) setOpcionesProveedor([]); });
    return () => { activo = false; };
  }, [consultaProveedor, proveedor]);

  const { subtotal, igv, total, perc } = useMemo(() => {
    const suma = r2(detalles.reduce((a, d) => a + d.importe, 0));
    let sub: number, igvCalc: number, tot: number;
    if (precioIncluyeIgv) {
      tot = suma;
      sub = r2(tot / (1 + IGV_RATE));
      igvCalc = r2(tot - sub);
    } else {
      sub = suma;
      igvCalc = r2(sub * IGV_RATE);
      tot = r2(sub + igvCalc);
    }
    return { subtotal: sub, igv: igvCalc, total: tot, perc: Number(percepcion) || 0 };
  }, [detalles, precioIncluyeIgv, percepcion]);

  const pagar = r2(total + perc);

  function eliminarDetalle(key: string) {
    setDetalles((prev) => prev.filter((d) => d.key !== key));
  }

  async function handleGuardar() {
    setError(null);

    if (!comprobante || !fechaEmision) {
      setError("Completa comprobante y fecha de emisión");
      return;
    }
    if (requiereSerie && (!serie || !numero)) {
      setError("Completa serie y número");
      return;
    }
    if (!proveedor) {
      setError("Selecciona un proveedor");
      return;
    }
    if (detalles.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    const payload: CompraRequest = {
      comprobante,
      serie: serie || null,
      numero: numero || null,
      fechaEmision,
      proveedorId: proveedor.id,
      precioIncluyeIgv,
      descripcion: descripcion || null,
      percepcion: perc,
      tipoPago,
      medioPago,
      regularizar,
      detalles: detalles.map((d) => ({
        productoId: d.productoId,
        lote: d.lote ?? null,
        fechaVencimiento: d.fechaVencimiento ?? null,
        unidadMedida: d.unidadMedida,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
      })),
    };

    setGuardando(true);
    try {
      await comprasApi.crear(payload);
      router.push("/compras");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la compra");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden p-4 md:p-6">
      {/* Header Fijo superior */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-primary tracking-tight">Ingresar Compra</h1>

          <button
            type="button"
            onClick={abrirVentanaFlotante}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold border border-zinc-200 transition-colors cursor-pointer"
            title="Abrir en ventana emergente (F6 desde cualquier página)"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Ventana flotante</span>
          </button>
        </div>
      </div>

      {/* Contenedor Principal flexible */}
      <div className="flex-1 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          {error && (
            <p className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 font-medium">
              {error}
            </p>
          )}

          {/* Fila 1 - Comprobante / Datos Básicos / Método de Pago */}
          <div className="shrink-0 grid grid-cols-12 items-end gap-3">
            <div className="col-span-12 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Comprobante*</label>
              <select
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              >
                {COMPROBANTES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">
                Serie{requiereSerie && "*"}
              </label>
              <input
                value={serie}
                onChange={(e) => setSerie(e.target.value.toUpperCase())}
                placeholder={requiereSerie ? "F001" : "Opcional"}
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">
                Número{requiereSerie && "*"}
              </label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder={requiereSerie ? "00000001" : "Opcional"}
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="col-span-8 sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Fecha Emisión*</label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="col-span-4 sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Método de Pago</label>
              <div className="flex gap-1.5">
                <select
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </select>
                <select
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
                >
                  {MEDIOS_PAGO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fila 2 - Proveedor & Acciones de Producto */}
          <div className="shrink-0 grid grid-cols-12 items-end gap-4">
            <div className="relative col-span-12 lg:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Proveedor*</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    value={proveedor ? proveedor.nombres : proveedorQuery}
                    onChange={(e) => {
                      setProveedor(null);
                      setProveedorQuery(e.target.value);
                      setMostrarOpcionesProveedor(true);
                    }}
                    onFocus={() => setMostrarOpcionesProveedor(true)}
                    placeholder="Buscar RUC o Razon Social..."
                    className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
                  />
                  {mostrarOpcionesProveedor && opcionesProveedor.length > 0 && !proveedor && (
                    <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
                      {opcionesProveedor.map((p) => (
                        <li
                          key={p.id}
                          onClick={() => {
                            setProveedor(p);
                            setMostrarOpcionesProveedor(false);
                          }}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-zinc-50 transition-colors"
                        >
                          <p className="font-semibold text-zinc-800">{p.nombres}</p>
                          <p className="text-xs text-zinc-400 font-mono">{p.numeroDocumento}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setModalProveedorAbierto(true)}
                  className="rounded-xl bg-primary px-2.5 py-1.5 text-white hover:bg-primary-dark transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                  title="Nuevo proveedor"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="col-span-6 lg:col-span-2 flex items-center gap-2 pb-1.5">
              <input
                type="checkbox"
                id="chk-igv"
                checked={precioIncluyeIgv}
                onChange={(e) => setPrecioIncluyeIgv(e.target.checked)}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
              <div>
                <label htmlFor="chk-igv" className="text-xs font-semibold text-zinc-600 cursor-pointer">
                  Incluye IGV
                </label>
              </div>
            </div>

            <div className="col-span-6 lg:col-span-2 flex items-center gap-2 pb-1.5">
              <input
                type="checkbox"
                id="chk-reg"
                checked={regularizar}
                onChange={(e) => setRegularizar(e.target.checked)}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
              <label htmlFor="chk-reg" className="text-xs font-semibold text-zinc-600 cursor-pointer">Por regularizar</label>
            </div>

            {/* BOTONES DE AGREGAR Y CREAR PRODUCTO */}
            <div className="col-span-12 lg:col-span-4 flex gap-2">
              <button
                type="button"
                onClick={() => setModalCompraProductoAbierto(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-1.5 px-2 text-xs font-semibold text-white hover:bg-primary-dark transition-colors cursor-pointer"
              >
                <ShoppingCart size={15} /> AGREGAR PROD
              </button>
              <button
                type="button"
                onClick={() => setModalCrearProductoAbierto(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-primary text-primary hover:bg-primary/5 py-1.5 px-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                <PackagePlus size={15} /> NUEVO PROD
              </button>
            </div>
          </div>

          {/* TABLA CON TAMAÑO FIJO Y SCROLL INTERNO */}
      <div className="flex-1 min-h-[180px] flex flex-col rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-100 shadow-xs">
                  <tr className="border-b border-zinc-200 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2">Lote</th>
                    <th className="px-3 py-2">F. Venc.</th>
                    <th className="px-3 py-2">U.M</th>
                    <th className="px-3 py-2">Cant</th>
                    <th className="px-3 py-2">P.U</th>
                    <th className="px-3 py-2">Importe</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-16 text-center text-zinc-400 text-sm">
                        Aún no has agregado productos a la compra
                      </td>
                    </tr>
                  ) : (
                    detalles.map((d) => (
                      <tr key={d.key} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-3 py-2 font-medium text-zinc-800 text-xs">{d.nombreProducto}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">{d.lote ?? "-"}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">{d.fechaVencimiento ?? "-"}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">{d.unidadMedida === "CAJA" ? "Caja" : d.unidadMedida === "KG" ? "Kg" : "Unidad"}</td>
                        <td className="px-3 py-2 font-semibold text-zinc-800 text-xs">{d.cantidad}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">S/ {d.precioUnitario.toFixed(2)}</td>
                        <td className="px-3 py-2 font-semibold text-zinc-800 text-xs">S/ {d.importe.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => eliminarDetalle(d.key)}
                            className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER: Totales y Botón Guardar (Siempre visible al final) */}
        <div className="pt-3 border-t border-zinc-100 shrink-0 space-y-3">
          {/* Totales */}
          <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/80">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">SUBTOTAL</p>
                <p className="text-sm font-bold text-zinc-700">S/ {subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">IGV</p>
                <p className="text-sm font-bold text-zinc-700">S/ {igv.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">PERCEPCIÓN</p>
                <input
                  type="number" min={0} step="0.01" value={percepcion}
                  onChange={(e) => setPercepcion(e.target.value)}
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-zinc-200 bg-white py-0.5 px-2 text-sm font-bold text-zinc-700 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">TOTAL</p>
                <p className="text-sm font-bold text-zinc-700">S/ {total.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-primary">A PAGAR</p>
              <p className="text-base font-black text-primary">S/ {pagar.toFixed(2)}</p>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleGuardar}
              disabled={guardando}
              className="w-full sm:w-auto rounded-xl bg-primary px-8 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              {guardando ? "GUARDANDO..." : "GUARDAR COMPRA"}
            </button>
          </div>
        </div>
      </div>


      {/* Modal para AGREGAR un ítem al detalle de compra */}
      <CompraProductoModal
        open={modalCompraProductoAbierto}
        onClose={() => setModalCompraProductoAbierto(false)}
        onAgregar={(item) => setDetalles((prev) => [...prev, item])}
      />

      {/* Modal para CREAR un producto totalmente nuevo en el catálogo */}
      <CrearProductoModal
        open={modalCrearProductoAbierto}
        producto={null}
        onClose={() => setModalCrearProductoAbierto(false)}
        onSave={async (data: ProductoPayload) => productosApi.crear(data)}
      />

      {/* Modal para CREAR Proveedor */}
      <ProveedorModal
        open={modalProveedorAbierto}
        onClose={() => setModalProveedorAbierto(false)}
        onSave={async (data: ProveedorRequestDTO) => {
          const nuevo = await proveedorApi.crear(data);
          setProveedor(nuevo);
          setModalProveedorAbierto(false);
        }}
      />
    </div>
  );
}

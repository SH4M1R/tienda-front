"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Layers, PackagePlus } from "lucide-react";
import type { DetalleCompraItem, UnidadMedida } from "@/api/compras";
import { productosApi, type Producto } from "@/api/productos";
import { useDebounce } from "@/hooks/useDebounce";

interface ProductoModalProps {
  open: boolean;
  onClose: () => void;
  onAgregar: (item: DetalleCompraItem) => void;
}

export default function ProductoModal({ open, onClose, onAgregar }: ProductoModalProps) {
  const [query, setQuery] = useState("");
  const consulta = useDebounce(query.trim(), 250);
  const [opciones, setOpciones] = useState<Producto[]>([]);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [producto, setProducto] = useState<Producto | null>(null);

  const [unidadMedida, setUnidadMedida] = useState<UnidadMedida>("UNIDAD");
  const [cantidad, setCantidad] = useState<number | "">("");
  const [precioCompra, setPrecioCompra] = useState<number | "">("");
  const [importe, setImporte] = useState<number | "">("");
  const [precioVenta, setPrecioVenta] = useState<number>(0);
  const [codigoLote, setCodigoLote] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);

  // Búsqueda en el servidor (solo productos activos)
  useEffect(() => {
    if (!open || !consulta || producto) { setOpciones([]); return; }
    let activo = true;
    productosApi.buscar(consulta, 15).then((r) => { if (activo) setOpciones(r); }).catch(() => { if (activo) setOpciones([]); });
    return () => { activo = false; };
  }, [consulta, producto, open]);

  const factorProducto = producto?.factor && producto.factor > 1 ? producto.factor : producto?.unidadesCaja && producto.unidadesCaja > 1 ? producto.unidadesCaja : 1;
  const compraPorCajas = factorProducto > 1;

  const seleccionarProducto = (p: Producto) => {
    setProducto(p);
    setMostrarOpciones(false);
    const f = p.factor && p.factor > 1 ? p.factor : p.unidadesCaja && p.unidadesCaja > 1 ? p.unidadesCaja : 1;
    setUnidadMedida(f > 1 ? "CAJA" : "UNIDAD");
    setPrecioCompra("");
    setImporte("");
    setPrecioVenta(p.precioVenta);
    setErrorPrecio(null);
  };

  const cambiarUnidadMedida = (v: UnidadMedida) => {
    setUnidadMedida(v);
    setPrecioCompra("");
    setImporte("");
  };

  const precioSugerido = producto
    ? unidadMedida === "CAJA" ? producto.precioCompra * factorProducto : producto.precioCompra
    : 0;

  const factorConversion = unidadMedida === "CAJA" ? factorProducto : 1;

  const unidadesIngresadas = useMemo(() => {
    const cant = typeof cantidad === "number" ? cantidad : 0;
    return cant * factorConversion;
  }, [cantidad, factorConversion]);

  function handleCantidadChange(valor: string) {
    if (valor === "") {
      setCantidad("");
      const precio = typeof precioCompra === "number" ? precioCompra : 0;
      setImporte(precio > 0 ? 0 : "");
      return;
    }
    const nuevaCantidad = Math.max(0, Math.floor(Number(valor)));
    setCantidad(nuevaCantidad);
    const precio = typeof precioCompra === "number" ? precioCompra : 0;
    setImporte(Number((nuevaCantidad * precio).toFixed(2)));
  }

  function handlePrecioCompraChange(valor: string) {
    if (valor === "") {
      setPrecioCompra("");
      setImporte("");
      return;
    }
    const nuevoPrecio = Number(valor);
    setPrecioCompra(nuevoPrecio);
    const cant = typeof cantidad === "number" ? cantidad : 0;
    setImporte(Number((cant * nuevoPrecio).toFixed(2)));
  }

  function handleImporteChange(valor: string) {
    if (valor === "") {
      setImporte("");
      setPrecioCompra("");
      return;
    }
    const nuevoImporte = Number(valor);
    setImporte(nuevoImporte);
    const cant = typeof cantidad === "number" ? cantidad : 0;
    setPrecioCompra(cant > 0 ? Number((nuevoImporte / cant).toFixed(4)) : "");
  }

  function limpiarFormulario() {
    setQuery("");
    setOpciones([]);
    setProducto(null);
    setUnidadMedida("UNIDAD");
    setCantidad("");
    setPrecioCompra("");
    setImporte("");
    setPrecioVenta(0);
    setCodigoLote("");
    setFechaVencimiento("");
    setMostrarOpciones(false);
    setErrorPrecio(null);
  }

  function handleCerrar() {
    limpiarFormulario();
    onClose();
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    const cantidadNum = typeof cantidad === "number" ? cantidad : 0;
    const precioCompraNum = typeof precioCompra === "number" ? precioCompra : 0;
    const importeNum = typeof importe === "number" ? importe : 0;
    if (!producto || !cantidadNum || cantidadNum <= 0 || !precioCompraNum) return;

    // Costo por unidad = importe / unidades netas
    const costoUnidad = unidadesIngresadas > 0 ? Number((importeNum / unidadesIngresadas).toFixed(4)) : 0;

    // Actualiza costo y precio de venta de la ficha del producto
    try {
      await productosApi.actualizar(producto.id, {
        nombre: producto.nombre,
        precioCompra: costoUnidad,
        precioVenta,
        stockMinimo: producto.stockMinimo,
        estado: producto.estado,
        barras: producto.barras,
        unidadesCaja: producto.unidadesCaja,
        precioCaja: producto.precioCaja,
        factor: producto.factor,
        categoriaId: producto.categoriaId,
      });
    } catch (err) {
      console.error("No se pudo actualizar el precio de venta del producto:", err);
      setErrorPrecio("No se pudo actualizar el precio de venta del producto, pero la compra continuará.");
    }

    onAgregar({
      key: crypto.randomUUID(),
      productoId: producto.id,
      nombreProducto: producto.nombre,
      unidadMedida,
      lote: codigoLote || undefined,
      fechaVencimiento: fechaVencimiento || undefined,
      cantidad: cantidadNum,
      precioUnitario: Number((importeNum / cantidadNum).toFixed(4)),
      importe: importeNum,
    });

    limpiarFormulario();
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-zinc-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-2">
            <PackagePlus size={18} className="text-primary transition-colors duration-300" />
            <h2 className="text-sm font-bold text-zinc-800">Agregar Producto a la Compra</h2>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAgregar} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative space-y-1">
              <label className={labelClass}>Buscar Producto *</label>
              <div className="relative">
                <input
                  autoFocus
                  value={
                    producto
                      ? producto.nombre
                      : query
                  }
                  onChange={(e) => {
                    setProducto(null);
                    setQuery(e.target.value);
                    setMostrarOpciones(true);
                  }}
                  onFocus={() => setMostrarOpciones(true)}
                  placeholder="Escribe el nombre o código de barras..."
                  className={`${inputClass} pl-9 pr-8 font-medium`}
                />
                <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                {producto && (
                  <button
                    type="button"
                    onClick={() => {
                      setProducto(null);
                      setQuery("");
                    }}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {mostrarOpciones && opciones.length > 0 && !producto && (
                <ul className="absolute z-20 mt-1 max-h-56 w-[700px] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
                  {opciones.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => seleccionarProducto(p)}
                      className="cursor-pointer px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-800 truncate">
                          {p.nombre}
                        </p>
                        {p.barras && (
                          <p className="text-xs text-zinc-400 font-mono">{p.barras}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                        Stock: {p.stockActual}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Tipo de Ingreso</label>
              <select
                value={unidadMedida}
                onChange={(e) => cambiarUnidadMedida(e.target.value as UnidadMedida)}
                className={inputClass}
              >
                {(!producto || compraPorCajas) && (
                  <option value="CAJA">Por Caja / Paquete</option>
                )}
                <option value="UNIDAD">Por Unidad</option>
              </select>
              {producto && !compraPorCajas && (
                <p className="text-[11px] text-zinc-400">
                  Este producto se compra por unidad (su factor es 1).
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className={labelClass}>{unidadMedida === "CAJA" ? "Cajas / Paquetes Ingresados" : "Unidades Ingresadas"}</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={cantidad}
                  onChange={(e) => handleCantidadChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "." || e.key === ",") e.preventDefault();
                  }}
                  className={`${inputClass} pl-8`}
                  placeholder="0"
                />
                <Layers className="absolute left-2.5 top-2.5 text-primary" size={15} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>
                Unidades Netas Ingresadas
                {unidadMedida === "CAJA" && producto && (
                  <span className="ml-1 font-normal text-zinc-400">(x{factorConversion})</span>
                )}
              </label>
              <input
                readOnly
                value={unidadesIngresadas}
                className={`${inputClass} bg-zinc-100 font-bold text-zinc-800`}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{unidadMedida === "CAJA" ? "Precio de Compra (por caja/paquete)" : "Precio de Compra (por unidad)"}</label>
              <input
                type="number"
                step="any"
                value={precioCompra}
                onChange={(e) => handlePrecioCompraChange(e.target.value)}
                placeholder={precioSugerido ? precioSugerido.toFixed(2) : "0.00"}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Importe (S/)</label>
              <input
                type="number"
                step="any"
                value={importe}
                onChange={(e) => handleImporteChange(e.target.value)}
                placeholder="0.00"
                className={`${inputClass} font-bold text-zinc-800`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Precio de Venta (por unidad)</label>
              <input
                type="number"
                step="any"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(Number(e.target.value))}
                className={`${inputClass} font-bold text-emerald-600`}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Código de Lote</label>
              <input
                value={codigoLote}
                onChange={(e) => setCodigoLote(e.target.value)}
                placeholder="Ej. L-2024-001"
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Fecha de Vencimiento</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {errorPrecio && <p className="text-[11px] text-red-500">{errorPrecio}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 shrink-0">
            <button
              type="button"
              onClick={handleCerrar}
              className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!producto || !cantidad || cantidad <= 0 || !precioCompra}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              Agregar Producto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
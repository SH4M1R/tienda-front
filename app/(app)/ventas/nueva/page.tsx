"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Pencil, Plus, ScanBarcode, ShoppingCart, Trash2, User, X } from "lucide-react";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useBarcodeScanner, useFetch } from "@/lib/hooks";
import { money } from "@/lib/format";
import { COMPROBANTES, MEDIOS_PAGO, type Caja, type Cliente, type MedioPago, type Producto, type TipoComprobante, type TipoUnidad, type Venta } from "@/lib/types";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Loading, Modal, cn, inputCls } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import ProductSearch from "@/components/ProductSearch";
import PesoModal from "@/components/PesoModal";
import { fmtPeso, gramosAPrecio } from "@/lib/peso";
import EntitySearch from "@/components/EntitySearch";
import { CajaCerradaModal } from "@/components/CajaCerradaModal";

interface Line { producto: Producto; cantidad: number; tipo: TipoUnidad }
const factorOf = (p: Producto) => p.factor ?? p.unidadesCaja ?? 1;
// PESO: cantidad = gramos y precioVenta = precio por kg. Para el resto, precio por unidad/caja.
const unitPrice = (l: Line) => (l.tipo === "CAJA" ? l.producto.precioCaja ?? 0 : l.producto.precioVenta);
const lineTotal = (l: Line) => (l.tipo === "PESO" ? gramosAPrecio(l.producto.precioVenta, l.cantidad) : unitPrice(l) * l.cantidad);
const unitsOf = (l: Line) => l.cantidad * (l.tipo === "CAJA" ? factorOf(l.producto) : 1);
const canBox = (p: Producto) => !p.porPeso && p.precioCaja != null && (p.factor != null || p.unidadesCaja != null);

export default function NuevaVentaPage() {
  const toast = useFeedback();
  const router = useRouter();
  const caja = useFetch<Caja>("/api/caja/actual");
  const searchRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<Line[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [comprobante, setComprobante] = useState<TipoComprobante>("NOTA_VENTA");
  const [medio, setMedio] = useState<MedioPago>("EFECTIVO");
  const [recibido, setRecibido] = useState("");
  const [izipay, setIzipay] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);

  // Producto por peso pendiente de pesar (index = línea que se edita, o null si se agrega)
  const [pesoTarget, setPesoTarget] = useState<{ producto: Producto; index: number | null; n: number } | null>(null);

  const total = useMemo(() => Math.round(cart.reduce((a, l) => a + lineTotal(l), 0) * 100) / 100, [cart]);
  const items = useMemo(() => cart.reduce((a, l) => a + (l.tipo === "PESO" ? 1 : l.cantidad), 0), [cart]);
  const vuelto = medio === "EFECTIVO" && recibido !== "" ? Number(recibido) - total : null;

  const addProduct = useCallback((p: Producto) => {
    if (p.stockActual <= 0) {
      toast.error(`El producto "${p.nombre}" no tiene stock disponible`);
      return;
    }

    if (p.porPeso) { setPesoTarget((t) => ({ producto: p, index: null, n: (t?.n ?? 0) + 1 })); return; }

    setCart((c) => {
      // Calcular unidades totales ya ocupadas en el carrito para este producto
      const totalUnitsInCart = c
        .filter((l) => l.producto.id === p.id)
        .reduce((sum, l) => sum + unitsOf(l), 0);

      if (totalUnitsInCart + 1 > p.stockActual) {
        toast.error(`Stock insuficiente para "${p.nombre}". Disponible: ${p.stockActual} und.`);
        return c;
      }

      const i = c.findIndex((l) => l.producto.id === p.id && l.tipo === "UNIDAD");
      if (i >= 0) {
        const n = [...c];
        n[i] = { ...n[i], cantidad: n[i].cantidad + 1 };
        return n;
      }
      return [...c, { producto: p, cantidad: 1, tipo: "UNIDAD" }];
    });

    setFlash(p.id);
    setTimeout(() => setFlash((f) => (f === p.id ? null : f)), 700);
  }, [toast]);

  /** Confirma el peso del modal: agrega (o suma al existente) o reemplaza la línea que se edita. */
  function confirmarPeso(gramos: number) {
    const t = pesoTarget;
    if (!t) return;
    const p = t.producto;
    setCart((c) => {
      if (t.index !== null) return c.map((l, k) => (k === t.index ? { ...l, cantidad: gramos } : l));
      const i = c.findIndex((l) => l.producto.id === p.id && l.tipo === "PESO");
      if (i >= 0) return c.map((l, k) => (k === i ? { ...l, cantidad: l.cantidad + gramos } : l));
      return [...c, { producto: p, cantidad: gramos, tipo: "PESO" }];
    });
    setPesoTarget(null);
    setFlash(p.id);
    setTimeout(() => setFlash((f) => (f === p.id ? null : f)), 700);
  }
  // Peso máximo para el modal: stock menos lo que ya hay en el carrito (sin contar la línea que se edita)
  const pesoMax = pesoTarget
    ? pesoTarget.producto.stockActual - cart.reduce((a, l, k) => (l.producto.id === pesoTarget.producto.id && k !== pesoTarget.index ? a + unitsOf(l) : a), 0)
    : 0;
  const pesoInicial = pesoTarget?.index != null ? cart[pesoTarget.index]?.cantidad ?? 0 : 0;

  // Pistola de códigos de barras cuando el cursor no está en un campo de texto
  useBarcodeScanner(async (code) => {
    try { addProduct(await api<Producto>(`/api/productos/barras/${encodeURIComponent(code)}`)); }
    catch (e) { toast.error(e instanceof ApiError && e.status === 404 ? `Código ${code} no registrado` : errorMessage(e)); }
  }, !!caja.data && !pagoOpen);

  function setLine(i: number, patch: Partial<Line>) {
    setCart((c) => {
      const line = c[i];
      if (!line) return c;

      const newTipo = patch.tipo ?? line.tipo;
      const newCantidad = patch.cantidad ?? line.cantidad;
      const factor = newTipo === "CAJA" ? factorOf(line.producto) : 1;
      
      // Unidades ocupadas por OTRAS líneas del mismo producto en el carrito
      const otherUnits = c
        .filter((x, k) => k !== i && x.producto.id === line.producto.id)
        .reduce((sum, x) => sum + unitsOf(x), 0);

      const maxUnitsAvailable = line.producto.stockActual - otherUnits;
      const maxCantidad = Math.floor(maxUnitsAvailable / factor);

      if (maxCantidad < 1) {
        toast.error(`Stock máximo alcanzado para "${line.producto.nombre}"`);
        return c;
      }

      let finalCantidad = newCantidad;
      if (newCantidad > maxCantidad) {
        finalCantidad = maxCantidad;
        toast.error(`Solo hay stock suficiente para ${maxCantidad} ${newTipo === "CAJA" ? "caja(s)" : "unidad(es)"}`);
      }

      return c.map((l, k) => (k === i ? { ...l, ...patch, cantidad: finalCantidad } : l));
    });
  }

  function changeTipo(i: number, tipo: TipoUnidad) {
    setCart((c) => {
      const l = c[i];
      if (!l) return c;

      const factor = tipo === "CAJA" ? factorOf(l.producto) : 1;
      const otherUnits = c
        .filter((x, k) => k !== i && x.producto.id === l.producto.id)
        .reduce((sum, x) => sum + unitsOf(x), 0);

      const maxUnitsAvailable = l.producto.stockActual - otherUnits;
      const unitsNeeded = l.cantidad * factor;

      if (unitsNeeded > maxUnitsAvailable) {
        toast.error(`No hay suficiente stock para cambiar a cajas (${unitsNeeded} unds. necesarias, disponible: ${maxUnitsAvailable})`);
        return c;
      }

      const dup = c.findIndex((x, k) => k !== i && x.producto.id === l.producto.id && x.tipo === tipo);
      if (dup >= 0) {
        const n = c.map((x, k) => (k === dup ? { ...x, cantidad: x.cantidad + l.cantidad } : x));
        return n.filter((_, k) => k !== i);
      }

      return c.map((x, k) => (k === i ? { ...x, tipo } : x));
    });
  }

  const cobrarRef = useRef<() => void>(() => {});
  /** Valida la venta y abre el modal flotante de método de pago. */
  function abrirPago() {
    if (!caja.data) { toast.error("Debe aperturar su caja"); return; }
    if (cart.length === 0) { toast.error("Agregue al menos un producto"); return; }
    
    // Verificar si algún producto excede el stock antes de cobrar
    for (const line of cart) {
      if (unitsOf(line) > line.producto.stockActual) {
        toast.error(`El producto "${line.producto.nombre}" excede el stock disponible`);
        return;
      }
    }

    if (comprobante === "FACTURA" && !cliente) { toast.error("La factura requiere un cliente"); return; }
    if (comprobante === "BOLETA" && !cliente && total >= 700) { toast.error("Boletas desde S/ 700 requieren identificar al cliente"); return; }
    setPagoOpen(true);
  }

  async function cobrar() {
    if (!caja.data) { toast.error("Debe aperturar su caja"); return; }
    if (cart.length === 0) { toast.error("Agregue al menos un producto"); return; }
    if (medio === "EFECTIVO" && (recibido === "" || Number(recibido) < total)) { toast.error("El monto recibido es menor al total"); return; }
    // Se abre la pestaña ahora (acción del usuario) para que el navegador no bloquee el comprobante; se completa al registrar la venta.
    const ventanaComprobante = window.open("about:blank", "_blank");
    setSaving(true);
    try {
      const v = await api<Venta>("/api/ventas", {
        body: {
          tipoVenta: comprobante, metodoPago: medio, clienteId: cliente?.id ?? null,
          montoRecibido: medio === "EFECTIVO" ? Number(recibido) : null, codigoIzipay: medio === "TARJETA" && izipay ? izipay : null,
          detalles: cart.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad, tipoVenta: l.tipo })),
        },
      });
      const url = `/ventas/boleta?id=${v.id}${v.vuelto ? `&vuelto=${v.vuelto.toFixed(2)}` : ""}`;
      if (ventanaComprobante) ventanaComprobante.location.href = url;
      else window.open(url, "_blank");
      setPagoOpen(false);
      setCart([]); setCliente(null); setRecibido(""); setIzipay(""); setComprobante("NOTA_VENTA"); setMedio("EFECTIVO");
      toast.success(`Venta ${v.comprobante} registrada${v.vuelto && v.vuelto > 0 ? ` · Vuelto ${money(v.vuelto)}` : ""}`);
      setTimeout(() => searchRef.current?.focus(), 50);
    } catch (e) {
      ventanaComprobante?.close();
      toast.error(errorMessage(e));
    } finally { setSaving(false); }
  }

  useEffect(() => { cobrarRef.current = pagoOpen ? cobrar : abrirPago; });
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "F9") { e.preventDefault(); cobrarRef.current(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  async function clientePorDni(text: string) {
    if (!/^(\d{8}|\d{11})$/.test(text)) { toast.info("Ingrese un DNI (8 dígitos) o RUC (11 dígitos) y presione Enter"); return; }
    try { setCliente(await api<Cliente>(`/api/clientes/${text.length === 11 ? "ruc" : "dni"}/${text}/registrar`, { method: "POST" })); }
    catch (e) { toast.error(errorMessage(e)); }
  }

  if (caja.loading) return <Loading />;

  // Sin caja abierta no se puede generar ventas: modal que lleva a Arqueo de caja.
  if (!caja.data) {
    return (
      <CajaCerradaModal
        open
        onClose={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        onIrAArqueo={() => router.push("/caja/arqueo")}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-4 overflow-hidden">
      {/* Cabecera Venta */}
      <Card className="shrink-0 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <h1 className="shrink-0 text-2xl font-semibold tracking-tight text-slate-900">Generar venta</h1>

          <div className="min-w-0 flex-1">
            {cliente ? (
              <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm"><User className="h-4 w-4 shrink-0 text-primary-700" /><span className="truncate font-medium">{cliente.nombreCompleto}</span>{cliente.dni && <span className="text-xs text-slate-500">{cliente.dni}</span>}</span>
                <button onClick={() => setCliente(null)} className="text-slate-400 hover:text-red-600" aria-label="Quitar cliente"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <EntitySearch<Cliente> endpoint="/api/clientes" placeholder="Público general · buscar o digitar DNI/RUC + Enter" onSelect={setCliente} onEnterText={clientePorDni}
                render={(c) => <><span className="font-medium">{c.nombreCompleto}</span> <span className="text-xs text-slate-500">{c.dni}</span></>} />
            )}
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-2 lg:w-96">
            {COMPROBANTES.map((c) => (
              <button key={c.value} type="button" disabled={!c.disponible} onClick={() => setComprobante(c.value)}
                title={c.disponible ? `Serie ${c.serie}` : "Disponible cuando se conecte con el SFS de SUNAT"}
                className={cn("rounded-lg border px-2 py-2 text-xs font-medium", !c.disponible ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300" : comprobante === c.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-300 text-slate-600 hover:bg-slate-50")}>
                {c.label}{!c.disponible && <span className="block text-[10px] font-normal">Próximamente</span>}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Área Principal (Buscador + Carrito / Resumen) */}
      <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col h-full min-h-0 gap-4">
          <Card className="shrink-0 p-4">
            <ProductSearch onSelect={addProduct} autoFocus inputRef={searchRef} />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><ScanBarcode className="h-3.5 w-3.5" />Con la pistola, el producto se agrega directo al carrito al escanear.</p>
          </Card>

          {/* Carrito con Scroll Interno */}
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardHeader title="Carrito" subtitle={`${items} artículo(s)`}
              actions={cart.length > 0 && <Button size="sm" variant="ghost" onClick={() => setCart([])}><Trash2 className="h-4 w-4 text-red-600"/>Vaciar</Button>} />
            
            <div className="flex-1 overflow-y-auto min-h-0">
              {cart.length === 0 ? <EmptyState title="El carrito está vacío" description="Busca un producto o escanea su código para comenzar." /> : (
                <ul className="divide-y divide-slate-100">
                  {cart.map((l, i) => {
                    const totalUnits = unitsOf(l);
                    const over = totalUnits > l.producto.stockActual;
                    const maxAllowedUnits = l.producto.stockActual - cart
                      .filter((x, k) => k !== i && x.producto.id === l.producto.id)
                      .reduce((sum, x) => sum + unitsOf(x), 0);
                    const factor = l.tipo === "CAJA" ? factorOf(l.producto) : 1;
                    const maxAllowedCount = Math.floor(maxAllowedUnits / factor);
                    const isPlusDisabled = l.cantidad >= maxAllowedCount;

                    if (l.tipo === "PESO") {
                      return (
                        <li key={`${l.producto.id}-${l.tipo}`} className={cn("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors sm:grid-cols-[1fr_auto_auto]", flash === l.producto.id && "bg-primary-50")}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{l.producto.nombre}</p>
                            <p className="text-xs text-slate-500">{money(l.producto.precioVenta)} por kg {over && <Badge tone="red">Stock disponible: {fmtPeso(l.producto.stockActual)}</Badge>}</p>
                          </div>
                          <button type="button" onClick={() => setPesoTarget({ producto: l.producto, index: i, n: 0 })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100" aria-label="Cambiar peso">
                            {fmtPeso(l.cantidad)}<Pencil className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                          <div className="flex items-center justify-end gap-2">
                            <span className="w-24 text-right text-sm font-semibold tabular-nums">{money(lineTotal(l))}</span>
                            <button onClick={() => setCart((c) => c.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar"><X className="h-4 w-4" /></button>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={`${l.producto.id}-${l.tipo}`} className={cn("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors sm:grid-cols-[1fr_auto_auto_auto]", flash === l.producto.id && "bg-primary-50")}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{l.producto.nombre}</p>
                          <p className="text-xs text-slate-500">{money(unitPrice(l))} c/u {over && <Badge tone="red">Stock disponible: {l.producto.stockActual} und</Badge>}</p>
                        </div>
                        {canBox(l.producto) ? (
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
                            {(["UNIDAD", "CAJA"] as TipoUnidad[]).map((t) => (
                              <button key={t} onClick={() => changeTipo(i, t)} className={cn("rounded-md px-2 py-1 font-medium", l.tipo === t ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100")}>{t === "UNIDAD" ? "Und" : `Caja x${factorOf(l.producto)}`}</button>
                            ))}
                          </div>
                        ) : <span className="hidden text-xs text-slate-400 sm:block">Unidad</span>}
                        
                        <div className="inline-flex items-center rounded-lg border border-slate-300">
                          <button className="p-2 text-slate-600 hover:bg-slate-100" onClick={() => l.cantidad <= 1 ? setCart((c) => c.filter((_, k) => k !== i)) : setLine(i, { cantidad: l.cantidad - 1 })} aria-label="Quitar uno"><Minus className="h-3.5 w-3.5" /></button>
                          <input type="number" min={1} value={l.cantidad} onChange={(e) => setLine(i, { cantidad: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="w-12 border-x border-slate-300 py-1.5 text-center text-sm focus:outline-none" />
                          <button 
                            disabled={isPlusDisabled} 
                            className={cn("p-2 text-slate-600 hover:bg-slate-100", isPlusDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent")} 
                            onClick={() => setLine(i, { cantidad: l.cantidad + 1 })} 
                            aria-label="Agregar uno"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <span className="w-24 text-right text-sm font-semibold tabular-nums">{money(lineTotal(l))}</span>
                          <button onClick={() => setCart((c) => c.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar"><X className="h-4 w-4" /></button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Resumen */}
        <Card className="flex flex-col h-full justify-between">
          <CardHeader title="Resumen" />
          <div className="space-y-4 p-5">
            <div className="space-y-1 rounded-lg bg-slate-900 p-4 text-white">
              <div className="flex justify-between text-sm text-slate-300"><span>Artículos</span><span>{items}</span></div>
              <div className="flex items-end justify-between"><span className="text-sm text-slate-300">Total</span><span className="text-3xl font-semibold">{money(total)}</span></div>
            </div>

            <Button size="lg" className="w-full" onClick={abrirPago} disabled={cart.length === 0}><ShoppingCart className="h-5 w-5" />Cobrar (F9)</Button>
          </div>
        </Card>
      </div>

      {pesoTarget && (
        <PesoModal key={`${pesoTarget.producto.id}-${pesoTarget.index}-${pesoTarget.n}`} nombre={pesoTarget.producto.nombre} precioKg={pesoTarget.producto.precioVenta}
          maxGramos={pesoMax} gramosIniciales={pesoInicial} onConfirm={confirmarPeso} onClose={() => setPesoTarget(null)} />
      )}

      <Modal open={pagoOpen} onClose={() => !saving && setPagoOpen(false)} title="Método de pago" size="sm"
        footer={<><Button variant="secondary" onClick={() => setPagoOpen(false)} disabled={saving}>Cancelar</Button>
          <Button loading={saving} onClick={cobrar} disabled={medio === "EFECTIVO" && (recibido === "" || Number(recibido) < total)}><Check className="h-4 w-4" />Confirmar venta (F9)</Button></>}>
        <div className="space-y-4">
          <div className="space-y-1 rounded-lg bg-slate-900 p-4 text-white">
            <div className="flex justify-between text-sm text-slate-300"><span>{COMPROBANTES.find((c) => c.value === comprobante)?.label} · {items} artículo(s)</span><span className="max-w-[50%] truncate">{cliente?.nombreCompleto ?? "Público general"}</span></div>
            <div className="flex items-end justify-between"><span className="text-sm text-slate-300">Total a cobrar</span><span className="text-3xl font-semibold">{money(total)}</span></div>
            {vuelto !== null && <div className={cn("flex justify-between border-t border-white/10 pt-2 text-sm", vuelto < 0 ? "text-red-300" : "text-emerald-300")}><span>{vuelto < 0 ? "Falta" : "Vuelto"}</span><span className="font-semibold">{money(Math.abs(vuelto))}</span></div>}
          </div>
          <Field label="Método de pago">
            <div className="grid grid-cols-2 gap-2">
              {MEDIOS_PAGO.map((m) => (
                <button key={m.value} onClick={() => setMedio(m.value)} className={cn("rounded-lg border px-2 py-2 text-xs font-medium", medio === m.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-300 text-slate-600 hover:bg-slate-50")}>{m.label}</button>
              ))}
            </div>
          </Field>

          {medio === "EFECTIVO" && (
            <div className="space-y-2">
              <Field label="Monto recibido"><input type="number" min="0" step="0.01" className={inputCls} value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="0.00" /></Field>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setRecibido(total.toFixed(2))} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200">Exacto</button>
                {[10, 20, 50, 100, 200].map((n) => <button key={n} onClick={() => setRecibido(String(n))} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200">{n}</button>)}
              </div>
            </div>
          )}
          {medio === "TARJETA" && <Field label="Código Izipay" hint="Opcional"><input className={inputCls} value={izipay} onChange={(e) => setIzipay(e.target.value)} maxLength={100} /></Field>}

        </div>
      </Modal>
    </div>
  );
}
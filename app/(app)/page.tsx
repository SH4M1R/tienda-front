'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, ShoppingBag, ArrowUpRight, ArrowDownRight, Minus,
  Wallet, CalendarDays, AlertTriangle, Bell, Package, ExternalLink,
  Search, Receipt, Inbox, Users,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NAV } from '@/lib/nav';
import { useConfig } from '@/lib/config-context';
import { daysAgo, today } from '@/lib/format';
import { medioLabel } from '@/lib/types';
import type { ComprasReporte, Dashboard, Horario, ProductoVenta, VentasReporte } from '@/lib/types';

import type {
  EvolucionVentasItem,
  ComprasVsVentasItem,
  CategoriaPieItem,
  RankingEmpleadoItem,
  ComprasProveedorItem,
  EvolucionVentasCardProps,
  ComprasVsVentasCardProps,
  HeatmapCardProps,
  CategoriaPieCardProps,
  RankingEmpleadosCardProps,
  ComprasPorProveedorCardProps,
} from '@/components/dashboard/DashboardCharts';
import type { ActividadRecienteProps } from '@/components/dashboard/ActividadReciente';

// dejando las props como `{}` — de ahí los errores en `data`/`matriz`/`items`.
const EvolucionVentasCard = dynamic<EvolucionVentasCardProps>(() => import('@/components/dashboard/DashboardCharts').then(m => m.EvolucionVentasCard), { ssr: false, loading: () => <ChartSkeleton /> });
const ComprasVsVentasCard = dynamic<ComprasVsVentasCardProps>(() => import('@/components/dashboard/DashboardCharts').then(m => m.ComprasVsVentasCard), { ssr: false, loading: () => <ChartSkeleton /> });
const CategoriaPieCard = dynamic<CategoriaPieCardProps>(() => import('@/components/dashboard/DashboardCharts').then(m => m.CategoriaPieCard), { ssr: false, loading: () => <ChartSkeleton /> });
const RankingEmpleadosCard = dynamic<RankingEmpleadosCardProps>(() => import('@/components/dashboard/DashboardCharts').then(m => m.RankingEmpleadosCard), { ssr: false, loading: () => <ChartSkeleton /> });
const ComprasPorProveedorCard = dynamic<ComprasPorProveedorCardProps>(() => import('@/components/dashboard/DashboardCharts').then(m => m.ComprasPorProveedorCard), { ssr: false, loading: () => <ChartSkeleton /> });
const ActividadReciente = dynamic<ActividadRecienteProps>(() => import('@/components/dashboard/ActividadReciente').then(m => m.ActividadReciente), { ssr: false });

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <div className="w-full rounded-xl bg-zinc-100 animate-pulse" style={{ height }} />;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const PALETA_APOYO = ['#f97316', '#0ea5e9', '#a1a1aa', '#f43f5e', '#eab308'];

const TONOS: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
};

const ENLACES_EXTERNOS = [
  { label: 'Emitir boleta', sub: 'SUNAT', url: 'https://ww1.sunat.gob.pe/xssecurity/SignOnVerification.htm?signonForwardAction=https%3A%2F%2Fww1.sunat.gob.pe%2Fol-ti-itemisionboletaresp%2Femitirbvsimp.do', icon: Receipt, tono: 'orange' as const, alerta: false },
  { label: 'Buzón y menú SOL', sub: 'SUNAT', url: 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*&exe=buzon', icon: Inbox, tono: 'orange' as const, alerta: false },
  { label: 'Consulta RUC', sub: 'SUNAT', url: 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp', icon: Search, tono: 'sky' as const, alerta: false },
];


function formatMoneda(valor: number) {
  return `S/ ${valor.toFixed(2)}`;
}

function esMismoMes(fechaIso: string, referencia: Date) {
  return new Date(fechaIso).getMonth() === referencia.getMonth() && new Date(fechaIso).getFullYear() === referencia.getFullYear();
}

function claveMes(fechaIso: string): string {
  const f = new Date(fechaIso);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
}

function formatMesLabel(clave: string): string {
  const [anio, mes] = clave.split('-').map(Number);
  const texto = new Date(anio, mes - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return ((actual - anterior) / anterior) * 100;
}

function usePrimaryColor(fallback = '#16a34a') {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (!raw) return;
    const esTripletaHsl = /^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(raw);
    setColor(esTripletaHsl ? `hsl(${raw})` : raw);
  }, []);
  return color;
}

function InsigniaVariacion({ variacion }: { variacion?: number | null }) {
  if (variacion === undefined || variacion === null) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400"><Minus size={12} /> 0%</span>;
  }
  const positivo = variacion >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positivo ? 'text-emerald-500' : 'text-rose-500'}`}>
      {positivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(variacion).toFixed(1)}%
    </span>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const { nombre, empresa } = useConfig();
  const [loading, setLoading] = useState(true);
  const primaryColor = usePrimaryColor('#2563eb');

  const [ventasDias, setVentasDias] = useState<{ fecha: string; total: number; cantidad: number }[]>([]);
  const [comprasDias, setComprasDias] = useState<{ fecha: string; total: number }[]>([]);
  const [metodoActual, setMetodoActual] = useState<VentasReporte | null>(null);
  const [metodoAnterior, setMetodoAnterior] = useState<VentasReporte | null>(null);
  const [resumen, setResumen] = useState<Dashboard | null>(null);
  const [ultimas, setUltimas] = useState<{ venta?: string; compra?: string }>({});

  const [heatmapRangoDias, setHeatmapRangoDias] = useState(30);
  const [evolucionRangoDias, setEvolucionRangoDias] = useState(7);
  const [comprasVentasRangoMeses, setComprasVentasRangoMeses] = useState(6);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(() => claveMes(new Date().toISOString()));

  const [horarioMatriz, setHorarioMatriz] = useState<Horario | null>(null);
  const [analisis, setAnalisis] = useState<{ ventas: VentasReporte | null; productos: ProductoVenta[]; compras: ComprasReporte | null }>({ ventas: null, productos: [], compras: null });

  const horario = useMemo(() => {
    const parse = (v: string | null | undefined, fb: number) => {
      if (!v) return fb;
      const h = parseInt(v.split(':')[0], 10);
      return isNaN(h) ? fb : h;
    };
    return { apertura: parse(empresa?.horaApertura, 0), cierre: parse(empresa?.horaCierre, 23) };
  }, [empresa]);

  const rangoMes = (clave: string) => {
    const [anio, mes] = clave.split('-').map(Number);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { desde: fmt(new Date(anio, mes - 1, 1)), hasta: fmt(new Date(anio, mes, 0)) };
  };

  // Carga base: 12 meses de ventas y compras por día, métodos de pago (mes actual y anterior), alertas y última actividad
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const ahora = new Date();
        const claveActual = claveMes(ahora.toISOString());
        const claveAnterior = claveMes(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString());
        const desde = daysAgo(365), hasta = today();
        const [v, c, mAct, mAnt, res, uv, uc] = await Promise.all([
          api<VentasReporte>('/api/reportes/ventas', { params: { desde, hasta } }),
          api<ComprasReporte>('/api/reportes/compras', { params: { desde, hasta } }),
          api<VentasReporte>('/api/reportes/ventas', { params: rangoMes(claveActual) }),
          api<VentasReporte>('/api/reportes/ventas', { params: rangoMes(claveAnterior) }),
          api<Dashboard>('/api/dashboard'),
          api<{ content: { fecha: string }[] }>('/api/ventas', { params: { size: 1 } }).catch(() => null),
          api<{ content: { fechaEmision: string }[] }>('/api/compras', { params: { size: 1 } }).catch(() => null),
        ]);
        if (cancelado) return;
        setVentasDias(v.porDia);
        setComprasDias(c.porDia);
        setMetodoActual(mAct);
        setMetodoAnterior(mAnt);
        setResumen(res);
        setUltimas({ venta: uv?.content?.[0]?.fecha, compra: uc?.content?.[0]?.fechaEmision });
      } catch {
        if (cancelado) return;
        setVentasDias([]); setComprasDias([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // Heatmap según el rango elegido (0 = todo el historial)
  useEffect(() => {
    api<Horario>('/api/reportes/ventas/horario', { params: { desde: heatmapRangoDias > 0 ? daysAgo(heatmapRangoDias) : '2000-01-01', hasta: today() } })
      .then(setHorarioMatriz).catch(() => setHorarioMatriz(null));
  }, [heatmapRangoDias]);

  // Análisis del mes seleccionado
  useEffect(() => {
    const params = rangoMes(mesSeleccionado);
    Promise.all([
      api<VentasReporte>('/api/reportes/ventas', { params }),
      api<ProductoVenta[]>('/api/reportes/ventas/productos', { params }),
      api<ComprasReporte>('/api/reportes/compras', { params }),
    ]).then(([ventas, productos, compras]) => setAnalisis({ ventas, productos, compras }))
      .catch(() => setAnalisis({ ventas: null, productos: [], compras: null }));
  }, [mesSeleccionado]);

  const sumaMes = <T extends { fecha: string; total: number; cantidad?: number }>(lista: T[], ref: Date) => {
    const r = lista.filter((x) => esMismoMes(x.fecha + 'T00:00:00', ref));
    return { total: r.reduce((s, x) => s + Number(x.total), 0), cantidad: r.reduce((s, x) => s + Number(x.cantidad ?? 0), 0) };
  };

  const ahoraRef = new Date();
  const mesAnteriorRef = new Date(ahoraRef.getFullYear(), ahoraRef.getMonth() - 1, 1);
  const vAct = sumaMes(ventasDias, ahoraRef), vAnt = sumaMes(ventasDias, mesAnteriorRef);
  const cAct = sumaMes(comprasDias, ahoraRef), cAnt = sumaMes(comprasDias, mesAnteriorRef);
  const ventasMensuales = vAct.total, ventasMesAnterior = vAnt.total;
  const comprasMensuales = cAct.total, comprasMesAnterior = cAnt.total;
  const cantidadVentasMensual = vAct.cantidad, cantidadVentasMesAnterior = vAnt.cantidad;

  const gananciaMensual = ventasMensuales - comprasMensuales;
  const gananciaMesAnterior = ventasMesAnterior - comprasMesAnterior;
  const variacionVentas = variacionPorcentual(ventasMensuales, ventasMesAnterior);
  const variacionCompras = variacionPorcentual(comprasMensuales, comprasMesAnterior);
  const variacionGanancia = variacionPorcentual(gananciaMensual, gananciaMesAnterior);

  const diasTranscurridosMes = new Date().getDate();
  const diasMesAnteriorTotal = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate();

  const promedioVentaDiaria = diasTranscurridosMes > 0 ? ventasMensuales / diasTranscurridosMes : 0;
  const promedioVentaDiariaAnterior = diasMesAnteriorTotal > 0 ? ventasMesAnterior / diasMesAnteriorTotal : 0;
  const variacionPromedioVenta = variacionPorcentual(promedioVentaDiaria, promedioVentaDiariaAnterior);

  const promedioClientesDiario = diasTranscurridosMes > 0 ? cantidadVentasMensual / diasTranscurridosMes : 0;
  const promedioClientesDiarioAnterior = diasMesAnteriorTotal > 0 ? cantidadVentasMesAnterior / diasMesAnteriorTotal : 0;
  const variacionPromedioClientes = variacionPorcentual(promedioClientesDiario, promedioClientesDiarioAnterior);

  const ticketPromedio = cantidadVentasMensual > 0 ? ventasMensuales / cantidadVentasMensual : 0;
  const ticketPromedioAnterior = cantidadVentasMesAnterior > 0 ? ventasMesAnterior / cantidadVentasMesAnterior : 0;
  const variacionTicketPromedio = variacionPorcentual(ticketPromedio, ticketPromedioAnterior);

  const margenActual = ventasMensuales > 0 ? (gananciaMensual / ventasMensuales) * 100 : 0;
  const margenMesAnterior = ventasMesAnterior > 0 ? (gananciaMesAnterior / ventasMesAnterior) * 100 : 0;
  const variacionMargen = variacionPorcentual(margenActual, margenMesAnterior);

  const metodoPagoStats = useMemo(() => {
    const top = [...(metodoActual?.porMedioPago ?? [])].sort((a, b) => b.cantidad - a.cantidad)[0];
    const totalActual = (metodoActual?.porMedioPago ?? []).reduce((s, m) => s + m.cantidad, 0);
    const totalAnterior = (metodoAnterior?.porMedioPago ?? []).reduce((s, m) => s + m.cantidad, 0);
    const porcentajeActual = top && totalActual > 0 ? (top.cantidad / totalActual) * 100 : 0;
    const prev = top ? (metodoAnterior?.porMedioPago ?? []).find((m) => m.etiqueta === top.etiqueta)?.cantidad ?? 0 : 0;
    const porcentajeAnterior = totalAnterior > 0 ? (prev / totalAnterior) * 100 : 0;
    return {
      metodoTop: top ? medioLabel(top.etiqueta) : 'Sin datos',
      porcentaje: porcentajeActual,
      variacion: variacionPorcentual(porcentajeActual, porcentajeAnterior),
    };
  }, [metodoActual, metodoAnterior]);

  const stats = [
    { title: 'Ventas del mes', value: formatMoneda(ventasMensuales), icon: TrendingUp, href: '/ventas/nueva', variacion: variacionVentas, tono: 'emerald' as const },
    { title: 'Compras del mes', value: formatMoneda(comprasMensuales), icon: ShoppingBag, href: '/compras', variacion: variacionCompras, tono: 'orange' as const, alerta: false },
    { title: 'Ganancia estimada', value: formatMoneda(gananciaMensual), icon: Wallet, href: '/ventas/nueva', variacion: variacionGanancia, tono: gananciaMensual >= 0 ? ('primary' as const) : ('rose' as const) },
    { title: 'Promedio de venta diaria', value: formatMoneda(promedioVentaDiaria), icon: TrendingUp, href: '/ventas', variacion: variacionPromedioVenta, tono: 'sky' as const },
    { title: 'Clientes atendidos por día', value: `${promedioClientesDiario.toFixed(1)} /día`, icon: Users, href: '/ventas/clientes', variacion: variacionPromedioClientes, tono: 'violet' as const },
    { title: 'Ticket promedio por venta', value: formatMoneda(ticketPromedio), icon: Receipt, href: '/ventas', variacion: variacionTicketPromedio, tono: 'violet' as const },
  ];

  const evolucionVentas = useMemo<EvolucionVentasItem[]>(() => {
    const hoy = new Date();
    const porFecha = new Map<string, number>();
    ventasDias.forEach((d) => porFecha.set(d.fecha, Number(d.total)));
    const iso = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    if (evolucionRangoDias <= 30) {
      const out: EvolucionVentasItem[] = [];
      for (let i = evolucionRangoDias - 1; i >= 0; i--) {
        const f = new Date(hoy); f.setDate(hoy.getDate() - i);
        out.push({ label: f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }), total: Number((porFecha.get(iso(f)) ?? 0).toFixed(2)) });
      }
      return out;
    }
    const totalSemanas = Math.ceil(evolucionRangoDias / 7);
    const out: EvolucionVentasItem[] = [];
    for (let s = 0; s < totalSemanas; s++) {
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const f = new Date(hoy); f.setDate(hoy.getDate() - (totalSemanas - 1 - s) * 7 - (6 - d));
        total += porFecha.get(iso(f)) ?? 0;
      }
      out.push({ label: `Sem. ${s + 1}`, total: Number(total.toFixed(2)) });
    }
    return out;
  }, [ventasDias, evolucionRangoDias]);

  const heatmap = useMemo(() => {
    const matriz: number[][] = DIAS_SEMANA.map((_, d) => HORAS.map((h) => horarioMatriz?.matriz?.[d]?.[h] ?? 0));
    return { matriz, max: Math.max(1, ...matriz.flat()) };
  }, [horarioMatriz]);

  const horasVisibles = useMemo(() => HORAS.filter((h) => h >= horario.apertura && h <= horario.cierre), [horario]);

  const comprasVsVentas = useMemo<ComprasVsVentasItem[]>(() => {
    const hoy = new Date();
    const out: ComprasVsVentasItem[] = [];
    for (let i = comprasVentasRangoMeses - 1; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      out.push({
        mes: fecha.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }),
        Ventas: Number(sumaMes(ventasDias, fecha).total.toFixed(2)),
        Compras: Number(sumaMes(comprasDias, fecha).total.toFixed(2)),
      });
    }
    return out;
  }, [ventasDias, comprasDias, comprasVentasRangoMeses]);

  const mesesDisponibles = useMemo(() => {
    const claves = new Set<string>();
    claves.add(claveMes(new Date().toISOString()));
    ventasDias.forEach((v) => claves.add(claveMes(v.fecha + 'T00:00:00')));
    comprasDias.forEach((c) => claves.add(claveMes(c.fecha + 'T00:00:00')));
    return Array.from(claves).sort((a, b) => (a < b ? 1 : -1));
  }, [ventasDias, comprasDias]);

  const ventasPorCategoria = useMemo<CategoriaPieItem[]>(() => {
    const acumulado = new Map<string, number>();
    analisis.productos.forEach((p) => acumulado.set(p.categoria || 'Sin categoría', (acumulado.get(p.categoria || 'Sin categoría') ?? 0) + Number(p.monto)));
    const total = Array.from(acumulado.values()).reduce((a, b) => a + b, 0);
    return Array.from(acumulado.entries())
      .map(([categoria, t]) => ({ categoria, total: Number(t.toFixed(2)), porcentaje: total > 0 ? Math.round((t / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [analisis.productos]);

  const rankingEmpleados = useMemo<RankingEmpleadoItem[]>(
    () => (analisis.ventas?.porEmpleado ?? []).map((e) => ({ empleado: e.etiqueta, total: Number(Number(e.total).toFixed(2)) })).sort((a, b) => b.total - a.total).slice(0, 6),
    [analisis.ventas]);

  const comprasPorProveedor = useMemo<ComprasProveedorItem[]>(
    () => (analisis.compras?.porProveedor ?? []).map((p) => ({ proveedor: p.etiqueta, total: Number(Number(p.total).toFixed(2)) })).sort((a, b) => b.total - a.total).slice(0, 6),
    [analisis.compras]);

  const topProductos = useMemo(
    () => analisis.productos.map((p) => ({ nombre: p.producto, unidades: Number(p.cantidad) })).sort((a, b) => b.unidades - a.unidades).slice(0, 5),
    [analisis.productos]);

  const alertasStock = resumen?.productosStockBajo ?? 0;
  const alertasVencimiento = resumen?.lotesPorVencer ?? 0;

  const actividadReciente = useMemo(() => {
    const items: { tipo: 'venta' | 'compra'; label: string; fecha: string }[] = [];
    if (ultimas.venta) items.push({ tipo: 'venta', label: 'Nueva venta registrada', fecha: ultimas.venta });
    if (ultimas.compra) items.push({ tipo: 'compra', label: 'Nueva compra realizada', fecha: ultimas.compra });
    return items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [ultimas]);

  const rangoFechasEncabezado = useMemo(() => {
    const hoy = new Date();
    const hace7 = new Date(hoy);
    hace7.setDate(hoy.getDate() - 6);
    const fmt = (f: Date) => f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    return `${fmt(hace7)} - ${fmt(hoy)}`;
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Bienvenido al panel administrativo de {nombre}</h1>
          <p className="text-sm text-zinc-500">Resumen general de tu negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 shadow-xs">
            <CalendarDays size={16} className="text-zinc-400" />
            {rangoFechasEncabezado}
          </div>
        </div>
      </div>

      {/* Tarjetas de métricas principales — 8 tarjetas, 4x2 en pantallas grandes */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const tono = TONOS[stat.tono];
          return (
            <button
              key={index}
              onClick={() => router.push(stat.href)}
              className="w-full text-left bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-primary/90 uppercase tracking-wider">{stat.title}</span>
                <div className={`p-2 rounded-xl ${tono.bg} ${tono.text}`}><Icon size={18} /></div>
              </div>
              {loading ? <div className="h-8 w-24 bg-zinc-100 rounded-lg animate-pulse" /> : <div className="text-xl font-extrabold text-zinc-800">{stat.value}</div>}
              <div className="flex items-center justify-between mt-2">
                <InsigniaVariacion variacion={stat.variacion} />
                <span className="text-[10px] text-zinc-400">vs. mes anterior</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {ENLACES_EXTERNOS.map((enlace) => {
            const Icon = enlace.icon;
            const tono = TONOS[enlace.tono];
            return (
              <a
                key={enlace.url}
                href={enlace.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-transparent"
              >
                <div className={`relative p-2.5 rounded-xl ${tono.bg} ${tono.text} shrink-0 transition-transform group-hover:scale-110`}>
                  {enlace.alerta && (
                    <span className="absolute inset-0 rounded-xl bg-rose-500/40 animate-ping pointer-events-none" />
                  )}
                  <Icon size={18} className={enlace.alerta ? 'relative z-10 animate-pulse text-rose-600' : ''} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{enlace.sub}</p>
                  <p className="text-sm font-semibold text-zinc-700 truncate">{enlace.label}</p>
                </div>
                <ExternalLink size={14} className="shrink-0 text-zinc-300 transition-all group-hover:text-zinc-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EvolucionVentasCard data={evolucionVentas} primaryColor={primaryColor} rango={evolucionRangoDias} onRangoChange={setEvolucionRangoDias} />
          <ComprasVsVentasCard data={comprasVsVentas} primaryColor={primaryColor} secondaryColor={PALETA_APOYO[0]} rango={comprasVentasRangoMeses} onRangoChange={setComprasVentasRangoMeses} />
        </div>

        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-zinc-200 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-zinc-800">Análisis mensual</h2>
            <p className="text-xs text-zinc-400">Categorías, empleados, productos y proveedores del mes seleccionado</p>
          </div>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
          >
            {mesesDisponibles.map((m) => <option key={m} value={m}>{formatMesLabel(m)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CategoriaPieCard data={ventasPorCategoria} primaryColor={primaryColor} paletaApoyo={PALETA_APOYO} mesLabel={formatMesLabel(mesSeleccionado)} />
          <RankingEmpleadosCard data={rankingEmpleados} primaryColor={primaryColor} mesLabel={formatMesLabel(mesSeleccionado)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Productos más vendidos</h2>
            <div className="space-y-3">
              {topProductos.length === 0 && <p className="text-xs text-zinc-400">Sin ventas registradas en {formatMesLabel(mesSeleccionado)}.</p>}
              {topProductos.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Package size={14} /></div>
                    <span className="text-sm text-zinc-600 truncate">{p.nombre}</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-700 shrink-0">{p.unidades.toLocaleString('es-PE')}</span>
                </div>
              ))}
            </div>
          </div>
          <ComprasPorProveedorCard data={comprasPorProveedor} primaryColor={primaryColor} mesLabel={formatMesLabel(mesSeleccionado)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Alertas y notificaciones</h2>
            <div className="space-y-3">
              {alertasStock > 0 && (
                <div className="flex items-start gap-3 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0"><AlertTriangle size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-700">Stock crítico</p>
                    <p className="text-xs text-zinc-500">{alertasStock} producto{alertasStock === 1 ? '' : 's'} en o bajo el stock mínimo</p>
                  </div>
                </div>
              )}
              {alertasVencimiento > 0 && (
                <div className="flex items-start gap-3 bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0"><Bell size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-700">Productos por vencer</p>
                    <p className="text-xs text-zinc-500">{alertasVencimiento} producto{alertasVencimiento === 1 ? '' : 's'} vencen en los próximos 30 días</p>
                  </div>
                </div>
              )}
              {alertasStock === 0 && alertasVencimiento === 0 && <p className="text-xs text-zinc-400">No hay alertas de inventario por el momento.</p>}
            </div>
          </div>
          <ActividadReciente items={actividadReciente} />
        </div>
      </div>
    </div>
  );
}

function Bienvenida() {
  const { user, can } = useAuth();
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.href !== '/' && can(i.href)) })).filter((s) => s.items.length);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Hola, {user?.nombre.split(' ')[0] ?? ''}</h1>
        <p className="text-sm text-zinc-500">Estos son los módulos a los que tienes acceso.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {sections.map((s) => (
          <div key={s.title} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">{s.title}</h2>
            <ul className="space-y-1">
              {s.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-zinc-600 hover:bg-primary/10 hover:text-primary transition-colors">
                    <i.icon size={16} />{i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <Bienvenida />;
}

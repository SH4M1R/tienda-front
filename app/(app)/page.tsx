'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, ShoppingBag, Wallet, AlertTriangle, Bell, ExternalLink, Search, Receipt, Inbox, Lock, Unlock,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { NAV } from '@/lib/nav';
import { useConfig } from '@/lib/config-context';
import type { ComprasReporte, Dashboard, VentasReporte } from '@/lib/types';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '@/components/charts';
import { daysAgo, fmtShortDay, money, toISODate, today } from '@/lib/format';

const TONOS: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
};

const ENLACES_EXTERNOS = [
  { label: 'Emitir boleta', sub: 'SUNAT', url: 'https://ww1.sunat.gob.pe/xssecurity/SignOnVerification.htm?signonForwardAction=https%3A%2F%2Fww1.sunat.gob.pe%2Fol-ti-itemisionboletaresp%2Femitirbvsimp.do', icon: Receipt, tono: 'orange' as const },
  { label: 'Buzón y menú SOL', sub: 'SUNAT', url: 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*&exe=buzon', icon: Inbox, tono: 'orange' as const },
  { label: 'Consulta RUC', sub: 'SUNAT', url: 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp', icon: Search, tono: 'sky' as const },
];

const soles = (v: number) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ejes = { fontSize: 12, fill: '#71717a' };

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Compras vs ventas por mes (últimos 3, 6 o 12 meses), en tonos del color primario. */
function GraficoMes() {
  const [meses, setMeses] = useState<3 | 6 | 12>(6);
  const [datos, setDatos] = useState<{ ventas: Map<string, number>; compras: Map<string, number> } | null>(null);
  const colores = useChartColors();

  // Primer día del mes, `meses - 1` meses atrás
  const inicio = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (meses - 1));
    return toISODate(d);
  }, [meses]);

  useEffect(() => {
    let activo = true;
    const params = { desde: inicio, hasta: today() };
    const porMes = (dias: { fecha: string; total: number }[]) => {
      const m = new Map<string, number>();
      dias.forEach((d) => { const k = d.fecha.slice(0, 7); m.set(k, (m.get(k) ?? 0) + d.total); });
      return m;
    };
    Promise.all([
      api<VentasReporte>('/api/reportes/ventas', { params }),
      api<ComprasReporte>('/api/reportes/compras', { params }),
    ])
      .then(([v, c]) => { if (activo) setDatos({ ventas: porMes(v.porDia), compras: porMes(c.porDia) }); })
      .catch(() => { if (activo) setDatos({ ventas: new Map(), compras: new Map() }); });
    return () => { activo = false; };
  }, [inicio]);

  const rows = useMemo(() => {
    const hoy = new Date();
    return Array.from({ length: meses }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1 - i), 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        label: meses === 12 ? MESES[d.getMonth()] : `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        Ventas: datos?.ventas.get(k) ?? 0,
        Compras: datos?.compras.get(k) ?? 0,
      };
    });
  }, [datos, meses]);
  const totalV = rows.reduce((a, d) => a + d.Ventas, 0);
  const totalC = rows.reduce((a, d) => a + d.Compras, 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Compras vs Ventas por mes</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">Ventas {money(totalV)} · Compras {money(totalC)}</p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 shrink-0">
          {([3, 6, 12] as const).map((n) => (
            <button
              key={n}
              onClick={() => { setDatos(null); setMeses(n); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${meses === n ? 'bg-primary text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              {n === 12 ? '1 año' : `${n} meses`}
            </button>
          ))}
        </div>
      </div>
      {datos === null ? <div className="h-[280px] bg-zinc-100 rounded-xl animate-pulse" /> : (
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="label" tick={ejes} tickLine={false} axisLine={false} />
              <YAxis tick={ejes} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v: unknown) => money(Number(v))} cursor={{ fill: 'rgba(100,116,139,0.08)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ventas" fill={colores[0]} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="Compras" fill={colores[0]} fillOpacity={0.4} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Ventas por día de los últimos 7 o 30 días (barras). */
function GraficoDias() {
  const [dias, setDias] = useState<7 | 30>(7);
  const [serie, setSerie] = useState<{ fecha: string; total: number }[] | null>(null);
  const colores = useChartColors();

  useEffect(() => {
    let activo = true;
    api<VentasReporte>('/api/reportes/ventas', { params: { desde: daysAgo(dias - 1), hasta: today() } })
      .then((r) => { if (activo) setSerie(r.porDia.map((d) => ({ fecha: d.fecha, total: d.total }))); })
      .catch(() => { if (activo) setSerie([]); });
    return () => { activo = false; };
  }, [dias]);

  // Completa con 0 los días sin ventas para que el eje sea continuo
  const rows = useMemo(() => {
    const m = new Map((serie ?? []).map((d) => [d.fecha.slice(0, 10), d.total]));
    return Array.from({ length: dias }, (_, i) => {
      const f = daysAgo(dias - 1 - i);
      return { label: fmtShortDay(f), total: m.get(f) ?? 0 };
    });
  }, [serie, dias]);
  const total = rows.reduce((a, d) => a + d.total, 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Ventas por día</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">Últimos {dias} días · Total {money(total)}</p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 shrink-0">
          {([7, 30] as const).map((n) => (
            <button
              key={n}
              onClick={() => { setSerie(null); setDias(n); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${dias === n ? 'bg-primary text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              {n} días
            </button>
          ))}
        </div>
      </div>
      {serie === null ? <div className="h-[280px] bg-zinc-100 rounded-xl animate-pulse" /> : (
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="label" tick={ejes} tickLine={false} axisLine={false} minTickGap={12} />
              <YAxis tick={ejes} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v: unknown) => [money(Number(v)), 'Ventas']} cursor={{ fill: 'rgba(100,116,139,0.08)' }} />
              <Bar dataKey="total" fill={colores[0]} radius={[6, 6, 0, 0]} maxBarSize={dias === 7 ? 48 : 22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Panel simple: resumen del día y del mes. Los gráficos y el detalle están en Reportes. */
function AdminDashboard() {
  const router = useRouter();
  const { nombre } = useConfig();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Dashboard>('/api/dashboard').then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const stats = [
    { title: 'Ventas de hoy', value: soles(data?.ventasHoy ?? 0), sub: `${data?.cantidadVentasHoy ?? 0} venta(s)`, icon: Wallet, href: '/ventas', tono: 'emerald' as const },
    { title: 'Ventas del mes', value: soles(data?.ventasMes ?? 0), sub: 'Mes en curso', icon: TrendingUp, href: '/reportes', tono: 'primary' as const },
    { title: 'Compras del mes', value: soles(data?.comprasMes ?? 0), sub: 'Mes en curso', icon: ShoppingBag, href: '/compras', tono: 'orange' as const },
    { title: 'Caja', value: data?.cajaAbierta ? 'Abierta' : 'Cerrada', sub: 'Estado de tu turno', icon: data?.cajaAbierta ? Unlock : Lock, href: '/caja/arqueo', tono: data?.cajaAbierta ? ('sky' as const) : ('rose' as const) },
  ];

  const stock = data?.productosStockBajo ?? 0;
  const vencer = data?.lotesPorVencer ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Bienvenido al panel administrativo de {nombre}</h1>
        <p className="text-sm text-zinc-500">Resumen rápido · Para gráficos y análisis ve a <Link href="/reportes" className="font-semibold text-primary hover:underline">Reportes</Link></p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const tono = TONOS[stat.tono];
          return (
            <button
              key={stat.title}
              onClick={() => router.push(stat.href)}
              className="w-full text-left bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-primary/90 uppercase tracking-wider">{stat.title}</span>
                <div className={`p-2 rounded-xl ${tono.bg} ${tono.text}`}><Icon size={18} /></div>
              </div>
              {loading ? <div className="h-8 w-24 bg-zinc-100 rounded-lg animate-pulse" /> : <div className="text-xl font-extrabold text-zinc-800">{stat.value}</div>}
              <span className="mt-2 text-[11px] text-zinc-400">{stat.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GraficoMes />
        <GraficoDias />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Alertas de inventario</h2>
          <div className="space-y-3">
            {stock > 0 && (
              <button onClick={() => router.push('/productos')} className="w-full text-left flex items-start gap-3 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0"><AlertTriangle size={16} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-700">Stock crítico</p>
                  <p className="text-xs text-zinc-500">{stock} producto{stock === 1 ? '' : 's'} en o bajo el stock mínimo</p>
                </div>
              </button>
            )}
            {vencer > 0 && (
              <button onClick={() => router.push('/productos')} className="w-full text-left flex items-start gap-3 bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0"><Bell size={16} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-700">Productos por vencer</p>
                  <p className="text-xs text-zinc-500">{vencer} lote{vencer === 1 ? '' : 's'} vencen en los próximos 30 días</p>
                </div>
              </button>
            )}
            {stock === 0 && vencer === 0 && <p className="text-xs text-zinc-400">No hay alertas de inventario por el momento.</p>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className={`p-2.5 rounded-xl ${tono.bg} ${tono.text} shrink-0`}><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{enlace.sub}</p>
                    <p className="text-sm font-semibold text-zinc-700 truncate">{enlace.label}</p>
                  </div>
                  <ExternalLink size={14} className="shrink-0 text-zinc-300 group-hover:text-zinc-500" />
                </a>
              );
            })}
          </div>
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
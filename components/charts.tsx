"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useConfig } from "@/lib/config-context";
import { palette } from "@/lib/color";
import { fmtShortDay, money, num } from "@/lib/format";
import type { Dia, Horario, Monto } from "@/lib/types";

const axis = { fontSize: 12, fill: "#71717a" };

export function useChartColors() {
  const { pub } = useConfig();
  return palette(pub.colorPrimario || "#2563eb");
}

export function SalesAreaChart({ data, height = 280, name = "Total" }: { data: Dia[]; height?: number; name?: string }) {
  const [c] = useChartColors();
  const rows = data.map((d) => ({ ...d, label: fmtShortDay(d.fecha) }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c} stopOpacity={0.35} />
              <stop offset="95%" stopColor={c} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
          <Tooltip formatter={(v: unknown) => [money(Number(v)), name]} labelFormatter={(l) => `Día ${l}`} />
          <Area type="monotone" dataKey="total" stroke={c} strokeWidth={2.5} fill="url(#areaFill)" activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, height = 280, money: isMoney = false, name = "Cantidad" }:
  { data: { label: string; value: number }[]; height?: number; money?: boolean; name?: string }) {
  const [c] = useChartColors();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
          <XAxis type="number" tick={axis} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" width={130} tick={axis} tickLine={false} axisLine={false}
            tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)} />
          <Tooltip formatter={(v: unknown) => [isMoney ? money(Number(v)) : num(Number(v)), name]} cursor={{ fill: "rgba(100,116,139,0.08)" }} />
          <Bar dataKey="value" fill={c} radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColumnChart({ data, height = 280, money: isMoney = true, name = "Total" }:
  { data: { label: string; value: number }[]; height?: number; money?: boolean; name?: string }) {
  const [c] = useChartColors();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={0}
            tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + "…" : v)} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={56} />
          <Tooltip formatter={(v: unknown) => [isMoney ? money(Number(v)) : num(Number(v)), name]} cursor={{ fill: "rgba(100,116,139,0.08)" }} />
          <Bar dataKey="value" fill={c} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, height = 260, labelOf }: { data: Monto[]; height?: number; labelOf?: (k: string) => string }) {
  const colors = useChartColors();
  const rows = data.filter((d) => d.total > 0).map((d) => ({ name: labelOf ? labelOf(d.etiqueta) : d.etiqueta, value: d.total }));
  if (rows.length === 0) return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>Sin datos en el periodo</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {rows.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(v: unknown) => money(Number(v))} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ventas vs compras por día (barras agrupadas, estilo del sistema de referencia). */
export function VsBarChart({ ventas, compras, height = 280 }: { ventas: Dia[]; compras: Dia[]; height?: number }) {
  const colors = useChartColors();
  const mapC = new Map(compras.map((d) => [d.fecha, d.total]));
  const rows = ventas.map((d) => ({ label: fmtShortDay(d.fecha), Ventas: d.total, Compras: mapC.get(d.fecha) ?? 0 }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={56} />
          <Tooltip formatter={(v: unknown) => money(Number(v))} cursor={{ fill: "rgba(100,116,139,0.08)" }} />
          <Legend />
          <Bar dataKey="Ventas" fill={colors[0]} radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Compras" fill={colors[2] ?? "#a1a1aa"} radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Dona con leyenda y porcentaje (ventas por categoría). */
export function CategoriaPie({ data }: { data: { label: string; value: number }[] }) {
  const colors = useChartColors();
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total <= 0) return <p className="py-12 text-center text-sm text-slate-400">Sin ventas en el periodo</p>;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v: unknown) => money(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.slice(0, 5).map((c, i) => (
          <div key={c.label} className="flex items-center justify-between text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="truncate text-slate-600">{c.label}</span>
            </div>
            <span className="shrink-0 font-semibold text-slate-500">{Math.round((c.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
/** Mapa de calor de ventas por día de la semana y hora. */
export function Heatmap({ data }: { data: Horario }) {
  const [c] = useChartColors();
  const horas = data.matriz.reduce<number[]>((acc, fila) => { fila.forEach((v, h) => { if (v > 0 && !acc.includes(h)) acc.push(h); }); return acc; }, []);
  if (data.maximo === 0) return <p className="py-12 text-center text-sm text-slate-400">Sin ventas en el periodo</p>;
  const min = Math.min(...horas), max = Math.max(...horas);
  const visibles = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-1 ml-12 flex">{visibles.map((h) => <div key={h} className="flex-1 text-center text-[10px] font-medium text-slate-400">{h}h</div>)}</div>
        {DIAS.map((dia, i) => (
          <div key={dia} className="mb-[3px] flex items-center gap-2">
            <div className="w-10 shrink-0 text-xs font-semibold text-slate-500">{dia}</div>
            <div className="flex flex-1 gap-[3px]">
              {visibles.map((h) => {
                const v = data.matriz[i]?.[h] ?? 0;
                return <div key={h} title={`${dia} ${h}:00 — ${v} venta${v === 1 ? "" : "s"}`} className="aspect-square flex-1 cursor-default rounded-[3px] transition-transform hover:scale-125"
                  style={{ backgroundColor: v === 0 ? "#f4f4f5" : `color-mix(in srgb, ${c} ${Math.round(15 + (v / data.maximo) * 85)}%, white)` }} />;
              })}
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-[10px] text-slate-400">Menos ventas</span>
          <div className="flex gap-[3px]">{[15, 35, 55, 75, 100].map((p) => <div key={p} className="h-4 w-4 rounded-[3px]" style={{ backgroundColor: `color-mix(in srgb, ${c} ${p}%, white)` }} />)}</div>
          <span className="text-[10px] text-slate-400">Más ventas</span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { memo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

function formatMoneda(valor: number) {
  return `S/ ${valor.toFixed(2)}`;
}

// ---------- Tipos de datos ----------
export interface EvolucionVentasItem {
  label: string;
  total: number;
}

export interface ComprasVsVentasItem {
  mes: string;
  Ventas: number;
  Compras: number;
}

export interface CategoriaPieItem {
  categoria: string;
  total: number;
  porcentaje: number;
}

export interface RankingEmpleadoItem {
  empleado: string;
  total: number;
}

export interface ComprasProveedorItem {
  proveedor: string;
  total: number;
}

// ---------- Tipos de props de cada card ----------
export interface EvolucionVentasCardProps {
  data: EvolucionVentasItem[];
  primaryColor: string;
  rango: number;
  onRangoChange: (v: number) => void;
}

export interface ComprasVsVentasCardProps {
  data: ComprasVsVentasItem[];
  primaryColor: string;
  secondaryColor: string;
  rango: number;
  onRangoChange: (v: number) => void;
}

export interface HeatmapCardProps {
  matriz: number[][];
  max: number;
  horasVisibles: number[];
  primaryColor: string;
  rango: number;
  onRangoChange: (v: number) => void;
}

export interface CategoriaPieCardProps {
  data: CategoriaPieItem[];
  primaryColor: string;
  paletaApoyo: string[];
  mesLabel: string;
}

export interface RankingEmpleadosCardProps {
  data: RankingEmpleadoItem[];
  primaryColor: string;
  mesLabel: string;
}

export interface ComprasPorProveedorCardProps {
  data: ComprasProveedorItem[];
  primaryColor: string;
  mesLabel: string;
}

// ---------- Evolución de ventas ----------
export const EvolucionVentasCard = memo(function EvolucionVentasCard({
  data, primaryColor, rango, onRangoChange,
}: EvolucionVentasCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Evolución de Ventas</h2>
        <select
          value={rango}
          onChange={(e) => onRangoChange(Number(e.target.value))}
          className="text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
        >
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradienteVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
          <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
          <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
          <Area type="monotone" dataKey="total" stroke={primaryColor} strokeWidth={2.5} fill="url(#gradienteVentas)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// ---------- Compras vs Ventas ----------
export const ComprasVsVentasCard = memo(function ComprasVsVentasCard({
  data, primaryColor, secondaryColor, rango, onRangoChange,
}: ComprasVsVentasCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Compras vs Ventas</h2>
        <select
          value={rango}
          onChange={(e) => onRangoChange(Number(e.target.value))}
          className="text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
        >
          <option value={3}>3 meses</option>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
          <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
          <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
          <Legend />
          <Bar dataKey="Ventas" fill={primaryColor} radius={[6, 6, 0, 0]} />
          <Bar dataKey="Compras" fill={secondaryColor} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ---------- Categorías (pie) ----------
export const CategoriaPieCard = memo(function CategoriaPieCard({
  data, primaryColor, paletaApoyo, mesLabel,
}: CategoriaPieCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Ventas por categoría de producto</h2>
      {data.length === 0 ? (
        <p className="text-xs text-zinc-400">Sin ventas registradas en {mesLabel}.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative w-40 h-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="categoria" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? primaryColor : paletaApoyo[(i - 1) % paletaApoyo.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-zinc-400">Total</span>
              <span className="text-sm font-bold text-zinc-700">100%</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {data.slice(0, 4).map((c, i) => (
              <div key={c.categoria} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? primaryColor : paletaApoyo[(i - 1) % paletaApoyo.length] }} />
                  <span className="text-zinc-600 truncate">{c.categoria}</span>
                </div>
                <span className="font-semibold text-zinc-500 shrink-0">{c.porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ---------- Ranking empleados ----------
export const RankingEmpleadosCard = memo(function RankingEmpleadosCard({
  data, primaryColor, mesLabel,
}: RankingEmpleadosCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Ranking de ventas por empleado</h2>
      {data.length === 0 ? (
        <p className="text-xs text-zinc-400">Sin ventas registradas en {mesLabel}.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
            <YAxis type="category" dataKey="empleado" tick={{ fontSize: 12 }} stroke="#a1a1aa" width={120} />
            <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
            <Bar dataKey="total" fill={primaryColor} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

// ---------- Compras por proveedor ----------
export const ComprasPorProveedorCard = memo(function ComprasPorProveedorCard({
  data, primaryColor, mesLabel,
}: ComprasPorProveedorCardProps) {
  return (
    <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Compras por proveedor</h2>
      {data.length === 0 ? (
        <p className="text-xs text-zinc-400">Sin compras registradas en {mesLabel}.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="proveedor" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
            <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
            <Tooltip formatter={(value) => formatMoneda(Number(value ?? 0))} />
            <Bar dataKey="total" fill={primaryColor} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});
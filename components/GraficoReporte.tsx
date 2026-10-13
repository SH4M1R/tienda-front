"use client";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { palette } from "@/lib/color";
import { useConfig } from "@/lib/config-context";
import { money } from "@/lib/format";
import type { Grafico } from "@/lib/reportes";

const axis = { fontSize: 11, fill: "#71717a" };
const corto = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Gráfico de un reporte (línea, barras, barras horizontales o torta) con los colores del tema. */
export default function GraficoReporte({ g }: { g: Grafico }) {
  const { color } = useConfig();
  const colores = palette(color || "#2563eb");
  const fmt = (v: number) => (g.dinero ? money(v) : new Intl.NumberFormat("es-PE").format(v));
  const tip = { formatter: (v: unknown) => fmt(Number(v)), contentStyle: { borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 } };

  if (g.tipo === "torta") {
    return (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={g.datos} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
              {g.datos.map((_, i) => <Cell key={i} fill={colores[i % colores.length]} />)}
            </Pie>
            <Tooltip {...tip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (g.tipo === "linea") {
    return (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={g.datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => (g.dinero ? `S/ ${v}` : String(v))} />
            <Tooltip {...tip} />
            <Line type="monotone" dataKey="value" name={g.etiqueta} stroke={colores[0]} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const horizontal = g.tipo === "barras-h";
  const alto = horizontal ? Math.max(220, g.datos.length * 34 + 40) : 288;
  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={g.datos} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={axis} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={150} tickFormatter={(v) => corto(String(v))} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={0} tickFormatter={(v) => corto(String(v), 14)} />
              <YAxis tick={axis} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => (g.dinero ? `S/ ${v}` : String(v))} />
            </>
          )}
          <Tooltip {...tip} />
          <Bar dataKey="value" name={g.etiqueta} fill={colores[0]} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

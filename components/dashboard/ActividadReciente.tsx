'use client';

import { memo, useEffect, useState } from 'react';
import { Receipt, ShoppingCart } from 'lucide-react';

function formatRelativo(fechaIso: string, ahora: Date) {
  const diffMin = Math.round((ahora.getTime() - new Date(fechaIso).getTime()) / 60000);
  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHoras = Math.round(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h`;
  return `Hace ${Math.round(diffHoras / 24)} d`;
}

export interface ActividadItem {
  tipo: 'venta' | 'compra';
  label: string;
  fecha: string;
}

export interface ActividadRecienteProps {
  items: ActividadItem[];
}

export const ActividadReciente = memo(function ActividadReciente({ items }: ActividadRecienteProps) {
  const [ahora, setAhora] = useState(() => new Date());

  // Solo este componente "tickea", y solo cada minuto (no cada segundo).
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Actividad reciente</h2>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-xs text-zinc-400">Sin actividad registrada todavía.</p>}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {item.tipo === 'venta' ? <Receipt size={16} /> : <ShoppingCart size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-700">{item.label}</p>
            </div>
            <span className="text-xs text-zinc-400 shrink-0">{formatRelativo(item.fecha, ahora)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
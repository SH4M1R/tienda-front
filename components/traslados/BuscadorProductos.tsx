'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { productosApi, type Producto } from '@/api/productos';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  onSelect: (producto: Producto) => void;
}

export default function BuscadorProductos({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const consulta = useDebounce(query.trim(), 250);
  const [focused, setFocused] = useState(false);
  const [resultados, setResultados] = useState<Producto[]>([]);

  useEffect(() => {
    if (!consulta) { setResultados([]); return; }
    let activo = true;
    productosApi.buscar(consulta, 8).then((r) => { if (activo) setResultados(r); }).catch(() => { if (activo) setResultados([]); });
    return () => { activo = false; };
  }, [consulta]);

  const handleSelect = (producto: Producto) => {
    onSelect(producto);
    setQuery('');
    setFocused(false);
  };

  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Buscar producto por nombre o código de barras..."
        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
      {focused && query.trim() && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-md max-h-72 overflow-y-auto">
          {resultados.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-400">Sin resultados.</div>
          ) : (
            resultados.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-zinc-800">{p.nombre}</p>
                  <p className="text-xs text-zinc-400">Stock actual: {p.stockActual}</p>
                </div>
                <span className="text-xs text-zinc-500">S/ {p.precioCompra.toFixed(2)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

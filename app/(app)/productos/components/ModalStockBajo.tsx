import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Printer, AlertTriangle, X, Loader2, Search, Package } from 'lucide-react';
import { productosApi, type Producto } from '@/api/productos';
import { exportarReporte, previsualizarReporte, type Col, type Formato, type ReportDef } from '@/lib/reportes';
import { useEmpresaDoc } from '@/hooks/useEmpresaDoc';
import { fmtStock } from '@/lib/peso';

interface ModalAlertaStockProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalAlertaStock: React.FC<ModalAlertaStockProps> = ({
  isOpen,
  onClose,
}) => {
  const emp = useEmpresaDoc();
  const [productosStockBajo, setProductosStockBajo] = useState<Producto[]>([]);
  const [formato, setFormato] = useState<'A4' | 'POS80'>('A4');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    productosApi.stockBajo().then(setProductosStockBajo).catch(() => setError('No se pudo cargar la lista.'));
  }, [isOpen]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productosStockBajo;
    return productosStockBajo.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productosStockBajo, search]);

  if (!isOpen) return null;

  const handleGenerarReporte = async (accion: 'descargar' | 'imprimir' | 'excel') => {
    try {
      setLoading(true);
      type Fila = Producto;
      const cols: Col<Fila>[] = [
        { header: 'Producto', width: 5, render: (p) => p.nombre },
        { header: 'Categoría', width: 3, render: (p) => p.categoriaNombre, pos: false },
        { header: 'Stock', width: 1.5, align: 'right', render: (p) => fmtStock(p, p.stockActual), value: (p) => p.stockActual },
        { header: 'Mín.', width: 1.5, align: 'right', render: (p) => fmtStock(p, p.stockMinimo), value: (p) => p.stockMinimo },
      ];
      const def: ReportDef<Fila> = {
        titulo: 'Alerta de stock mínimo',
        columnas: cols,
        filas: productosStockBajo,
        archivo: `alerta_stock_${new Date().toISOString().slice(0, 10)}`,
        resumen: [{ label: 'Productos en alerta', value: String(productosStockBajo.length), bold: true }],
      };
      const f = formato === 'A4' ? 'a4' : 'pos80';
      if (accion === 'imprimir') await previsualizarReporte(def, f, emp);
      else await exportarReporte(def, (accion === 'excel' ? 'excel' : f) as Formato, emp);
      if (accion !== 'imprimir') onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl transition-all border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Alerta de Stock Mínimo
              </h3>
              <p className="text-xs text-slate-500">
                {productosStockBajo.length} productos con existencias críticas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Buscador + Formato */}
        <div className="px-6 pt-4 pb-2 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search size={16} />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en stock bajo..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-500 shrink-0">Formato PDF:</span>
              <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setFormato('A4')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    formato === 'A4'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setFormato('POS80')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    formato === 'POS80'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  POS-80
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla interactiva con Scroll */}
        <div className="p-6 pt-2 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {productosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Package size={32} className="text-slate-300" />
                <span>No se encontraron productos con stock bajo.</span>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-primary/10 text-primary font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Producto</th>
                    <th className="px-4 py-2.5">Categoría</th>
                    <th className="px-4 py-2.5 text-right">Stock Actual</th>
                    <th className="px-4 py-2.5 text-right">Stock Mín.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {productosFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{p.nombre}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.categoriaNombre ?? '-'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-500">{fmtStock(p, p.stockActual)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{fmtStock(p, p.stockMinimo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {error && <p className="px-6 pb-2 text-xs text-red-500 font-medium shrink-0">{error}</p>}

        {/* Pie del Modal */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
          
          <button
            type="button"
            onClick={() => handleGenerarReporte('excel')}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Excel
          </button>

          <button
            type="button"
            onClick={() => handleGenerarReporte('imprimir')}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Vista Previa
          </button>

          <button
            type="button"
            onClick={() => handleGenerarReporte('descargar')}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 focus:outline-none transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
};
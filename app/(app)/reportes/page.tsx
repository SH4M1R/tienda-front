'use client';

import { useState } from 'react';
import { FileText, Printer, Loader2, FileSpreadsheet } from 'lucide-react';
import ModalAviso from '@/components/ModalAviso';
import { exportarReporte, previsualizarReporte } from '@/lib/reportes';
import { REPORTES, type GrupoReporte, type ReporteItem } from '@/lib/reportes/catalogo';
import { useEmpresaDoc } from '@/hooks/useEmpresaDoc';

type Modulo = 'ventas' | 'caja' | 'compras' | 'inventario' | 'gestion';

const MODULOS: { id: Modulo; label: string; grupos: GrupoReporte[] }[] = [
  { id: 'ventas', label: 'Ventas', grupos: ['Ventas'] },
  { id: 'caja', label: 'Caja', grupos: ['Caja'] },
  { id: 'compras', label: 'Compras', grupos: ['Compras'] },
  { id: 'inventario', label: 'Inventario', grupos: ['Inventario'] },
  { id: 'gestion', label: 'Gestión', grupos: ['Personal', 'General'] },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoy = () => iso(new Date());
const inicioDeMes = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)); };

function ReporteCard({
  titulo, descripcion, children, cargando, onPos80, onA4, onExcel,
}: {
  titulo: string;
  descripcion: string;
  children?: React.ReactNode;
  cargando: boolean;
  onPos80: () => void;
  onA4: () => void;
  onExcel: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-primary text-sm">{titulo}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{descripcion}</p>
        </div>
      </div>

      {children && <div className="flex flex-wrap gap-3">{children}</div>}

      <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-100">
        <button
          disabled={cargando}
          onClick={onPos80}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          POS80
        </button>
        <button
          disabled={cargando}
          onClick={onA4}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          A4
        </button>
        <button
          disabled={cargando}
          onClick={onExcel}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          Excel
        </button>
      </div>
    </div>
  );
}

function InputFecha({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </label>
  );
}

function InputNumero({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        type="number"
        min={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </label>
  );
}

export default function ReportesPage() {
  const emp = useEmpresaDoc();
  const [moduloActivo, setModuloActivo] = useState<Modulo>('ventas');
  const [fechaInicio, setFechaInicio] = useState(inicioDeMes());
  const [fechaFin, setFechaFin] = useState(hoy());
  const [diasVencer, setDiasVencer] = useState('30');
  const [cargando, setCargando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ open: boolean; mensaje: string }>({ open: false, mensaje: '' });

  async function ejecutar(r: ReporteItem, formato: 'pos80' | 'a4' | 'excel') {
    if (r.periodo && fechaInicio > fechaFin) {
      setAviso({ open: true, mensaje: 'La fecha de inicio no puede ser mayor a la fecha fin.' });
      return;
    }
    setCargando(r.id);
    try {
      const def = await r.construir(fechaInicio, fechaFin, Number(diasVencer) || 30);
      if (formato === 'pos80') await previsualizarReporte(def, 'pos80', emp);
      else await exportarReporte(def, formato, emp);
    } catch (err) {
      setAviso({ open: true, mensaje: err instanceof Error ? err.message : 'Ocurrió un error al generar el reporte.' });
    } finally {
      setCargando(null);
    }
  }

  const modulo = MODULOS.find((m) => m.id === moduloActivo)!;
  const items = REPORTES.filter((r) => modulo.grupos.includes(r.grupo));
  const usaFechas = items.some((r) => r.periodo);

  return (
    <div className="space-y-6">
      <ModalAviso isOpen={aviso.open} titulo="Error al generar reporte" mensaje={aviso.mensaje} tipo="error" onClose={() => setAviso({ open: false, mensaje: '' })} />

      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Reportes</h1>
        <p className="text-sm text-zinc-500 mt-1">Genera y descarga los reportes del sistema en ticket, A4 o Excel.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODULOS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModuloActivo(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              moduloActivo === m.id
                ? 'bg-primary text-white'
                : 'bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {usaFechas && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-4 flex flex-wrap gap-4 items-end">
          <InputFecha label="Fecha inicio" value={fechaInicio} onChange={setFechaInicio} />
          <InputFecha label="Fecha fin" value={fechaFin} onChange={setFechaFin} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((r) => (
          <ReporteCard
            key={r.id}
            titulo={r.titulo}
            descripcion={r.descripcion}
            cargando={cargando === r.id}
            onPos80={() => ejecutar(r, 'pos80')}
            onA4={() => ejecutar(r, 'a4')}
            onExcel={() => ejecutar(r, 'excel')}
          >
            {r.id === 'por-vencer' && (
              <InputNumero label="Días margen" value={diasVencer} onChange={setDiasVencer} placeholder="30" />
            )}
          </ReporteCard>
        ))}
      </div>
    </div>
  );
}

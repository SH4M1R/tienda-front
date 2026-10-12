'use client';

import { useState } from 'react';
import { Search, Pencil, Plus } from 'lucide-react';
import { proveedorApi } from '@/api/proveedores';
import type { Proveedor, ProveedorRequestDTO } from '@/api/proveedores';
import { usePaginaServidor } from '@/hooks/usePaginaServidor';
import { useDebounce } from '@/hooks/useDebounce';
import ProveedorModal from './components/ProveedorModal';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function ProveedoresPage() {
  const [search, setSearch] = useState('');
  const busqueda = useDebounce(search.trim(), 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [proveedorActivo, setProveedorActivo] = useState<Proveedor | null>(null);

  const {
    items: itemsPaginados, total: totalItems, totalPages: totalPaginas, page: paginaSegura, size: pageSize,
    loading, setPage: setCurrentPage, cambiarTamano, recargar,
  } = usePaginaServidor<Proveedor>(
    (p, sz) => proveedorApi.pagina(p, sz, busqueda || undefined),
    [busqueda],
    PAGE_SIZE_OPTIONS[0]
  );

  const handleGuardar = async (data: ProveedorRequestDTO) => {
    if (proveedorActivo) {
      await proveedorApi.actualizar(proveedorActivo.id, data);
    } else {
      await proveedorApi.crear(data);
    }
    recargar();
  };

  const handleNuevo = () => {
    setProveedorActivo(null);
    setModalOpen(true);
  };

  const handleEditar = (p: Proveedor) => {
    setProveedorActivo(p);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Proveedores</h1>
          <p className="text-sm text-zinc-500 mt-1">Directorio y datos de contacto de proveedores.</p>
        </div>
        <button
          onClick={handleNuevo}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white font-semibold text-xs shadow-xs hover:bg-primary-dark transition-all cursor-pointer"
        >
          <Plus size={14} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          <Search size={16} />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento o contacto..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading && itemsPaginados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando proveedores...</div>
        ) : itemsPaginados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron proveedores.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: '46%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                    <th className="px-5 py-3">NOMBRE PROVEEDOR</th>
                    <th className="px-5 py-3">DOCUMENTO</th>
                    <th className="px-5 py-3">TELÉFONO</th>
                    <th className="px-5 py-3">CONTACTO</th>
                    <th className="px-5 py-3">TELÉFONO CONTACTO</th>
                    <th className="px-5 py-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {itemsPaginados.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 font-semibold text-zinc-800">{p.nombres}</td>
                      <td className="px-5 py-3 text-primary font-mono text-sm">
                        {p.numeroDocumento ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{p.telefono ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-600">{p.contactoNombres ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-600">{p.contactoCelular ?? '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditar(p)}
                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2"
                            title="Editar proveedor"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalItems > 0 && (
              <Paginacion
                currentPage={paginaSegura}
                totalPages={totalPaginas}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="proveedores"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setCurrentPage}
                onPageSizeChange={cambiarTamano}
              />
            )}
          </>
        )}
      </div>

      <ProveedorModal
        open={modalOpen}
        proveedor={proveedorActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />
    </div>
  );
}
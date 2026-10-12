'use client';

import { useState } from 'react';
import { usePaginaServidor } from '@/hooks/usePaginaServidor';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Pencil, Plus } from 'lucide-react';
import { clientesApi, getNombreCompleto } from '@/api/clientes';
import type { Cliente, ClienteRequest } from '@/api/clientes';
import ClienteModal from './components/ClienteModal';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);

  // La búsqueda y la paginación las hace el servidor
  const {
    items: clientes, total: totalItems, totalPages: totalPaginas,
    page: paginaSegura, size: pageSize, loading, setPage: setCurrentPage, cambiarTamano, recargar,
  } = usePaginaServidor<Cliente>(
    (p, sz) => clientesApi.listarPaginado(p, sz, q),
    [q],
    PAGE_SIZE_OPTIONS[0]
  );

  const handleGuardar = async (data: ClienteRequest) => {
    if (clienteActivo) {
      await clientesApi.actualizar(clienteActivo.id, data);
    } else {
      await clientesApi.crear(data);
    }
    recargar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Clientes</h1>
          <p className="text-sm text-zinc-500 mt-1">Datos de los clientes registrados.</p>
        </div>
        <button
          onClick={() => { setClienteActivo(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI o RUC..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading && clientes.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron clientes.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  <th className="px-5 py-3">NOMBRE</th>
                  <th className="px-5 py-3">DNI / RUC</th>
                  <th className="px-5 py-3">TELÉFONO</th>
                  <th className="px-5 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 font-semibold text-zinc-800">{getNombreCompleto(c)}</td>
                    <td className="px-5 py-3 text-zinc-600 font-mono text-xs">{c.dni ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{c.telefono ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setClienteActivo(c); setModalOpen(true); }}
                          title="Editar"
                          className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2 cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Paginacion
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              pageSize={pageSize}
              totalItems={totalItems}
              itemLabel="clientes"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setCurrentPage}
              onPageSizeChange={cambiarTamano}
            />
          </>
        )}
      </div>

      <ClienteModal
        open={modalOpen}
        cliente={clienteActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />
    </div>
  );
}

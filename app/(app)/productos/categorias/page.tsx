'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { categoriasApi, type Categoria } from '@/api/productos';
import { useSession } from '@/hooks/useSession';
import CategoriaModal from '../components/CategoriaModal';
import ModalEliminar from '@/components/ModalEliminar';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const COL_WIDTHS = {
  id: '10%',
  descripcion: '75%',
  acciones: '15%',
};

export default function CategoriasPage() {
  const { esAdministrador } = useSession();
  const [items, setItems] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemActivo, setItemActivo] = useState<Categoria | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    mensaje: string;
    errorMensaje?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    mensaje: '',
    onConfirm: async () => {},
  });

  const cerrarModal = () =>
    setModalConfig((prev) => ({ ...prev, isOpen: false }));

  const cargar = async () => {
    setLoading(true);
    try {
      setItems(await categoriasApi.listar());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const totalItems = items.length;
  const totalPaginas = Math.ceil(totalItems / pageSize) || 1;
  const paginaSegura = Math.min(Math.max(currentPage, 1), totalPaginas);
  const itemsPaginados = items.slice((paginaSegura - 1) * pageSize, paginaSegura * pageSize);

  const handleGuardar = async (nombre: string) => {
    if (itemActivo) await categoriasApi.actualizar(itemActivo.id, { nombre });
    else await categoriasApi.crear({ nombre });
    await cargar();
  };

  const handleEliminar = (item: Categoria) => {
    setModalConfig({
      isOpen: true,
      mensaje: `¿Deseas eliminar "${item.nombre}"?`,
      errorMensaje: 'No se pudo eliminar. Puede que esté siendo usada por algún producto.',
      onConfirm: async () => {
        await categoriasApi.eliminar(item.id);
        await cargar();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Categorías de Producto</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona las categorías usadas al registrar productos.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <span className="text-sm font-bold text-primary">CATEGORÍAS</span>
          <button
            onClick={() => { setItemActivo(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">Aún no hay registros.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: COL_WIDTHS.id }} />
                <col style={{ width: COL_WIDTHS.descripcion }} />
                <col style={{ width: COL_WIDTHS.acciones }} />
              </colgroup>
              <thead>
                <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  <th className="px-5 py-3">CÓDIGO</th>
                  <th className="px-5 py-3">DESCRIPCIÓN</th>
                  <th className="px-5 py-3 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {itemsPaginados.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 text-zinc-800">{item.id}</td>
                    <td className="px-5 py-3 font-bold text-zinc-800">{item.nombre}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setItemActivo(item); setModalOpen(true); }} title="Editar" className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2">
                          <Pencil size={16} />
                        </button>
                        {esAdministrador && (
                          <button onClick={() => handleEliminar(item)} title="Borrar" className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-2">
                            <Trash2 size={16} />
                          </button>
                        )}
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
              itemLabel={'categorías'}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>

      <CategoriaModal
        open={modalOpen}
        item={itemActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />

      <ModalEliminar
        isOpen={modalConfig.isOpen}
        onClose={cerrarModal}
        mensaje={modalConfig.mensaje}
        errorMensajeDefault={modalConfig.errorMensaje}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
}

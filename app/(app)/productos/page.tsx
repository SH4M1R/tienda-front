'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Boxes, Package, AlertTriangle, CalendarClock, Database, ImageIcon } from 'lucide-react';
import { categoriasApi, productosApi, urlImagenProducto } from '@/api/productos';
import type { Categoria, Producto, ProductoPayload } from '@/api/productos';
import { request } from '@/api/http';
import { usePaginaServidor } from '@/hooks/usePaginaServidor';
import { useDebounce } from '@/hooks/useDebounce';
import ProductoModal, { ToggleSwitch, type CambioImagen } from './components/ProductoModal';
import StockModal from './components/StockModal';
import Paginacion from '@/components/Paginacion';
import { ModalAlertaStock } from './components/ModalStockBajo';
import { ModalProductosPorVencer } from './components/ModalProductoPorVencer';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const COL_WIDTHS = {
  producto: '38%',
  categoria: '14%',
  pVenta: '10%',
  pCompra: '10%',
  stock: '8%',
  estado: '10%',
  acciones: '10%',
};

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sublabel,
  onClick,
}: {
  icon: typeof Package;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sublabel: string;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick} 
      className={`bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 flex items-center gap-4 ${
        onClick ? 'cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all' : ''
      }`}
    >
      <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
        <Icon size={35} />
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="text-xl font-bold text-primary">{value}</p>
        <p className="text-xs text-zinc-500">{sublabel}</p>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [productoActivo, setProductoActivo] = useState<Producto | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [productoParaStock, setProductoParaStock] = useState<Producto | null>(null);

  const [modalStockBajoOpen, setModalStockBajoOpen] = useState(false);
  const [modalPorVencerOpen, setModalPorVencerOpen] = useState(false);

  const [vista, setVista] = useState<'activos' | 'inactivos'>('activos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Contadores y tarjetas (consultas livianas al servidor)
  const [conteoActivos, setConteoActivos] = useState(0);
  const [conteoInactivos, setConteoInactivos] = useState(0);
  const [stockBajo, setStockBajo] = useState(0);
  const [porVencer, setPorVencer] = useState(0);
  const [valorInventario, setValorInventario] = useState<number | null>(null);

  const cargarResumen = () => {
    productosApi.contar({ estado: true }).then(setConteoActivos).catch(() => {});
    productosApi.contar({ estado: false }).then(setConteoInactivos).catch(() => {});
    productosApi.stockBajo().then((l) => setStockBajo(l.length)).catch(() => {});
    productosApi.porVencer(90).then((l) => setPorVencer(new Set(l.map((x) => x.productoId)).size)).catch(() => {});
    request<{ valorTotal: number }>('/reportes/inventario').then((r) => setValorInventario(r.valorTotal)).catch(() => setValorInventario(null));
  };

  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]));
    cargarResumen();
  }, []);

  const {
    items: productos, total: totalItems, totalPages: totalPaginas,
    page: paginaSegura, size: pageSize, loading, setPage: setCurrentPage, cambiarTamano, recargar,
  } = usePaginaServidor<Producto>(
    (p, sz) => productosApi.pagina(p, sz, {
      q,
      estado: vista === 'activos',
      categoriaId: categoriaFiltro === 'todas' ? undefined : Number(categoriaFiltro),
    }),
    [q, vista, categoriaFiltro],
    PAGE_SIZE_OPTIONS[0]
  );

  const refrescar = () => { recargar(); cargarResumen(); };

  const handleGuardar = async (data: ProductoPayload, imagen: CambioImagen): Promise<Producto> => {
    let guardado = productoActivo
      ? await productosApi.actualizar(productoActivo.id, data)
      : await productosApi.crear(data);
    try {
      if (imagen.archivo) guardado = await productosApi.subirImagen(guardado.id, imagen.archivo);
      else if (imagen.quitar && guardado.imagen) guardado = await productosApi.eliminarImagen(guardado.id);
    } finally {
      refrescar();
    }
    return guardado;
  };

  const handleToggleEstado = async (producto: Producto) => {
    try {
      await productosApi.cambiarEstado(producto.id, !producto.estado);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
    refrescar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Productos</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona el inventario y las categorías de la tienda.</p>
        </div>
        <button
          onClick={() => { setProductoActivo(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all"
        >
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Total Productos"
          value={conteoActivos.toLocaleString('es-PE')}
          sublabel="Activos"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          label="Stock Bajo"
          value={stockBajo.toLocaleString('es-PE')}
          sublabel="Productos"
          onClick={() => setModalStockBajoOpen(true)}
        />
        <StatCard
          icon={CalendarClock}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          label="Por Vencer (90 días)"
          value={porVencer.toLocaleString('es-PE')}
          sublabel="Productos"
          onClick={() => setModalPorVencerOpen(true)}
        />
        <StatCard
          icon={Database}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          label="Valor Total Inventario"
          value={valorInventario === null ? '—' : `S/ ${valorInventario.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sublabel="Valorizado a costo"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        <button
          onClick={() => setVista('activos')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            vista === 'activos'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Activos <span className="ml-1 text-xs font-normal text-zinc-400">({conteoActivos})</span>
        </button>
        <button
          onClick={() => setVista('inactivos')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            vista === 'inactivos'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Inactivos <span className="ml-1 text-xs font-normal text-zinc-400">({conteoInactivos})</span>
        </button>
      </div>

      {/* Buscador + filtro de categoría */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm w-full sm:w-auto flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o código de barras..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading && productos.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando productos...</div>
        ) : productos.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron productos.</div>
        ) : (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: COL_WIDTHS.producto }} />
              <col style={{ width: COL_WIDTHS.categoria }} />
              <col style={{ width: COL_WIDTHS.pVenta }} />
              <col style={{ width: COL_WIDTHS.pCompra }} />
              <col style={{ width: COL_WIDTHS.stock }} />
              <col style={{ width: COL_WIDTHS.estado }} />
              <col style={{ width: COL_WIDTHS.acciones }} />
            </colgroup>
            <thead>
              <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">P.Venta</th>
                <th className="px-4 py-3 text-left">P.Compra</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {productos.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors font-bold text-xs">
                  <td className="px-4 py-3 text-zinc-800 whitespace-normal text-left" title={p.nombre}>
                    <div className="flex items-center gap-3">
                      {urlImagenProducto(p) ? (
                        <img src={urlImagenProducto(p)!} alt={p.nombre} loading="lazy" className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200 object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-300"><ImageIcon size={16} /></div>
                      )}
                      <span>{p.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-primary font-semibold break-words whitespace-normal text-left" title={p.categoriaNombre}>{p.categoriaNombre}</td>
                  <td className="px-4 py-3 font-medium text-zinc-800 text-left">S/ {p.precioVenta.toFixed(2)}</td>
                  <td className="px-4 py-3 text-zinc-600 text-left">S/ {p.precioCompra.toFixed(2)}</td>
                  <td className="px-4 py-3 text-left">
                    <span className={p.stockBajo ? 'text-red-500 font-semibold' : 'text-zinc-600'}>{p.stockActual}</span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex flex-col items-center gap-1">
                      <ToggleSwitch checked={p.estado} onChange={() => handleToggleEstado(p)} />
                      <span className={`text-xs font-semibold ${p.estado ? 'text-primary' : 'text-zinc-400'}`}>
                        {p.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => { setProductoParaStock(p); setStockModalOpen(true); }}
                        title="Ver stock / lotes"
                        className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border-2"
                      >
                        <Boxes size={16} />
                      </button>
                      <button onClick={() => { setProductoActivo(p); setModalOpen(true); }} title="Editar Producto" className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2">
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {productos.length > 0 && (
          <Paginacion
            currentPage={paginaSegura}
            totalPages={totalPaginas}
            pageSize={pageSize}
            totalItems={totalItems}
            itemLabel="productos"
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setCurrentPage}
            onPageSizeChange={cambiarTamano}
          />
        )}
      </div>

      <ProductoModal
        open={modalOpen}
        producto={productoActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />

      <StockModal
        open={stockModalOpen}
        producto={productoParaStock}
        onClose={() => setStockModalOpen(false)}
      />

      <ModalAlertaStock isOpen={modalStockBajoOpen} onClose={() => setModalStockBajoOpen(false)} />

      <ModalProductosPorVencer isOpen={modalPorVencerOpen} onClose={() => setModalPorVencerOpen(false)} />
    </div>
  );
}

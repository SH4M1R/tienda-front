'use client';

interface PaginacionProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  itemLabel?: string;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function Paginacion({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  itemLabel = 'elementos',
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
}: PaginacionProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-zinc-200 bg-zinc-50/50">
      <div className="flex items-center gap-2 text-sm text-primary">
        <span>Mostrar</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1.5 rounded-lg border border-primary bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>de {totalItems} {itemLabel}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg border border-primary text-sm text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
        >
          Anterior
        </button>
        <span className="text-sm text-primary">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-primary text-sm text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
"use client";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, X, type LucideIcon } from "lucide-react";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
  "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-100 disabled:text-slate-500";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
const variants: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500/40",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-primary-500/30",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-primary-500/30",
};
const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

export function Button({
  variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes; loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant], sizes[size], className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button type="button" title={label} aria-label={label}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-30", className)}
      {...rest}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function Field({ label, hint, error, required, children, className }:
  { label?: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {label}{required && <span className="text-red-500"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-xs", className)}>{children}</div>;
}
export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint, tone = "primary" }:
  { label: string; value: ReactNode; icon: LucideIcon; hint?: string; tone?: "primary" | "red" | "amber" | "green" }) {
  const tones = {
    primary: "bg-primary-100 text-primary-700", red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700", green: "bg-emerald-100 text-emerald-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "red" | "amber" | "primary" }) {
  const tones = {
    gray: "bg-slate-100 text-slate-700", green: "bg-emerald-100 text-emerald-700", red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800", primary: "bg-primary-100 text-primary-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary-600", className)} />;
}
export function Loading({ label = "Cargando..." }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Spinner />{label}</div>;
}
export function EmptyState({ title = "Sin resultados", description, action }:
  { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="h-10 w-10 text-slate-300" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-medium underline">Reintentar</button>}
    </div>
  );
}
export function Alert({ tone = "amber", children }: { tone?: "amber" | "primary" | "red"; children: ReactNode }) {
  const t = { amber: "border-amber-200 bg-amber-50 text-amber-800", primary: "border-primary-200 bg-primary-50 text-primary-800", red: "border-red-200 bg-red-50 text-red-700" };
  return <div className={cn("rounded-lg border px-4 py-3 text-sm", t[tone])}>{children}</div>;
}

export function Modal({ open, onClose, title, children, footer, size = "md" }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className={cn("my-8 w-full rounded-xl bg-white shadow-xl", w)} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Th({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return <th className={cn("whitespace-nowrap bg-primary/10 px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary", right ? "text-right" : "text-left", className)}>{children}</th>;
}
export function Td({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return <td className={cn("px-5 py-3 text-sm text-slate-700", right && "text-right tabular-nums", className)}>{children}</td>;
}
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] divide-y divide-slate-100 text-sm [&_tbody]:divide-y [&_tbody]:divide-slate-100 [&_tbody_tr:hover]:bg-slate-50/60">{children}</table>
    </div>
  );
}

export function Pagination({ page, totalPages, total, onChange, pageSize, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100], itemLabel = "registros" }:
  { page: number; totalPages: number; total: number; onChange: (p: number) => void;
    pageSize?: number; onPageSizeChange?: (n: number) => void; pageSizeOptions?: readonly number[]; itemLabel?: string }) {
  const pages = Math.max(totalPages, 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-sm text-primary">
      <div className="flex items-center gap-2">
        {pageSize !== undefined && onPageSizeChange ? (
          <>
            <span>Mostrar</span>
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-primary bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/50">
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>de {total} {itemLabel}</span>
          </>
        ) : <span>{total} {itemLabel}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button disabled={page === 0} onClick={() => onChange(page - 1)}
          className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
        <span>Página {page + 1} de {pages}</span>
        <button disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}
          className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }:
  { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cn("whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            value === t.value ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-primary-600" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      {label}
    </label>
  );
}

export function DateRange({ desde, hasta, onDesde, onHasta }:
  { desde: string; hasta: string; onDesde: (v: string) => void; onHasta: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Desde"><input type="date" className={cn(inputCls, "w-40")} value={desde} max={hasta} onChange={(e) => onDesde(e.target.value)} /></Field>
      <Field label="Hasta"><input type="date" className={cn(inputCls, "w-40")} value={hasta} min={desde} onChange={(e) => onHasta(e.target.value)} /></Field>
    </div>
  );
}

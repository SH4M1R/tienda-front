"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Button, Modal, cn } from "./ui";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; type: ToastType; message: string }
interface ConfirmOpts { title?: string; message: string; confirmText?: string; danger?: boolean }

interface Ctx {
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}
const FeedbackCtx = createContext<Ctx | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === "error" ? 6000 : 3500);
  }, []);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null); };

  const value = useMemo<Ctx>(() => ({
    success: (m) => push("success", m), error: (m) => push("error", m), info: (m) => push("info", m), confirm,
  }), [push, confirm]);

  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const tones = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-primary-200 bg-primary-50 text-primary-800",
  };

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={cn("pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg", tones[t.type])}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" /><span>{t.message}</span>
            </div>
          );
        })}
      </div>
      <Modal open={!!dlg} onClose={() => close(false)} title={dlg?.title ?? "Confirmar"} size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => close(false)}>Cancelar</Button>
          <Button variant={dlg?.danger ? "danger" : "primary"} onClick={() => close(true)}>{dlg?.confirmText ?? "Aceptar"}</Button>
        </>}>
        <div className="flex gap-3 text-sm text-slate-600">
          <AlertTriangle className={cn("h-5 w-5 shrink-0", dlg?.danger ? "text-red-500" : "text-amber-500")} />
          <p>{dlg?.message}</p>
        </div>
      </Modal>
    </FeedbackCtx.Provider>
  );
}

export function useFeedback() {
  const c = useContext(FeedbackCtx);
  if (!c) throw new Error("useFeedback debe usarse dentro de FeedbackProvider");
  return c;
}

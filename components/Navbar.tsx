"use client";
import { useEffect, useState } from "react";
import { Clock, LogOut, Menu, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConfig } from "@/lib/config-context";
import { ROLES } from "@/lib/types";
import { Button, Modal } from "./ui";
import { useFeedback } from "./feedback";

interface Props { onToggleSidebar?: () => void }

/** Navbar con la estructura del sistema de referencia: logo + empresa, reloj, usuario/rol y cierre de sesión confirmado. */
export default function Navbar({ onToggleSidebar }: Props) {
  const { user, logout } = useAuth();
  const { nombre, pub } = useConfig();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const rol = ROLES.find((r) => r.value === user?.rol)?.label ?? user?.rol;
  const hora = ahora?.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "";
  const fecha = ahora?.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" }) ?? "";

  return (
    <header className="flex h-16 w-full items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 shadow-xs sm:gap-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button type="button" onClick={onToggleSidebar} aria-label="Abrir menú" className="-ml-1 cursor-pointer rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:hidden"><Menu size={22} /></button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="truncate text-sm font-bold tracking-tight text-primary sm:text-lg">{nombre}</span>
        </div>
      </div>

      {ahora && (
        <div className="mx-auto hidden shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 lg:flex" title={fecha}>
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold tabular-nums text-zinc-700">{hora}</span>
          <span className="ml-0.5 border-l border-zinc-200 pl-2 text-xs capitalize text-zinc-400">{fecha}</span>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-9 sm:w-9"><UserCircle className="h-5 w-5" /></span>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-zinc-800">{user?.nombre ?? "Usuario"}</p>
            <p className="text-xs uppercase tracking-wide text-primary">{rol ?? "—"}</p>
          </div>
        </div>
        <div className="h-6 w-px bg-zinc-200 sm:h-8" />
          <button onClick={() => setLogoutOpen(true)} title="Cerrar sesión"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-500 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm">
          <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="¿Cerrar sesión?" size="sm"
        footer={<><Button variant="secondary" onClick={() => setLogoutOpen(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => { setLogoutOpen(false); logout(); }}>Sí, cerrar sesión</Button></>}>
        <div className="text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600"><LogOut className="h-5 w-5" /></span>
          <p className="text-sm text-zinc-500">Tendrás que volver a ingresar tu usuario y contraseña para acceder al sistema.</p>
        </div>
      </Modal>
    </header>
  );
}

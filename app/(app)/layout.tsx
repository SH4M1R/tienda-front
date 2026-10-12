"use client";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { CajaCerradaModal } from "@/components/CajaCerradaModal";
import { Spinner } from "@/components/ui";

/** Rutas que ocupan toda la pantalla (el propio contenido maneja su scroll). */
const RUTAS_PANTALLA_COMPLETA = ["/compras/nueva", "/ventas/nueva"];

/** Rutas que conservan su scroll normal pero no muestran el pie de página. */
const RUTAS_SIN_FOOTER = ["/ventas/nueva"];

function Acceso({ children }: { children: React.ReactNode }) {
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  if (can(pathname)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-3 text-center">
      <div className="p-4 bg-red-50 text-red-500 rounded-2xl"><ShieldAlert size={32} /></div>
      <h2 className="text-lg font-bold text-zinc-800">No tienes acceso a esta sección</h2>
      <p className="text-sm text-zinc-500 max-w-sm">Si crees que deberías tener acceso, solicita al administrador que revise tus permisos asignados.</p>
      <button onClick={() => router.push("/")} className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Volver al Panel</button>
    </div>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const esPopup = searchParams.get("popup") === "true";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [modalCajaOpen, setModalCajaOpen] = useState(false);

  // Sin sesión → login
  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);

  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  const closeSidebar = () => setIsSidebarOpen(false);
  const esPantallaCompleta = RUTAS_PANTALLA_COMPLETA.some((r) => pathname?.startsWith(r));
  const sinFooter = esPantallaCompleta || RUTAS_SIN_FOOTER.some((r) => pathname?.startsWith(r));

  if (esPopup) {
    return (
      <div className="h-dvh w-full overflow-hidden bg-background">
        <Acceso><div className="h-full w-full">{children}</div></Acceso>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <header className="z-40 h-16 w-full shrink-0 border-b bg-background">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      </header>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={closeSidebar} />}

        <aside
          className={`
            fixed top-16 bottom-0 left-0 z-30 w-64 bg-background transition-all duration-300 ease-in-out
            md:static md:translate-x-0 shrink-0
            ${isSidebarCollapsed ? "md:w-20" : "md:w-64"}
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <Sidebar
            onClose={closeSidebar}
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((p) => !p)}
            onCajaCerrada={() => setModalCajaOpen(true)}
          />
        </aside>

        <main
          className={`flex flex-1 flex-col min-w-0 min-h-0 relative transition-all duration-300 ease-in-out ${
            esPantallaCompleta ? "overflow-hidden" : "overflow-y-auto p-4 md:p-8"
          }`}
        >
          <Acceso>
            <div className={esPantallaCompleta ? "flex-1 w-full min-h-0 overflow-hidden" : "flex-1 w-full"}>{children}</div>
          </Acceso>

          {!sinFooter && (
            <footer className="pt-8 pb-2 text-center text-xs text-zinc-400 shrink-0">
              © {new Date().getFullYear()} SH Systems (Tiendas y Bodegas) - Todos los derechos reservados.
            </footer>
          )}

          <CajaCerradaModal
            open={modalCajaOpen}
            onClose={() => setModalCajaOpen(false)}
            onIrAArqueo={() => { setModalCajaOpen(false); closeSidebar(); router.push("/caja/arqueo"); }}
          />
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}
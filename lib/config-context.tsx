"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";
import type { Empresa, EmpresaPublica } from "./types";

const DEFAULT_COLOR = "#2563eb";
const DEFAULT_PUB: EmpresaPublica = { nombreComercial: "Mi Tienda", razonSocial: null, logo: null, colorPrimario: DEFAULT_COLOR };

interface ConfigState {
  pub: EmpresaPublica;
  empresa: Empresa | null;
  nombre: string;
  applyColor: (hex: string) => void;
  reload: () => Promise<void>;
}
const Ctx = createContext<ConfigState | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pub, setPub] = useState<EmpresaPublica>(DEFAULT_PUB);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const applyColor = useCallback((hex: string) => {
    document.documentElement.style.setProperty("--primary", hex);
    try { localStorage.setItem("tienda_primary", hex); } catch { /* noop */ }
  }, []);

  const hasUser = !!user;
  const reload = useCallback(async () => {
    try {
      const p = await api<EmpresaPublica>("/api/empresa/publica", { auth: false });
      setPub(p);
      applyColor(p.colorPrimario || DEFAULT_COLOR);
    } catch { /* backend apagado: se mantiene el último color */ }
    // Los datos completos solo se piden con una sesión ya validada por AuthProvider
    if (hasUser) {
      try { setEmpresa(await api<Empresa>("/api/empresa")); } catch { /* sin permisos o sesión vencida */ }
    } else {
      setEmpresa(null);
    }
  }, [applyColor, hasUser]);

  useEffect(() => { reload(); }, [reload]);

  const nombre = pub.nombreComercial || pub.razonSocial || "Mi Tienda";
  useEffect(() => { document.title = nombre; }, [nombre]);

  const value = useMemo(() => ({ pub, empresa, nombre, applyColor, reload }), [pub, empresa, nombre, applyColor, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfig() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfig debe usarse dentro de ConfigProvider");
  return c;
}

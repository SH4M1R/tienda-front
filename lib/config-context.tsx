"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";
import type { Empresa, EmpresaPublica } from "./types";

const DEFAULT_COLOR = "#2563eb";
const DEFAULT_PUB: EmpresaPublica = { nombreComercial: "Mi Tienda", razonSocial: null, logo: null };
const LS_KEY = "tienda_primary";

interface ConfigState {
  pub: EmpresaPublica;
  empresa: Empresa | null;
  nombre: string;
  /** Color primario elegido en este navegador (no se guarda en la base de datos). */
  color: string;
  applyColor: (hex: string) => void;
  reload: () => Promise<void>;
}
const Ctx = createContext<ConfigState | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pub, setPub] = useState<EmpresaPublica>(DEFAULT_PUB);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const [color, setColor] = useState(DEFAULT_COLOR);

  // El color se guarda solo en el navegador (localStorage)
  const applyColor = useCallback((hex: string) => {
    document.documentElement.style.setProperty("--primary", hex);
    setColor(hex);
    try { localStorage.setItem(LS_KEY, hex); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LS_KEY);
      if (guardado && /^#[0-9a-fA-F]{6}$/.test(guardado)) {
        document.documentElement.style.setProperty("--primary", guardado);
        setColor(guardado);
      }
    } catch { /* noop */ }
  }, []);

  const hasUser = !!user;
  const reload = useCallback(async () => {
    try {
      const p = await api<EmpresaPublica>("/api/empresa/publica", { auth: false });
      setPub(p);
    } catch { /* backend apagado */ }
    // Los datos completos solo se piden con una sesión ya validada por AuthProvider
    if (hasUser) {
      try { setEmpresa(await api<Empresa>("/api/empresa")); } catch { /* sin permisos o sesión vencida */ }
    } else {
      setEmpresa(null);
    }
  }, [hasUser]);

  useEffect(() => { reload(); }, [reload]);

  const nombre = pub.nombreComercial || pub.razonSocial || "Mi Tienda";
  useEffect(() => { document.title = nombre; }, [nombre]);

  const value = useMemo(() => ({ pub, empresa, nombre, color, applyColor, reload }), [pub, empresa, nombre, color, applyColor, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfig() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfig debe usarse dentro de ConfigProvider");
  return c;
}

"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { Empleado, LoginResponse } from "./types";
import { ALL_ITEMS } from "./nav";

interface AuthState {
  user: Empleado | null;
  permisos: string[];
  ready: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  can: (href: string) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Empleado | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const clear = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setPermisos([]);
  }, []);

  const logout = useCallback(() => {
    clear();
    router.replace("/login");
  }, [clear, router]);

  useEffect(() => {
    setUnauthorizedHandler(() => { clear(); router.replace("/login"); });
    return () => setUnauthorizedHandler(null);
  }, [clear, router]);

  useEffect(() => {
    let cancel = false;
    async function init() {
      if (!tokenStore.get()) { setReady(true); return; }
      try {
        const r = await api<LoginResponse>("/api/auth/me");
        if (!cancel) { setUser(r.empleado); setPermisos(r.permisos); }
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancel) setReady(true);
      }
    }
    init();
    return () => { cancel = true; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api<LoginResponse>("/api/auth/login", { body: { username, password }, auth: false });
    if (r.token) tokenStore.set(r.token);
    setUser(r.empleado);
    setPermisos(r.permisos);
  }, []);

  const isAdmin = user?.rol === "ADMIN";
  const can = useCallback((href: string) => {
    if (!user) return false;
    if (user.rol === "ADMIN") return true;
    const item = ALL_ITEMS.find((i) => i.href === href);
    if (!item) return true;
    if (item.adminOnly) return false;
    if (item.always) return true;
    return permisos.includes(href);
  }, [user, permisos]);

  const value = useMemo(() => ({ user, permisos, ready, isAdmin, login, logout, can }),
    [user, permisos, ready, isAdmin, login, logout, can]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return c;
}

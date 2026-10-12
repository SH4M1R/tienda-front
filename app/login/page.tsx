"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Store, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConfig } from "@/lib/config-context";
import { errorMessage } from "@/lib/api";
import { Alert, Button, Spinner } from "@/components/ui";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const { nombre, pub } = useConfig();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (ready && user) router.replace("/"); }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  if (!ready || user) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-primary-50/40 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-primary/20 bg-white p-8 shadow-xl shadow-primary/10">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex min-h-[64px] items-center justify-center">
            {pub.logo ? (
              <img src={pub.logo} alt={nombre || "Logo de la empresa"} className="h-16 w-auto max-w-[200px] object-contain drop-shadow-sm" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Store className="h-7 w-7" /></span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary">Iniciar Sesión</h1>
            {nombre && <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">{nombre}</p>}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="red">{error}</Alert>}

          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-semibold text-slate-700">Usuario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary"><User className="h-[18px] w-[18px]" /></span>
              <input id="username" className="w-full rounded-lg border border-primary/50 bg-slate-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/50"
                value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" required />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary"><Lock className="h-[18px] w-[18px]" /></span>
              <input id="password" type={show ? "text" : "password"}
                className="w-full rounded-lg border border-primary/50 bg-slate-50 py-2.5 pl-10 pr-10 text-sm transition-all focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/50"
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary/50 hover:text-primary" aria-label="Mostrar contraseña">
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!username || !password}>Ingresar al sistema</Button>
        </form>
      </div>
    </div>
  );
}

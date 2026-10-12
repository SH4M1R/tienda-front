'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Save, ShieldCheck } from 'lucide-react';
import { empleadosCrudApi, rolLabel } from '@/api/empleados';
import type { Empleado } from '@/api/empleados';
import { permisosApi } from '@/api/permisos';
import { ESTRUCTURA_MENU } from '@/constants/menuEstructura';

export default function PermisosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState('');
  const [empleadoActivo, setEmpleadoActivo] = useState<Empleado | null>(null);
  const [rutasSeleccionadas, setRutasSeleccionadas] = useState<Set<string>>(new Set());
  const [cargandoPermisos, setCargandoPermisos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    empleadosCrudApi.listar().then((data) => setEmpleados(data.filter((e) => e.rol !== 'ADMIN')));
  }, []);

  const empleadosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter((e) => e.nombre.toLowerCase().includes(q) || e.username.toLowerCase().includes(q));
  }, [empleados, search]);

  const seleccionarEmpleado = async (empleado: Empleado) => {
    setEmpleadoActivo(empleado);
    setGuardado(false);
    setCargandoPermisos(true);
    try {
      const rutas = await permisosApi.obtener(empleado.id);
      setRutasSeleccionadas(new Set(rutas));
    } catch {
      setRutasSeleccionadas(new Set());
    } finally {
      setCargandoPermisos(false);
    }
  };

  const toggleRuta = (ruta: string) => {
    setRutasSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(ruta)) nuevo.delete(ruta);
      else nuevo.add(ruta);
      return nuevo;
    });
  };

  const toggleModulo = (rutas: string[], marcarTodas: boolean) => {
    setRutasSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      rutas.forEach((r) => marcarTodas ? nuevo.add(r) : nuevo.delete(r));
      return nuevo;
    });
  };

  const handleGuardar = async () => {
    if (!empleadoActivo) return;
    setGuardando(true);
    try {
      await permisosApi.guardar(empleadoActivo.id, Array.from(rutasSeleccionadas));
      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Asignar permisos</h1>
        <p className="text-sm text-zinc-500 mt-1">Selecciona a qué secciones del sistema puede acceder cada empleado.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de empleados */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden h-fit">
          <div className="p-4 border-b border-zinc-200">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={14} /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empleado..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-100">
            {empleadosFiltrados.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-400">No se encontraron empleados.</div>
            ) : (
              empleadosFiltrados.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => seleccionarEmpleado(emp)}
                  className={`w-full text-left px-4 py-3 transition-colors ${empleadoActivo?.id === emp.id ? 'bg-primary/10' : 'hover:bg-zinc-50'}`}
                >
                  <p className={`text-sm font-semibold ${empleadoActivo?.id === emp.id ? 'text-primary' : 'text-zinc-800'}`}>{emp.nombre}</p>
                  <p className="text-xs text-zinc-400">{emp.username} · {rolLabel(emp.rol)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Checklist de permisos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-xs p-6">
          {!empleadoActivo ? (
            <div className="py-16 text-center text-sm text-zinc-400 flex flex-col items-center gap-2">
              <ShieldCheck size={28} className="text-zinc-300" />
              Selecciona un empleado para asignar sus permisos.
            </div>
          ) : cargandoPermisos ? (
            <div className="py-16 text-center text-sm text-zinc-400">Cargando permisos...</div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div>
                  <p className="text-sm font-bold text-zinc-800">{empleadoActivo.nombre}</p>
                  <p className="text-xs text-zinc-400">{empleadoActivo.username} · {rolLabel(empleadoActivo.rol)}</p>
                </div>
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save size={15} /> {guardando ? 'Guardando...' : guardado ? '¡Guardado!' : 'Guardar permisos'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {ESTRUCTURA_MENU.map((mod) => {
                  const rutasModulo = mod.items.map((i) => i.ruta);
                  const todasMarcadas = rutasModulo.every((r) => rutasSeleccionadas.has(r));
                  return (
                    <div key={mod.modulo} className="border border-zinc-200 rounded-xl p-4 space-y-2">
                      <label className="flex items-center gap-2 pb-2 border-b border-zinc-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={todasMarcadas}
                          onChange={(e) => toggleModulo(rutasModulo, e.target.checked)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-bold text-zinc-800">{mod.modulo}</span>
                      </label>
                      {mod.items.map((item) => (
                        <label key={item.ruta} className="flex items-center gap-2 pl-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rutasSeleccionadas.has(item.ruta)}
                            onChange={() => toggleRuta(item.ruta)}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="text-sm text-zinc-600">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
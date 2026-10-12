'use client';

import { useEffect, useMemo, useState } from 'react';
import { LogIn, LogOut, Clock } from 'lucide-react';
import { asistenciaApi } from '@/api/asistencia';
import type { Asistencia, EmpleadoAsistencia as Empleado } from '@/api/asistencia';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function fechaLocalYYYYMMDD(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function normalizarFecha(fecha: string | null | undefined): string {
  if (!fecha) return '';
  return fecha.slice(0, 10);
}

export default function AsistenciaPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [procesando, setProcesando] = useState<'entrada' | 'salida' | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [registros, setRegistros] = useState<Asistencia[]>([]);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const cargarRegistros = () => asistenciaApi.hoyTodos().then(setRegistros).catch(() => setRegistros([]));

  useEffect(() => {
    asistenciaApi.empleados().then(setEmpleados).catch(() => setEmpleados([]));
    cargarRegistros();
  }, []);

  const registrosHoy = useMemo(() => {
    const hoy = fechaLocalYYYYMMDD(new Date());
    return registros.filter((r) => normalizarFecha(r.fecha) === hoy);
  }, [registros]);

  // Cálculos de paginación
  const totalItems = registrosHoy.length;
  const totalPaginas = Math.ceil(totalItems / pageSize) || 1;
  const paginaSegura = Math.min(Math.max(currentPage, 1), totalPaginas);

  const itemsPaginados = useMemo(() => {
    return registrosHoy.slice(
      (paginaSegura - 1) * pageSize,
      paginaSegura * pageSize
    );
  }, [registrosHoy, paginaSegura, pageSize]);

  const handleMarcar = async (tipo: 'entrada' | 'salida') => {
    setMensaje(null);
    if (!username) return setMensaje({ tipo: 'error', texto: 'Selecciona tu usuario.' });
    if (!password) return setMensaje({ tipo: 'error', texto: 'Escribe tu contraseña.' });

    setProcesando(tipo);
    try {
      if (tipo === 'entrada') {
        const resultado = await asistenciaApi.marcarEntrada({ username, password });
        if (resultado.tardanza) {
          setMensaje({ tipo: 'error', texto: `Entrada registrada, pero llegaste con ${resultado.minutosTardanza} minuto(s) de tardanza.` });
        } else {
          setMensaje({ tipo: 'exito', texto: '¡Entrada registrada a tiempo!' });
        }
      } else {
        await asistenciaApi.marcarSalida({ username, password });
        setMensaje({ tipo: 'exito', texto: '¡Salida registrada correctamente!' });
      }
      setPassword('');
      await cargarRegistros();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Ocurrió un error al marcar asistencia.' });
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Registro de asistencia</h1>
        <p className="text-sm text-zinc-500 mt-1">Selecciona tu usuario e ingresa tu contraseña para marcar tu entrada o salida.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Usuario</label>
          <select
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            name="usuario-asistencia-no-autofill"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          >
            <option value="">Selecciona tu usuario...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.username}>{e.nombre} ({e.username})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMarcar('entrada')}
            placeholder="Tu contraseña"
            autoComplete="new-password"
            name="clave-asistencia-no-autofill"
            data-lpignore="true"
            data-1p-ignore="true"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {mensaje && (
          <p className={`text-sm font-medium ${mensaje.tipo === 'exito' ? 'text-primary' : 'text-red-500'}`}>
            {mensaje.texto}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => handleMarcar('entrada')}
            disabled={procesando !== null}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 cursor-pointer"
          >
            <LogIn size={16} /> {procesando === 'entrada' ? 'Marcando...' : 'Marcar entrada'}
          </button>
          <button
            onClick={() => handleMarcar('salida')}
            disabled={procesando !== null}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-900 transition-all disabled:opacity-50 cursor-pointer"
          >
            <LogOut size={16} /> {procesando === 'salida' ? 'Marcando...' : 'Marcar salida'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 flex items-center gap-2 bg-zinc-50/50">
          <Clock size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-zinc-800">Marcaciones de hoy</h2>
        </div>

        {registrosHoy.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-400">Aún no hay marcaciones registradas hoy.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: '50%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                    <th className="px-5 py-3">EMPLEADO</th>
                    <th className="px-5 py-3">ENTRADA</th>
                    <th className="px-5 py-3">SALIDA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {itemsPaginados.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 font-semibold text-zinc-800">{r.empleadoNombre}</td>
                      <td className="px-5 py-3 text-zinc-600">
                        {r.horaEntrada ? new Date(r.horaEntrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        {r.tardanza && <span className="ml-2 text-[10px] font-semibold text-red-500">Tarde ({r.minutosTardanza} min)</span>}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {r.horaSalida ? new Date(r.horaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Paginacion
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              pageSize={pageSize}
              totalItems={totalItems}
              itemLabel="marcaciones"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
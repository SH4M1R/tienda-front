'use client';

import { useEffect, useState } from 'react';
import {
  Paintbrush, Check, Building2, Save, Phone, Mail, MapPin, Clock,
  Store, Plus, Pencil, Trash2, Upload, FolderOpen, Database, Download, Send, Loader2,
} from 'lucide-react';
import { useConfig } from '@/lib/config-context';
import { PRESET_COLORS } from '@/lib/color';
import { backupApi, empresaApi, sucursalesApi, type EmpresaForm, type Sucursal } from '@/api/empresa';
import ModalAviso from '@/components/ModalAviso';
import ModalEliminar from '@/components/ModalEliminar';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';

const vacio: EmpresaForm = {
  ruc: '', razonSocial: '', nombreComercial: '', telefono: '', email: '', direccion: '', departamento: '', ciudad: '',
  logo: '', horaApertura: '', horaCierre: '', toleranciaMinutos: 10, rutaImagenes: '',
  backupAutomaticoActivo: true, frecuenciaBackup: 'DIARIO', ultimoBackupEnviado: '',
};

export default function ConfiguracionPage() {
  const { color, applyColor, reload } = useConfig();
  const [guardado, setGuardado] = useState(false);
  const [form, setForm] = useState<EmpresaForm>(vacio);
  const [cargandoBackup, setCargandoBackup] = useState(false);
  const [cargandoCorreo, setCargandoCorreo] = useState(false);
  const [avisoBackup, setAvisoBackup] = useState<{ open: boolean; tipo: 'success' | 'error'; titulo: string; mensaje: string }>({ open: false, tipo: 'success', titulo: '', mensaje: '' });
  const [aviso, setAviso] = useState<{ open: boolean; mensaje: string }>({ open: false, mensaje: '' });

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucModal, setSucModal] = useState<{ open: boolean; id: number | null; nombre: string; saving: boolean; error: string }>(
    { open: false, id: null, nombre: '', saving: false, error: '' });
  const [sucEliminar, setSucEliminar] = useState<Sucursal | null>(null);

  const cargarSucursales = () => sucursalesApi.listar().then(setSucursales).catch(() => setSucursales([]));

  useEffect(() => {
    empresaApi.obtener()
      .then(({ form: f }) => { setForm(f); })
      .catch((err) => console.error('Error cargando datos de la empresa:', err));
    cargarSucursales();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({ ...prev, [name]: v }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((prev) => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // El color se aplica al instante y se recuerda solo en este navegador
  const cambiarColor = (hex: string) => applyColor(hex);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await empresaApi.guardar(form);
      setForm(data);
      await reload();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    } catch (err) {
      setAviso({ open: true, mensaje: err instanceof Error && err.message ? err.message : 'No se pudieron guardar las configuraciones.' });
    }
  };

  const descargarBackup = async () => {
    setCargandoBackup(true);
    try {
      await backupApi.descargar();
      setAvisoBackup({ open: true, tipo: 'success', titulo: 'Copia de seguridad descargada', mensaje: 'El archivo .sql de la base de datos se descargó correctamente.' });
    } catch (err) {
      setAvisoBackup({ open: true, tipo: 'error', titulo: 'Error al descargar', mensaje: err instanceof Error ? err.message : 'No se pudo generar la copia de seguridad.' });
    } finally {
      setCargandoBackup(false);
    }
  };

  const enviarBackup = async () => {
    if (!form.email) {
      setAvisoBackup({ open: true, tipo: 'error', titulo: 'Correo requerido', mensaje: 'Ingresa y guarda el correo electrónico de la empresa antes de enviar la copia de seguridad.' });
      return;
    }
    setCargandoCorreo(true);
    try {
      const msg = await backupApi.enviarCorreo();
      setForm((p) => ({ ...p, ultimoBackupEnviado: new Date().toLocaleString('sv-SE').slice(0, 19) }));
      setAvisoBackup({ open: true, tipo: 'success', titulo: 'Envío exitoso', mensaje: msg });
    } catch (err) {
      setAvisoBackup({ open: true, tipo: 'error', titulo: 'Error en el envío', mensaje: err instanceof Error ? err.message : 'Ocurrió un error al enviar el correo.' });
    } finally {
      setCargandoCorreo(false);
    }
  };

  const guardarSucursal = async () => {
    const nombre = sucModal.nombre.trim();
    if (!nombre) return setSucModal((m) => ({ ...m, error: 'El nombre es obligatorio.' }));
    setSucModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      if (sucModal.id) await sucursalesApi.actualizar(sucModal.id, nombre);
      else await sucursalesApi.crear(nombre);
      setSucModal({ open: false, id: null, nombre: '', saving: false, error: '' });
      cargarSucursales();
    } catch (err) {
      setSucModal((m) => ({ ...m, saving: false, error: err instanceof Error ? err.message : 'No se pudo guardar la sucursal.' }));
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full mx-auto px-4 lg:px-6 pb-12">
      <ModalAviso isOpen={aviso.open} tipo="error" titulo="Error al guardar" mensaje={aviso.mensaje} onClose={() => setAviso({ open: false, mensaje: '' })} />

      <ModalAviso isOpen={avisoBackup.open} tipo={avisoBackup.tipo} titulo={avisoBackup.titulo} mensaje={avisoBackup.mensaje} onClose={() => setAvisoBackup((a) => ({ ...a, open: false }))} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Configuración de la Tienda</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Personaliza la apariencia visual, horario e información legal o comercial de tu tienda.
          </p>
        </div>
        <button
          onClick={handleGuardar}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:brightness-95 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all shrink-0 self-start sm:self-center cursor-pointer"
        >
          <Save size={16} />
          {guardado ? '¡Cambios Guardados!' : 'Guardar Todo'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Bloque 1: Datos de la Empresa */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Building2 size={18} className="text-primary" />
              Información de la Empresa
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">RUC</label>
                <input name="ruc" value={form.ruc} onChange={handleChange} placeholder="Ej. 20123456789" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Razón Social</label>
                <input name="razonSocial" value={form.razonSocial} onChange={handleChange} placeholder="Ej. Mi Tienda S.A.C." className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-600">Nombre Comercial (Se muestra en el Panel)</label>
                <input name="nombreComercial" value={form.nombreComercial} onChange={handleChange} placeholder="Ej. Mi Tienda" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            </div>
          </div>

          {/* Bloque 2: Contacto y Ubicación */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <MapPin size={18} className="text-primary" />
              Contacto y Ubicación
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1"><Phone size={12}/> Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej. 01 4445555" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1"><Mail size={12}/> Correo Electrónico</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Ej. contacto@mitienda.com" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-600">Dirección</label>
                <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Ej. Av. Larco 123" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Departamento</label>
                <input name="departamento" value={form.departamento} onChange={handleChange} placeholder="Ej. Lima" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Ciudad</label>
                <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ej. Lima" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            </div>
          </div>

          {/* Bloque 3: Horario de Atención */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Clock size={18} className="text-primary" />
              Horario de Atención
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Hora de apertura</label>
                <input
                  type="time"
                  name="horaApertura"
                  value={form.horaApertura}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Hora de cierre</label>
                <input
                  type="time"
                  name="horaCierre"
                  value={form.horaCierre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Tolerancia tardanza (min)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  name="toleranciaMinutos"
                  value={form.toleranciaMinutos}
                  onChange={(e) => setForm((prev) => ({ ...prev, toleranciaMinutos: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>


          {/* Copias de Seguridad */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Database size={18} className="text-primary" />
              Copias de Seguridad de la Base de Datos
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={descargarBackup}
                disabled={cargandoBackup}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cargandoBackup ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Descargar Backup (.sql)
              </button>

              <button
                type="button"
                onClick={enviarBackup}
                disabled={cargandoCorreo}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cargandoCorreo ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Enviar Backup al Correo
              </button>
            </div>

            <hr className="border-zinc-100" />

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="backupAutomaticoActivo"
                  checked={form.backupAutomaticoActivo}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary/50 cursor-pointer"
                />
                <span className="text-xs font-semibold text-zinc-700">
                  Activar envío automático de copias de seguridad al correo de la empresa
                </span>
              </label>

              {form.backupAutomaticoActivo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600">Frecuencia del envío</label>
                    <select
                      name="frecuenciaBackup"
                      value={form.frecuenciaBackup}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="DIARIO">Diario (Todos los días a las 12:00 PM)</option>
                      <option value="SEMANAL">Semanal (Todos los domingos a las 12:00 PM)</option>
                      <option value="QUINCENAL">Quincenal (Días 1 y 15 del mes a las 12:00 PM)</option>
                      <option value="MENSUAL">Mensual (Día 1 de cada mes a las 12:00 PM)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600">Último envío registrado</label>
                    <input
                      type="text"
                      disabled
                      value={form.ultimoBackupEnviado || 'Sin envíos anteriores'}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-100 text-xs text-zinc-500"
                    />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-zinc-400">El correo emisor se configura en el servidor; el receptor es el correo de la empresa. Guarda los cambios para aplicar la frecuencia.</p>
            </div>
          </div>

          {/* Sucursales */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                <Store size={18} className="text-primary" />
                Sucursales
              </span>
              <button
                type="button"
                onClick={() => setSucModal({ open: true, id: null, nombre: '', saving: false, error: '' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-all cursor-pointer"
              >
                <Plus size={14} /> Nueva
              </button>
            </div>
            <p className="text-xs text-zinc-500">Origen y destino de los traslados.</p>
            {sucursales.length === 0 ? (
              <div className="py-6 text-center text-sm text-zinc-400">Sin sucursales registradas.</div>
            ) : (
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                {sucursales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/60">
                    <span className="text-sm font-semibold text-zinc-800">{s.nombre}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => setSucModal({ open: true, id: s.id, nombre: s.nombre, saving: false, error: '' })}
                        className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2 cursor-pointer"
                      ><Pencil size={14} /></button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => setSucEliminar(s)}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-2 cursor-pointer"
                      ><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Logo de la Empresa */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Upload size={18} className="text-primary" />
              Logo de la Tienda
            </span>

            <div className="w-full h-28 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center p-2 overflow-hidden">
              {form.logo ? (
                <img src={form.logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-zinc-400">Sin logo cargado</span>
              )}
            </div>

            <div className="space-y-1">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer" />
              <p className="text-[10px] text-zinc-400 leading-tight">Muestra principal en la barra superior o reportes.</p>
            </div>
          </div>

          {/* Carpeta de imágenes de productos */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <FolderOpen size={18} className="text-primary" />
              Imágenes de productos
            </span>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600">Carpeta de almacenamiento</label>
              <input
                name="rutaImagenes"
                value={form.rutaImagenes}
                onChange={handleChange}
                placeholder="Ej. D:\tienda\imagenes  o  /var/tienda/imagenes"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <p className="text-[10px] text-zinc-400 leading-tight">Ruta en el equipo donde corre el servidor. Se crea si no existe. Las imágenes no tienen límite de tamaño.</p>
            </div>
          </div>

          {/* Color del Tema */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Paintbrush size={18} className="text-primary" />
              Color del Tema
            </span>
            <p className="text-xs text-zinc-500">Selecciona el color de acento de la interfaz. Se aplica al instante y se guarda solo en este navegador.</p>

            <div className="grid grid-cols-4 gap-3 pt-1">
              {PRESET_COLORS.map((c) => {
                const isActive = color.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => cambiarColor(c.value)}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                        isActive ? 'border-zinc-800 scale-105 shadow-sm' : 'border-transparent group-hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {isActive && <Check size={16} className="text-white drop-shadow-xs" />}
                    </div>
                    <span className="text-[10px] font-medium text-zinc-600">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {sucModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
            <div className="px-5 py-4 border-b border-zinc-200">
              <h2 className="text-sm font-bold text-zinc-800">{sucModal.id ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Nombre</label>
                <input
                  autoFocus
                  value={sucModal.nombre}
                  onChange={(e) => setSucModal((m) => ({ ...m, nombre: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && guardarSucursal()}
                  className={inputCls}
                />
              </div>
              {sucModal.error && <p className="text-xs text-red-500 font-medium">{sucModal.error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setSucModal({ open: false, id: null, nombre: '', saving: false, error: '' })}
                  className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
                <button type="button" onClick={guardarSucursal} disabled={sucModal.saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-60">
                  {sucModal.saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalEliminar
        isOpen={!!sucEliminar}
        onClose={() => setSucEliminar(null)}
        mensaje={`¿Eliminar la sucursal "${sucEliminar?.nombre ?? ''}"? Si tiene traslados no podrá eliminarse.`}
        errorMensajeDefault="No se pudo eliminar la sucursal. Es posible que tenga traslados registrados."
        onConfirm={async () => {
          if (sucEliminar) await sucursalesApi.eliminar(sucEliminar.id);
          cargarSucursales();
        }}
      />
    </div>
  );
}

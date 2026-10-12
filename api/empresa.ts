import { request } from '@/api/http';

export interface EmpresaForm {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  telefono: string;
  email: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  logo: string;
  horaApertura: string;
  horaCierre: string;
  toleranciaMinutos: number;
  colorPrimario: string;
  rutaImagenes: string;
}

export interface Sucursal { id: number; nombre: string }

type EmpresaRaw = Partial<{ [K in keyof EmpresaForm]: EmpresaForm[K] | null }> & {
  backupAutomaticoActivo?: boolean | null;
  frecuenciaBackup?: string | null;
};

const limpiar = (d: EmpresaRaw | undefined, color: string): EmpresaForm => ({
  ruc: d?.ruc ?? '',
  razonSocial: d?.razonSocial ?? '',
  nombreComercial: d?.nombreComercial ?? '',
  telefono: d?.telefono ?? '',
  email: d?.email ?? '',
  direccion: d?.direccion ?? '',
  departamento: d?.departamento ?? '',
  ciudad: d?.ciudad ?? '',
  logo: d?.logo ?? '',
  horaApertura: d?.horaApertura ?? '',
  horaCierre: d?.horaCierre ?? '',
  toleranciaMinutos: d?.toleranciaMinutos ?? 10,
  colorPrimario: d?.colorPrimario ?? color,
  rutaImagenes: d?.rutaImagenes ?? '',
});

export const empresaApi = {
  obtener: async (): Promise<{ form: EmpresaForm; raw: EmpresaRaw }> => {
    const raw = await request<EmpresaRaw>('/empresa');
    return { form: limpiar(raw, '#2563eb'), raw };
  },
  /** Conserva los campos del backend que esta pantalla no edita (copias de seguridad). */
  guardar: async (form: EmpresaForm, raw: EmpresaRaw): Promise<EmpresaForm> => {
    const body = {
      ...form,
      horaApertura: form.horaApertura || null,
      horaCierre: form.horaCierre || null,
      backupAutomaticoActivo: raw.backupAutomaticoActivo ?? false,
      frecuenciaBackup: raw.frecuenciaBackup ?? 'DIARIO',
    };
    const d = await request<EmpresaRaw>('/empresa', { method: 'PUT', body });
    return limpiar(d, form.colorPrimario);
  },
};

export const sucursalesApi = {
  listar: () => request<Sucursal[]>('/sucursales'),
  crear: (nombre: string) => request<Sucursal>('/sucursales', { method: 'POST', body: { nombre } }),
  actualizar: (id: number, nombre: string) => request<Sucursal>(`/sucursales/${id}`, { method: 'PUT', body: { nombre } }),
  eliminar: (id: number) => request<void>(`/sucursales/${id}`, { method: 'DELETE' }),
};

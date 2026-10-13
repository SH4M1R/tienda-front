import { request } from '@/api/http';
import { apiDownload } from '@/lib/api';

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
  rutaImagenes: string;
  backupAutomaticoActivo: boolean;
  frecuenciaBackup: string;
  ultimoBackupEnviado: string;
}

export interface Sucursal { id: number; nombre: string }

type EmpresaRaw = Partial<{ [K in keyof EmpresaForm]: EmpresaForm[K] | null }> & {
  [k: string]: unknown;
};

const limpiar = (d: EmpresaRaw | undefined): EmpresaForm => ({
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
  rutaImagenes: d?.rutaImagenes ?? '',
  backupAutomaticoActivo: d?.backupAutomaticoActivo ?? true,
  frecuenciaBackup: d?.frecuenciaBackup ?? 'DIARIO',
  ultimoBackupEnviado: d?.ultimoBackupEnviado ?? '',
});

export const empresaApi = {
  obtener: async (): Promise<{ form: EmpresaForm; raw: EmpresaRaw }> => {
    const raw = await request<EmpresaRaw>('/empresa');
    return { form: limpiar(raw), raw };
  },
  guardar: async (form: EmpresaForm): Promise<EmpresaForm> => {
    const body = {
      ...form,
      horaApertura: form.horaApertura || null,
      horaCierre: form.horaCierre || null,
    };
    const d = await request<EmpresaRaw>('/empresa', { method: 'PUT', body });
    return limpiar(d);
  },
};

export const backupApi = {
  /** Descarga el archivo .sql de la base de datos. */
  descargar: () => apiDownload('/api/backup/descargar', 'backup.sql'),
  /** Envía la copia al correo registrado de la empresa. */
  enviarCorreo: () => request<{ message: string }>('/backup/enviar-correo', { method: 'POST' }).then((r) => r.message),
};

export const sucursalesApi = {
  listar: () => request<Sucursal[]>('/sucursales'),
  crear: (nombre: string) => request<Sucursal>('/sucursales', { method: 'POST', body: { nombre } }),
  actualizar: (id: number, nombre: string) => request<Sucursal>(`/sucursales/${id}`, { method: 'PUT', body: { nombre } }),
  eliminar: (id: number) => request<void>(`/sucursales/${id}`, { method: 'DELETE' }),
};

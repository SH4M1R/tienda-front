import { request } from '@/api/http';

export type TipoMovimiento = 'INGRESO' | 'EGRESO';
export type CategoriaMovimiento =
  | 'RETIRO_EFECTIVO' | 'PAGO_PROVEEDOR' | 'PAGO_SERVICIOS' | 'GASTO_VARIO' | 'APORTE_CAPITAL' | 'DEVOLUCION' | 'OTRO';
export type MedioPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE_PLIN';

export interface MovimientoCaja {
  id: number;
  cajaId: number;
  empleadoNombre: string;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  numero: string | null;
  fechaEmision: string | null;
  descripcion: string;
  monto: number;
  medioPago: MedioPago;
  fechaRegistro: string;
  anulado: boolean;
}

export interface RegistrarMovimientoPayload {
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  numero: string;
  fechaEmision: string;
  descripcion: string;
  monto: number;
  medioPago: MedioPago;
}

export const movimientoCajaApi = {
  listar: (desde?: string, hasta?: string) => request<MovimientoCaja[]>('/caja/movimientos', { params: { desde, hasta } }),
  registrar: (data: RegistrarMovimientoPayload) => request<MovimientoCaja>('/caja/movimientos', { method: 'POST', body: data }),
  anular: (id: number) => request<MovimientoCaja>(`/caja/movimientos/${id}/anular`, { method: 'PATCH' }),
};

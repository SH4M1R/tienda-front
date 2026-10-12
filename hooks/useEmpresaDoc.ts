'use client';

import { useConfig } from '@/lib/config-context';
import type { EmpresaDoc } from '@/lib/reportes';

/** Datos de la empresa para cabeceras de PDF / Excel. */
export function useEmpresaDoc(): EmpresaDoc {
  const { empresa, pub, nombre } = useConfig();
  return {
    nombre,
    ruc: empresa?.ruc,
    direccion: empresa?.direccion,
    telefono: empresa?.telefono,
    logo: empresa?.logo ?? pub.logo,
  };
}

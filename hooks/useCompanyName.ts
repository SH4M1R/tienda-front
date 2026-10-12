'use client';

import { useConfig } from '@/lib/config-context';

/** Misma interfaz que Botica; los datos salen de la empresa configurada en el backend. */
export function useCompanyName() {
  const { nombre, pub, reload } = useConfig();
  return {
    companyName: nombre,
    companyLogo: pub.logo ?? '',
    companyIcon: pub.logo ?? '',
    /** Vuelve a leer la empresa desde el servidor (usar tras guardar Configuración). */
    recargar: reload,
  };
}

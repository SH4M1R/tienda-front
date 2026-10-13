'use client';
import { useConfig } from '@/lib/config-context';

/** Color primario vigente (se cambia en Configuración; se guarda en este navegador). */
export function useThemeColor() {
  const { color, applyColor } = useConfig();
  return { primaryColor: color || '#2563eb', changeTheme: applyColor };
}

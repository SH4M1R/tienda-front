'use client';
import { useConfig } from '@/lib/config-context';

/** Color primario vigente (se cambia en Configuración → Apariencia). */
export function useThemeColor() {
  const { pub, applyColor } = useConfig();
  return { primaryColor: pub.colorPrimario || '#2563eb', changeTheme: applyColor };
}

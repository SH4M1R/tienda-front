import { PERMISSIONABLE } from '@/lib/nav';

export interface ItemMenu {
  ruta: string;
  label: string;
}

export interface ModuloMenu {
  modulo: string;
  items: ItemMenu[];
}

/** Secciones que se pueden habilitar por empleado (derivadas del menú lateral de la Tienda). */
export const ESTRUCTURA_MENU: ModuloMenu[] = PERMISSIONABLE.map((s) => ({
  modulo: s.title,
  items: s.items.map((i) => ({ ruta: i.href, label: i.label })),
}));

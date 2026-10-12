import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, CalendarCheck, ClipboardList, FilePlus2, Landmark, LayoutDashboard,
  Package, Receipt, Settings, ShieldCheck, ShoppingCart, Tags, Truck, UserCog, Users, Wallet, Contact, ListChecks,
  type LucideIcon,
} from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon; adminOnly?: boolean; always?: boolean }
export interface NavSection { title: string; items: NavItem[] }

export const NAV: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, always: true },
      { label: "Asistencias", href: "/asistencia", icon: CalendarCheck, always: true },
      { label: "Reportes", href: "/reportes", icon: BarChart3 },
    ],
  },
  {
    title: "Caja",
    items: [
      { label: "Arqueo de caja", href: "/caja/arqueo", icon: Landmark },
      { label: "Movimientos", href: "/caja/movimientos", icon: Wallet },
    ],
  },
  {
    title: "Ventas",
    items: [
      { label: "Listado de ventas", href: "/ventas", icon: Receipt },
      { label: "Nueva venta", href: "/ventas/nueva", icon: ShoppingCart },
      { label: "Clientes", href: "/ventas/clientes", icon: Contact },
    ],
  },
  {
    title: "Compras",
    items: [
      { label: "Listado de compras", href: "/compras", icon: ListChecks },
      { label: "Nueva compra", href: "/compras/nueva", icon: FilePlus2 },
      { label: "Proveedores", href: "/compras/proveedores", icon: Truck },
    ],
  },
  {
    title: "Productos",
    items: [
      { label: "Listado", href: "/productos", icon: Package },
      { label: "Categorías", href: "/productos/categorias", icon: Tags },
      { label: "Kardex", href: "/productos/kardex", icon: ClipboardList },
    ],
  },
  {
    title: "Traslados",
    items: [
      { label: "Ingresos", href: "/traslados/ingresos", icon: ArrowDownToLine },
      { label: "Egresos", href: "/traslados/egresos", icon: ArrowUpFromLine },
    ],
  },
  {
    title: "Administración",
    items: [
      { label: "Empleados", href: "/empleados", icon: Users, adminOnly: true },
      { label: "Permisos", href: "/empleados/permisos", icon: ShieldCheck, adminOnly: true },
      { label: "Configuración", href: "/configuracion", icon: Settings, adminOnly: true },
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((s) => s.items);
/** Ítems cuya visibilidad se controla desde "Permisos". */
export const PERMISSIONABLE: NavSection[] = NAV
  .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly && !i.always) }))
  .filter((s) => s.items.length > 0);

export { UserCog };

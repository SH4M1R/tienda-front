'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, ShoppingCart, Contact, ChevronDown, List, Plus, Users, Tags, Lock, Repeat,
  ArrowDownToLine, ArrowUpFromLine, Receipt, ArrowRightLeft, ShieldCheck, UserCheck, BarChart3, CalendarCheck,
  ShoppingBag, Wallet, ChevronsLeft, ChevronsRight, ClipboardList, Store,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useConfig } from '@/lib/config-context';
import { api } from '@/lib/api';

const topLinks = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/asistencia', label: 'Asistencia', icon: CalendarCheck },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
];

const cajaChildren = [
  { href: '/caja/arqueo', label: 'Arqueo de caja', icon: Receipt },
  { href: '/caja/movimientos', label: 'Movimientos', icon: ArrowRightLeft },
];

const productosChildren = [
  { href: '/productos', label: 'Listado productos', icon: List },
  { href: '/productos/categorias', label: 'Categorías', icon: Tags },
  { href: '/productos/kardex', label: 'Kardex', icon: ClipboardList },
];

const trasladosChildren = [
  { href: '/traslados/ingresos', label: 'Ingresos', icon: ArrowDownToLine },
  { href: '/traslados/egresos', label: 'Egresos', icon: ArrowUpFromLine },
];

const empleadosChildren = [
  { href: '/empleados', label: 'Listado Empleados', icon: UserCheck },
  { href: '/empleados/permisos', label: 'Asignar Permisos', icon: ShieldCheck },
];

const bottomLinks = [{ href: '/configuracion', label: 'Configuración', icon: Settings }];

const EVENTO_CAJA_ACTUALIZADA = 'caja:actualizada';
const RUTA_GENERAR_VENTA = '/ventas/nueva';
const RUTA_GENERAR_COMPRA = '/compras/nueva';

type MenuId = 'caja' | 'ventas' | 'compras' | 'productos' | 'empleados' | 'traslados' | null;

interface SidebarProps {
  onClose?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCajaCerrada: () => void;
}

export default function Sidebar({ onClose, collapsed, onToggleCollapse, onCajaCerrada }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, can, isAdmin } = useAuth();
  const { nombre } = useConfig();

  const cajaChildrenVisibles = cajaChildren.filter((c) => can(c.href));
  const productosChildrenVisibles = productosChildren.filter((c) => can(c.href));
  const trasladosChildrenVisibles = trasladosChildren.filter((c) => can(c.href));
  const empleadosChildrenVisibles = empleadosChildren.filter((c) => isAdmin && can(c.href));

  const ventasLinksVisibles = {
    listado: can('/ventas'),
    generar: can(RUTA_GENERAR_VENTA),
    clientes: can('/ventas/clientes'),
  };
  const ventasModuloVisible = Object.values(ventasLinksVisibles).some(Boolean);

  const comprasLinksVisibles = {
    listado: can('/compras'),
    generar: can(RUTA_GENERAR_COMPRA),
    proveedores: can('/compras/proveedores'),
  };
  const comprasModuloVisible = Object.values(comprasLinksVisibles).some(Boolean);

  const cajaModuloVisible = cajaChildrenVisibles.length > 0;
  const productosModuloVisible = productosChildrenVisibles.length > 0;
  const trasladosModuloVisible = trasladosChildrenVisibles.length > 0;
  const empleadosModuloVisible = empleadosChildrenVisibles.length > 0;

  const topLinksVisibles = topLinks.filter((link) => can(link.href));

  const cajaActivo = pathname.startsWith('/caja');
  const productosActivo = pathname.startsWith('/productos');
  const ventasActivo = pathname.startsWith('/ventas');
  const comprasActivo = pathname.startsWith('/compras');
  const empleadosActivo = pathname.startsWith('/empleados');
  const trasladosActivo = pathname.startsWith('/traslados');

  const menuActivoInicial: MenuId = cajaActivo ? 'caja' : ventasActivo ? 'ventas' : comprasActivo ? 'compras'
    : productosActivo ? 'productos' : empleadosActivo ? 'empleados' : trasladosActivo ? 'traslados' : null;

  const [menuAbierto, setMenuAbierto] = useState<MenuId>(menuActivoInicial);

  const toggleMenu = (id: MenuId) => setMenuAbierto((prev) => (prev === id ? null : id));

  const handleToggleMenu = (id: MenuId) => {
    if (collapsed) {
      onToggleCollapse();
      setMenuAbierto(id);
    } else {
      toggleMenu(id);
    }
  };

  // Estado de la caja del usuario
  const [cajaAbierta, setCajaAbierta] = useState<boolean | undefined>(undefined);

  const revisarCaja = useCallback(() => {
    if (!user?.id) return;
    api('/api/caja/actual')
      .then((actual) => setCajaAbierta(!!actual))
      .catch(() => setCajaAbierta(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    revisarCaja();
    window.addEventListener('focus', revisarCaja);
    window.addEventListener(EVENTO_CAJA_ACTUALIZADA, revisarCaja);
    const intervalo = setInterval(revisarCaja, 15000);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', revisarCaja);
      window.removeEventListener(EVENTO_CAJA_ACTUALIZADA, revisarCaja);
    };
  }, [user?.id, pathname, revisarCaja]);

  const puedeVender = !!cajaAbierta;

  // Atajos: F4 = Generar venta, F6 = Ingresar compra
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'F4' && e.key !== 'F6') return;
      const target = e.target as HTMLElement | null;
      const escribiendo = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (escribiendo) return;
      if (e.key === 'F4') {
        if (!ventasLinksVisibles.generar) return;
        e.preventDefault();
        if (!puedeVender) { onCajaCerrada(); return; }
        router.push(RUTA_GENERAR_VENTA);
      } else {
        if (!comprasLinksVisibles.generar) return;
        e.preventDefault();
        const w = 1280, h = 800;
        const top = (window.screen.height - h) / 2;
        const left = (window.screen.width - w) / 2;
        window.open(
          `${window.location.origin}${RUTA_GENERAR_COMPRA}?popup=true`,
          'GenerarCompraPOS',
          `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ventasLinksVisibles.generar, comprasLinksVisibles.generar, puedeVender, onCajaCerrada, router]);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg text-md font-semibold transition-all shrink-0 ${
      collapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-2.5'
    } ${active ? 'bg-white text-primary shadow-md' : 'text-white hover:bg-white/20 hover:text-white'}`;

  const handleClickGenerarVenta = (e: React.MouseEvent) => {
    if (cajaAbierta === false) {
      e.preventDefault();
      onCajaCerrada();
    } else if (onClose) {
      onClose();
    }
  };

  const handleLinkClick = () => { if (onClose) onClose(); };

  const grupo = (id: Exclude<MenuId, null>, titulo: string, Icon: typeof Wallet, activo: boolean, hijos: React.ReactNode) => (
    <>
      <button
        type="button"
        onClick={() => handleToggleMenu(id)}
        title={collapsed ? titulo : undefined}
        className={linkClass(activo && menuAbierto !== id)}
      >
        <Icon size={18} />
        {!collapsed && <span className="flex-1 text-left">{titulo}</span>}
        {!collapsed && <ChevronDown size={16} className={`transition-transform ${menuAbierto === id ? 'rotate-180' : ''}`} />}
      </button>
      {!collapsed && menuAbierto === id && <div className="flex flex-col gap-1 pl-4">{hijos}</div>}
    </>
  );

  const enlaces = (items: { href: string; label: string; icon: typeof Wallet }[]) =>
    items.map(({ href, label, icon: Icon }) => (
      <Link key={href} href={href} onClick={handleLinkClick} className={linkClass(pathname === href)}>
        <Icon size={16} />
        <span className="text-sm">{label}</span>
      </Link>
    ));

  return (
    <div className="flex flex-col h-full bg-primary text-white shadow-2xl">
      {/* Cabecera: logo + nombre y botón de colapsar */}
      <div className={`hidden md:flex items-center border-b border-white px-3 py-3 ${collapsed ? 'flex-col gap-2 justify-center' : 'justify-between'}`}>
        <div className={`flex items-center gap-2 p-0.5 ${collapsed ? 'justify-center' : 'flex-1 min-w-0 mr-1'}`}>
          <a href="https://wa.me/51907845855" title="CONTACTA CON JPS SYSTEMS" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <img src="/jpssystems.png"
              alt="CONTACTA CON JPS SYSTEMS"
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/30 bg-white hover:opacity-90 transition-opacity cursor-pointer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
          {!collapsed && <span className="truncate text-xs font-semibold">Contáctanos</span>}
          </a>
        </div>

        <div className={`bg-white shrink-0 ${collapsed ? 'w-full h-[1px]' : 'h-8 w-[1px] mx-1'}`} />

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      <nav
        className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto p-3
                   [&::-webkit-scrollbar]:w-1.5
                   [&::-webkit-scrollbar-track]:bg-primary
                   [&::-webkit-scrollbar-thumb]:bg-white/25
                   [&::-webkit-scrollbar-thumb]:rounded-full
                   hover:[&::-webkit-scrollbar-thumb]:bg-white/40"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.25) transparent' }}
      >
        {topLinksVisibles.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={handleLinkClick} title={collapsed ? label : undefined} className={linkClass(pathname === href)}>
            <Icon size={18} />
            {!collapsed && label}
          </Link>
        ))}

        {cajaModuloVisible && grupo('caja', 'Caja', Wallet, cajaActivo, enlaces(cajaChildrenVisibles))}

        {ventasModuloVisible && grupo('ventas', 'Ventas', ShoppingCart, ventasActivo, (
          <>
            {ventasLinksVisibles.listado && (
              <Link href="/ventas" onClick={handleLinkClick} className={linkClass(pathname === '/ventas')}>
                <List size={16} />
                <span className="text-sm">Listado de ventas</span>
              </Link>
            )}
            {ventasLinksVisibles.generar && (
              <Link
                href={RUTA_GENERAR_VENTA}
                onClick={handleClickGenerarVenta}
                title={cajaAbierta === false ? 'Debes abrir tu caja primero' : 'Generar venta (F4)'}
                className={`${linkClass(pathname === RUTA_GENERAR_VENTA)} ${cajaAbierta === false ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {cajaAbierta === false ? <Lock size={16} /> : <Plus size={16} />}
                <span className="text-sm flex-1">Generar venta</span>
                {puedeVender && <span className="text-[10px] font-semibold text-white/60 border border-white/30 rounded px-1">F4</span>}
              </Link>
            )}
            {ventasLinksVisibles.clientes && (
              <Link href="/ventas/clientes" onClick={handleLinkClick} className={linkClass(pathname === '/ventas/clientes')}>
                <Contact size={16} />
                <span className="text-sm">Clientes</span>
              </Link>
            )}
          </>
        ))}

        {comprasModuloVisible && grupo('compras', 'Compras', ShoppingBag, comprasActivo, (
          <>
            {comprasLinksVisibles.listado && (
              <Link href="/compras" onClick={handleLinkClick} className={linkClass(pathname === '/compras')}>
                <List size={16} />
                <span className="text-sm">Listado de Compras</span>
              </Link>
            )}
            {comprasLinksVisibles.generar && (
              <Link href={RUTA_GENERAR_COMPRA} onClick={handleLinkClick} title="Ingresar Compra (F6)" className={linkClass(pathname === RUTA_GENERAR_COMPRA)}>
                <Plus size={16} />
                <span className="text-sm flex-1">Ingresar Compra</span>
                <span className="text-[10px] font-semibold text-white/60 border border-white/30 rounded px-1">F6</span>
              </Link>
            )}
            {comprasLinksVisibles.proveedores && (
              <Link href="/compras/proveedores" onClick={handleLinkClick} className={linkClass(pathname === '/compras/proveedores')}>
                <Contact size={16} />
                <span className="text-sm">Proveedores</span>
              </Link>
            )}
          </>
        ))}

        {productosModuloVisible && grupo('productos', 'Productos', Package, productosActivo, enlaces(productosChildrenVisibles))}
        {trasladosModuloVisible && grupo('traslados', 'Traslados', Repeat, trasladosActivo, enlaces(trasladosChildrenVisibles))}
        {empleadosModuloVisible && grupo('empleados', 'Empleados', Users, empleadosActivo, enlaces(empleadosChildrenVisibles))}

        {isAdmin && bottomLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={handleLinkClick} title={collapsed ? label : undefined} className={linkClass(pathname === href)}>
            <Icon size={18} />
            {!collapsed && label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
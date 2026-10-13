# Frontend Intranet Tienda (Next.js 16 · React 19 · Tailwind v4)

Validado con `tsc`, ESLint y `next build` (21 rutas). Generadores POS 80 / A4 / Excel probados en Node. Backend esperado: Spring Boot en `http://localhost:8020`.

## Instalación (sobre tu proyecto ya creado)
1. Copia la carpeta `src/` dentro de tu proyecto, reemplazando `app/globals.css` y `app/layout.tsx`.
   - Si tu proyecto **no usa `src/`**, copia `app/`, `components/` y `lib/` a la raíz (el alias `@/*` debe apuntar a la raíz).
2. **Elimina `src/app/page.tsx`** (la ruta `/` ahora la sirve `src/app/(app)/page.tsx`, que es el dashboard).
3. Instala dependencias: `npm i recharts lucide-react jspdf exceljs`
4. Copia `.env.local.example` a `.env.local` (cambia la URL si tu backend usa otra).
5. En `package.json`, deja el puerto que permite tu CORS: `"dev": "next dev -p 3020"`.
6. (Opcional) reemplaza `eslint.config.mjs`: solo desactiva dos reglas que no aplican (efectos de carga de datos y `<img>` con logo base64).
7. `npm run dev` → http://localhost:3020 (usuario inicial: `admin`).

## Estructura
```
src/
  app/
    layout.tsx              raíz: fuentes, color guardado, Providers
    login/                  inicio de sesión
    (app)/                  zona protegida (navbar + sidebar + guard)
      page.tsx              dashboard (admin) / bienvenida (otros roles)
      asistencia/  reportes/
      caja/{arqueo,movimientos}/
      ventas/{page,nueva,clientes}/
      compras/{page,nueva,proveedores}/
      productos/{page,categorias,kardex}/
      traslados/{ingresos,egresos}/
      empleados/{page,permisos}/
      configuracion/
  components/               ui, feedback (toasts/confirmar), charts, ProductSearch, EntitySearch, Ticket, Navbar, Sidebar…
  lib/                      api, auth-context, config-context, nav, types, format, color, hooks
```

## Cómo funciona
- **Acceso:** sin sesión todo redirige a `/login`. El token JWT va en `localStorage`; ante un 401 se cierra la sesión sola. La seguridad real está en el backend; el frontend solo oculta/redirige.
- **Menú por permisos:** ADMIN ve todo. Los demás ven solo lo asignado en *Empleados → Permisos* (Dashboard y Asistencias siempre visibles; Reportes, Empleados y Configuración solo ADMIN). Entrar por URL a un módulo no permitido muestra "Sin acceso".
- **Color:** toda la UI usa `primary-50…950`, derivadas de **una sola variable** `--primary` (`color-mix`). Se cambia en *Configuración → Apariencia* con vista previa en vivo y se guarda en la empresa (afecta a todos los usuarios y al login).
- **Venta (POS):** buscador por nombre; Enter o la pistola de códigos agrega directo al carrito (lee el código exacto primero). Si el cursor no está en un campo, también detecta la pistola. Atajo **F9** para cobrar. Controla stock, venta por unidad/caja, cliente por DNI (RENIEC), vuelto y ticket imprimible.
- **Gráficos:** dashboard con selector de periodo (Hoy / 7 días / 30 días / Mes) y reportes con exportación CSV; los colores salen del color primario.

## Integración con el diseño/funcionalidad de Botica (sin dominio farmacéutico)
- **Todas las pantallas excepto Ventas y Arqueo de caja** replican el diseño de Botica (tablas `bg-primary/10`, modales `z-[60]`, botones `border-2`, paginación del servidor con `usePaginaServidor` + `Paginacion`): Clientes, Proveedores, Productos (+ lotes, stock bajo, por vencer), Categorías, Compras (listado, ingresar compra, detalle), Traslados, Movimientos de caja, Empleados, Permisos, Configuración y Reportes.
- Capa de adaptación: `src/api/*.ts` (usa `request`/`fetchPagina` con JWT y prefijo `/api`), `src/hooks/*`, `src/constants/menuEstructura.ts` (permisos derivados del menú).
- Diferencias deliberadas: el stock solo se modifica por Compras/Traslados (el kardex se calcula de esos documentos, por eso el modal de lotes es de solo lectura); clientes solo con DNI; sin metas de venta por empleado.
- **Navbar y Login:** estructura y estilo de Botica (logo + empresa, reloj, usuario/rol, cierre de sesión con confirmación). La autenticación sigue siendo JWT de la Tienda.
- **Reportes:** pestaña *Descargas* con 13 reportes (ventas por periodo/empleado/medio de pago/producto, top productos, arqueo y flujo de caja, compras por proveedor, cuentas por pagar, inventario valorizado, alerta de stock, por vencer, asistencia, consolidado), cada uno en **POS 80 · A4 · Excel**. Una sola definición declarativa (`lib/reportes/catalogo.ts`) alimenta los tres formatos (`lib/reportes/{pdf,excel}.ts`); jsPDF y ExcelJS se cargan solo al exportar.
- **Listado de ventas:** navegación por día (anterior/siguiente + calendario), tabla paginada con tamaño de página y acciones por fila.
- **Generar venta:** cliente y comprobante arriba; el cobro abre un modal flotante de método de pago (F9 confirma).
- **Dashboard:** mismas tarjetas de la Tienda; gráficos al estilo Botica (evolución, compras vs ventas, mapa de calor hora/día, categorías, ranking de empleados, compras por proveedor).
- **Kardex:** tarjetas de la Tienda + tabla estilo Botica + exportación POS 80/A4/Excel. **Caja:** impresión del arqueo (POS 80/A4/Excel).
- **Tablas, tarjetas, paginación y botones de acción** comparten el estilo de Botica desde `components/ui.tsx`.
- **Permisos:** ahora se validan **en el servidor** (`@permisos` en el backend); *Reportes* se asigna por permiso. Al crear un empleado no administrador se le asignan los permisos de su rol.

> Empleados existentes que no sean ADMIN: vuelve a asignarles permisos en *Empleados → Permisos* (botón "Sugerido por rol"), porque ahora el servidor los exige.

## Última tanda de cambios
- Compras → *Ingresar compra* con el layout a pantalla completa de Botica, **ventana flotante** y atajo **F6** (en Ventas, F4).
- Productos con imagen en el listado; Clientes con consulta de DNI y RUC; Caja abre/cierra con modal; Dashboard, Kardex, Asistencia (quiosco), Boleta PDF y Navbar/Sidebar con el diseño de Botica.
- Comprobantes: solo Nota de Venta habilitada; Boleta/Factura quedan para la conexión con el SFS de la SUNAT.
- Verificado: `tsc`, `eslint` y `next build` sin errores.
- Aviso: el historial de asistencia de administrador ahora se consulta desde *Reportes → Asistencia*.

## Tanda de cambios
- **Lotes** editables y creables desde *Productos → Stock*.
- **Generar venta:** sin caja abierta aparece un modal que lleva a Arqueo de caja; al cobrar, el comprobante se abre de inmediato (sin modal intermedio). Pie de página oculto en esa pantalla.
- **Color del tema** guardado solo en el navegador.
- **Configuración:** tarjeta de copias de seguridad (descargar, enviar al correo, envío automático y frecuencia).
- **Comprobante:** incluye teléfono, dirección, RUC y razón social; nunca el correo.
- **Reportes:** categorías, tarjetas, filtros, gráfico + tabla paginada con los 14 reportes existentes (exportables a POS80, A4 y Excel).
- **Dashboard** simplificado: tarjetas de resumen, alertas y accesos rápidos; los gráficos están en Reportes.
- Se adoptaron los cambios de tu zip (Generar venta a pantalla completa, Arqueo, etc.).

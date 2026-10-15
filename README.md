# JPS Market · Front en modo demostración (sin backend)

Todo el front funciona **sin servidor**: las llamadas a `/api/...` se resuelven en memoria con datos estáticos
(`src/mock/seed.ts` + `src/mock/server.ts`). El diseño y las pantallas son los mismos del proyecto real.

## Ejecutar
```bash
npm install
npm run dev      # http://localhost:3020
```

## Archivos de `public/` que debes copiar
- `public/JPSMARKETBANNER.png` → logo de la empresa (login, navbar, comprobante PDF).
- `public/jpssystems.png` → imagen del botón "Contáctanos" del menú lateral (opcional; si falta se oculta).

## Usuarios de prueba
| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin` | `admin123` |
| Cajero | `cajero` | `cajero123` |
| Almacén | `almacen` | `almacen123` |

## Datos incluidos
JPS Market (RUC 20607845855, tel. 907845855, jpssystems907@gmail.com) · 30 productos en 6 categorías (con lotes,
vencimientos y stock bajo) · 10 clientes (8 DNI + 2 RUC) · 100 ventas (NV001) · 20 compras · 5 proveedores · 3 empleados ·
8 traslados · cajas (abiertas hoy para admin y cajero), movimientos y asistencias de los últimos 14 días.
Las fechas se generan relativas al día actual, así que dashboard y reportes siempre muestran datos recientes.

## Comportamiento
- Todo es funcional: vender (descuenta stock FEFO), anular, comprar, traslados, abrir/cerrar caja, kardex, reportes
  (POS80/A4/Excel), empleados/permisos, configuración, asistencia, consulta DNI/RUC simulada, backup `.sql` de demostración.
- Los cambios se guardan en el `localStorage` del navegador (se comparten entre pestañas, por eso el comprobante abre bien en
  otra pestaña) y los datos se **regeneran cada día**. Para volver al estado inicial: abre la app con `?reset-demo`
  (ej. `http://localhost:3020/login?reset-demo`) o borra los datos del sitio.
- El código para conectar el backend real está intacto en el proyecto `tienda-front`; aquí solo cambian `src/lib/api.ts`
  (redirige a `src/mock`) y los textos de marca (JPS Systems).

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

## Estructura (importante)
El proyecto usa la carpeta `src/` (`src/app`, `src/components`, `src/lib`, `src/mock`…) y el alias `@/*` apunta a `./src/*`
(ver `tsconfig.json`). **No mezcles** una carpeta `app/` en la raíz con `src/app`: Next.js usaría la de la raíz e ignoraría `src/`.

## Desplegar (Vercel, recomendado)
1. Sube el proyecto a GitHub (el `.gitignore` ya excluye `node_modules` y `.next`; **sí** incluye `public/` con tus logos).
2. En vercel.com → *Add New… → Project* → importa el repositorio. Framework: **Next.js** (autodetectado). No requiere variables de entorno.
3. *Deploy*. Cada `git push` vuelve a publicar.

Otras opciones: `npm run build && npm run start` en cualquier servidor con Node ≥ 20.9 (puerto 3020).
Nota: los datos de demostración viven en el navegador de cada visitante (localStorage), no en el servidor.

## Estructura esperada (importante)
El alias `@/` apunta a `src/`, así que el proyecto debe quedar así (todo dentro de `src/`):
```
tienda-front-demo/
├─ public/            ← aquí van JPSMARKETBANNER.png y jpssystems.png
├─ src/
│  ├─ app/  components/  lib/  api/  hooks/  mock/  ...
├─ package.json  tsconfig.json  next.config.mjs  postcss.config.mjs  eslint.config.mjs
```
Si ves `Can't resolve '@/components/...'`, es que `app/`, `components/`, `lib/`… quedaron en la raíz en vez de dentro de `src/`.

## Desplegar
**Vercel (recomendado, sin variables de entorno):** sube la carpeta a GitHub → vercel.com → *Add New Project* → importa el repo
(Framework: Next.js, todo por defecto) → *Deploy*. Cada `git push` vuelve a desplegar.

**Probar el build de producción en local:**
```bash
npm ci && npm run build && npm start      # http://localhost:3020
```
Notas: el build descarga la fuente Geist de Google Fonts (necesita internet; Vercel lo tiene). Todas las páginas se generan
estáticas, y no hace falta backend ni variables de entorno.

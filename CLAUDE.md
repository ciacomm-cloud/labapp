# labapp — Sistema de Control de Inventario y Producción (Laboratorio de Micropropagación)

Proyecto nuevo e independiente. **Sin relación** con lab.castamay.com ni con
ningún otro proyecto existente — auth, base de datos y despliegue son propios
de este repo.

## Stack

- **Backend:** FastAPI + SQLAlchemy 2.x + Alembic (migraciones versionadas).
- **DB:** MySQL/Percona (no Postgres — este servidor es CloudPanel y solo
  tiene MySQL disponible). Driver `PyMySQL`.
- **Auth:** JWT propio (PyJWT) + `passlib[bcrypt]` para hashing. Construido
  desde cero para este proyecto — no reutiliza nada de otros sistemas.
- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`),
  React Router v7. SPA cliente-only, sin SSR/RSC.

## Decisiones técnicas tomadas

1. **`catalog_code`**: asignado manualmente por el admin al crear el
   `CatalogItem`. No hay autogeneración de folios (`C0001`, `C0002`...).
2. **`InventoryLog` es histórico puro, no upsert.** Se permiten múltiples
   logs por catálogo en la misma semana — cada `POST` crea una fila nueva.
   El "estado actual" de un catálogo es siempre su log más reciente
   (`ORDER BY created_at DESC LIMIT 1`), nunca un registro que se sobreescribe.
3. **Sin fotos por ahora.** El esquema de `inventory_logs` no tiene columna
   para adjuntos. Diseño pensado para que agregarlo después sea una migración
   aditiva y no rompa nada (columna nullable nueva, o tabla `inventory_log_photos`
   aparte con FK a `inventory_logs.id` — decidir cuando se implemente).
4. **Motor de BD: MySQL, no Postgres.** El spec original asumía Postgres;
   se corrigió tras verificar que el servidor solo tiene MySQL/Percona
   corriendo (CloudPanel, sin `sudo` a nivel de BD más allá de
   `clpctlWrapper db:export/import`). La base `applab` y el usuario `labapp`
   se crearon manualmente desde el panel de CloudPanel.
5. **Alembic desde el día 1** (no `create_all()`) para tener migraciones
   versionadas en un proyecto que va a producción.
6. **Usuarios:** tabla `users` propia con `role` enum (`admin` | `tech`).
   No hay roles adicionales todavía.

## Gotchas conocidos

**`passlib` + `bcrypt`:** `passlib==1.7.4` es incompatible con `bcrypt>=4.1`
(rompe el backend con `AttributeError: module 'bcrypt' has no attribute
'__about__'` y luego `ValueError: password cannot be longer than 72 bytes`).
Fijado a `bcrypt==4.0.1` en `requirements.txt`. Si se actualiza `passlib`,
revisar si ya soporta bcrypt 4.1+/5.x antes de destapar el pin.

**`react-router` advisory sin patch disponible:** `npm audit` reporta un
"High" (RSC Mode CSRF Bypass, GHSA-qwww-vcr4-c8h2) en el rango
`7.12.0-8.2.0` — cubre la última versión estable (`7.18.1`, la que usamos).
Es específico de **RSC Mode** (React Server Components / server actions);
esta app es una SPA cliente-only con `BrowserRouter`, no usa RSC ni loaders
de servidor, así que no aplica. No degradar la versión para "resolverlo":
versiones anteriores (probado `7.11.0`) tienen un historial mucho más largo
de CVEs reales (XSS, RCE, open redirect) que sí aplicarían. Mantener en la
última estable.

**Fechas del frontend: usar hora local, no UTC.** `new Date().toISOString()`
da la fecha en UTC, y el servidor corre en CST (UTC-6) — usar
`toISOString().slice(0,10)` para "hoy" hace que la captura registre un día
adelante del servidor durante buena parte del día, y el backend calculaba
`dias_transcurridos` en negativo. Se encontró probando la app real en
navegador (Playwright), no por `tsc`/build. Fix: `src/lib/dates.ts` usa
`getFullYear()/getMonth()/getDate()` (hora local) en vez de `toISOString()`.
Cualquier fecha "hoy" nueva en el frontend debe pasar por ese helper.

**Un 401 no siempre significa "sesión expirada".** `lib/api.ts` interceptaba
*cualquier* respuesta 401 (de cualquier endpoint) como "tu sesión expiró" y
mostraba ese mensaje genérico — incluyendo el propio `POST /api/auth/login`
cuando rechaza credenciales incorrectas. Resultado: un login fallido (usuario
o password mal) mostraba "Sesión expirada, vuelve a iniciar sesión" en vez
del detalle real del backend ("Usuario o contraseña incorrectos"), incluso
en la primerísima visita sin sesión previa — confuso porque nunca hubo
sesión que expirar. Reportado en producción 2026-07-25, reproducido con
Playwright en contexto de navegador limpio (sin storage previo) contra
`https://labapp.castamay.com`. Fix: el branch de "limpiar token + notificar
sesión expirada" en `request()` ahora solo se dispara si la request llevaba
un `Authorization: Bearer` nuestro (`res.status === 401 && token`) — el login
nunca manda ese header, así que su 401 cae al manejo genérico de errores y
muestra el `detail` real del backend. Verificado que el caso legítimo (token
inválido/vencido guardado) sigue limpiando el token correctamente al perder
una request autenticada.

## Estructura

```
labapp/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routers
│   │   ├── config.py          # Settings desde .env (pydantic-settings)
│   │   ├── database.py        # engine, SessionLocal, Base, get_db
│   │   ├── deps.py            # get_current_user, require_role, require_admin, require_any_role
│   │   ├── models/
│   │   │   ├── user.py        # User, UserRole
│   │   │   └── inventario.py  # Genus, Species, CatalogItem, InventoryLog, DiscardReason
│   │   ├── schemas/
│   │   │   ├── user.py        # UserCreate, UserOut, Token
│   │   │   ├── inventario.py  # Genus/Species/CatalogItem Create/Update/Out
│   │   │   ├── inventory_log.py  # InventoryLogCreate/Update/Out
│   │   │   └── dashboard.py   # DashboardSummaryOut, DashboardUrgenteOut
│   │   ├── routers/
│   │   │   ├── auth.py        # /api/auth/login, /me, /users (admin)
│   │   │   ├── inventario.py  # /api/inventario/genera, /species
│   │   │   ├── catalog.py     # /api/catalog-items (+ /{id}/logs)
│   │   │   └── dashboard.py   # /api/dashboard/summary, /urgentes, /export
│   │   └── services/
│   │       ├── auth.py               # hash_password, verify_password, JWT
│   │       ├── inventory_rules.py    # validate_log_balances
│   │       └── inventory_metrics.py  # compute_log_metrics
│   ├── alembic/                # migraciones versionadas
│   ├── requirements.txt
│   ├── .env                    # NO commiteado — credenciales reales
│   └── .env.example
├── frontend/                    # Vite + React + TS + Tailwind v4
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts          # fetch wrapper, JWT, login(), downloadExport()
│   │   │   ├── types.ts        # tipos espejo de los schemas del backend
│   │   │   └── dates.ts        # fechas en hora local (ver gotcha arriba)
│   │   ├── auth/AuthContext.tsx
│   │   ├── components/         # Layout (tabs por rol), ProtectedRoute, SemaforoBadge
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── CapturaPage.tsx     # tech + admin
│   │       ├── DashboardPage.tsx   # admin only
│   │       ├── CatalogoPage.tsx    # admin only, tabs Géneros/Especies/Catálogo
│   │       └── catalogo/           # GeneraSection, SpeciesSection, CatalogSection
│   └── dist/                    # build de producción (gitignored)
└── CLAUDE.md
```

## Despliegue en producción (labapp.castamay.com)

**Arquitectura actual (desde 2026-07-25): código y proceso corren nativamente
bajo el usuario `castamay-labapp`** — el dueño real del vhost/document root
de `labapp.castamay.com` en CloudPanel. nginx sigue haciendo reverse proxy
hacia el backend (uvicorn en loopback), igual que antes.

**Por qué el cambio:** la Fase 1 se desplegó originalmente bajo el usuario
`caladiorosevelvet` (ver historial más abajo) porque esa era la sesión
disponible en ese momento y no había forma de operar como `castamay-labapp`
desde ahí (sin `su`/`sudo -u`). En una sesión posterior sí hubo login directo
como `castamay-labapp`, y se migró para que el sitio corra bajo su propio
usuario — aislamiento por sitio, un usuario del sistema por dominio, mismo
patrón ya usado en el resto de los proyectos de este servidor (p. ej.
`lab.castamay.com` bajo `castamay-lab`, puerto 8765). Corregir esto evita que
un sitio dependa del ciclo de vida de la cuenta de otro.

Restricciones de permisos verificadas que siguen aplicando (independientes
del usuario):

- No hay acceso de lectura/escritura a `/etc/nginx/*` (vhosts, sites-enabled)
  desde ningún usuario de aplicación. Cambios al vhost requieren el panel de
  CloudPanel (rol admin) o acceso root directo.
- Un usuario del sistema no puede controlar el `systemctl --user` /
  `loginctl` de otro (D-Bus de sesión separado) — el cutover entre usuarios
  requiere que cada lado detenga/arranque su propio servicio.
- Sí hay: permiso de escritura de grupo sobre
  `/home/castamay-labapp/htdocs/labapp.castamay.com/` (para depositar el
  build estático del frontend cuando exista).

**Backend (desplegado bajo `castamay-labapp`):**

- Código en `/home/castamay-labapp/labapp/` (fuera de `htdocs/`, que es solo
  para el build estático del frontend).
- Unidad systemd de usuario: `~/.config/systemd/user/labapp-api.service`
  (copia versionada en `deploy/labapp-api.service`).
- Corre `uvicorn app.main:app --host 127.0.0.1 --port 8766 --workers 2`.
- `systemctl --user enable --now labapp-api.service` + `loginctl enable-linger
  castamay-labapp` → sobrevive reinicios y logout.
- DB sin cambios: mismo MySQL `applab`/usuario `labapp`, mismas migraciones
  Alembic ya aplicadas (`alembic current` == head, no se re-corrieron).
- Verificado end-to-end vía `https://labapp.castamay.com`: `/api/health` →
  `{"status":"ok"}`, login (`/api/auth/login`) → JWT válido.

**Historial — despliegue original bajo `caladiorosevelvet` (Fase 1, ya dado
de baja):** código y proceso corrían bajo `caladiorosevelvet` porque esa era
la única sesión disponible en el momento del despliegue inicial y no había
forma de operar como `castamay-labapp` desde ahí. Mismo puerto (8766), mismo
mecanismo (`systemctl --user` + `linger`). Reemplazado por el despliegue
nativo descrito arriba.

**Frontend (2026-07-25 — build desplegado, falta el cutover de nginx):** el
build de Vite/React (`npm run build` → `dist/`) ya se copió a
`/home/castamay-labapp/htdocs/labapp.castamay.com/`, reemplazando el
placeholder `index.php` (backup en
`deploy/htdocs-placeholder-backup/index.php.bak`). Verificado en producción:

- `https://labapp.castamay.com/` → 200, sirve el `index.html` nuevo del SPA.
- `https://labapp.castamay.com/assets/*.js` → 200 (los assets estáticos se
  sirven bien, coincidencia exacta de archivo).
- `https://labapp.castamay.com/api/health` → 200 `{"status":"ok"}` — el
  reverse proxy `/api/` **ya estaba configurado** desde el despliegue del
  backend (Fase 1), no era necesario tocarlo de nuevo.
- `https://labapp.castamay.com/captura` (o cualquier ruta profunda del SPA
  cargada directo/refrescada, no navegada desde dentro de la app) → **404**.
  Es exactamente el punto 2 de abajo, todavía pendiente: sin el
  `try_files ... /index.html;`, nginx no tiene fallback para rutas que no son
  un archivo real. La navegación interna (React Router, sin recargar) sí
  funciona porque nunca toca al servidor.

**Acción pendiente que requiere al admin de CloudPanel (no ejecutable desde
este entorno):** editar el Vhost de `labapp.castamay.com` en el panel para:

1. ~~Agregar un `location /api/` con reverse proxy a `127.0.0.1:8766`~~ — ya
   hecho, verificado arriba.
2. Cambiar `location /` para servir estático con
   `try_files $uri $uri/ /index.html;` y remover el bloque
   `location ~ \.php$` (ya no hay PHP que ejecutar). **Sin este paso, cargar o
   refrescar cualquier ruta del SPA que no sea `/` da 404.**

Snippet sugerido para pegar en el editor de Vhost de CloudPanel:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8766;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Cuando exista el build del frontend, reemplazar el location / por:
# location / {
#     try_files $uri $uri/ /index.html;
# }
```

No se requiere recrear el site ni cambiar su "tipo" en CloudPanel — basta con
este snippet en el Vhost existente; el `location ~ \.php$` puede quedar sin
uso una vez no haya archivos `.php` en el document root.

## Correr localmente

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # y llenar DATABASE_URL / SECRET_KEY reales
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

```bash
cd frontend
npm install
npm run dev   # proxea /api a http://127.0.0.1:8766 (ver vite.config.ts)
```

## Plan de fases (spec original)

1. ✅ Estructura del proyecto + migraciones de las 4 tablas de inventario + modelo de usuarios.
2. ✅ (2026-07-25) Reglas de negocio de captura (`app/services/inventory_rules.py`):
   `validate_log_balances()` — `discard_reason` obligatorio si `discarded_jars > 0`,
   saldos no negativos.
3. ✅ (2026-07-25) Métricas derivadas (`app/services/inventory_metrics.py`):
   `dias_transcurridos`, `semaforo_antiguedad` (verde ≤25, amarillo ≤35, rojo >35),
   `estado_critico` (normal ≤1 y hay frascos en rescate). Nunca se
   guardan como columnas — se calculan al vuelo vía `compute_log_metrics()`.
4. ✅ (2026-07-25) Endpoints CRUD de taxonomía (`app/routers/inventario.py` —
   `/api/inventario/genera`, `/api/inventario/species`) y catálogo
   (`app/routers/catalog.py` — `/api/catalog-items`). Lectura para `admin`/`tech`
   (`require_any_role`), escritura solo `admin` (`require_admin`). Probado
   end-to-end contra la DB real (crear/listar/duplicado 409/FK inexistente 404/borrar).
5. ✅ (2026-07-25) Endpoint de captura semanal (`app/routers/catalog.py`):
   `POST /api/catalog-items/{id}/logs` — `admin`/`tech` pueden crear
   (`require_any_role`), cada POST crea una fila nueva (histórico puro, no
   upsert, múltiples logs por semana permitidos). `PUT
   /api/catalog-items/{id}/logs/{log_id}` — solo `admin` puede corregir
   logs pasados (`require_admin`). Reutiliza `validate_log_balances()` de
   `inventory_rules.py` y `compute_log_metrics()` de `inventory_metrics.py`
   — el response de ambos endpoints incluye `dias_transcurridos`,
   `semaforo_antiguedad` y `estado_critico` calculados al vuelo. Probado
   end-to-end contra la DB real: creación tech, múltiples logs sin upsert,
   discard_reason obligatorio (422), saldo negativo (422), corrección de
   tech rechazada (403), corrección de admin aplicada (200, `updated_by`
   actualizado), `estado_critico` en escenario de rescate.
6. ✅ (2026-07-25) Endpoints de dashboard (`app/routers/dashboard.py`,
   `require_admin` a nivel de router — los tres endpoints son admin-only):
   - `GET /api/dashboard/summary?desde&hasta`: `total_frascos_laboratorio` y
     `frascos_en_rescate_activos` son snapshot actual (suma sobre el log más
     reciente de cada catálogo, vía `ROW_NUMBER() OVER (PARTITION BY
     catalog_item_id ORDER BY created_at DESC)`); `porcentaje_merma` sí es
     por periodo — `discarded_jars` / total de frascos registrados
     (`normal+ready+rescue_1+rescue_2+discarded`) entre TODOS los logs con
     `last_subculture_date` en `[desde, hasta]` (default: últimos 30 días).
   - `GET /api/dashboard/urgentes`: log más reciente por catálogo, join con
     especie/género, `ORDER BY last_subculture_date ASC` (= `dias_transcurridos`
     desc), con métricas de `inventory_metrics.py` al vuelo.
   - `GET /api/dashboard/export?desde&hasta&formato=csv|xlsx`: filtra
     `InventoryLog` por `last_subculture_date` en el rango (no `created_at`),
     un renglón por log (no solo el más reciente). Requirió agregar
     `openpyxl` a `requirements.txt` (no había dependencia de Excel antes).
   Probado end-to-end: acceso de tech rechazado (403) en los tres, cálculo
   de totales/merma verificado con datos conocidos, orden de urgentes,
   contenido de CSV y XLSX (parseado de vuelta con `openpyxl`), `formato`
   inválido → 422.
7. ✅ (2026-07-25) Frontend (Vite + React + TS + Tailwind v4, React Router):
   - `LoginPage` — JWT vía `/api/auth/login` (form-urlencoded, no JSON).
   - `CapturaPage` (`admin`/`tech`) — buscar catálogo, formulario de captura,
     confirmación con métricas al vuelo (semáforo/estado crítico).
   - `DashboardPage` (admin only) — stat cards, tabla de urgentes, export
     CSV/XLSX con selector de periodo.
   - `CatalogoPage` (admin only) — CRUD de géneros/especies/catálogo en tabs;
     no estaba en el plan original pero sin esto no había forma de crear
     nada que capturar, así que se agregó a esta fase.
   - `Layout` muestra/oculta tabs Dashboard y Catálogo según `user.role`;
     `ProtectedRoute` además bloquea acceso directo por URL.
   Probado end-to-end **en navegador real** (Playwright headless, ver gotcha
   de fechas arriba — así se encontró el bug de UTC/hora local): login admin
   y tech con usuarios de prueba temporales (creados y borrados vía DB, no
   se tocó el usuario admin real), CRUD completo de género → especie →
   catálogo desde la UI, captura semanal con confirmación correcta, dashboard
   con summary + urgentes reflejando el dato recién capturado, export CSV y
   XLSX descargados y verificados (contenido correcto), tabs Dashboard/Catálogo
   ausentes para `tech` y redirección al navegar esas rutas por URL directa,
   cero errores de consola. Sin residuos de datos de prueba.
   **Deploy:** build copiado a
   `/home/castamay-labapp/htdocs/labapp.castamay.com/` (ver sección de
   despliegue arriba) — funcional en `/`, pendiente el `try_files` de nginx
   para rutas profundas.
8. Seed de géneros/especies/catálogos existentes desde la hoja de cálculo
   actual, para no perder folios (`# Catálogo`) ya asignados.

## Roles

| Rol | Puede |
|---|---|
| `admin` | CRUD de usuarios, taxonomía, catálogo; dashboard; export; corregir logs históricos |
| `tech` | Captura semanal (crear logs) por catálogo; sin acceso a CRUD de catálogo/taxonomía ni export |

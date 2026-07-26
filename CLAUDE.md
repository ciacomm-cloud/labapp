# labapp — Sistema de Control de Inventario y Producción (Laboratorio de Micropropagación)

## v2 — Modelo de linaje por cohortes (reemplaza v1 por completo)

**v1** (commits anteriores en este mismo historial) modelaba cada lote como
una fila con conteos agregados semanales (X normales, Y en rescate, Z
descartados). Eso perdía el origen y la trayectoria de cada grupo de
frascos — no había forma de saber, dos semanas después, qué pasó exactamente
con los frascos que "desaparecieron" de una categoría.

**v2** modela el proceso real del laboratorio: un `Lote` nace como una
siembra única (una `Cohorte` raíz), y con el tiempo se ramifica en
`Cohorte`s hijas que divergen en destino (normal, contaminado, endofitos,
multiplicado...). Cada rama conserva referencia a su padre
(`parent_cohorte_id`, self-referencing) y cada transición queda en
`EventoCohorte`, una tabla histórica **append-only** — nunca se sobreescribe.

Todo el código de modelos/rutas/componentes de v1 (`inventario.py`,
`CapturaPage.tsx`, `CatalogoPage.tsx`, conteos agregados) fue reemplazado.
No había datos de producción reales que preservar; se reconstruyó desde
cero manteniendo el historial de git.

## Stack (sin cambios respecto a v1)

- **Backend:** FastAPI + SQLAlchemy 2.x + Alembic. DB MySQL (no Postgres —
  este servidor es CloudPanel y solo tiene MySQL/Percona). Driver `PyMySQL`.
- **Auth:** JWT propio (`python-jose`) + `passlib[bcrypt]`.
- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4
  (`@tailwindcss/vite`) + React Router v7. SPA cliente-only.

## Modelo de datos v2

- `generos`, `especies` (+ `numero_id`, nuevo campo para el futuro esquema
  de folios), `tipos_frasco`, `tipos_medio`: catálogos base.
- `lotes`: metadata fija del evento de siembra (especie, tipo de frasco,
  tipo de medio, cantidad sembrada, fecha, folio). No cambia tras crearse.
- `cohortes`: `lote_id`, `parent_cohorte_id` (nullable, self-referencing),
  `fase` (enum: inicio, multiplicacion, enraizamiento, endurecimiento,
  rescate_1, rescate_2, normal, contaminado, descartado), `cantidad`,
  `fecha_ultima_revision` (alimenta el semáforo de antigüedad).
- `eventos_cohorte`: histórico append-only. `cohorte_padre_id` (siempre),
  `cohorte_hija_id` (nullable — null en `sin_cambios`), `tipo_evento`,
  `cantidad`, `motivo` (obligatorio en `contaminacion`/`rescate_falla`),
  `notas`, `fecha`, `usuario_id`.

**Divergencia vs. multiplicación** (`app/routers/cohortes.py`,
`capturar_eventos`): una sesión de captura es una lista de eventos sobre
una misma cohorte padre, procesados en orden con un contador `remaining`
que arranca en `cohorte_padre.cantidad`. Los eventos de divergencia
(contaminación, endofitos, enraizamiento, endurecimiento, resultados de
rescate) restan `cantidad` de `remaining` y crean una hija con esa misma
cantidad — el total se conserva. `multiplicacion` es distinto: consume
**todo** el `remaining` restante de esa sesión y la hija nace con la
cantidad nueva indicada (puede ser mayor) — es expansión, no reparto. Al
final, `cohorte_padre.cantidad` se actualiza a `remaining` (lo que no se
mencionó en ningún evento sigue siendo la misma cohorte, sin hija nueva).

**Folios/códigos**: el formato exacto (`CA054-01`, `CA054-01-A`, etc.) está
pendiente de confirmación con el director del laboratorio. Los campos
`lotes.folio` y `cohortes.codigo` existen en el esquema pero se guardan
`NULL` — no hay generación automática implementada todavía (a propósito,
ver spec v2 sec. 3).

## Gotchas encontrados en esta sesión

**MySQL no soporta `NULLS FIRST`.** `Cohorte.fecha_ultima_revision.asc().nullsfirst()`
genera SQL inválido en MySQL (`nullsfirst()`/`nullslast()` son sintaxis de
Postgres/SQLite). En MySQL, `NULL` ya ordena antes que cualquier valor con
`ASC` de forma nativa — basta con `.asc()` a secas. Si se necesita
`NULLS LAST` en el futuro, no hay equivalente directo: usar
`case((columna.is_(None), 1), else_=0)` como criterio de orden adicional.

**Pydantic v2 `model_validate()` no permite completar campos requeridos
después.** El patrón `obj = Schema.model_validate(orm_instance); obj.campo
= valor` falla si `campo` es requerido en el schema pero no existe como
atributo en `orm_instance` (p. ej. `LoteConCohorteRaiz.cohorte_raiz` no es
un atributo de `Lote`) — la validación ocurre por completo dentro de
`model_validate()`, antes de que la asignación posterior tenga oportunidad
de correr. Fix: construir el modelo completo de una vez
(`Schema(**Base.model_validate(x).model_dump(), campo_extra=...)`) en vez de
validar y luego asignar. Afectó `POST/GET /api/lotes/{id}` (500 en
producción). `CohorteConHistorial.eventos_como_padre` no tuvo este problema
porque el campo tiene default (`= []`).

**`StaticFiles(html=True)` no sirve `index.html` para subrutas del SPA.**
Solo lo hace en la raíz (`/`); navegar directo o refrescar en `/login`,
`/crear-lote`, etc. daba 404. Fix en `app/main.py`: mount de `/assets` por
separado + una ruta catch-all `GET /{full_path:path}` que sirve el archivo
si existe físicamente en `dist/`, o cae a `index.html` en cualquier otro
caso (excepto rutas que empiezan con `api/`, que devuelven 404 real).

**Un mensaje de éxito que se limpia a sí mismo.** En `Actualizar.tsx`,
`guardar()` hacía `setOk(mensaje)` y luego llamaba a `cargarDetalle(id)`
para refrescar el historial — pero `cargarDetalle` empezaba con
`setOk(null)`. Como ambas llamadas ocurren en el mismo tick síncrono, React
batchea las actualizaciones y el estado final era `null`: el POST
funcionaba (verificado con curl/logs), pero el toast "Guardado: ..." nunca
se veía. Fix: separar la carga de datos (`loadDetalle`, sin tocar
error/ok) de `cargarDetalle` (que sí resetea mensajes, para usarse al
cambiar de cohorte desde el selector), y en `guardar()` llamar
`setOk(...)` **después** de `await loadDetalle(...)`, no antes.

**Gotchas de v1 que siguen aplicando:** `passlib==1.7.4` requiere
`bcrypt==4.0.1` fijo (versiones `>=4.1` rompen con `AttributeError:
module 'bcrypt' has no attribute '__about__'`).

## Despliegue

Corre bajo el usuario del sistema **`labappuser`** (cuenta actual de este
proyecto en `vmi3229826`; no confundir con `castamay-lab`, que es un
proyecto distinto y no relacionado — `lab.castamay.com` / MicroProp LMS,
puerto 8765).

- Backend: `~/.config/systemd/user/labapp-api.service` (uvicorn,
  `127.0.0.1:8766`). `loginctl enable-linger labappuser` habilitado para
  que sobreviva a logout/reinicio.
- Frontend: `npm run build` → `frontend/dist/`, servido por el propio
  FastAPI (mismo proceso, mismo puerto — ver gotcha de SPA fallback arriba).
  Un solo punto de entrada tras el reverse proxy de CloudPanel.
- DB: MySQL `caladiopower`, usuario `xanadugreen`. Credenciales en
  `backend/.env` (gitignored, no commiteado).
- Cambios de backend requieren `systemctl --user restart labapp-api.service`;
  cambios de frontend requieren `npm run build` (el restart no es necesario
  si solo cambió el frontend, ya que `main.py` sirve `dist/` en caliente).

## Estructura

```
labapp/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, routers, SPA fallback
│   │   ├── core/
│   │   │   ├── config.py        # Settings desde .env (pydantic-settings)
│   │   │   ├── database.py      # engine, SessionLocal, Base, get_db
│   │   │   ├── security.py      # hash/verify password, JWT
│   │   │   └── deps.py          # get_current_user, require_admin
│   │   ├── models/               # Genero, Especie, TipoFrasco, TipoMedio,
│   │   │                         # Lote, Cohorte, EventoCohorte, User
│   │   ├── schemas/              # espejo pydantic de los modelos
│   │   └── routers/
│   │       ├── auth.py           # /api/auth/login
│   │       ├── users.py          # /api/users (admin)
│   │       ├── catalogos.py      # /api/catalogos/* (4 catálogos)
│   │       ├── lotes.py          # /api/lotes (crea lote + cohorte raíz)
│   │       ├── cohortes.py       # /api/cohortes, /{id}/eventos (captura)
│   │       └── dashboard.py      # /api/dashboard?fase=&genero_id=&especie_id=
│   ├── alembic/
│   └── requirements.txt
└── frontend/
    └── src/
        ├── lib/api.ts, types.ts
        ├── context/AuthContext.tsx
        ├── components/Layout.tsx, ProtectedRoute.tsx
        └── pages/
            ├── Login.tsx
            ├── Dashboard.tsx       # tabs por fase, listado por lote, semáforo
            ├── CrearLote.tsx
            ├── Actualizar.tsx      # captura de eventos, nace linaje
            ├── Catalogos.tsx       # 4 sub-tabs CRUD
            └── Usuarios.tsx        # admin only
```

## Correr localmente

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# crear .env con LABAPP_DB_USER, LABAPP_DB_PASSWORD, LABAPP_DB_NAME, LABAPP_SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

```bash
cd frontend
npm install
npm run dev   # proxea /api a http://127.0.0.1:8766 (ver vite.config.ts)
```

## Roles

| Rol | Puede |
|---|---|
| `admin` | CRUD de catálogos, crear lotes, capturar eventos, dashboard, CRUD de usuarios |
| `operador` | Crear lotes, capturar eventos, ver catálogos y dashboard (sin CRUD de catálogos ni usuarios) |

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
- **Frontend:** Vite/React SPA (aún no iniciado — fase posterior del plan).

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

## Gotcha conocido: `passlib` + `bcrypt`

`passlib==1.7.4` es incompatible con `bcrypt>=4.1` (rompe el backend con
`AttributeError: module 'bcrypt' has no attribute '__about__'` y luego
`ValueError: password cannot be longer than 72 bytes`). Fijado a
`bcrypt==4.0.1` en `requirements.txt`. Si se actualiza `passlib`, revisar si
ya soporta bcrypt 4.1+/5.x antes de destapar el pin.

## Estructura

```
labapp/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routers
│   │   ├── config.py          # Settings desde .env (pydantic-settings)
│   │   ├── database.py        # engine, SessionLocal, Base, get_db
│   │   ├── deps.py            # get_current_user, require_role, require_admin
│   │   ├── models/
│   │   │   ├── user.py        # User, UserRole
│   │   │   └── inventario.py  # Genus, Species, CatalogItem, InventoryLog, DiscardReason
│   │   ├── schemas/
│   │   │   └── user.py        # UserCreate, UserOut, Token
│   │   ├── routers/
│   │   │   └── auth.py        # /api/auth/login, /me, /users (admin)
│   │   └── services/
│   │       └── auth.py        # hash_password, verify_password, JWT
│   ├── alembic/                # migraciones versionadas
│   ├── requirements.txt
│   ├── .env                    # NO commiteado — credenciales reales
│   └── .env.example
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

**Frontend (pendiente — fase 7 del plan):** una vez exista el build de
Vite/React (`npm run build` → `dist/`), se copia el contenido de `dist/` a
`/home/castamay-labapp/htdocs/labapp.castamay.com/` (permiso de grupo ya
verificado), reemplazando el placeholder `index.php` actual.

**Acción pendiente que requiere al admin de CloudPanel (no ejecutable desde
este entorno):** editar el Vhost de `labapp.castamay.com` en el panel para:

1. Agregar un `location /api/` con reverse proxy a `127.0.0.1:8766`.
2. Cuando el frontend esté listo, cambiar `location /` para servir estático
   con `try_files $uri $uri/ /index.html;` y remover el bloque
   `location ~ \.php$` (ya no hay PHP que ejecutar).

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
5. Endpoint de captura semanal (`POST /catalog-items/{id}/logs`) — técnico
   y admin pueden crear, solo admin puede corregir logs pasados.
6. Endpoints de dashboard: `/dashboard/summary`, `/dashboard/urgentes`,
   `/dashboard/export` (admin only).
7. Frontend: tab "Inventarios" — primero vista de captura (técnico),
   después dashboard (admin).
8. Seed de géneros/especies/catálogos existentes desde la hoja de cálculo
   actual, para no perder folios (`# Catálogo`) ya asignados.

## Roles

| Rol | Puede |
|---|---|
| `admin` | CRUD de usuarios, taxonomía, catálogo; dashboard; export; corregir logs históricos |
| `tech` | Captura semanal (crear logs) por catálogo; sin acceso a CRUD de catálogo/taxonomía ni export |

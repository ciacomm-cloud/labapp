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
2. Reglas de negocio de captura (`inventory_rules.py`): validación de
   `discard_reason` obligatorio si `discarded_jars > 0`, saldos no negativos.
3. Métricas derivadas (`inventory_metrics.py`): `dias_transcurridos`,
   `semaforo_antiguedad` (verde ≤25, amarillo ≤35, rojo >35),
   `estado_critico` (normal ≤1 y hay frascos en rescate). Nunca se
   guardan como columnas — se calculan al vuelo en el response.
4. Endpoints CRUD de taxonomía (`/api/inventario/genera`, `/species`) y
   catálogo (`/catalog-items`), solo admin para escritura.
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

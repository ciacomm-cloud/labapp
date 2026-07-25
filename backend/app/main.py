from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, catalog, inventario

app = FastAPI(title="Laboratorio de Micropropagación - API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(inventario.router)
app.include_router(catalog.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}

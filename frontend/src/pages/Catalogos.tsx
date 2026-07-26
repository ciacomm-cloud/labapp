import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Genero, Especie, TipoFrasco, TipoMedio } from "../types";

type Tab = "genero" | "especie" | "frasco" | "medio";

export default function Catalogos() {
  const [tab, setTab] = useState<Tab>("genero");

  const tabs: { id: Tab; label: string }[] = [
    { id: "genero", label: "Género" },
    { id: "especie", label: "Especie" },
    { id: "frasco", label: "Tipo de Frasco" },
    { id: "medio", label: "Tipo de Medio" },
  ];

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "genero" && <GeneroTab />}
      {tab === "especie" && <EspecieTab />}
      {tab === "frasco" && <FrascoTab />}
      {tab === "medio" && <MedioTab />}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-lg border border-slate-200 p-4">{children}</div>;
}

function GeneroTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Genero[]>([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Genero[]>("/catalogos/generos").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/catalogos/generos", { nombre });
      setNombre("");
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al crear");
    }
  }

  async function borrar(id: number) {
    try {
      await api.delete(`/catalogos/generos/${id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al borrar");
    }
  }

  return (
    <Panel>
      {user?.rol === "admin" && (
        <form onSubmit={crear} className="flex gap-2 mb-4">
          <input
            required
            placeholder="Nombre del género"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm flex-1 max-w-xs"
          />
          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
            Agregar
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <ul className="divide-y divide-slate-100">
        {items.map((g) => (
          <li key={g.id} className="py-2 flex items-center justify-between text-sm">
            <span>{g.nombre}</span>
            {user?.rol === "admin" && (
              <button onClick={() => borrar(g.id)} className="text-red-600 hover:underline text-xs">
                Borrar
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="py-2 text-sm text-slate-400">Sin géneros aún.</li>}
      </ul>
    </Panel>
  );
}

function EspecieTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Especie[]>([]);
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [form, setForm] = useState({ genero_id: "", nombre: "", morfologia: "", numero_id: "" });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Especie[]>("/catalogos/especies").then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get<Genero[]>("/catalogos/generos").then((r) => setGeneros(r.data));
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/catalogos/especies", {
        genero_id: Number(form.genero_id),
        nombre: form.nombre,
        morfologia: form.morfologia || null,
        numero_id: form.numero_id || null,
      });
      setForm({ genero_id: "", nombre: "", morfologia: "", numero_id: "" });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al crear");
    }
  }

  async function borrar(id: number) {
    try {
      await api.delete(`/catalogos/especies/${id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al borrar");
    }
  }

  const nombreGenero = (id: number) => generos.find((g) => g.id === id)?.nombre ?? "?";

  return (
    <Panel>
      {user?.rol === "admin" && (
        <form onSubmit={crear} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <select
            required
            value={form.genero_id}
            onChange={(e) => setForm({ ...form, genero_id: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Género...</option>
            {generos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
          <input
            required
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Morfología (opcional)"
            value={form.morfologia}
            onChange={(e) => setForm({ ...form, morfologia: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Número ID"
            value={form.numero_id}
            onChange={(e) => setForm({ ...form, numero_id: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
            Agregar
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="py-1.5 font-medium">Género</th>
            <th className="py-1.5 font-medium">Especie</th>
            <th className="py-1.5 font-medium">Morfología</th>
            <th className="py-1.5 font-medium">Número ID</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((e) => (
            <tr key={e.id}>
              <td className="py-1.5">{nombreGenero(e.genero_id)}</td>
              <td className="py-1.5">{e.nombre}</td>
              <td className="py-1.5 text-slate-500">{e.morfologia ?? "—"}</td>
              <td className="py-1.5 text-slate-500">{e.numero_id ?? "—"}</td>
              <td className="py-1.5 text-right">
                {user?.rol === "admin" && (
                  <button onClick={() => borrar(e.id)} className="text-red-600 hover:underline text-xs">
                    Borrar
                  </button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="py-2 text-slate-400">Sin especies aún.</td></tr>
          )}
        </tbody>
      </table>
    </Panel>
  );
}

function FrascoTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<TipoFrasco[]>([]);
  const [form, setForm] = useState({ nombre: "", capacidad: "" });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<TipoFrasco[]>("/catalogos/tipos-frasco").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/catalogos/tipos-frasco", { nombre: form.nombre, capacidad: form.capacidad || null });
      setForm({ nombre: "", capacidad: "" });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al crear");
    }
  }

  async function borrar(id: number) {
    try {
      await api.delete(`/catalogos/tipos-frasco/${id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al borrar");
    }
  }

  return (
    <Panel>
      {user?.rol === "admin" && (
        <form onSubmit={crear} className="flex gap-2 mb-4">
          <input
            required
            placeholder="Nombre / tipo"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <input
            placeholder="Capacidad"
            value={form.capacidad}
            onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
            Agregar
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <ul className="divide-y divide-slate-100">
        {items.map((t) => (
          <li key={t.id} className="py-2 flex items-center justify-between text-sm">
            <span>{t.nombre} {t.capacidad && <span className="text-slate-400">— {t.capacidad}</span>}</span>
            {user?.rol === "admin" && (
              <button onClick={() => borrar(t.id)} className="text-red-600 hover:underline text-xs">Borrar</button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="py-2 text-sm text-slate-400">Sin tipos de frasco aún.</li>}
      </ul>
    </Panel>
  );
}

function MedioTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<TipoMedio[]>([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<TipoMedio[]>("/catalogos/tipos-medio").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/catalogos/tipos-medio", { nombre });
      setNombre("");
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al crear");
    }
  }

  async function borrar(id: number) {
    try {
      await api.delete(`/catalogos/tipos-medio/${id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al borrar");
    }
  }

  return (
    <Panel>
      {user?.rol === "admin" && (
        <form onSubmit={crear} className="flex gap-2 mb-4">
          <input
            required
            placeholder="Nombre del tipo de medio"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm flex-1 max-w-xs"
          />
          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
            Agregar
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <ul className="divide-y divide-slate-100">
        {items.map((m) => (
          <li key={m.id} className="py-2 flex items-center justify-between text-sm">
            <span>{m.nombre}</span>
            {user?.rol === "admin" && (
              <button onClick={() => borrar(m.id)} className="text-red-600 hover:underline text-xs">Borrar</button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="py-2 text-sm text-slate-400">Sin tipos de medio aún.</li>}
      </ul>
    </Panel>
  );
}

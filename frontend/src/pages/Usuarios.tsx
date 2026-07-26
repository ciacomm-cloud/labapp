import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { User } from "../types";

export default function Usuarios() {
  const [items, setItems] = useState<User[]>([]);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "operador" as User["rol"] });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<User[]>("/users").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/users", form);
      setForm({ nombre: "", email: "", password: "", rol: "operador" });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al crear usuario");
    }
  }

  async function toggleActivo(u: User) {
    await api.patch(`/users/${u.id}`, { activo: !u.activo });
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Usuarios</h1>

      <form onSubmit={crear} className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-2 gap-3 mb-4">
        <input required placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <input required type="email" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <input required type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as User["rol"] })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <option value="operador">Operador</option>
          <option value="admin">Admin</option>
        </select>
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <button className="col-span-2 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
          Crear usuario
        </button>
      </form>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left py-2 px-3 font-medium">Nombre</th>
              <th className="text-left py-2 px-3 font-medium">Correo</th>
              <th className="text-left py-2 px-3 font-medium">Rol</th>
              <th className="text-left py-2 px-3 font-medium">Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((u) => (
              <tr key={u.id}>
                <td className="py-2 px-3">{u.nombre}</td>
                <td className="py-2 px-3">{u.email}</td>
                <td className="py-2 px-3">{u.rol}</td>
                <td className="py-2 px-3">{u.activo ? "Activo" : "Inactivo"}</td>
                <td className="py-2 px-3 text-right">
                  <button onClick={() => toggleActivo(u)} className="text-xs text-slate-600 hover:underline">
                    {u.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

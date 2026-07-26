import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Genero, Especie, TipoFrasco, TipoMedio } from "../types";

export default function CrearLote() {
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [frascos, setFrascos] = useState<TipoFrasco[]>([]);
  const [medios, setMedios] = useState<TipoMedio[]>([]);

  const [generoId, setGeneroId] = useState("");
  const [form, setForm] = useState({
    especie_id: "",
    tipo_frasco_id: "",
    tipo_medio_id: "",
    cantidad_sembrada: "",
    fecha_siembra: new Date().toISOString().slice(0, 10),
    notas: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    api.get<Genero[]>("/catalogos/generos").then((r) => setGeneros(r.data));
    api.get<TipoFrasco[]>("/catalogos/tipos-frasco").then((r) => setFrascos(r.data));
    api.get<TipoMedio[]>("/catalogos/tipos-medio").then((r) => setMedios(r.data));
  }, []);

  useEffect(() => {
    if (!generoId) {
      setEspecies([]);
      return;
    }
    api.get<Especie[]>("/catalogos/especies", { params: { genero_id: generoId } }).then((r) => setEspecies(r.data));
  }, [generoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post("/lotes", {
        especie_id: Number(form.especie_id),
        tipo_frasco_id: Number(form.tipo_frasco_id),
        tipo_medio_id: Number(form.tipo_medio_id),
        cantidad_sembrada: Number(form.cantidad_sembrada),
        fecha_siembra: form.fecha_siembra,
        notas: form.notas || null,
      });
      setOk(`Lote #${data.id} creado con cohorte raíz de ${data.cohorte_raiz.cantidad} frascos.`);
      setForm({ ...form, cantidad_sembrada: "", notas: "" });
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al crear el lote");
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Crear Lote</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Género</label>
            <select
              required
              value={generoId}
              onChange={(e) => { setGeneroId(e.target.value); setForm({ ...form, especie_id: "" }); }}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Selecciona...</option>
              {generos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Especie</label>
            <select
              required
              disabled={!generoId}
              value={form.especie_id}
              onChange={(e) => setForm({ ...form, especie_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
            >
              <option value="">Selecciona...</option>
              {especies.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de frasco</label>
            <select
              required
              value={form.tipo_frasco_id}
              onChange={(e) => setForm({ ...form, tipo_frasco_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Selecciona...</option>
              {frascos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de medio</label>
            <select
              required
              value={form.tipo_medio_id}
              onChange={(e) => setForm({ ...form, tipo_medio_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Selecciona...</option>
              {medios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad de frascos sembrados</label>
            <input
              type="number"
              min={1}
              required
              value={form.cantidad_sembrada}
              onChange={(e) => setForm({ ...form, cantidad_sembrada: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de siembra</label>
            <input
              type="date"
              required
              value={form.fecha_siembra}
              onChange={(e) => setForm({ ...form, fecha_siembra: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Folio</label>
          <input
            disabled
            value="Se generará automáticamente (formato pendiente de confirmar)"
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-400 italic"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notas (opcional)</label>
          <textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {ok && <p className="text-sm text-emerald-600">{ok}</p>}
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
          Crear Lote
        </button>
      </form>
    </div>
  );
}

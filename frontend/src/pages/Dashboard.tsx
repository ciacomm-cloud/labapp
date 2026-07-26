import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Fase, Genero, Especie, LoteDashboardItem } from "../types";

const TABS: { id: Fase; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "multiplicacion", label: "Multiplicación" },
  { id: "rescate_1", label: "Rescate 1" },
  { id: "rescate_2", label: "Rescate 2" },
  { id: "enraizamiento", label: "Enraizamiento" },
  { id: "endurecimiento", label: "Endurecimiento" },
  { id: "normal", label: "Normal" },
  { id: "descartado", label: "Descartado" },
];

const SEMAFORO_DOT: Record<string, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-400",
  rojo: "bg-red-500",
};

type SortKey = "folio" | "especie_nombre" | "total_frascos" | "dias_mas_antiguos";

export default function Dashboard() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [items, setItems] = useState<LoteDashboardItem[]>([]);
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [generoId, setGeneroId] = useState("");
  const [especieId, setEspecieId] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("dias_mas_antiguos");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  useEffect(() => {
    api.get<Genero[]>("/catalogos/generos").then((r) => setGeneros(r.data));
  }, []);

  useEffect(() => {
    api.get<Especie[]>("/catalogos/especies", { params: generoId ? { genero_id: generoId } : {} }).then((r) => setEspecies(r.data));
  }, [generoId]);

  useEffect(() => {
    const params: Record<string, string> = { fase };
    if (generoId) params.genero_id = generoId;
    if (especieId) params.especie_id = especieId;
    api.get<LoteDashboardItem[]>("/dashboard", { params }).then((r) => setItems(r.data));
  }, [fase, generoId, especieId]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const va = a[sortKey] ?? -1;
      const vb = b[sortKey] ?? -1;
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  const th = (key: SortKey, label: string) => (
    <th
      onClick={() => toggleSort(key)}
      className="py-2 px-3 font-medium text-left cursor-pointer select-none hover:text-slate-700"
    >
      {label} {sortKey === key ? (sortDir === 1 ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFase(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              fase === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={generoId}
          onChange={(e) => { setGeneroId(e.target.value); setEspecieId(""); }}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todos los géneros</option>
          {generos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select
          value={especieId}
          onChange={(e) => setEspecieId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todas las especies</option>
          {especies.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 w-8"></th>
              {th("folio", "Lote")}
              {th("especie_nombre", "Especie")}
              {th("total_frascos", "Frascos activos")}
              {th("dias_mas_antiguos", "Cohorte más antigua")}
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((item) => (
              <Fragment key={item.lote_id}>
                <tr
                  key={item.lote_id}
                  onClick={() => setExpandido(expandido === item.lote_id ? null : item.lote_id)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="py-2 px-3 text-slate-400">{expandido === item.lote_id ? "▾" : "▸"}</td>
                  <td className="py-2 px-3 font-medium">{item.folio ?? `Lote #${item.lote_id}`}</td>
                  <td className="py-2 px-3">{item.genero_nombre} {item.especie_nombre}</td>
                  <td className="py-2 px-3">{item.total_frascos}</td>
                  <td className="py-2 px-3">{item.dias_mas_antiguos != null ? `${item.dias_mas_antiguos} días` : "sin revisar"}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${SEMAFORO_DOT[item.semaforo]}`} title={item.semaforo} />
                  </td>
                </tr>
                {expandido === item.lote_id && (
                  <tr key={`${item.lote_id}-detalle`}>
                    <td colSpan={6} className="bg-slate-50 px-6 py-3">
                      <table className="w-full text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="text-left py-1 font-medium">Cohorte</th>
                            <th className="text-left py-1 font-medium">Fase</th>
                            <th className="text-left py-1 font-medium">Cantidad</th>
                            <th className="text-left py-1 font-medium">Última revisión</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {item.cohortes.map((c) => (
                            <tr key={c.id}>
                              <td className="py-1">#{c.id}{c.parent_cohorte_id ? ` (hija de #${c.parent_cohorte_id})` : " (raíz)"}</td>
                              <td className="py-1">{c.fase}</td>
                              <td className="py-1">{c.cantidad}</td>
                              <td className="py-1">{c.fecha_ultima_revision ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">Sin cohortes en esta fase.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

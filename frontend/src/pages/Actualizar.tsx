import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Lote, Cohorte, CohorteConHistorial, TipoEvento } from "../types";

interface EventoDraft {
  tipo_evento: TipoEvento;
  cantidad: string;
  motivo: string;
  notas: string;
}

const EVENTO_LABELS: Record<TipoEvento, string> = {
  sin_cambios: "Sin cambios",
  multiplicacion: "Pasa a multiplicación",
  contaminacion: "Se contamina",
  endofitos: "Detecta endofitos",
  rescate_exito: "Rescate: éxito → Normal",
  rescate_persiste: "Rescate: persiste (siguiente nivel)",
  rescate_falla: "Rescate: falla → Descartado",
  enraizamiento: "Pasa a enraizamiento",
  endurecimiento: "Pasa a endurecimiento/invernadero",
};

const requiereMotivo = (t: TipoEvento) => t === "contaminacion" || t === "rescate_falla";
const requiereCantidad = (t: TipoEvento) => t !== "sin_cambios";
const soloEnRescate = (t: TipoEvento) => t.startsWith("rescate_");

function nuevoEvento(): EventoDraft {
  return { tipo_evento: "sin_cambios", cantidad: "", motivo: "", notas: "" };
}

export default function Actualizar() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteId, setLoteId] = useState("");
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [cohorteId, setCohorteId] = useState("");
  const [detalle, setDetalle] = useState<CohorteConHistorial | null>(null);

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [eventos, setEventos] = useState<EventoDraft[]>([nuevoEvento()]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    api.get<Lote[]>("/lotes").then((r) => setLotes(r.data));
  }, []);

  useEffect(() => {
    if (!loteId) { setCohortes([]); return; }
    api.get<Cohorte[]>("/cohortes", { params: { lote_id: loteId } }).then((r) => setCohortes(r.data.filter((c) => c.cantidad > 0)));
  }, [loteId]);

  async function loadDetalle(id: string) {
    if (!id) { setDetalle(null); return; }
    const { data } = await api.get<CohorteConHistorial>(`/cohortes/${id}`);
    setDetalle(data);
  }

  function cargarDetalle(id: string) {
    setCohorteId(id);
    setOk(null);
    setError(null);
    loadDetalle(id);
  }

  function actualizarEvento(idx: number, patch: Partial<EventoDraft>) {
    setEventos((prev) => prev.map((ev, i) => (i === idx ? { ...ev, ...patch } : ev)));
  }

  async function guardar() {
    setError(null);
    setOk(null);
    try {
      const payload = {
        fecha,
        eventos: eventos.map((ev) => ({
          tipo_evento: ev.tipo_evento,
          cantidad: requiereCantidad(ev.tipo_evento) ? Number(ev.cantidad) : null,
          motivo: ev.motivo || null,
          notas: ev.notas || null,
        })),
      };
      const { data } = await api.post(`/cohortes/${cohorteId}/eventos`, payload);
      setEventos([nuevoEvento()]);
      await loadDetalle(cohorteId);
      if (loteId) {
        const r = await api.get<Cohorte[]>("/cohortes", { params: { lote_id: loteId } });
        setCohortes(r.data.filter((c) => c.cantidad > 0));
      }
      setOk(`Guardado: ${data.eventos.length} evento(s), ${data.cohortes_hijas.length} cohorte(s) nueva(s).`);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Error al guardar la captura");
    }
  }

  const opcionesEvento: TipoEvento[] = detalle
    ? (["sin_cambios", "multiplicacion", "contaminacion", "endofitos", "enraizamiento", "endurecimiento"] as TipoEvento[])
        .concat(detalle.fase === "rescate_1" || detalle.fase === "rescate_2" ? ["rescate_exito", "rescate_persiste", "rescate_falla"] : [])
    : [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Actualizar — captura de avance</h1>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Lote</label>
          <select
            value={loteId}
            onChange={(e) => { setLoteId(e.target.value); cargarDetalle(""); }}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Selecciona un lote...</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.folio ?? `Lote #${l.id}`} — sembrado {l.fecha_siembra}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Cohorte activa</label>
          <select
            disabled={!loteId}
            value={cohorteId}
            onChange={(e) => cargarDetalle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
          >
            <option value="">Selecciona una cohorte...</option>
            {cohortes.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} · {c.fase} · {c.cantidad} frascos
              </option>
            ))}
          </select>
        </div>
      </div>

      {detalle && (
        <>
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Cohorte #{detalle.id} — fase actual: {detalle.fase}</span>
              <span className="text-slate-500">{detalle.cantidad} frascos</span>
            </div>
            {detalle.eventos_como_padre.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Historial</p>
                <ul className="text-xs text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                  {detalle.eventos_como_padre.map((ev) => (
                    <li key={ev.id}>
                      {ev.fecha} — {EVENTO_LABELS[ev.tipo_evento]}
                      {ev.cantidad != null ? ` (${ev.cantidad})` : ""}
                      {ev.motivo ? ` · motivo: ${ev.motivo}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de captura</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>

            {eventos.map((ev, idx) => (
              <div key={idx} className="border border-slate-200 rounded-md p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <select
                    value={ev.tipo_evento}
                    onChange={(e) => actualizarEvento(idx, { tipo_evento: e.target.value as TipoEvento })}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm flex-1"
                  >
                    {opcionesEvento.map((t) => (
                      <option key={t} value={t}>{EVENTO_LABELS[t]}</option>
                    ))}
                  </select>
                  {eventos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEventos((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-red-600 hover:underline px-1 py-1.5"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {requiereCantidad(ev.tipo_evento) && (
                  <input
                    type="number"
                    min={1}
                    placeholder={ev.tipo_evento === "multiplicacion" ? "Cantidad de frascos nuevos sembrados" : "Cantidad de frascos"}
                    value={ev.cantidad}
                    onChange={(e) => actualizarEvento(idx, { cantidad: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                )}
                {requiereMotivo(ev.tipo_evento) && (
                  <input
                    placeholder="Motivo (obligatorio)"
                    value={ev.motivo}
                    onChange={(e) => actualizarEvento(idx, { motivo: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                )}
                <input
                  placeholder="Notas (opcional)"
                  value={ev.notas}
                  onChange={(e) => actualizarEvento(idx, { notas: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                {soloEnRescate(ev.tipo_evento) && (
                  <p className="text-xs text-amber-600">Solo aplica si la cohorte está en Rescate 1 o 2.</p>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setEventos((prev) => [...prev, nuevoEvento()])}
              className="text-sm text-emerald-700 hover:underline"
            >
              + Agregar otro destino en esta misma captura
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {ok && <p className="text-sm text-emerald-600">{ok}</p>}

            <div>
              <button
                onClick={guardar}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700"
              >
                Guardar captura
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

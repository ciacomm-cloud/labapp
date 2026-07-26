import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { DISCARD_REASONS, type CatalogItemOut, type DiscardReason, type InventoryLogOut } from '../lib/types'
import { SemaforoBadge } from '../components/SemaforoBadge'
import { todayLocalISO } from '../lib/dates'

function buildEmptyForm() {
  return {
    normal_jars: 0,
    ready_jars: 0,
    rescue_1_jars: 0,
    rescue_2_jars: 0,
    discarded_jars: 0,
    discard_reason: '' as DiscardReason | '',
    last_subculture_date: todayLocalISO(),
    notes: '',
  }
}
type CaptureForm = ReturnType<typeof buildEmptyForm>

export function CapturaPage() {
  const [items, setItems] = useState<CatalogItemOut[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(buildEmptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<InventoryLogOut | null>(null)

  useEffect(() => {
    api
      .get<CatalogItemOut[]>('/api/catalog-items')
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el catálogo'))
      .finally(() => setLoadingItems(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.catalog_code.toLowerCase().includes(q) ||
        it.species.name.toLowerCase().includes(q) ||
        it.species.genus.name.toLowerCase().includes(q),
    )
  }, [items, search])

  const selected = items.find((it) => it.id === selectedId) ?? null

  const selectItem = (id: number) => {
    setSelectedId(id)
    setForm(buildEmptyForm())
    setLastResult(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await api.post<InventoryLogOut>(`/api/catalog-items/${selected.id}/logs`, {
        normal_jars: form.normal_jars,
        ready_jars: form.ready_jars,
        rescue_1_jars: form.rescue_1_jars,
        rescue_2_jars: form.rescue_2_jars,
        discarded_jars: form.discarded_jars,
        discard_reason: form.discard_reason || null,
        last_subculture_date: form.last_subculture_date,
        notes: form.notes || null,
      })
      setLastResult(result)
      setForm(buildEmptyForm())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la captura')
    } finally {
      setSubmitting(false)
    }
  }

  const numberField = (key: keyof CaptureForm, label: string) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      <input
        type="number"
        min={0}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        value={form[key] as number}
        onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
      />
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="md:col-span-1">
        <h2 className="mb-2 text-sm font-semibold text-stone-900">Catálogo</h2>
        <input
          placeholder="Buscar por folio, especie o género..."
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loadingItems ? (
          <p className="text-sm text-stone-500">Cargando...</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-stone-200 overflow-y-auto rounded-md border border-stone-200 bg-white">
            {filtered.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => selectItem(it.id)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${
                    selectedId === it.id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="font-medium text-stone-900">{it.catalog_code}</div>
                  <div className="text-stone-500">
                    {it.species.genus.name} {it.species.name}
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-stone-400">Sin resultados</li>
            )}
          </ul>
        )}
      </div>

      <div className="md:col-span-2">
        {!selected ? (
          <p className="text-sm text-stone-500">Selecciona un catálogo para capturar.</p>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="mb-1 text-lg font-semibold text-stone-900">{selected.catalog_code}</h2>
            <p className="mb-4 text-sm text-stone-500">
              {selected.species.genus.name} {selected.species.name}
            </p>

            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {numberField('normal_jars', 'Normales')}
              {numberField('ready_jars', 'Listos')}
              {numberField('rescue_1_jars', 'Rescate 1')}
              {numberField('rescue_2_jars', 'Rescate 2')}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              {numberField('discarded_jars', 'Descartados')}
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Motivo de descarte {form.discarded_jars > 0 && <span className="text-red-600">*</span>}
                </label>
                <select
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  value={form.discard_reason}
                  onChange={(e) => setForm((f) => ({ ...f, discard_reason: e.target.value as DiscardReason }))}
                  required={form.discarded_jars > 0}
                >
                  <option value="">—</option>
                  {DISCARD_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-stone-700">Última resiembra</label>
              <input
                type="date"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                value={form.last_subculture_date}
                onChange={(e) => setForm((f) => ({ ...f, last_subculture_date: e.target.value }))}
                required
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-stone-700">Notas</label>
              <textarea
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar captura'}
            </button>

            {lastResult && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
                <p className="font-medium text-emerald-800">Captura guardada</p>
                <p className="text-emerald-700">
                  {lastResult.dias_transcurridos} días desde última resiembra ·{' '}
                  <SemaforoBadge semaforo={lastResult.semaforo_antiguedad} />
                  {lastResult.estado_critico && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      crítico
                    </span>
                  )}
                </p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

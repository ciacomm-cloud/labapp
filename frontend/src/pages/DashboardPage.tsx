import { useEffect, useMemo, useState } from 'react'
import { api, ApiError, downloadExport } from '../lib/api'
import type { DashboardSummaryOut, DashboardUrgenteOut, GenusOut, SpeciesOut } from '../lib/types'
import { SemaforoBadge } from '../components/SemaforoBadge'
import { SortableTh } from '../components/SortableTh'
import { localISODaysAgo } from '../lib/dates'
import { useSort } from '../lib/useSort'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  )
}

type UrgenteSortKey = 'catalog_code' | 'especie' | 'last_subculture_date' | 'dias_transcurridos' | 'normal_jars' | 'rescate'

function urgenteSortValue(u: DashboardUrgenteOut, key: UrgenteSortKey): string | number {
  switch (key) {
    case 'catalog_code':
      return u.catalog_code
    case 'especie':
      return `${u.genus} ${u.species}`
    case 'last_subculture_date':
      return u.last_subculture_date
    case 'dias_transcurridos':
      return u.dias_transcurridos
    case 'normal_jars':
      return u.normal_jars
    case 'rescate':
      return u.rescue_1_jars + u.rescue_2_jars
  }
}

export function DashboardPage() {
  const [desde, setDesde] = useState(localISODaysAgo(30))
  const [hasta, setHasta] = useState(localISODaysAgo(0))
  const [genera, setGenera] = useState<GenusOut[]>([])
  const [species, setSpecies] = useState<SpeciesOut[]>([])
  const [genusId, setGenusId] = useState('')
  const [speciesId, setSpeciesId] = useState('')
  const [summary, setSummary] = useState<DashboardSummaryOut | null>(null)
  const [urgentes, setUrgentes] = useState<DashboardUrgenteOut[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)

  const speciesFiltradas = useMemo(
    () => (genusId ? species.filter((s) => s.genus_id === Number(genusId)) : species),
    [species, genusId],
  )

  const filterParams = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra)
    if (genusId) params.set('genus_id', genusId)
    if (speciesId) params.set('species_id', speciesId)
    return params.toString()
  }

  const loadSummary = async (d: string, h: string) => {
    try {
      const data = await api.get<DashboardSummaryOut>(`/api/dashboard/summary?${filterParams({ desde: d, hasta: h })}`)
      setSummary(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el resumen')
    }
  }

  const loadUrgentes = async () => {
    try {
      const data = await api.get<DashboardUrgenteOut[]>(`/api/dashboard/urgentes?${filterParams({})}`)
      setUrgentes(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la tabla de urgentes')
    }
  }

  useEffect(() => {
    api.get<GenusOut[]>('/api/inventario/genera').then(setGenera).catch(() => {})
    api.get<SpeciesOut[]>('/api/inventario/species').then(setSpecies).catch(() => {})
    setLoading(true)
    Promise.all([loadSummary(desde, hasta), loadUrgentes()])
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFiltros = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    await Promise.all([loadSummary(desde, hasta), loadUrgentes()])
  }

  const handleExport = async (formato: 'csv' | 'xlsx') => {
    setExporting(formato)
    try {
      await downloadExport(desde, hasta, formato)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo exportar')
    } finally {
      setExporting(null)
    }
  }

  const { sorted: urgentesOrdenados, sortKey, direction, toggle } = useSort<DashboardUrgenteOut, UrgenteSortKey>(
    urgentes,
    urgenteSortValue,
  )

  if (loading) return <p className="text-sm text-stone-500">Cargando...</p>

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <form onSubmit={applyFiltros} className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Desde</label>
            <input
              type="date"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Hasta</label>
            <input
              type="date"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Género</label>
            <select
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              value={genusId}
              onChange={(e) => {
                setGenusId(e.target.value)
                setSpeciesId('')
              }}
            >
              <option value="">Todos</option>
              {genera.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Especie</label>
            <select
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              value={speciesId}
              onChange={(e) => setSpeciesId(e.target.value)}
            >
              <option value="">Todas</option>
              {speciesFiltradas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
          >
            Aplicar filtros
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
            >
              {exporting === 'csv' ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={exporting !== null}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
            >
              {exporting === 'xlsx' ? 'Exportando...' : 'Exportar XLSX'}
            </button>
          </div>
        </form>

        {summary && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Frascos en laboratorio" value={summary.total_frascos_laboratorio} />
            <StatCard label="En rescate activo" value={summary.frascos_en_rescate_activos} />
            <StatCard label="Lotes con estado" value={summary.catalogos_con_estado} />
            <StatCard label={`% merma (${summary.periodo_desde} a ${summary.periodo_hasta})`} value={`${summary.porcentaje_merma}%`} />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-900">Urgentes (por días desde última resiembra)</h2>
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <SortableTh label="Folio" sortKeyName="catalog_code" activeKey={sortKey} direction={direction} onClick={toggle} />
                <SortableTh label="Especie" sortKeyName="especie" activeKey={sortKey} direction={direction} onClick={toggle} />
                <SortableTh
                  label="Última resiembra"
                  sortKeyName="last_subculture_date"
                  activeKey={sortKey}
                  direction={direction}
                  onClick={toggle}
                />
                <SortableTh
                  label="Días"
                  sortKeyName="dias_transcurridos"
                  activeKey={sortKey}
                  direction={direction}
                  onClick={toggle}
                />
                <th className="px-3 py-2">Semáforo</th>
                <th className="px-3 py-2">Crítico</th>
                <SortableTh label="Normales" sortKeyName="normal_jars" activeKey={sortKey} direction={direction} onClick={toggle} />
                <SortableTh label="Rescate" sortKeyName="rescate" activeKey={sortKey} direction={direction} onClick={toggle} />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {urgentesOrdenados.map((u) => (
                <tr key={u.catalog_item_id}>
                  <td className="px-3 py-2 font-medium text-stone-900">{u.catalog_code}</td>
                  <td className="px-3 py-2 text-stone-600">
                    {u.genus} {u.species}
                  </td>
                  <td className="px-3 py-2 text-stone-600">{u.last_subculture_date}</td>
                  <td className="px-3 py-2 text-stone-600">{u.dias_transcurridos}</td>
                  <td className="px-3 py-2">
                    <SemaforoBadge semaforo={u.semaforo_antiguedad} />
                  </td>
                  <td className="px-3 py-2">
                    {u.estado_critico && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">crítico</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-stone-600">{u.normal_jars}</td>
                  <td className="px-3 py-2 text-stone-600">{u.rescue_1_jars + u.rescue_2_jars}</td>
                </tr>
              ))}
              {urgentesOrdenados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-stone-400">
                    Sin lotes con captura registrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

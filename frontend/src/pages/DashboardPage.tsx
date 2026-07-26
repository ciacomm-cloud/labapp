import { useEffect, useState } from 'react'
import { api, ApiError, downloadExport } from '../lib/api'
import type { DashboardSummaryOut, DashboardUrgenteOut } from '../lib/types'
import { SemaforoBadge } from '../components/SemaforoBadge'
import { localISODaysAgo } from '../lib/dates'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  )
}

export function DashboardPage() {
  const [desde, setDesde] = useState(localISODaysAgo(30))
  const [hasta, setHasta] = useState(localISODaysAgo(0))
  const [summary, setSummary] = useState<DashboardSummaryOut | null>(null)
  const [urgentes, setUrgentes] = useState<DashboardUrgenteOut[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)

  const loadSummary = async (d: string, h: string) => {
    try {
      const data = await api.get<DashboardSummaryOut>(`/api/dashboard/summary?desde=${d}&hasta=${h}`)
      setSummary(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el resumen')
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadSummary(desde, hasta),
      api.get<DashboardUrgenteOut[]>('/api/dashboard/urgentes').then(setUrgentes),
    ])
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPeriodo = async (e: React.FormEvent) => {
    e.preventDefault()
    await loadSummary(desde, hasta)
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

  if (loading) return <p className="text-sm text-stone-500">Cargando...</p>

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <form onSubmit={applyPeriodo} className="mb-4 flex flex-wrap items-end gap-3">
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
          <button
            type="submit"
            className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
          >
            Aplicar periodo
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
            <StatCard label="Catálogos con estado" value={summary.catalogos_con_estado} />
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
                <th className="px-3 py-2">Folio</th>
                <th className="px-3 py-2">Especie</th>
                <th className="px-3 py-2">Última resiembra</th>
                <th className="px-3 py-2">Días</th>
                <th className="px-3 py-2">Semáforo</th>
                <th className="px-3 py-2">Crítico</th>
                <th className="px-3 py-2">Normales</th>
                <th className="px-3 py-2">Rescate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {urgentes.map((u) => (
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
              {urgentes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-stone-400">
                    Sin catálogos con captura registrada
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

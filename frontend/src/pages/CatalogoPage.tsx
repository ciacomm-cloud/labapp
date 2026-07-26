import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { CatalogItemOut, GenusOut, SpeciesOut } from '../lib/types'
import { GeneraSection } from './catalogo/GeneraSection'
import { SpeciesSection } from './catalogo/SpeciesSection'
import { CatalogSection } from './catalogo/CatalogSection'

type Tab = 'genera' | 'species' | 'catalog'

export function CatalogoPage() {
  const [tab, setTab] = useState<Tab>('genera')
  const [genera, setGenera] = useState<GenusOut[]>([])
  const [species, setSpecies] = useState<SpeciesOut[]>([])
  const [items, setItems] = useState<CatalogItemOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [g, s, c] = await Promise.all([
      api.get<GenusOut[]>('/api/inventario/genera'),
      api.get<SpeciesOut[]>('/api/inventario/species'),
      api.get<CatalogItemOut[]>('/api/catalog-items'),
    ])
    setGenera(g)
    setSpecies(s)
    setItems(c)
  }, [])

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el catálogo'))
      .finally(() => setLoading(false))
  }, [reload])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'genera', label: `Géneros (${genera.length})` },
    { key: 'species', label: `Especies (${species.length})` },
    { key: 'catalog', label: `Lotes (${items.length})` },
  ]

  if (loading) return <p className="text-sm text-stone-500">Cargando...</p>

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {tab === 'genera' && <GeneraSection genera={genera} reload={reload} />}
      {tab === 'species' && <SpeciesSection species={species} genera={genera} reload={reload} />}
      {tab === 'catalog' && <CatalogSection items={items} species={species} reload={reload} />}
    </div>
  )
}

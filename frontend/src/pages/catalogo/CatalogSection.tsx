import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { CatalogItemOut, SpeciesOut } from '../../lib/types'

const emptyForm = { catalog_code: '', species_id: '', status: 'active' }

export function CatalogSection({
  items,
  species,
  reload,
}: {
  items: CatalogItemOut[]
  species: SpeciesOut[]
  reload: () => Promise<void>
}) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/api/catalog-items/${editingId}`, {
          species_id: Number(form.species_id),
          status: form.status,
        })
      } else {
        await api.post('/api/catalog-items', {
          catalog_code: form.catalog_code,
          species_id: Number(form.species_id),
          status: form.status,
        })
      }
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el catálogo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: CatalogItemOut) => {
    if (!confirm(`¿Borrar el catálogo "${item.catalog_code}"? Falla si tiene logs asociados.`)) return
    setError(null)
    try {
      await api.delete(`/api/catalog-items/${item.id}`)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 md:col-span-1">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">{editingId ? 'Editar catálogo' : 'Nuevo catálogo'}</h3>

        <label className="mb-1 block text-sm font-medium text-stone-700">Folio (catalog_code)</label>
        <input
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-stone-100"
          value={form.catalog_code}
          onChange={(e) => setForm((f) => ({ ...f, catalog_code: e.target.value }))}
          disabled={editingId !== null}
          required
        />

        <label className="mb-1 block text-sm font-medium text-stone-700">Especie</label>
        <select
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={form.species_id}
          onChange={(e) => setForm((f) => ({ ...f, species_id: e.target.value }))}
          required
        >
          <option value="">Selecciona una especie...</option>
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.genus.name} {s.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-stone-700">Estado</label>
        <select
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {editingId ? 'Guardar' : 'Crear'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="md:col-span-2">
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-3 py-2">Folio</th>
                <th className="px-3 py-2">Especie</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 font-medium text-stone-900">{it.catalog_code}</td>
                  <td className="px-3 py-2 text-stone-600">
                    {it.species.genus.name} {it.species.name}
                  </td>
                  <td className="px-3 py-2 text-stone-600">{it.status}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditingId(it.id)
                        setForm({ catalog_code: it.catalog_code, species_id: String(it.species_id), status: it.status })
                      }}
                      className="mr-3 text-emerald-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button onClick={() => handleDelete(it)} className="text-red-600 hover:underline">
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-stone-400">
                    Sin catálogos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

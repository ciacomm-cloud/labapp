import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { GenusOut, SpeciesOut } from '../../lib/types'

const emptyForm = { genus_id: '', name: '', morphology: '' }

export function SpeciesSection({
  species,
  genera,
  reload,
}: {
  species: SpeciesOut[]
  genera: GenusOut[]
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
    const payload = {
      genus_id: Number(form.genus_id),
      name: form.name,
      morphology: form.morphology || null,
    }
    try {
      if (editingId) {
        await api.put(`/api/inventario/species/${editingId}`, payload)
      } else {
        await api.post('/api/inventario/species', payload)
      }
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la especie')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (s: SpeciesOut) => {
    if (!confirm(`¿Borrar "${s.name}"? Falla si tiene catálogos asociados.`)) return
    setError(null)
    try {
      await api.delete(`/api/inventario/species/${s.id}`)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 md:col-span-1">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">{editingId ? 'Editar especie' : 'Nueva especie'}</h3>

        <label className="mb-1 block text-sm font-medium text-stone-700">Género</label>
        <select
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={form.genus_id}
          onChange={(e) => setForm((f) => ({ ...f, genus_id: e.target.value }))}
          required
        >
          <option value="">Selecciona un género...</option>
          {genera.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-stone-700">Nombre</label>
        <input
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />

        <label className="mb-1 block text-sm font-medium text-stone-700">Morfología (opcional)</label>
        <input
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={form.morphology}
          onChange={(e) => setForm((f) => ({ ...f, morphology: e.target.value }))}
        />

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
                <th className="px-3 py-2">Género</th>
                <th className="px-3 py-2">Especie</th>
                <th className="px-3 py-2">Morfología</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {species.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 text-stone-600">{s.genus.name}</td>
                  <td className="px-3 py-2 text-stone-900">{s.name}</td>
                  <td className="px-3 py-2 text-stone-600">{s.morphology ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditingId(s.id)
                        setForm({ genus_id: String(s.genus_id), name: s.name, morphology: s.morphology ?? '' })
                      }}
                      className="mr-3 text-emerald-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline">
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {species.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-stone-400">
                    Sin especies
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

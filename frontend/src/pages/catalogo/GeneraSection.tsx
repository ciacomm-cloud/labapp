import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { GenusOut } from '../../lib/types'

export function GeneraSection({ genera, reload }: { genera: GenusOut[]; reload: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<GenusOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setName('')
    setEditing(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`/api/inventario/genera/${editing.id}`, { name })
      } else {
        await api.post('/api/inventario/genera', { name })
      }
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el género')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (g: GenusOut) => {
    if (!confirm(`¿Borrar el género "${g.name}"? Falla si tiene especies asociadas.`)) return
    setError(null)
    try {
      await api.delete(`/api/inventario/genera/${g.id}`)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 md:col-span-1">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">{editing ? 'Editar género' : 'Nuevo género'}</h3>
        <label className="mb-1 block text-sm font-medium text-stone-700">Nombre</label>
        <input
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {editing ? 'Guardar' : 'Crear'}
          </button>
          {editing && (
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
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {genera.map((g) => (
                <tr key={g.id}>
                  <td className="px-3 py-2 text-stone-900">{g.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditing(g)
                        setName(g.name)
                      }}
                      className="mr-3 text-emerald-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button onClick={() => handleDelete(g)} className="text-red-600 hover:underline">
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {genera.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-stone-400">
                    Sin géneros
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

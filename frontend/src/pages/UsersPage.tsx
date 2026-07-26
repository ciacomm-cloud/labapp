import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { UserOut, UserRole } from '../lib/types'
import { useAuth } from '../auth/AuthContext'

const emptyForm = {
  username: '',
  full_name: '',
  role: 'tech' as UserRole,
  is_active: true,
  password: '',
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserOut[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reload = () => api.get<UserOut[]>('/api/auth/users').then(setUsers)

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar usuarios'))
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/api/auth/users/${editingId}`, {
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
          password: form.password || null,
        })
      } else {
        await api.post('/api/auth/users', {
          username: form.username,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
        })
      }
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (u: UserOut) => {
    setEditingId(u.id)
    setForm({ username: u.username, full_name: u.full_name, role: u.role, is_active: u.is_active, password: '' })
    setError(null)
  }

  const handleDelete = async (u: UserOut) => {
    if (!confirm(`¿Borrar al usuario "${u.username}"?`)) return
    setError(null)
    try {
      await api.delete(`/api/auth/users/${u.id}`)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar')
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Cargando...</p>

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 md:col-span-1">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h3>

        <label className="mb-1 block text-sm font-medium text-stone-700">Usuario</label>
        <input
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-stone-100"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          disabled={editingId !== null}
          required
        />

        <label className="mb-1 block text-sm font-medium text-stone-700">Nombre completo</label>
        <input
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          required
        />

        <label className="mb-1 block text-sm font-medium text-stone-700">Rol</label>
        <select
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-stone-100"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
          disabled={editingId === currentUser?.id}
        >
          <option value="tech">tech</option>
          <option value="admin">admin</option>
        </select>

        {editingId && (
          <label className="mb-3 flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              disabled={editingId === currentUser?.id}
            />
            Activo
          </label>
        )}

        <label className="mb-1 block text-sm font-medium text-stone-700">
          {editingId ? 'Nuevo password (dejar en blanco para no cambiar)' : 'Password'}
        </label>
        <input
          type="password"
          className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required={!editingId}
        />

        {editingId === currentUser?.id && (
          <p className="mb-3 text-xs text-stone-500">
            No puedes quitarte el rol de admin ni desactivar tu propia cuenta.
          </p>
        )}

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
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-medium text-stone-900">
                    {u.username} {u.id === currentUser?.id && <span className="text-xs text-stone-400">(tú)</span>}
                  </td>
                  <td className="px-3 py-2 text-stone-600">{u.full_name}</td>
                  <td className="px-3 py-2 text-stone-600">{u.role}</td>
                  <td className="px-3 py-2">
                    {u.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">activo</span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">inactivo</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => startEdit(u)} className="mr-3 text-emerald-700 hover:underline">
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={u.id === currentUser?.id}
                      className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:no-underline"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-stone-400">
                    Sin usuarios
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

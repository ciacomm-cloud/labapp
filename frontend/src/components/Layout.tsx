import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Tab({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-stone-900">labapp</span>
            <nav className="flex gap-1">
              <Tab to="/captura">Captura</Tab>
              {user?.role === 'admin' && <Tab to="/dashboard">Dashboard</Tab>}
              {user?.role === 'admin' && <Tab to="/catalogo">Catálogo</Tab>}
              {user?.role === 'admin' && <Tab to="/usuarios">Usuarios</Tab>}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-stone-600">
            <span>
              {user?.full_name} <span className="text-stone-400">({user?.role})</span>
            </span>
            <button
              onClick={logout}
              className="rounded-md border border-stone-300 px-2.5 py-1 text-stone-700 hover:bg-stone-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}

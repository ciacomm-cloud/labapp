import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { CapturaPage } from './pages/CapturaPage'
import { DashboardPage } from './pages/DashboardPage'
import { CatalogoPage } from './pages/CatalogoPage'
import { UsersPage } from './pages/UsersPage'

function AuthedLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}

function App() {
  const { loading } = useAuth()

  if (loading) return <div className="p-8 text-center text-stone-500">Cargando...</div>

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/captura"
        element={
          <ProtectedRoute>
            <AuthedLayout>
              <CapturaPage />
            </AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['admin']}>
            <AuthedLayout>
              <DashboardPage />
            </AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogo"
        element={
          <ProtectedRoute roles={['admin']}>
            <AuthedLayout>
              <CatalogoPage />
            </AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute roles={['admin']}>
            <AuthedLayout>
              <UsersPage />
            </AuthedLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/captura" replace />} />
    </Routes>
  )
}

export default App

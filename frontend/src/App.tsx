import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CrearLote from "./pages/CrearLote";
import Actualizar from "./pages/Actualizar";
import Catalogos from "./pages/Catalogos";
import Usuarios from "./pages/Usuarios";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/crear-lote" element={<CrearLote />} />
              <Route path="/actualizar" element={<Actualizar />} />
              <Route path="/catalogos" element={<Catalogos />} />
              <Route element={<AdminRoute />}>
                <Route path="/usuarios" element={<Usuarios />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

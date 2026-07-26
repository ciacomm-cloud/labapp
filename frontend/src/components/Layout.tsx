import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoMenu from "../assets/logo_menu.jpg";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive
      ? "bg-emerald-600 text-white"
      : "text-slate-600 hover:bg-slate-100"
  }`;

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <img src={logoMenu} alt="LabApp" className="h-9 w-auto object-contain" />
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/crear-lote" className={linkClass}>
                Crear Lote
              </NavLink>
              <NavLink to="/actualizar" className={linkClass}>
                Actualizar
              </NavLink>
              <NavLink to="/catalogos" className={linkClass}>
                Catálogos
              </NavLink>
              {user?.rol === "admin" && (
                <NavLink to="/usuarios" className={linkClass}>
                  Usuarios
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{user?.nombre}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

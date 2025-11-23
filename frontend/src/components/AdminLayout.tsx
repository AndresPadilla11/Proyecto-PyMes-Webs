import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import logoIcon from '../assets/logo-pymes-contables.svg';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, logout, isAdminMode } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Si no está en modo admin, solo mostrar children (será manejado por AdminRoute)
  if (!isAdminMode) {
    return <>{children}</>;
  }

  const isAdmin = user?.role === 'ADMIN';
  const isCashier = user?.role === 'CASHIER';

  return (
    <div className="min-h-screen bg-background-light">
      {/* Navbar/Sidebar */}
      <nav className="bg-card-background shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200">
                <div className="flex-shrink-0">
                  <img src={logoIcon} alt="PyMes Contables" className="w-10 h-10 lg:w-12 lg:h-12" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg lg:text-xl font-bold text-text-dark leading-tight">PyMes</span>
                  <span className="text-xs lg:text-sm text-text-light font-medium leading-tight">Contables</span>
                </div>
              </Link>
              {isCashier && (
                <span className="px-3 py-1 text-xs font-semibold bg-secondary-green/20 text-secondary-green rounded-2xl border border-secondary-green/30">
                  Cajero
                </span>
              )}
              {isAdmin && (
                <span className="px-3 py-1 text-xs font-semibold bg-blue-500/20 text-blue-600 rounded-2xl border border-blue-500/30">
                  Admin
                </span>
              )}
              <div className="hidden sm:flex sm:space-x-1">
                {/* Rutas solo para ADMIN en modo admin */}
                {isAdmin && (
                  <>
                    <Link
                      to="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-text-light hover:text-text-dark hover:bg-gray-50 rounded-2xl transition-all duration-200"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/clients"
                      className="px-4 py-2 text-sm font-medium text-text-light hover:text-text-dark hover:bg-gray-50 rounded-2xl transition-all duration-200"
                    >
                      Clientes
                    </Link>
                    <Link
                      to="/products"
                      className="px-4 py-2 text-sm font-medium text-text-light hover:text-text-dark hover:bg-gray-50 rounded-2xl transition-all duration-200"
                    >
                      Productos
                    </Link>
                    <Link
                      to="/invoices"
                      className="px-4 py-2 text-sm font-medium text-text-light hover:text-text-dark hover:bg-gray-50 rounded-2xl transition-all duration-200"
                    >
                      Facturas
                    </Link>
                  </>
                )}
                {/* Ruta para todos los usuarios */}
                <Link
                  to="/sales"
                  className="px-4 py-2 text-sm font-medium text-text-light hover:text-text-dark hover:bg-gray-50 rounded-2xl transition-all duration-200"
                >
                  Ventas
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-2xl">
                <div className="bg-blue-50 rounded-full p-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs text-text-light font-medium">Usuario</span>
                  <span className="text-sm font-semibold text-text-dark">{user?.fullName || 'Usuario'}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner"
                title="Cerrar Sesión"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="min-h-screen bg-background-light py-6 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

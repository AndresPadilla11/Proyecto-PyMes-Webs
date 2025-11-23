import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';
import ClientList from './components/ClientList';
import InvoiceList from './components/InvoiceList';
import NotFound from './components/NotFound';
import ProductList from './components/ProductList';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Clients from './pages/Clients';

// Componente para proteger rutas privadas
const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
  return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">Cargando...</p>
              </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Componente para proteger rutas solo para ADMIN (requiere modo admin activado)
const AdminRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isLoading, user, isAdminMode } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">Cargando...</p>
              </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si no es admin o no tiene modo admin activado, redirigir a POS
  if (user?.role !== 'ADMIN' || !isAdminMode) {
    return <Navigate to="/sales" replace />;
  }

  return children;
};

// Componente para manejar ruta raíz (sin bucle de redirección)
const RootRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">Cargando...</p>
            </div>
    );
  }

  // Solo redirige UNA VEZ, sin re-renderizar constantemente
  return <Navigate to={isAuthenticated ? "/sales" : "/login"} replace />;
};

// Componente principal de la aplicación (rutas protegidas)
const AppContent = () => {
  return (
          <Routes>
      {/* Ruta raíz - redirige solo una vez sin bucles */}
      <Route path="/" element={<RootRoute />} />

      {/* Ruta de login pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Ruta de POS sin AdminLayout (interfaz limpia) */}
      <Route
        path="/sales"
        element={
          <PrivateRoute>
            <POS />
          </PrivateRoute>
        }
      />

      {/* Rutas administrativas con AdminLayout */}
      <Route
        path="/dashboard"
        element={
          <AdminRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <AdminRoute>
            <AdminLayout>
              <ClientList />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <AdminRoute>
            <AdminLayout>
              <Clients />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/products"
        element={
          <AdminRoute>
            <AdminLayout>
              <ProductList />
            </AdminLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <AdminRoute>
            <AdminLayout>
              <InvoiceList />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* Ruta 404 */}
            <Route 
        path="*"
              element={
          <PrivateRoute>
            <AdminLayout>
              <NotFound />
            </AdminLayout>
          </PrivateRoute>
        }
      />
          </Routes>
  );
};

// Componente raíz con AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

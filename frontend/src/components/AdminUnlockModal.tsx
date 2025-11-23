import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import * as authService from '../services/authService';

interface AdminUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminUnlockModal = ({ isOpen, onClose, onSuccess }: AdminUnlockModalProps) => {
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await authService.verifyPassword(password);

      if (response.success) {
        // Redirigir al dashboard y activar modo admin
        onSuccess();
        navigate('/dashboard');
        setPassword('');
        onClose();
      } else {
        setError(response.message || 'Acceso denegado');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error al verificar la contraseña');
      } else {
        // Verificar si es un error de Axios
        const axiosError = err as AxiosError<{ message?: string; success?: boolean }>;
        if (axiosError.response) {
          const errorMessage = axiosError.response.data?.message || 'Contraseña incorrecta o no eres Admin';
          
          // Si el error es 403 o 401, mostrar mensaje específico
          if (axiosError.response.status === 403 || axiosError.response.status === 401) {
            setError('Contraseña incorrecta o no eres Admin');
          } else {
            setError(errorMessage);
          }
        } else {
          setError('Contraseña incorrecta o no eres Admin');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 rounded-full p-3">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Acceso de Administrador</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all"
              title="Cerrar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6 text-base">
            Ingresa tu contraseña de administrador para acceder al panel de administración.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow-md">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="adminPassword" className="block mb-3 font-semibold text-gray-700 text-base">
                Contraseña de Administrador
              </label>
              <input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ingresa tu contraseña"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !password}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Desbloquear
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUnlockModal;


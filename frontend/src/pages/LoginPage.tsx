import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

// Obtener el Client ID de Google desde las variables de entorno
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';

const LoginPage = () => {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    tenantName: ''
  });

  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error al escribir
    if (error) setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        // Login
        if (!formData.email || !formData.password) {
          setError('Email y contraseña son requeridos');
          setIsSubmitting(false);
          return;
        }

        await login({
          email: formData.email,
          password: formData.password
        });

        // Todos los usuarios inician en POS
        navigate('/sales');
      } else {
        // Registro
        if (!formData.fullName || !formData.email || !formData.password) {
          setError('Todos los campos son requeridos');
          setIsSubmitting(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setIsSubmitting(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          setIsSubmitting(false);
          return;
        }

        await register({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          tenantName: formData.tenantName || undefined
        });

        // Todos los usuarios inician en POS
        navigate('/sales');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error al procesar la solicitud');
      } else if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(
          axiosError.response?.data?.message || 'Error al procesar la solicitud'
        );
      } else {
        setError('Error al procesar la solicitud');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      tenantName: ''
    });
  };

  // Manejar el éxito de Google Sign-In
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      // Obtener el ID token de la respuesta
      const idToken = credentialResponse.credential;
      
      if (!idToken) {
        throw new Error('No se recibió el token de Google');
      }

      // Enviar el ID token al backend
      await loginWithGoogle(idToken);

      // Todos los usuarios inician en POS
      navigate('/sales');
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      if (err instanceof Error) {
        setError(err.message || 'Error al iniciar sesión con Google');
      } else if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(
          axiosError.response?.data?.message || 'Error al iniciar sesión con Google'
        );
      } else {
        setError('Error al iniciar sesión con Google');
      }
    }
  };

  // Manejar el error de Google Sign-In
  const handleGoogleError = () => {
    setIsGoogleLoading(false);
    setError('Error al iniciar sesión con Google. Por favor, intenta nuevamente.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-blue-start to-gradient-blue-end flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Tarjeta flotante con estilo Neumorfismo/Glassmorphism */}
      <div className="max-w-md w-full">
        <div className="bg-card-background rounded-[3rem] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] p-8 lg:p-14 backdrop-blur-sm border border-white/20">
          {/* Encabezado */}
          <div className="text-center mb-10">
            {/* Logo/Icono con efecto flotante */}
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-br from-gradient-blue-start to-gradient-blue-end rounded-3xl p-6 shadow-[0_10px_30px_-5px_rgba(55,93,229,0.4)] transform hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-text-dark mb-3 tracking-tight">
              {isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="text-base text-text-light">
              {isLoginMode
                ? 'Ingresa a tu cuenta de PyMes Contables'
                : 'Regístrate para comenzar a usar PyMes Contables'}
            </p>
          </div>

          {/* Formulario */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-sm">
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Campos del formulario */}
            <div className="space-y-5">
              {!isLoginMode && (
                <>
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-sm font-semibold text-text-dark mb-2.5"
                    >
                      Nombre Completo
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required={!isLoginMode}
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-gray-50/50 border-none rounded-2xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-gradient-blue-start focus:bg-white transition-all duration-300 text-base shadow-inner"
                      placeholder="Nombre Completo"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tenantName"
                      className="block text-sm font-semibold text-text-dark mb-2.5"
                    >
                      Nombre de la Empresa <span className="text-text-light font-normal">(Opcional)</span>
                    </label>
                    <input
                      id="tenantName"
                      name="tenantName"
                      type="text"
                      value={formData.tenantName}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-gray-50/50 border-none rounded-2xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-gradient-blue-start focus:bg-white transition-all duration-300 text-base shadow-inner"
                      placeholder="Nombre de la Empresa"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-text-dark mb-2.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-gray-50/50 border-none rounded-2xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-gradient-blue-start focus:bg-white transition-all duration-300 text-base shadow-inner"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-text-dark mb-2.5"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-gray-50/50 border-none rounded-2xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-gradient-blue-start focus:bg-white transition-all duration-300 text-base shadow-inner"
                  placeholder="••••••••"
                />
              </div>

              {!isLoginMode && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-text-dark mb-2.5"
                  >
                    Confirmar Contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required={!isLoginMode}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-gray-50/50 border-none rounded-2xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-gradient-blue-start focus:bg-white transition-all duration-300 text-base shadow-inner"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            {/* Botón de envío con gradiente */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-gradient-blue-start to-gradient-blue-end hover:opacity-90 active:scale-[0.98] text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-[0_10px_30px_-5px_rgba(55,93,229,0.4)] hover:shadow-[0_15px_40px_-5px_rgba(55,93,229,0.5)] active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Procesando...
                  </span>
                ) : isLoginMode ? (
                  'Iniciar Sesión'
                ) : (
                  'Registrarse'
                )}
              </button>
            </div>

            {/* Divisor y Botón de Google Sign-In - Solo mostrar si GOOGLE_CLIENT_ID está configurado */}
            {GOOGLE_CLIENT_ID && (
              <>
                {/* Divisor */}
                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card-background text-text-light">O continúa con</span>
                  </div>
                </div>

                {/* Botón de Google Sign-In */}
                <div className="pt-4">
                  {isGoogleLoading ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-white text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-md opacity-50 cursor-not-allowed border border-gray-300 flex items-center justify-center gap-3 text-base"
                    >
                      <svg
                        className="animate-spin h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Conectando con Google...
                    </button>
                  ) : (
                    <div className="flex justify-center w-full">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        useOneTap={false}
                        text="signin_with"
                        shape="rectangular"
                        theme="outline"
                        size="large"
                        locale="es"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Enlace para cambiar de modo */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm font-semibold text-gradient-blue-start hover:text-gradient-blue-end active:opacity-80 transition-colors duration-200"
              >
                {isLoginMode
                  ? '¿No tienes cuenta? Regístrate'
                  : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

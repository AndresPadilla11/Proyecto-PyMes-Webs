import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginPayload, RegisterPayload, AuthResponse } from '../services/authService';
import * as authService from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  isAdminMode: boolean;
  setAdminMode: (enabled: boolean) => void;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  loginWithGoogle: (idToken: string) => Promise<AuthResponse>;
  logout: () => void;
  promoteToAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const loadUser = () => {
      try {
        const savedUser = authService.getUser();
        if (savedUser && authService.isAuthenticated()) {
          setUser(savedUser);
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        authService.clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (payload: LoginPayload): Promise<AuthResponse> => {
    try {
      const response = await authService.login(payload);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
    try {
      const response = await authService.register(payload);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<AuthResponse> => {
    try {
      const response = await authService.loginWithGoogle({ idToken });
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAdminMode(false);
  };

  const promoteToAdmin = async (): Promise<void> => {
    try {
      const response = await authService.promoteToAdmin();
      // Actualizar el usuario en el estado con el nuevo rol y token
      setUser(response.user);
      // Si ya era ADMIN, no cambia nada, pero actualizamos el estado
      if (response.user.role === 'ADMIN') {
        setIsAdminMode(true);
      }
    } catch (error) {
      throw error;
    }
  };

  const setAdminMode = (enabled: boolean) => {
    setIsAdminMode(enabled);
    // Guardar en localStorage para persistencia
    if (enabled) {
      localStorage.setItem('admin_mode', 'true');
    } else {
      localStorage.removeItem('admin_mode');
    }
  };

  // Cargar estado de admin mode desde localStorage
  useEffect(() => {
    const adminModeSaved = localStorage.getItem('admin_mode');
    if (adminModeSaved === 'true') {
      setIsAdminMode(true);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'ADMIN',
    isCashier: user?.role === 'CASHIER',
    isAdminMode,
    setAdminMode,
    login,
    register,
    loginWithGoogle,
    logout,
    promoteToAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


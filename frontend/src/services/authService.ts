import apiClient from '../api/axios';

export interface User {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  tenantName?: string;
  tenantSlug?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * Guarda el token y usuario en localStorage
 */
export const saveAuthData = (token: string, user: User): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Obtiene el token del localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Obtiene el usuario del localStorage
 */
export const getUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

/**
 * Elimina los datos de autenticación del localStorage
 */
export const clearAuthData = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Verifica si el usuario está autenticado
 */
export const isAuthenticated = (): boolean => {
  return getToken() !== null && getUser() !== null;
};

/**
 * Login de usuario
 */
export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
  const { token, user } = response.data;
  
  // Guardar en localStorage
  saveAuthData(token, user);
  
  return response.data;
};

/**
 * Registro de nuevo usuario
 */
export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', payload);
  const { token, user } = response.data;
  
  // Guardar en localStorage
  saveAuthData(token, user);
  
  return response.data;
};

/**
 * Logout de usuario
 */
export const logout = (): void => {
  clearAuthData();
};

/**
 * Verifica la contraseña del usuario actual para acceso admin
 */
export const verifyPassword = async (password: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>('/auth/verify-password', { password });
  return response.data;
};

/**
 * Promueve el usuario actual a ADMIN y obtiene un nuevo token
 */
export const promoteToAdmin = async (): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/promote-to-admin');
  const { token, user } = response.data;
  
  // Guardar el nuevo token en localStorage
  saveAuthData(token, user);
  
  return response.data;
};

/**
 * Interfaz para login con Google
 */
export interface GoogleLoginPayload {
  idToken: string;
}

/**
 * Login con Google Sign-In
 */
export const loginWithGoogle = async (payload: GoogleLoginPayload): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/google', payload);
  const { token, user } = response.data;
  
  // Guardar en localStorage
  saveAuthData(token, user);
  
  return response.data;
};


import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { tokenStore } from './tokens';
import { emitUnauthorized } from './authEvents';
import type { ApiError, AuthResponse } from './types';

// baseURL = origen del backend Spring (spec 001). A diferencia de la web (que usa el
// proxy '/api' de Vite), aquí las rutas van verbatim del openapi: '/auth/login',
// '/estaciones', '/api/public/...'. Configurable por app.config.ts (extra.apiUrl).
const baseURL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://10.0.2.2:8080';

export const api = axios.create({ baseURL });

// Adjunta el access token a cada petición (lectura async desde SecureStore).
api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cliente aparte para refrescar (sin interceptores, evita recursión).
const refreshClient = axios.create({ baseURL });
let refreshPromise: Promise<string> | null = null;

async function refrescarToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await tokenStore.getRefresh();
      const res = await refreshClient.post<AuthResponse>('/auth/refresh', { refreshToken });
      await tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      return res.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// En 401, intenta refrescar una vez y reintenta la petición original (FR-003).
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const esAuth = original?.url?.includes('/auth/');
    const tieneRefresh = !!(await tokenStore.getRefresh());

    if (error.response?.status === 401 && original && !original._retry && !esAuth && tieneRefresh) {
      original._retry = true;
      try {
        const nuevo = await refrescarToken();
        original.headers.Authorization = `Bearer ${nuevo}`;
        return api(original);
      } catch {
        // Refresh falló → sesión terminada (FR-021).
        await tokenStore.clear();
        emitUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje legible de un error de Axios (FR-020). */
export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.message) return data.message;
    if (error.code === 'ERR_NETWORK') return 'Sin conexión con el servidor. Revisa tu red.';
    return error.message;
  }
  return 'Error inesperado';
}

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokens';
import type { ApiError, AuthResponse } from './types';

// En dev se usa el proxy '/api' (ver vite.config). En prod, VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({ baseURL });

// Adjunta el access token a cada petición.
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cliente aparte para refrescar (sin interceptores, evita recursión).
const refreshClient = axios.create({ baseURL });
let refreshPromise: Promise<string> | null = null;

function refrescarToken(): Promise<string> {
  if (!refreshPromise) {
    const refreshToken = tokenStore.getRefresh();
    refreshPromise = refreshClient
      .post<AuthResponse>('/auth/refresh', { refreshToken })
      .then((res) => {
        tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// En 401, intenta refrescar una vez y reintenta la petición original.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const esLogin = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !esLogin
        && tokenStore.getRefresh()) {
      original._retry = true;
      try {
        const nuevo = await refrescarToken();
        original.headers.Authorization = `Bearer ${nuevo}`;
        return api(original);
      } catch {
        tokenStore.clear();
        if (!location.pathname.startsWith('/login')) {
          location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje legible de un error de Axios. */
export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.message ?? error.message;
  }
  return 'Error inesperado';
}

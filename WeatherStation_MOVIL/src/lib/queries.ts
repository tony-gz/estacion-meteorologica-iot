import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type {
  Estacion, PublicEstacion, PublicEstadistica,
} from './types';

// Rutas verbatim del openapi (spec 001). baseURL = origen del backend.

// ── Público (sin cuenta) — US1 ──────────────────────────────────────────────

/** GET /api/public/weather/latest → estaciones aprobadas con su lectura actual. */
export function usePublicEstaciones() {
  return useQuery({
    queryKey: ['public-estaciones'],
    queryFn: async () =>
      (await api.get<PublicEstacion[]>('/api/public/weather/latest')).data,
    refetchInterval: 60_000,
  });
}

/** GET /api/public/statistics → estadística agregada pública (opcional). */
export function usePublicEstadisticas(municipio?: string) {
  return useQuery({
    queryKey: ['public-stats', municipio ?? null],
    queryFn: async () =>
      (await api.get<PublicEstadistica>('/api/public/statistics', {
        params: municipio ? { municipio } : {},
      })).data,
  });
}

// ── Autenticado (US2 en adelante) ───────────────────────────────────────────

/** GET /estaciones → estaciones (según rol). Requiere sesión. */
export function useEstaciones(enabled = true) {
  return useQuery({
    queryKey: ['estaciones'],
    enabled,
    queryFn: async () => (await api.get<Estacion[]>('/estaciones')).data,
    refetchInterval: 30_000,
  });
}

/** GET /estaciones/{id} → detalle de una estación. */
export function useEstacion(id: string, enabled = true) {
  return useQuery({
    queryKey: ['estacion', id],
    enabled,
    queryFn: async () => (await api.get<Estacion>(`/estaciones/${id}`)).data,
    refetchInterval: 30_000,
  });
}

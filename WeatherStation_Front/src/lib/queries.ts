import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type {
  Estacion, Estadisticas, Lectura, PublicEstacion, PublicEstadistica,
} from './types';

// El {id} de las rutas es el uuid público de la estación.

export function useEstaciones() {
  return useQuery({
    queryKey: ['estaciones'],
    queryFn: async () => (await api.get<Estacion[]>('/estaciones')).data,
    refetchInterval: 30_000,
  });
}

export function useEstacion(id: string) {
  return useQuery({
    queryKey: ['estacion', id],
    queryFn: async () => (await api.get<Estacion>(`/estaciones/${id}`)).data,
    refetchInterval: 30_000,
  });
}

function rango(horas: number) {
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - horas * 3_600_000);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

export function useHistorial(id: string, horas: number, enabled: boolean) {
  return useQuery({
    queryKey: ['historial', id, horas],
    enabled,
    queryFn: async () =>
      (await api.get<Lectura[]>(`/estaciones/${id}/historial`, { params: rango(horas) })).data,
  });
}

export function useEstadisticas(id: string, horas: number, enabled: boolean) {
  return useQuery({
    queryKey: ['estadisticas', id, horas],
    enabled,
    queryFn: async () =>
      (await api.get<Estadisticas>(`/estaciones/${id}/estadisticas`, { params: rango(horas) })).data,
  });
}

// ── Público (sin cuenta). Rutas con prefijo /api en el backend. ──────────────

export function usePublicEstaciones() {
  return useQuery({
    queryKey: ['public-estaciones'],
    queryFn: async () => (await api.get<PublicEstacion[]>('/api/public/weather/latest')).data,
    refetchInterval: 60_000,
  });
}

export function usePublicEstadisticas(municipio?: string) {
  return useQuery({
    queryKey: ['public-stats', municipio ?? null],
    queryFn: async () =>
      (await api.get<PublicEstadistica>('/api/public/statistics', {
        params: municipio ? { municipio } : {},
      })).data,
  });
}

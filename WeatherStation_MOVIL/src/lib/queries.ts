import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  Alerta, Conexion, Estacion, Estadisticas, IaResponse, Lectura,
  PublicEstacion, PublicEstadistica, SolicitarEstacionInput, Solicitud, StationToken,
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

// ── Autenticado (US2) ───────────────────────────────────────────────────────

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

/** Rango [ahora - horas, ahora] en ISO para históricos/estadísticas. */
function rango(horas: number) {
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - horas * 3_600_000);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

/** GET /estaciones/{id}/historial → serie temporal de lecturas (FR-008). */
export function useHistorial(id: string, horas: number, enabled = true) {
  return useQuery({
    queryKey: ['historial', id, horas],
    enabled,
    queryFn: async () =>
      (await api.get<Lectura[]>(`/estaciones/${id}/historial`, { params: rango(horas) })).data,
  });
}

/** GET /estaciones/{id}/estadisticas → agregados del rango. */
export function useEstadisticas(id: string, horas: number, enabled = true) {
  return useQuery({
    queryKey: ['estadisticas', id, horas],
    enabled,
    queryFn: async () =>
      (await api.get<Estadisticas>(`/estaciones/${id}/estadisticas`, { params: rango(horas) })).data,
  });
}

/** GET /alertas → alertas meteorológicas (FR-010). */
export function useAlertas(enabled = true) {
  return useQuery({
    queryKey: ['alertas'],
    enabled,
    queryFn: async () => (await api.get<Alerta[]>('/alertas')).data,
    refetchInterval: 60_000,
  });
}

// ── Asistente IA (solo autenticado) — FR-009 ────────────────────────────────

/** POST /ia/preguntar {estacionId, pregunta} → respuesta fundamentada. */
export function usePreguntarIA() {
  return useMutation({
    mutationFn: async (vars: { estacionId: string; pregunta: string }) =>
      (await api.post<IaResponse>('/ia/preguntar', vars)).data,
  });
}

/** POST /ia/resumen {estacionId, horas} → resumen del clima reciente. */
export function useResumenIA() {
  return useMutation({
    mutationFn: async (vars: { estacionId: string; horas?: number }) =>
      (await api.post<IaResponse>('/ia/resumen', { horas: 24, ...vars })).data,
  });
}

// ── Gestión del responsable (US4) ───────────────────────────────────────────

/** GET /estaciones/{id}/conexiones → historial de conexiones (FR-014). */
export function useConexiones(id: string, enabled = true) {
  return useQuery({
    queryKey: ['conexiones', id],
    enabled,
    queryFn: async () => (await api.get<Conexion[]>(`/estaciones/${id}/conexiones`)).data,
  });
}

/** GET /solicitudes/mis-solicitudes → solicitudes del usuario. */
export function useMisSolicitudes(enabled = true) {
  return useQuery({
    queryKey: ['mis-solicitudes'],
    enabled,
    queryFn: async () => (await api.get<Solicitud[]>('/solicitudes/mis-solicitudes')).data,
  });
}

/** POST /solicitudes → solicitar alta de estación (FR-013). */
export function useSolicitarEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SolicitarEstacionInput) =>
      (await api.post<Solicitud>('/solicitudes', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
  });
}

// ── Credenciales de estación (002.1 — solo ADMIN) ───────────────────────────

/**
 * POST /estaciones/{uuid}/regenerar-token → nuevo token en claro (una sola vez).
 * Solo ADMIN (FR-024). El backend guarda solo el hash; **invalida** el token anterior,
 * así que la estación debe re-provisionarse. El token NO se cachea (FR-023).
 */
export function useRegenerarToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) =>
      (await api.post<StationToken>(`/estaciones/${uuid}/regenerar-token`)).data,
    onSuccess: (_data, uuid) => qc.invalidateQueries({ queryKey: ['estacion', uuid] }),
  });
}

/**
 * POST /solicitudes/{id}/aprobar → aprueba y devuelve el token en claro (una sola vez).
 * Solo ADMIN. Disponible para un futuro flujo de aprobación en la app; hoy la aprobación
 * se hace en la Web. El token NO se cachea (FR-023).
 */
export function useAprobarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<StationToken>(`/solicitudes/${id}/aprobar`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  Alerta, Conexion, Escuela, EstadoAlerta, EstadoSolicitud, PageResponse,
  Rol, Solicitud, StationToken, TipoAlerta, Usuario,
} from './types';

// ── Usuarios ────────────────────────────────────────────────────────────────

export function useUsuarios(page: number, size = 20) {
  return useQuery({
    queryKey: ['usuarios', page, size],
    queryFn: async () =>
      (await api.get<PageResponse<Usuario>>('/usuarios', { params: { page, size } })).data,
  });
}

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  escuelaId?: string;
}

export interface ActualizarUsuarioInput {
  nombre?: string;
  email?: string;
  rol?: Rol;
  escuelaId?: string;
  activo?: boolean;
  password?: string;
}

export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearUsuarioInput) => api.post<Usuario>('/usuarios', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useActualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActualizarUsuarioInput }) =>
      api.put<Usuario>(`/usuarios/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/usuarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

// ── Escuelas ─────────────────────────────────────────────────────────────────

export interface EscuelaInput {
  nombre: string;
  clave?: string;
  municipio?: string;
  ubicacion?: string;
  latitud?: number;
  longitud?: number;
  director?: string;
  contactoEmail?: string;
}

export function useEscuelas() {
  return useQuery({
    queryKey: ['escuelas'],
    queryFn: async () => (await api.get<Escuela[]>('/escuelas')).data,
  });
}

export function useCrearEscuela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EscuelaInput) => api.post<Escuela>('/escuelas', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escuelas'] }),
  });
}

export function useActualizarEscuela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EscuelaInput }) =>
      api.put<Escuela>(`/escuelas/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escuelas'] }),
  });
}

export function useEliminarEscuela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/escuelas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escuelas'] }),
  });
}

// ── Estaciones (gobernanza) ───────────────────────────────────────────────────

export interface RegistrarEstacionInput {
  nombre: string;
  escuelaId: string;
  ubicacion?: string;
  municipio?: string;
  descripcion?: string;
}

function invalidarEstaciones(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['estaciones'] });
}

export function useRegistrarEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegistrarEstacionInput) => api.post('/estaciones', input),
    onSuccess: () => invalidarEstaciones(qc),
  });
}

/** Acción de gobernanza que devuelve la estación (rechazar/deshabilitar/reactivar/mantenimiento). */
export function useAccionEstacion(accion: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, motivo }: { uuid: string; motivo?: string }) =>
      api.post(`/estaciones/${uuid}/${accion}`, motivo ? { motivo } : {}),
    onSuccess: () => invalidarEstaciones(qc),
  });
}

/** Aprobar o regenerar token: devuelven el token en claro UNA sola vez. */
export function useTokenEstacion(accion: 'aprobar' | 'regenerar-token') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      api.post<StationToken>(`/estaciones/${uuid}/${accion}`).then((r) => r.data),
    onSuccess: () => invalidarEstaciones(qc),
  });
}

export function useEliminarEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => api.delete(`/estaciones/${uuid}`),
    onSuccess: () => invalidarEstaciones(qc),
  });
}

export function useConexiones(uuid: string, enabled: boolean) {
  return useQuery({
    queryKey: ['conexiones', uuid],
    enabled,
    queryFn: async () => (await api.get<Conexion[]>(`/estaciones/${uuid}/conexiones`)).data,
  });
}

// ── Solicitudes ───────────────────────────────────────────────────────────────

export function useSolicitudes(estado?: EstadoSolicitud) {
  return useQuery({
    queryKey: ['solicitudes', estado ?? null],
    queryFn: async () =>
      (await api.get<Solicitud[]>('/solicitudes', { params: estado ? { estado } : {} })).data,
  });
}

export interface SolicitarEstacionInput {
  nombre: string;
  institucion?: string;
  ubicacion?: string;
  municipio?: string;
  latitud?: number;
  longitud?: number;
  firmware?: string;
}

export function useSolicitarEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SolicitarEstacionInput) =>
      api.post<Solicitud>('/solicitudes', input).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] });
      qc.invalidateQueries({ queryKey: ['mis-solicitudes'] });
    },
  });
}

export function useMisSolicitudes() {
  return useQuery({
    queryKey: ['mis-solicitudes'],
    queryFn: async () =>
      (await api.get<Solicitud[]>('/solicitudes/mis-solicitudes')).data,
  });
}

export function useAprobarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<StationToken>(`/solicitudes/${id}/aprobar`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] });
      qc.invalidateQueries({ queryKey: ['estaciones'] });
    },
  });
}

export function useRechazarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      api.post(`/solicitudes/${id}/rechazar`, motivo ? { motivo } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes'] }),
  });
}

// ── Alertas ─────────────────────────────────────────────────────────────────

export interface FiltrosAlerta {
  estacionId?: string;
  tipo?: TipoAlerta;
  estado?: EstadoAlerta;
}

export function useAlertas(filtros: FiltrosAlerta) {
  return useQuery({
    queryKey: ['alertas', filtros],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filtros.estacionId) params.estacionId = filtros.estacionId;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.estado) params.estado = filtros.estado;
      return (await api.get<Alerta[]>('/alertas', { params })).data;
    },
  });
}

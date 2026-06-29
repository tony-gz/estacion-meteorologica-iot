// Tipos espejo de los DTOs del backend (WeatherStation Backend v3).

export type Rol = 'ADMIN' | 'RESPONSABLE' | 'INVESTIGADOR' | 'USUARIO';
export type EstadoEstacion = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED' | 'MAINTENANCE';
export type Conectividad = 'ONLINE' | 'OFFLINE';
export type EstadoSolicitud = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TipoAlerta =
  | 'LLUVIA' | 'VIENTO_FUERTE' | 'CALOR_EXTREMO'
  | 'ESTACION_DESCONECTADA' | 'SENSOR_SIN_RESPUESTA';
export type Severidad = 'BAJA' | 'MEDIA' | 'ALTA';
export type EstadoAlerta = 'ACTIVA' | 'RESUELTA';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  escuelaId: string | null;
  escuelaNombre: string | null;
  activo: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: Usuario;
}

export interface Lectura {
  timestamp: string;
  temperatura: number;
  humedad: number;
  presion: number;
  vientoKmh: number;
  vientoDir: string;
  vientoGrados: number | null;
  lluviaMm: number;
}

/** StationResponse del backend (gobernanza + consulta). El {id} de las rutas es el uuid. */
export interface Estacion {
  id: string;
  uuid: string;
  nombre: string;
  descripcion: string | null;
  escuelaId: string | null;
  escuelaNombre: string | null;
  responsableId: string | null;
  responsableNombre: string | null;
  ubicacion: string | null;
  municipio: string | null;
  latitud: number | null;
  longitud: number | null;
  altitud: number | null;
  firmware: string | null;
  hardware: string | null;
  ultimoRssi: number | null;
  estado: EstadoEstacion;
  conectividad: Conectividad;
  fechaRegistro: string;
  ultimaConexion: string | null;
  enLinea: boolean;
  ultimaLectura: Lectura | null;
}

export interface Escuela {
  id: string;
  nombre: string;
  clave: string | null;
  municipio: string | null;
  ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  director: string | null;
  contactoEmail: string | null;
  totalEstaciones: number;
  createdAt: string;
}

export interface StationToken {
  estacionId: string;
  uuid: string;
  token: string;
  generadoEn: string;
  aviso: string;
}

export interface Solicitud {
  id: string;
  uuidPropuesto: string;
  nombre: string;
  escuelaId: string | null;
  escuelaNombre: string | null;
  institucion: string | null;
  ubicacion: string | null;
  municipio: string | null;
  firmware: string | null;
  estado: EstadoSolicitud;
  motivoRechazo: string | null;
  estacionId: string | null;
  solicitanteNombre: string | null;
  solicitanteEmail: string | null;
  createdAt: string;
  resueltaEn: string | null;
}

export interface Conexion {
  timestamp: string;
  ip: string | null;
  firmware: string | null;
  evento: string;
  detalle: string | null;
}

export interface Agregado {
  min: number;
  max: number;
  promedio: number;
}

export interface Estadisticas {
  estacionId: string;
  desde: string;
  hasta: string;
  muestras: number;
  temperatura: Agregado | null;
  humedad: Agregado | null;
  presion: Agregado | null;
  vientoKmh: Agregado | null;
  lluviaTotalMm: number;
}

export interface IaResponse {
  estacionId: string;
  respuesta: string;
  rangoDesde: string;
  rangoHasta: string;
  muestrasUsadas: number;
  advertencias: string[];
  generadoEn: string;
}

export interface Alerta {
  id: string;
  estacionId: string;
  tipo: TipoAlerta;
  severidad: Severidad;
  estado: EstadoAlerta;
  mensaje: string;
  valorDisparo: number;
  variableDisparo: string;
  detectadaEn: string;
  resueltaEn: string | null;
}

/** Vista pública (sin cuenta). */
export interface PublicEstacion {
  uuid: string;
  nombre: string;
  municipio: string | null;
  latitud: number | null;
  longitud: number | null;
  escuelaNombre: string | null;
  conectividad: Conectividad;
  ultimaLectura: Lectura | null;
}

export interface PublicEstadistica {
  ambito: string;
  desde: string;
  hasta: string;
  estaciones: number;
  muestras: number;
  temperatura: Agregado | null;
  humedad: Agregado | null;
  presion: Agregado | null;
  vientoKmh: Agregado | null;
  lluviaTotalMm: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}

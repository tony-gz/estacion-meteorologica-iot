// Paleta y tokens de estilo. Soporta claro/oscuro (se resuelve con useColorScheme).
export interface Tema {
  fondo: string;
  superficie: string;
  borde: string;
  texto: string;
  textoTenue: string;
  primario: string;
  online: string;
  offline: string;
  error: string;
}

export const temaClaro: Tema = {
  fondo: '#f2f5f9',
  superficie: '#ffffff',
  borde: '#e2e8f0',
  texto: '#0f172a',
  textoTenue: '#64748b',
  primario: '#2563eb',
  online: '#16a34a',
  offline: '#94a3b8',
  error: '#dc2626',
};

export const temaOscuro: Tema = {
  fondo: '#0b1220',
  superficie: '#111a2e',
  borde: '#1e293b',
  texto: '#e2e8f0',
  textoTenue: '#94a3b8',
  primario: '#3b82f6',
  online: '#22c55e',
  offline: '#64748b',
  error: '#f87171',
};

export function usarTema(esquema: 'light' | 'dark' | null | undefined): Tema {
  return esquema === 'dark' ? temaOscuro : temaClaro;
}

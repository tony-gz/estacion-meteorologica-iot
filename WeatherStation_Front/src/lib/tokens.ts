// Almacenamiento de tokens JWT en localStorage.
import type { Usuario } from './types';

const ACCESS = 'ws.accessToken';
const REFRESH = 'ws.refreshToken';
const USER = 'ws.usuario';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  getUsuario: (): Usuario | null => {
    const raw = localStorage.getItem(USER);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  },
  set: (accessToken: string, refreshToken: string, usuario: Usuario) => {
    localStorage.setItem(ACCESS, accessToken);
    localStorage.setItem(REFRESH, refreshToken);
    localStorage.setItem(USER, JSON.stringify(usuario));
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS, accessToken);
    localStorage.setItem(REFRESH, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  },
};

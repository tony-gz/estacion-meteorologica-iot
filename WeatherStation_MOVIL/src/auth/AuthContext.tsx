import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { tokenStore } from '../lib/tokens';
import { setOnUnauthorized } from '../lib/authEvents';
import type { AuthResponse, Rol, Usuario } from '../lib/types';

interface AuthState {
  usuario: Usuario | null;
  autenticado: boolean;
  cargando: boolean;
  esAdmin: boolean;
  esResponsable: boolean;
  tieneRol: (...roles: Rol[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  registrar: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Hidrata la sesión desde SecureStore al arrancar.
  useEffect(() => {
    let activo = true;
    (async () => {
      const u = await tokenStore.getUsuario();
      if (activo) {
        setUsuario(u);
        setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  // El interceptor de api.ts avisa aquí cuando un 401 no es recuperable.
  useEffect(() => {
    setOnUnauthorized(() => setUsuario(null));
    return () => setOnUnauthorized(null);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    await tokenStore.set(data.accessToken, data.refreshToken, data.usuario);
    setUsuario(data.usuario);
  }

  async function registrar(nombre: string, email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/register', { nombre, email, password });
    await tokenStore.set(data.accessToken, data.refreshToken, data.usuario);
    setUsuario(data.usuario);
  }

  async function logout() {
    await tokenStore.clear();
    setUsuario(null);
  }

  const value = useMemo<AuthState>(() => ({
    usuario,
    autenticado: usuario !== null,
    cargando,
    esAdmin: usuario?.rol === 'ADMIN',
    esResponsable: usuario?.rol === 'RESPONSABLE',
    tieneRol: (...roles: Rol[]) => (usuario ? roles.includes(usuario.rol) : false),
    login,
    registrar,
    logout,
  }), [usuario, cargando]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

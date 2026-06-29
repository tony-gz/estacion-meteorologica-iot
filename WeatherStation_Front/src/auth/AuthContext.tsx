import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { tokenStore } from '../lib/tokens';
import type { AuthResponse, Rol, Usuario } from '../lib/types';

interface AuthState {
  usuario: Usuario | null;
  autenticado: boolean;
  esAdmin: boolean;
  esResponsable: boolean;
  tieneRol: (...roles: Rol[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  registrar: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => tokenStore.getUsuario());

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    tokenStore.set(data.accessToken, data.refreshToken, data.usuario);
    setUsuario(data.usuario);
  }

  async function registrar(nombre: string, email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/register', { nombre, email, password });
    tokenStore.set(data.accessToken, data.refreshToken, data.usuario);
    setUsuario(data.usuario);
  }

  function logout() {
    tokenStore.clear();
    setUsuario(null);
  }

  const value = useMemo<AuthState>(() => ({
    usuario,
    autenticado: usuario !== null,
    esAdmin: usuario?.rol === 'ADMIN',
    esResponsable: usuario?.rol === 'RESPONSABLE',
    tieneRol: (...roles: Rol[]) => (usuario ? roles.includes(usuario.rol) : false),
    login,
    registrar,
    logout,
  }), [usuario]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

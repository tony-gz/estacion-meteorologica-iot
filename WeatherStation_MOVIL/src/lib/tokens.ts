// Almacenamiento seguro de tokens JWT (FR-004): expo-secure-store cifra en el
// Keystore de Android. Reemplaza el localStorage del Front. API asíncrona.
import * as SecureStore from 'expo-secure-store';
import type { Usuario } from './types';

// Claves permitidas por SecureStore: [A-Za-z0-9._-]. Usamos guion bajo.
const ACCESS = 'ws_accessToken';
const REFRESH = 'ws_refreshToken';
const USER = 'ws_usuario';

export const tokenStore = {
  getAccess: (): Promise<string | null> => SecureStore.getItemAsync(ACCESS),
  getRefresh: (): Promise<string | null> => SecureStore.getItemAsync(REFRESH),

  getUsuario: async (): Promise<Usuario | null> => {
    const raw = await SecureStore.getItemAsync(USER);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  },

  set: async (accessToken: string, refreshToken: string, usuario: Usuario): Promise<void> => {
    await SecureStore.setItemAsync(ACCESS, accessToken);
    await SecureStore.setItemAsync(REFRESH, refreshToken);
    await SecureStore.setItemAsync(USER, JSON.stringify(usuario));
  },

  setTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
    await SecureStore.setItemAsync(ACCESS, accessToken);
    await SecureStore.setItemAsync(REFRESH, refreshToken);
  },

  clear: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
    await SecureStore.deleteItemAsync(USER);
  },
};

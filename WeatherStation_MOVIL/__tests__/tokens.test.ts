// Mock en memoria de expo-secure-store.
jest.mock('expo-secure-store', () => {
  const almacen = new Map<string, string>();
  return {
    getItemAsync: jest.fn((k: string) => Promise.resolve(almacen.has(k) ? almacen.get(k)! : null)),
    setItemAsync: jest.fn((k: string, v: string) => { almacen.set(k, v); return Promise.resolve(); }),
    deleteItemAsync: jest.fn((k: string) => { almacen.delete(k); return Promise.resolve(); }),
  };
});

import { tokenStore } from '../src/lib/tokens';
import type { Usuario } from '../src/lib/types';

const usuario: Usuario = {
  id: 'u1', nombre: 'Ana', email: 'ana@x.mx', rol: 'RESPONSABLE',
  escuelaId: 'e1', escuelaNombre: 'Escuela 1', activo: true, createdAt: '2026-01-01T00:00:00Z',
};

describe('tokenStore (SecureStore)', () => {
  it('guarda y recupera access, refresh y usuario', async () => {
    await tokenStore.set('acc', 'ref', usuario);
    expect(await tokenStore.getAccess()).toBe('acc');
    expect(await tokenStore.getRefresh()).toBe('ref');
    expect(await tokenStore.getUsuario()).toMatchObject({ id: 'u1', rol: 'RESPONSABLE' });
  });

  it('setTokens actualiza solo los tokens', async () => {
    await tokenStore.setTokens('acc2', 'ref2');
    expect(await tokenStore.getAccess()).toBe('acc2');
    expect(await tokenStore.getRefresh()).toBe('ref2');
  });

  it('clear elimina todo (logout, FR-005)', async () => {
    await tokenStore.set('acc', 'ref', usuario);
    await tokenStore.clear();
    expect(await tokenStore.getAccess()).toBeNull();
    expect(await tokenStore.getRefresh()).toBeNull();
    expect(await tokenStore.getUsuario()).toBeNull();
  });
});

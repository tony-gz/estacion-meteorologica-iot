// Puente entre la capa de red y la navegación/estado de sesión.
// En web el interceptor hacía `location.href = '/login'`; en RN no existe eso, así
// que el AuthContext registra aquí un handler que se dispara ante un 401 no
// recuperable (FR-021).

type Handler = () => void;

let onUnauthorized: Handler | null = null;

export function setOnUnauthorized(handler: Handler | null): void {
  onUnauthorized = handler;
}

export function emitUnauthorized(): void {
  onUnauthorized?.();
}

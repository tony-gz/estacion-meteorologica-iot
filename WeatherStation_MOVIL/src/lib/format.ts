// Utilidades de formato para la UI. Portado del Front.
// FR-011: se muestran los tiempos tal como llegan del backend (zona explícita en el
// ISO). No recalculamos UTC manualmente; Date interpreta el offset del propio string.

export function fmtNum(n: number | null | undefined, dec = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDiaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

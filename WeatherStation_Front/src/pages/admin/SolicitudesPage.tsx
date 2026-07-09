import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  useAprobarSolicitud, useRechazarSolicitud, useSolicitudes,
} from '../../lib/adminQueries';
import { mensajeError } from '../../lib/api';
import { Modal } from '../../components/Modal';
import { fmtFechaHora } from '../../lib/format';
import { Icono } from '../../components/Icono';
import type { StationToken } from '../../lib/types';

const ESTADO_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export function SolicitudesPage() {
  const { esAdmin } = useAuth();
  const { data, isLoading, error } = useSolicitudes();
  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();
  const [token, setToken] = useState<StationToken | null>(null);

  if (isLoading) return <p className="text-slate-500">Cargando solicitudes…</p>;
  if (error) return <p className="text-rose-700">{mensajeError(error)}</p>;

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">
        Solicitudes de alta de estaciones. Los usuarios pueden solicitar tokens desde el formulario público.
      </p>
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left dark:bg-slate-700/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Institución</th>
              <th className="px-4 py-2 font-medium">Solicitante</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              {esAdmin && <th className="px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Sin solicitudes.</td></tr>
            )}
            {data?.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2">{s.nombre}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.institucion ?? s.escuelaNombre ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                  {s.solicitanteNombre ? (
                    <span title={s.solicitanteEmail ?? ''}>{s.solicitanteNombre}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[s.estado]}`}>{s.estado}</span>
                </td>
                <td className="px-4 py-2 text-slate-400 text-xs">{fmtFechaHora(s.createdAt)}</td>
                {esAdmin && (
                  <td className="px-4 py-3">
                    {s.estado === 'PENDING' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button disabled={aprobar.isPending} onClick={() => aprobar.mutate(s.id, { onSuccess: setToken })}
                                className="px-2.5 py-1 rounded-md text-xs font-medium border transition disabled:opacity-40 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/70 dark:text-emerald-400 dark:hover:bg-emerald-950/40">Aprobar</button>
                        <button disabled={rechazar.isPending} onClick={() => rechazar.mutate({ id: s.id })}
                                className="px-2.5 py-1 rounded-md text-xs font-medium border transition disabled:opacity-40 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-400 dark:hover:bg-rose-950/40">Rechazar</button>
                      </div>
                    ) : <span className="text-slate-400 text-xs">resuelta</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {token && (
        <Modal abierto onCerrar={() => setToken(null)} titulo="Estación creada — Token y UUID">
          <p className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
            <Icono nombre="⚠" size={15} className="shrink-0" /> {token.aviso}
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">UUID de la estación</p>
              <code className="block break-all text-xs bg-slate-100 dark:bg-slate-700 rounded-md p-3 font-mono">{token.uuid}</code>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">Token de acceso</p>
              <code className="block break-all text-xs bg-slate-100 dark:bg-slate-700 rounded-md p-3 font-mono">{token.token}</code>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    onClick={() => navigator.clipboard?.writeText(token.uuid)}>Copiar UUID</button>
            <button className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    onClick={() => navigator.clipboard?.writeText(token.token)}>Copiar Token</button>
            <button className="px-4 py-2 text-sm rounded-md bg-sky-600 text-white" onClick={() => setToken(null)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

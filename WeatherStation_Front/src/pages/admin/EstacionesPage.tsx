import { useMemo, useState, type FormEvent } from 'react';
import {
  Check, KeyRound, PauseCircle, PlayCircle, RadioTower, Trash2, Wrench, X,
} from 'lucide-react';
import { useEstaciones } from '../../lib/queries';
import {
  useAccionEstacion, useConexiones, useEliminarEstacion, useEscuelas,
  useRegistrarEstacion, useTokenEstacion,
} from '../../lib/adminQueries';
import { mensajeError } from '../../lib/api';
import { Modal } from '../../components/Modal';
import { EstadoBadge } from '../../components/EstadoBadge';
import { MenuAcciones, MenuItem, MenuSep } from '../../components/MenuAcciones';
import { fmtFechaHora } from '../../lib/format';
import { Icono } from '../../components/Icono';
import type { Estacion, StationToken } from '../../lib/types';

// Orden de la lista: las PENDING (requieren acción) primero, luego el resto.
const ORDEN_ESTADO: Record<string, number> = {
  PENDING: 0, MAINTENANCE: 1, APPROVED: 2, DISABLED: 3, REJECTED: 4,
};

const ESTADO_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  DISABLED: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  MAINTENANCE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

export function EstacionesPage() {
  const { data, isLoading, error } = useEstaciones();
  const [registrando, setRegistrando] = useState(false);
  const [token, setToken] = useState<StationToken | null>(null);
  const [conexiones, setConexiones] = useState<Estacion | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const estaciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (data ?? [])
      .filter((e) => !q
        || e.nombre.toLowerCase().includes(q)
        || (e.escuelaNombre ?? '').toLowerCase().includes(q)
        || (e.municipio ?? '').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9));
  }, [data, busqueda]);

  if (isLoading) return <p className="text-slate-500">Cargando estaciones…</p>;
  if (error) return <p className="text-rose-700">{mensajeError(error)}</p>;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gobernanza de estaciones: registrar, aprobar y administrar el ciclo de vida.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, escuela o municipio…"
            className="w-64 max-w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          />
          <button onClick={() => setRegistrando(true)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 whitespace-nowrap">
            + Registrar estación
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left dark:bg-slate-700/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Escuela</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Conexión</th>
              <th className="px-4 py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estaciones.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                {busqueda ? 'Sin estaciones que coincidan con la búsqueda.' : 'Sin estaciones.'}
              </td></tr>
            )}
            {estaciones.map((e) => (
              <Fila key={e.id} e={e} onToken={setToken} onConexiones={setConexiones} />
            ))}
          </tbody>
        </table>
      </div>

      {registrando && <RegistrarModal onCerrar={() => setRegistrando(false)} onToken={setToken} />}
      {token && <TokenModal token={token} onCerrar={() => setToken(null)} />}
      {conexiones && <ConexionesModal estacion={conexiones} onCerrar={() => setConexiones(null)} />}
    </div>
  );
}

function Fila({ e, onToken, onConexiones }: {
  e: Estacion;
  onToken: (t: StationToken) => void;
  onConexiones: (e: Estacion) => void;
}) {
  const aprobar = useTokenEstacion('aprobar');
  const regenerar = useTokenEstacion('regenerar-token');
  const rechazar = useAccionEstacion('rechazar');
  const deshabilitar = useAccionEstacion('deshabilitar');
  const mantenimiento = useAccionEstacion('mantenimiento');
  const reactivar = useAccionEstacion('reactivar');
  const eliminar = useEliminarEstacion();
  const ocupado = aprobar.isPending || regenerar.isPending || rechazar.isPending
    || deshabilitar.isPending || mantenimiento.isPending || reactivar.isPending || eliminar.isPending;

  return (
    <tr className="border-t border-slate-100 dark:border-slate-700 align-middle">
      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{e.nombre}</td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{e.escuelaNombre ?? '—'}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[e.estado]}`}>{e.estado}</span>
      </td>
      <td className="px-4 py-3"><EstadoBadge enLinea={e.enLinea} /></td>
      <td className="px-4 py-3 text-right">
        <MenuAcciones disabled={ocupado}>
          {(close) => (
            <>
              {e.estado === 'PENDING' && (
                <>
                  <MenuItem tono="ok" onClick={() => { close(); aprobar.mutate(e.uuid, { onSuccess: onToken }); }}><Check size={16} /> Aprobar</MenuItem>
                  <MenuItem tono="danger" onClick={() => { close(); rechazar.mutate({ uuid: e.uuid }); }}><X size={16} /> Rechazar</MenuItem>
                </>
              )}
              {e.estado === 'APPROVED' && (
                <>
                  <MenuItem onClick={() => { close(); mantenimiento.mutate({ uuid: e.uuid }); }}><Wrench size={16} /> Mantenimiento</MenuItem>
                  <MenuItem onClick={() => { close(); deshabilitar.mutate({ uuid: e.uuid }); }}><PauseCircle size={16} /> Deshabilitar</MenuItem>
                  <MenuItem onClick={() => { close(); regenerar.mutate(e.uuid, { onSuccess: onToken }); }}><KeyRound size={16} /> Regenerar token</MenuItem>
                </>
              )}
              {(e.estado === 'DISABLED' || e.estado === 'MAINTENANCE') && (
                <MenuItem tono="ok" onClick={() => { close(); reactivar.mutate({ uuid: e.uuid }); }}><PlayCircle size={16} /> Reactivar</MenuItem>
              )}
              <MenuItem onClick={() => { close(); onConexiones(e); }}><RadioTower size={16} /> Conexiones</MenuItem>
              <MenuSep />
              <MenuItem tono="danger"
                        onClick={() => { close(); if (confirm(`¿Eliminar ${e.nombre}?`)) eliminar.mutate(e.uuid); }}>
                <Trash2 size={16} /> Eliminar
              </MenuItem>
            </>
          )}
        </MenuAcciones>
      </td>
    </tr>
  );
}

function RegistrarModal({ onCerrar, onToken }: {
  onCerrar: () => void;
  onToken: (t: StationToken) => void;
}) {
  void onToken;
  const escuelas = useEscuelas();
  const registrar = useRegistrarEstacion();
  const [nombre, setNombre] = useState('');
  const [escuelaId, setEscuelaId] = useState('');
  const [municipio, setMunicipio] = useState('');

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    registrar.mutate({ nombre, escuelaId, municipio: municipio || undefined },
      { onSuccess: onCerrar });
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Registrar estación (queda PENDIENTE)">
      <form onSubmit={onSubmit} className="space-y-3">
        <Campo label="Nombre"><input required minLength={2} value={nombre}
          onChange={(e) => setNombre(e.target.value)} className={inputCls} /></Campo>
        <Campo label="Escuela">
          <select required value={escuelaId} onChange={(e) => setEscuelaId(e.target.value)} className={inputCls}>
            <option value="">Selecciona…</option>
            {escuelas.data?.map((es) => <option key={es.id} value={es.id}>{es.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Municipio"><input value={municipio}
          onChange={(e) => setMunicipio(e.target.value)} className={inputCls} /></Campo>
        {registrar.isError && <Err msg={mensajeError(registrar.error)} />}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className={btnSec}>Cancelar</button>
          <button type="submit" disabled={registrar.isPending || !escuelaId} className={btnPri}>
            {registrar.isPending ? 'Registrando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TokenModal({ token, onCerrar }: { token: StationToken; onCerrar: () => void }) {
  const [copiadoToken, setCopiadoToken] = useState(false);
  const [copiadoUuid, setCopiadoUuid] = useState(false);
  return (
    <Modal abierto onCerrar={onCerrar} titulo="Token y UUID de la estación">
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
        <button className={btnSec} onClick={() => {
          navigator.clipboard?.writeText(token.uuid); setCopiadoUuid(true);
        }}>{copiadoUuid ? 'UUID copiado' : 'Copiar UUID'}</button>
        <button className={btnSec} onClick={() => {
          navigator.clipboard?.writeText(token.token); setCopiadoToken(true);
        }}>{copiadoToken ? 'Token copiado' : 'Copiar Token'}</button>
        <button className={btnPri} onClick={onCerrar}>Cerrar</button>
      </div>
    </Modal>
  );
}

function ConexionesModal({ estacion, onCerrar }: { estacion: Estacion; onCerrar: () => void }) {
  const { data, isLoading } = useConexiones(estacion.uuid, true);
  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Conexiones: ${estacion.nombre}`}>
      {isLoading && <p className="text-slate-500 text-sm">Cargando…</p>}
      {data && data.length === 0 && <p className="text-slate-400 text-sm">Sin conexiones registradas.</p>}
      <ul className="space-y-1 max-h-80 overflow-y-auto text-sm">
        {data?.map((c, i) => (
          <li key={i} className="flex justify-between gap-3 border-b border-slate-100 dark:border-slate-700 py-1">
            <span className="font-mono text-xs">{c.evento}</span>
            <span className="text-slate-500 dark:text-slate-400">{c.detalle ?? ''}</span>
            <span className="text-slate-400 text-xs">{fmtFechaHora(c.timestamp)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100';
const btnSec = 'px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300';
const btnPri = 'px-4 py-2 text-sm rounded-md bg-sky-600 text-white disabled:opacity-60';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Err({ msg }: { msg: string }) {
  return <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{msg}</div>;
}

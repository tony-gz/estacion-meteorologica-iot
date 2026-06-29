import { Link } from 'react-router-dom';
import type { Estacion } from '../lib/types';
import { fmtNum, fmtFechaHora } from '../lib/format';
import { EstadoBadge } from './EstadoBadge';

export function EstacionCard({ estacion }: { estacion: Estacion }) {
  const l = estacion.ultimaLectura;
  return (
    <Link
      to={`/estaciones/${estacion.uuid}`}
      className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-sky-300 transition dark:bg-slate-800 dark:border-slate-700 dark:hover:border-sky-500"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{estacion.nombre}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {estacion.municipio ?? estacion.ubicacion ?? estacion.escuelaNombre ?? ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <EstadoBadge enLinea={estacion.enLinea} />
          {estacion.estado !== 'APPROVED' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {estacion.estado}
            </span>
          )}
        </div>
      </div>

      {l ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Dato icono="🌡️" valor={`${fmtNum(l.temperatura)}°`} />
          <Dato icono="💧" valor={`${fmtNum(l.humedad, 0)}%`} />
          <Dato icono="💨" valor={`${fmtNum(l.vientoKmh)}`} sub="km/h" />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Sin datos recientes</p>
      )}

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Última conexión: {estacion.ultimaConexion ? fmtFechaHora(estacion.ultimaConexion) : '—'}
      </p>
    </Link>
  );
}

function Dato({ icono, valor, sub }: { icono: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-700/50">
      <div className="text-lg" aria-hidden>{icono}</div>
      <div className="font-semibold text-slate-700 text-sm dark:text-slate-100">{valor}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

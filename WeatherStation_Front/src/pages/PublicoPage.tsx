import { NavLink } from 'react-router-dom';
import { usePublicEstaciones, usePublicEstadisticas } from '../lib/queries';
import { FondoClimaCiclo } from '../components/FondoClimaCiclo';
import { EstadoBadge } from '../components/EstadoBadge';
import { fmtNum, fmtFechaHora } from '../lib/format';
import { mensajeError } from '../lib/api';
import { Icono } from '../components/Icono';
import type { PublicEstacion } from '../lib/types';

/** Vista pública SIN cuenta: estaciones + clima actual. La IA exige iniciar sesión. */
export function PublicoPage() {
  const { data, isLoading, error } = usePublicEstaciones();
  const stats = usePublicEstadisticas();
  const estaciones = data ?? [];
  const enLinea = estaciones.filter((e) => e.conectividad === 'ONLINE').length;

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden h-48 sm:h-56 mb-6 shadow-md">
        <FondoClimaCiclo />
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-5 text-white">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-lg">CLIMBOT</h1>
          <p className="mt-1 text-white/90 text-sm sm:text-base drop-shadow">
            Red de estaciones meteorológicas — vista pública
          </p>
          <p className="mt-3 text-white/80 text-xs sm:text-sm drop-shadow inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
            {isLoading ? 'Cargando…' : `${estaciones.length} estaciones · ${enLinea} en línea`}
          </p>
        </div>
      </div>

      <div className="relative mb-5 overflow-hidden rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 px-5 py-4 dark:from-sky-950/40 dark:to-indigo-950/40 dark:border-sky-800">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-400 to-indigo-500" />
        <div className="flex items-start gap-3">
          <Icono nombre="🌤️" size={22} className="mt-0.5 shrink-0 text-sky-500 dark:text-sky-400" />
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Datos en vivo de la red, sin necesidad de cuenta.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              El <strong>asistente de IA</strong> y los <strong>históricos</strong> están disponibles al{' '}
              <NavLink to="/login" className="text-sky-600 hover:underline font-medium dark:text-sky-400">
                iniciar sesión
              </NavLink>.
            </p>
          </div>
        </div>
      </div>

      {stats.data && stats.data.muestras > 0 && stats.data.temperatura && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Resumen icono="🌡️" label="Temp. media" valor={`${fmtNum(stats.data.temperatura.promedio)}°`} />
          <Resumen icono="💧" label="Humedad media" valor={`${fmtNum(stats.data.humedad?.promedio ?? 0, 0)}%`} />
          <Resumen icono="🌧️" label="Lluvia 24h" valor={`${fmtNum(stats.data.lluviaTotalMm)} mm`} />
          <Resumen icono="📡" label="Estaciones" valor={`${stats.data.estaciones}`} />
        </div>
      )}

      {error && <p className="text-rose-700">{mensajeError(error)}</p>}
      {data && data.length === 0 && (
        <p className="text-slate-400 text-center py-8">No hay estaciones públicas todavía.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {estaciones.map((e) => <CardPublica key={e.uuid} e={e} />)}
      </div>
    </div>
  );
}

function CardPublica({ e }: { e: PublicEstacion }) {
  const l = e.ultimaLectura;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{e.nombre}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{e.municipio ?? e.escuelaNombre ?? ''}</p>
        </div>
        <EstadoBadge enLinea={e.conectividad === 'ONLINE'} />
      </div>
      {l ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Dato icono="🌡️" valor={`${fmtNum(l.temperatura)}°`} />
          <Dato icono="💧" valor={`${fmtNum(l.humedad, 0)}%`} />
          <Dato icono="💨" valor={`${fmtNum(l.vientoKmh)}`} sub="km/h" />
        </div>
      ) : <p className="mt-4 text-sm text-slate-400">Sin datos recientes</p>}
      {l && (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Actualizado: {fmtFechaHora(l.timestamp)}
        </p>
      )}
    </div>
  );
}

function Resumen({ icono, label, valor }: { icono: string; label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 text-center flex flex-col items-center dark:bg-slate-800 dark:border-slate-700">
      <Icono nombre={icono} size={22} className="text-sky-600 dark:text-sky-400 mb-1" />
      <div className="font-bold text-slate-800 dark:text-slate-100">{valor}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function Dato({ icono, valor, sub }: { icono: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 flex flex-col items-center dark:bg-slate-700/50">
      <Icono nombre={icono} size={18} className="text-sky-600 dark:text-sky-400" />
      <div className="font-semibold text-slate-700 text-sm dark:text-slate-100">{valor}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

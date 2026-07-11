import { Link } from 'react-router-dom';
import { useEstaciones } from '../lib/queries';
import { EstacionCard } from '../components/EstacionCard';
import { FondoClimaCiclo } from '../components/FondoClimaCiclo';
import { mensajeError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { autenticado, esAdmin, esResponsable } = useAuth();
  const { data, isLoading, error } = useEstaciones();
  const estaciones = data ?? [];
  const enLinea = estaciones.filter((e) => e.enLinea).length;

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden h-48 sm:h-56 mb-6 shadow-md">
        <FondoClimaCiclo />
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-5 text-white">
          <h1 translate="no" className="text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-lg">
            CLIMBOT
          </h1>
          <p className="mt-1 text-white/90 text-sm sm:text-base drop-shadow">
            Red de estaciones meteorológicas inteligentes
          </p>
          <p className="mt-3 text-white/80 text-xs sm:text-sm drop-shadow inline-flex items-center gap-2
                        bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
            {isLoading
              ? 'Cargando…'
              : `${estaciones.length} estaciones · ${enLinea} en línea`}
          </p>
        </div>
      </div>

      {autenticado && !esAdmin && !esResponsable && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/40">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">¿Tienes una estación meteorológica?</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Conéctala a <span translate="no">CLIMBOT</span> y comparte tus datos con la comunidad.</p>
            </div>
            <Link to="/solicitar-estacion"
                  className="shrink-0 px-5 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 transition">
              Solicitar mi estación
            </Link>
          </div>
        </div>
      )}

      {isLoading && <Estado texto="Cargando estaciones…" />}
      {error && <Estado texto={mensajeError(error)} tono="error" />}
      {data && data.length === 0 && <Estado texto="No hay estaciones registradas." />}

      {estaciones.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {estaciones.map((e) => (
            <EstacionCard key={e.id} estacion={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function Estado({ texto, tono }: { texto: string; tono?: 'error' }) {
  return (
    <div className={`rounded-lg border p-6 text-center ${
      tono === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }`}>
      {texto}
    </div>
  );
}

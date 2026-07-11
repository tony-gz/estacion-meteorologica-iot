import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useEstacion, useHistorial } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { descargarHistorialCsv } from '../lib/csv';
import { fmtFechaHora, fmtNum } from '../lib/format';
import { SensorCard } from '../components/SensorCard';
import { EstadoBadge } from '../components/EstadoBadge';
import { Grafica } from '../components/Grafica';
import { AsistenteIA } from '../components/AsistenteIA';
import { FondoClima, calcularEstado } from '../components/FondoClima';
import { Icono } from '../components/Icono';

const CLIMA: Record<string, { sym: string; texto: string }> = {
  day: { sym: '☀️', texto: 'Despejado' },
  night: { sym: '🌙', texto: 'Noche despejada' },
  rain: { sym: '🌧️', texto: 'Lluvia' },
  storm: { sym: '⛈️', texto: 'Tormenta' },
};

const RANGOS = [
  { label: '24 h', horas: 24 },
  { label: '48 h', horas: 48 },
  { label: '7 días', horas: 168 },
];

export function EstacionDetallePage() {
  const { id = '' } = useParams();
  const { tieneRol, esResponsable, usuario } = useAuth();

  const { data: estacion, isLoading, error } = useEstacion(id);
  const [horas, setHoras] = useState(24);

  // INVESTIGADOR y ADMIN ven el histórico de cualquier estación. El RESPONSABLE
  // solo el de las estaciones de las que es responsable (su propia estación).
  const esMiEstacion = !!usuario && !!estacion && estacion.responsableId === usuario.id;
  const puedeVerHistorico = tieneRol('INVESTIGADOR', 'ADMIN') || (esResponsable && esMiEstacion);

  const historial = useHistorial(id, horas, puedeVerHistorico);

  if (isLoading) return <p className="text-slate-500">Cargando…</p>;
  if (error) return <p className="text-rose-700">{mensajeError(error)}</p>;
  if (!estacion) return null;

  const l = estacion.ultimaLectura;

  return (
    <div>
      <Link to="/" className="text-sm text-sky-600 hover:underline">← Estaciones</Link>

      <div className="relative mt-3 rounded-xl overflow-hidden h-52 sm:h-60 shadow-sm">
        <FondoClima lluviaMm={l?.lluviaMm ?? 0} vientoKmh={l?.vientoKmh ?? 0} />
        <div className="relative z-10 h-full flex flex-col justify-between p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold drop-shadow-md">{estacion.nombre}</h1>
              <p className="text-white/80 text-sm drop-shadow">{estacion.ubicacion}</p>
            </div>
            <EstadoBadge enLinea={estacion.enLinea} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              {l && <div className="text-5xl font-bold drop-shadow-md leading-none">{fmtNum(l.temperatura)}°</div>}
              <div className="text-white/90 text-sm mt-1 drop-shadow flex items-center gap-1.5">
                {(() => {
                  const c = CLIMA[calcularEstado(l?.lluviaMm ?? 0, l?.vientoKmh ?? 0)];
                  return <><Icono nombre={c.sym} size={16} className="text-white" /> {c.texto}</>;
                })()}
              </div>
            </div>
            {l && (
              <div className="text-right text-white/90 text-xs sm:text-sm drop-shadow space-y-0.5">
                <div className="flex items-center justify-end gap-1.5"><Icono nombre="💧" size={14} className="text-white" /> {fmtNum(l.humedad, 0)} %</div>
                <div className="flex items-center justify-end gap-1.5"><Icono nombre="💨" size={14} className="text-white" /> {fmtNum(l.vientoKmh)} km/h {l.vientoDir}</div>
                <div className="flex items-center justify-end gap-1.5"><Icono nombre="🌧️" size={14} className="text-white" /> {fmtNum(l.lluviaMm)} mm</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
        firmware {estacion.firmware ?? '—'} · última conexión{' '}
        {estacion.ultimaConexion ? fmtFechaHora(estacion.ultimaConexion) : '—'}
      </p>

      <h2 className="text-lg font-semibold text-slate-700 mt-6 mb-3 dark:text-slate-200">Clima actual</h2>
      {l ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <SensorCard icono="🌡️" etiqueta="Temperatura" valor={fmtNum(l.temperatura)} unidad="°C" />
          <SensorCard icono="💧" etiqueta="Humedad" valor={fmtNum(l.humedad, 0)} unidad="%" />
          <SensorCard icono="📊" etiqueta="Presión" valor={fmtNum(l.presion)} unidad="hPa" />
          <SensorCard icono="💨" etiqueta="Viento" valor={fmtNum(l.vientoKmh)} unidad="km/h" />
          <SensorCard icono="🧭" etiqueta="Dirección" valor={l.vientoDir || '—'} />
          <SensorCard icono="🌧️" etiqueta="Lluvia" valor={fmtNum(l.lluviaMm)} unidad="mm" />
        </div>
      ) : (
        <p className="text-slate-400">Sin datos actuales disponibles.</p>
      )}

      <div className="mt-8">
        <AsistenteIA estacionId={estacion.uuid} />
      </div>

      <h2 className="text-lg font-semibold text-slate-700 mt-8 mb-3 dark:text-slate-200">Histórico</h2>
      {!puedeVerHistorico ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          El histórico y las gráficas están disponibles para investigadores y administradores,
          y para el responsable de esta estación. Contacta a un administrador si necesitas ese acceso.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {RANGOS.map((r) => (
              <button
                key={r.horas}
                onClick={() => setHoras(r.horas)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  horas === r.horas ? 'bg-sky-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => descargarHistorialCsv(
                estacion.nombre,
                horas === 168 ? '7dias' : `${horas}h`,
                historial.data ?? [],
              )}
              disabled={!historial.data || historial.data.length === 0}
              className="ml-auto px-3 py-1.5 rounded-md text-sm font-medium border border-emerald-300 text-emerald-700
                         hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed
                         dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              title="Descargar los registros del rango actual en CSV"
            >
              ↓ Descargar CSV
            </button>
          </div>

          {historial.isLoading && <p className="text-slate-500">Cargando histórico…</p>}
          {historial.error && <p className="text-rose-700">{mensajeError(historial.error)}</p>}
          {historial.data && historial.data.length === 0 && (
            <p className="text-slate-400">No hay lecturas en este rango.</p>
          )}
          {historial.data && historial.data.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Grafica datos={historial.data} campo="temperatura" titulo="Temperatura" color="#fb923c" unidad="°C" />
              <Grafica datos={historial.data} campo="humedad" titulo="Humedad" color="#38bdf8" unidad="%" />
              <Grafica datos={historial.data} campo="presion" titulo="Presión" color="#818cf8" unidad="hPa" />
              <Grafica datos={historial.data} campo="vientoKmh" titulo="Viento" color="#a78bfa" unidad="km/h" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

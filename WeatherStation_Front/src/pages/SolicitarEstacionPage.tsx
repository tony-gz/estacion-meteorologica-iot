import { useState } from 'react';
import { useMisSolicitudes, useSolicitarEstacion, type SolicitarEstacionInput } from '../lib/adminQueries';
import { mensajeError } from '../lib/api';
import { fmtFechaHora } from '../lib/format';

const ESTADO_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export function SolicitarEstacionPage() {
  const { data: misSolicitudes, isLoading, error } = useMisSolicitudes();
  const solicitar = useSolicitarEstacion();

  const [nombre, setNombre] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [firmware, setFirmware] = useState('');
  const [exito, setExito] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: SolicitarEstacionInput = { nombre };
    if (institucion) input.institucion = institucion;
    if (ubicacion) input.ubicacion = ubicacion;
    if (municipio) input.municipio = municipio;
    if (latitud) input.latitud = parseFloat(latitud);
    if (longitud) input.longitud = parseFloat(longitud);
    if (firmware) input.firmware = firmware;

    solicitar.mutate(input, {
      onSuccess: () => {
        setNombre('');
        setInstitucion('');
        setUbicacion('');
        setMunicipio('');
        setLatitud('');
        setLongitud('');
        setFirmware('');
        setExito('Solicitud enviada. Espera la aprobación del administrador.');
        setTimeout(() => setExito(null), 6000);
      },
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Mis solicitudes ── */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
          Mis solicitudes
        </h2>
        {isLoading && <p className="text-slate-500 text-sm">Cargando…</p>}
        {error && <p className="text-rose-700 text-sm">{mensajeError(error)}</p>}
        {!isLoading && !error && (!misSolicitudes || misSolicitudes.length === 0) && (
          <p className="text-slate-400 text-sm">No has realizado ninguna solicitud aún.</p>
        )}
        {misSolicitudes && misSolicitudes.length > 0 && (
          <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left dark:bg-slate-700/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Estación</th>
                  <th className="px-4 py-2 font-medium">Institución</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {misSolicitudes.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2">{s.nombre}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {s.institucion ?? s.escuelaNombre ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{fmtFechaHora(s.createdAt)}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {s.estado === 'APPROVED' && 'Token enviado a tu correo'}
                      {s.estado === 'REJECTED' && (s.motivoRechazo ?? 'Rechazada')}
                      {s.estado === 'PENDING' && 'Esperando revisión…'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Nueva solicitud ── */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
          Solicitar token para una estación
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Completa el formulario para solicitar un token de acceso. Un administrador
          revisará tu solicitud y te enviará el token por correo electrónico.
        </p>

        {exito && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {exito}
          </div>
        )}

        {solicitar.error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {mensajeError(solicitar.error)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre de la estación <span className="text-rose-500">*</span>
            </label>
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
                   className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Institución / Escuela
            </label>
            <input value={institucion} onChange={(e) => setInstitucion(e.target.value)}
                   placeholder="Ej: Secundaria Técnica 28"
                   className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400" />
            <p className="text-xs text-slate-400 mt-1">Opcional. Si no perteneces a una escuela, déjalo vacío.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
              <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}
                     placeholder="Ej: Av. Principal 123"
                     className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Municipio</label>
              <input value={municipio} onChange={(e) => setMunicipio(e.target.value)}
                     placeholder="Ej: Chilpancingo"
                     className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitud</label>
              <input type="number" step="any" value={latitud} onChange={(e) => setLatitud(e.target.value)}
                     placeholder="Ej: 17.5500"
                     className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longitud</label>
              <input type="number" step="any" value={longitud} onChange={(e) => setLongitud(e.target.value)}
                     placeholder="Ej: -99.5000"
                     className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Versión del firmware
            </label>
            <input value={firmware} onChange={(e) => setFirmware(e.target.value)}
                   placeholder="Ej: v3.0"
                   className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400" />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={solicitar.isPending}
                    className="px-6 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 transition">
              {solicitar.isPending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

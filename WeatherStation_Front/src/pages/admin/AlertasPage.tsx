import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAlertas, useEliminarAlerta, type FiltrosAlerta } from '../../lib/adminQueries';
import { useEstaciones } from '../../lib/queries';
import { useAuth } from '../../auth/AuthContext';
import { mensajeError } from '../../lib/api';
import { fmtFechaHora } from '../../lib/format';
import type { Alerta, EstadoAlerta, Severidad, TipoAlerta } from '../../lib/types';

const TIPOS: TipoAlerta[] = ['LLUVIA', 'VIENTO_FUERTE', 'CALOR_EXTREMO'];
const ESTADOS: EstadoAlerta[] = ['ACTIVA', 'RESUELTA'];

export function AlertasPage() {
  const { esAdmin } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosAlerta>({});
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useAlertas(filtros);
  const estaciones = useEstaciones();
  const eliminar = useEliminarAlerta();

  const filtradas = useMemo<Alerta[]>(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((a) =>
      a.tipo.toLowerCase().includes(q)
      || a.estacionId.toLowerCase().includes(q)
      || (a.mensaje ?? '').toLowerCase().includes(q));
  }, [data, busqueda]);

  const idsVisibles = filtradas.map((a) => a.id);
  const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every((id) => seleccion.has(id));

  function alternar(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function alternarTodas() {
    setSeleccion(todasSeleccionadas ? new Set() : new Set(idsVisibles));
  }

  async function eliminarSeleccionadas() {
    const ids = [...seleccion];
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} alerta(s)? Esta acción no se puede deshacer.`)) return;
    await Promise.allSettled(ids.map((id) => eliminar.mutateAsync(id)));
    setSeleccion(new Set());
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Select label="Estación" value={filtros.estacionId ?? ''}
                onChange={(v) => setFiltros((f) => ({ ...f, estacionId: v || undefined }))}>
          <option value="">Todas</option>
          {estaciones.data?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </Select>
        <Select label="Tipo" value={filtros.tipo ?? ''}
                onChange={(v) => setFiltros((f) => ({ ...f, tipo: (v || undefined) as TipoAlerta }))}>
          <option value="">Todos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Estado" value={filtros.estado ?? ''}
                onChange={(v) => setFiltros((f) => ({ ...f, estado: (v || undefined) as EstadoAlerta }))}>
          <option value="">Todos</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <label className="text-sm flex-1 min-w-48">
          <span className="block text-slate-500 mb-1 dark:text-slate-400">Buscar</span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Tipo, estación o mensaje…"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          />
        </label>
        {esAdmin && seleccion.size > 0 && (
          <button
            onClick={eliminarSeleccionadas}
            disabled={eliminar.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 whitespace-nowrap"
          >
            <Trash2 size={15} /> Eliminar ({seleccion.size})
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-500">Cargando alertas…</p>}
      {error && <p className="text-rose-700">{mensajeError(error)}</p>}
      {data && filtradas.length === 0 && (
        <p className="text-slate-400">No hay alertas con esos filtros.</p>
      )}

      {filtradas.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left dark:bg-slate-700/50 dark:text-slate-400">
              <tr>
                {esAdmin && (
                  <th className="px-4 py-2 w-10">
                    <input type="checkbox" checked={todasSeleccionadas} onChange={alternarTodas}
                           aria-label="Seleccionar todas" className="align-middle accent-sky-600" />
                  </th>
                )}
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Estación</th>
                <th className="px-4 py-2 font-medium">Severidad</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Mensaje</th>
                <th className="px-4 py-2 font-medium">Detectada</th>
                <th className="px-4 py-2 font-medium">Resuelta</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-700">
                  {esAdmin && (
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={seleccion.has(a.id)} onChange={() => alternar(a.id)}
                             aria-label="Seleccionar alerta" className="align-middle accent-sky-600" />
                    </td>
                  )}
                  <td className="px-4 py-2 font-medium">{a.tipo}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.estacionId}</td>
                  <td className="px-4 py-2"><SevBadge s={a.severidad} /></td>
                  <td className="px-4 py-2">
                    {a.estado === 'ACTIVA'
                      ? <span className="text-rose-600 font-medium">ACTIVA</span>
                      : <span className="text-slate-400">RESUELTA</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{a.mensaje}</td>
                  <td className="px-4 py-2 text-slate-400">{fmtFechaHora(a.detectadaEn)}</td>
                  <td className="px-4 py-2 text-slate-400">{a.resueltaEn ? fmtFechaHora(a.resueltaEn) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SevBadge({ s }: { s: Severidad }) {
  const c = s === 'ALTA' ? 'bg-rose-100 text-rose-700'
    : s === 'MEDIA' ? 'bg-amber-100 text-amber-700'
    : 'bg-slate-100 text-slate-600';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c}`}>{s}</span>;
}

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="block text-slate-500 mb-1 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
        {children}
      </select>
    </label>
  );
}

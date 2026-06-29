import { useState, type FormEvent } from 'react';
import {
  useActualizarEscuela, useCrearEscuela, useEliminarEscuela, useEscuelas,
  type EscuelaInput,
} from '../../lib/adminQueries';
import { mensajeError } from '../../lib/api';
import { Modal } from '../../components/Modal';
import type { Escuela } from '../../lib/types';

export function EscuelasPage() {
  const { data, isLoading, error } = useEscuelas();
  const eliminar = useEliminarEscuela();
  const [editar, setEditar] = useState<Escuela | null | 'nueva'>(null);

  if (isLoading) return <p className="text-slate-500">Cargando escuelas…</p>;
  if (error) return <p className="text-rose-700">{mensajeError(error)}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Escuelas de la red.</p>
        <button onClick={() => setEditar('nueva')}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-sky-600 text-white hover:bg-sky-700">
          + Nueva escuela
        </button>
      </div>
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left dark:bg-slate-700/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Clave</th>
              <th className="px-4 py-2 font-medium">Municipio</th>
              <th className="px-4 py-2 font-medium">Estaciones</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2">{e.nombre}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{e.clave ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{e.municipio ?? '—'}</td>
                <td className="px-4 py-2">{e.totalEstaciones}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <button onClick={() => setEditar(e)} className="text-sky-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => { if (confirm(`¿Eliminar ${e.nombre}?`)) eliminar.mutate(e.id); }}
                          className="text-rose-500 hover:underline disabled:opacity-50" disabled={eliminar.isPending}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {eliminar.isError && (
        <p className="mt-2 text-sm text-rose-700">{mensajeError(eliminar.error)}</p>
      )}
      {editar && (
        <EscuelaModal escuela={editar === 'nueva' ? null : editar} onCerrar={() => setEditar(null)} />
      )}
    </div>
  );
}

function EscuelaModal({ escuela, onCerrar }: { escuela: Escuela | null; onCerrar: () => void }) {
  const crear = useCrearEscuela();
  const actualizar = useActualizarEscuela();
  const [f, setF] = useState<EscuelaInput>({
    nombre: escuela?.nombre ?? '',
    clave: escuela?.clave ?? '',
    municipio: escuela?.municipio ?? '',
    director: escuela?.director ?? '',
    contactoEmail: escuela?.contactoEmail ?? '',
  });
  const m = escuela ? actualizar : crear;

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const input: EscuelaInput = {
      nombre: f.nombre,
      clave: f.clave || undefined,
      municipio: f.municipio || undefined,
      director: f.director || undefined,
      contactoEmail: f.contactoEmail || undefined,
    };
    if (escuela) actualizar.mutate({ id: escuela.id, input }, { onSuccess: onCerrar });
    else crear.mutate(input, { onSuccess: onCerrar });
  }

  const cls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100';
  return (
    <Modal abierto onCerrar={onCerrar} titulo={escuela ? `Editar: ${escuela.nombre}` : 'Nueva escuela'}>
      <form onSubmit={onSubmit} className="space-y-3">
        {([
          ['nombre', 'Nombre', true],
          ['clave', 'Clave (CCT)', false],
          ['municipio', 'Municipio', false],
          ['director', 'Director', false],
          ['contactoEmail', 'Email de contacto', false],
        ] as const).map(([k, label, req]) => (
          <label key={k} className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{label}</span>
            <input className={cls} required={req}
                   value={(f[k] as string) ?? ''}
                   onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </label>
        ))}
        {m.isError && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{mensajeError(m.error)}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300">Cancelar</button>
          <button type="submit" disabled={m.isPending} className="px-4 py-2 text-sm rounded-md bg-sky-600 text-white disabled:opacity-60">
            {m.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

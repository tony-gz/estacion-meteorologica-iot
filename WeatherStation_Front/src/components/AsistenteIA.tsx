import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, mensajeError } from '../lib/api';
import type { IaResponse } from '../lib/types';
import { fmtFechaHora } from '../lib/format';
import { Icono } from './Icono';

type Accion = 'preguntar' | 'resumen' | 'prediccion';

const EJEMPLOS = [
  '¿Va a llover hoy?',
  '¿Cómo está el clima ahora?',
  '¿Hay riesgo de tormenta?',
];

async function ejecutar(estacionId: string, accion: Accion, pregunta?: string): Promise<IaResponse> {
  if (accion === 'resumen') {
    return (await api.post<IaResponse>('/ia/resumen', { estacionId, horas: 24 })).data;
  }
  if (accion === 'prediccion') {
    return (await api.post<IaResponse>('/ia/prediccion', { estacionId })).data;
  }
  return (await api.post<IaResponse>('/ia/preguntar', { estacionId, pregunta })).data;
}

export function AsistenteIA({ estacionId }: { estacionId: string }) {
  const [pregunta, setPregunta] = useState('');

  const m = useMutation<IaResponse, unknown, { accion: Accion; pregunta?: string }>({
    mutationFn: (v) => ejecutar(estacionId, v.accion, v.pregunta),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pregunta.trim()) m.mutate({ accion: 'preguntar', pregunta: pregunta.trim() });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 dark:bg-slate-800 dark:border-slate-700">
      <h2 className="text-lg font-semibold text-slate-700 mb-1 dark:text-slate-200">🤖 Asistente meteorológico</h2>
      <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">
        Pregunta sobre esta estación. Las respuestas se basan solo en sus datos reales.
      </p>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Escribe tu pregunta…"
          maxLength={500}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                     dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={m.isPending || !pregunta.trim()}
          className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4"
        >
          Preguntar
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mt-3">
        {EJEMPLOS.map((q) => (
          <button
            key={q}
            onClick={() => { setPregunta(q); m.mutate({ accion: 'preguntar', pregunta: q }); }}
            disabled={m.isPending}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
          >
            {q}
          </button>
        ))}
        <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
        <button
          onClick={() => m.mutate({ accion: 'resumen' })}
          disabled={m.isPending}
          className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-60"
        >
          Resumen 24 h
        </button>
        <button
          onClick={() => m.mutate({ accion: 'prediccion' })}
          disabled={m.isPending}
          className="text-xs px-2.5 py-1 rounded-full bg-violet-50 hover:bg-violet-100 text-violet-700 disabled:opacity-60"
        >
          Predicción
        </button>
      </div>

      {m.isPending && <p className="mt-4 text-sm text-slate-500 animate-pulse">Consultando a la IA…</p>}

      {m.isError && (
        <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {mensajeError(m.error)}
        </div>
      )}

      {m.isSuccess && (
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 dark:bg-slate-700/40 dark:border-slate-600">
          <p className="text-slate-800 whitespace-pre-line dark:text-slate-100">{m.data.respuesta}</p>
          {m.data.advertencias.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.data.advertencias.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  <Icono nombre="⚠" size={12} /> {a}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">
            {m.data.muestrasUsadas} muestras · generado {fmtFechaHora(m.data.generadoEn)}
          </p>
        </div>
      )}
    </div>
  );
}

import { Icono } from './Icono';

interface Props {
  icono: string;
  etiqueta: string;
  valor: string;
  unidad?: string;
}

export function SensorCard({ icono, etiqueta, valor, unidad }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 dark:bg-slate-800 dark:border-slate-700">
      <Icono nombre={icono} size={24} className="text-sky-600 dark:text-sky-400 shrink-0" />
      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{etiqueta}</div>
        <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {valor}
          {unidad && <span className="text-sm font-normal text-slate-400 ml-1">{unidad}</span>}
        </div>
      </div>
    </div>
  );
}

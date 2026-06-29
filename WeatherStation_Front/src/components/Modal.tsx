import type { ReactNode } from 'react';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
}

export function Modal({ abierto, onCerrar, titulo, children }: Props) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xl leading-none dark:hover:text-slate-200">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Menú de acciones por fila: un solo botón "Acciones ▾" que despliega una lista
 * vertical. Se renderiza en un portal (document.body) con posición fija para que
 * NO lo recorte el contenedor con overflow de la tabla.
 */
export function MenuAcciones({ children, disabled, label = 'Acciones' }: {
  children: (close: () => void) => ReactNode;
  disabled?: boolean;
  label?: string;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cerrar = () => setPos(null);

  function alternar() {
    if (pos) { cerrar(); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const ancho = 208;
      setPos({ top: r.bottom + 4, left: Math.min(window.innerWidth - ancho - 8, Math.max(8, r.right - ancho)) });
    }
  }

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
      document.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={alternar}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 text-slate-600 text-sm hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        {label} <span className="text-xs leading-none">▾</span>
      </button>
      {pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={cerrar} />
          <div
            className="fixed z-50 w-52 rounded-lg border border-slate-200 bg-white shadow-xl py-1 dark:bg-slate-800 dark:border-slate-700"
            style={{ top: pos.top, left: pos.left }}
          >
            {children(cerrar)}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

export function MenuItem({ onClick, children, tono }: {
  onClick: () => void;
  children: ReactNode;
  tono?: 'danger' | 'ok';
}) {
  const color = tono === 'danger'
    ? 'text-rose-600 dark:text-rose-400'
    : tono === 'ok'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-slate-700 dark:text-slate-200';
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700/70 ${color}`}
    >
      {children}
    </button>
  );
}

export function MenuSep() {
  return <div className="my-1 border-t border-slate-100 dark:border-slate-700" />;
}

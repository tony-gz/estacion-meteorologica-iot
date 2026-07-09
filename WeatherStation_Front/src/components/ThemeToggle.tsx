import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { aplicarTema, temaInicial, type Tema } from '../lib/theme';

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  function alternar() {
    const nuevo: Tema = tema === 'dark' ? 'light' : 'dark';
    aplicarTema(nuevo);
    setTema(nuevo);
  }

  return (
    <button
      onClick={alternar}
      title={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Cambiar tema"
      className="px-2.5 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-200
                 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {tema === 'dark'
        ? <Sun size={18} strokeWidth={2} aria-hidden />
        : <Moon size={18} strokeWidth={2} aria-hidden />}
    </button>
  );
}

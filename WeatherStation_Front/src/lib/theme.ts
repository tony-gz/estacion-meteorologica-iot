// Gestión del tema claro/oscuro (clase .dark en <html>, persistido en localStorage).
export type Tema = 'light' | 'dark';

const KEY = 'ws.theme';

export function temaInicial(): Tema {
  const guardado = localStorage.getItem(KEY);
  if (guardado === 'light' || guardado === 'dark') return guardado;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark');
  localStorage.setItem(KEY, tema);
}

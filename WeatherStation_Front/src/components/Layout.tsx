import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Layout() {
  const { autenticado, esAdmin, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarMenu = () => setMenuAbierto(false);

  const linkBase = 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors';
  const linkActivo = ({ isActive }: { isActive: boolean }) =>
    `${linkBase} ${isActive
      ? 'bg-sky-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`;

  // Variante a ancho completo para el panel desplegable en móvil.
  const linkMovil = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
      ? 'bg-sky-600 text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`;

  function cerrarSesion() {
    logout();
    cerrarMenu();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-slate-200
                         dark:bg-slate-900/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Marca */}
          <Link to="/" onClick={cerrarMenu} className="flex items-center gap-2.5 group min-w-0">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600
                             text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 6.5 19z" />
              </svg>
            </span>
            <span className="leading-tight min-w-0">
              <span className="block font-extrabold tracking-tight bg-gradient-to-r from-sky-600 to-indigo-600
                               bg-clip-text text-transparent text-lg">CLIMBOT</span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                Estaciones IoT
              </span>
            </span>
          </Link>

          {/* Navegación de escritorio (≥ sm) */}
          <nav className="hidden sm:flex items-center gap-1.5">
            <NavLink to="/" end className={linkActivo}>Inicio</NavLink>
            {esAdmin && <NavLink to="/admin" className={linkActivo}>Admin</NavLink>}
            <ThemeToggle />

            {autenticado ? (
              <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{usuario?.nombre}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">{usuario?.rol}</span>
                </div>
                <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600
                                 text-white text-xs font-bold shadow-sm" title={usuario?.nombre}>
                  {iniciales(usuario?.nombre ?? '')}
                </span>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  title="Cerrar sesión"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50
                             dark:hover:bg-rose-950/40 transition-colors"
                  aria-label="Cerrar sesión"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 ml-1">
                <NavLink
                  to="/login?mode=registro"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
                             border border-slate-300 dark:border-slate-600
                             text-slate-600 dark:text-slate-300
                             hover:bg-slate-100 dark:hover:bg-slate-800
                             hover:scale-105 active:scale-100 transition-all duration-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Crear cuenta
                </NavLink>
                <NavLink
                  to="/login"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold
                             bg-gradient-to-r from-sky-500 to-indigo-500 text-white
                             hover:from-sky-600 hover:to-indigo-600
                             shadow-md hover:shadow-lg
                             hover:scale-105 active:scale-100 transition-all duration-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Iniciar sesión
                </NavLink>
              </div>
            )}
          </nav>

          {/* Controles móviles (< sm): tema + hamburguesa */}
          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMenuAbierto((o) => !o)}
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuAbierto}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100
                         dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {menuAbierto ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Panel desplegable en móvil */}
        {menuAbierto && (
          <nav className="sm:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1
                          bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
            <NavLink to="/" end className={linkMovil} onClick={cerrarMenu}>Inicio</NavLink>
            {esAdmin && <NavLink to="/admin" className={linkMovil} onClick={cerrarMenu}>Admin</NavLink>}

            {autenticado ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600
                                   text-white text-xs font-bold shadow-sm shrink-0">
                    {iniciales(usuario?.nombre ?? '')}
                  </span>
                  <div className="leading-tight min-w-0">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{usuario?.nombre}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400">{usuario?.rol}</span>
                  </div>
                </div>
                <button
                  onClick={cerrarSesion}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium
                             text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <NavLink
                  to="/login?mode=registro"
                  onClick={cerrarMenu}
                  className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold
                             border border-slate-300 dark:border-slate-600
                             text-slate-600 dark:text-slate-300
                             hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Crear cuenta
                </NavLink>
                <NavLink
                  to="/login"
                  onClick={cerrarMenu}
                  className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold
                             bg-gradient-to-r from-sky-500 to-indigo-500 text-white
                             hover:from-sky-600 hover:to-indigo-600 shadow-md transition-colors"
                >
                  Iniciar sesión
                </NavLink>
              </div>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

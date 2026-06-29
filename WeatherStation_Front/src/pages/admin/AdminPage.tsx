import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { UsuariosPage } from './UsuariosPage';
import { EstacionesPage } from './EstacionesPage';
import { EscuelasPage } from './EscuelasPage';
import { SolicitudesPage } from './SolicitudesPage';
import { AlertasPage } from './AlertasPage';

const tabBase = 'px-4 py-2 rounded-md text-sm font-medium transition-colors';
const tab = ({ isActive }: { isActive: boolean }) =>
  `${tabBase} ${isActive
    ? 'bg-sky-600 text-white'
    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`;

export function AdminPage() {
  const { esAdmin } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4 dark:text-slate-100">Administración</h1>
      <nav className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-3 dark:border-slate-700">
        <NavLink to="/admin/estaciones" className={tab}>Estaciones</NavLink>
        <NavLink to="/admin/solicitudes" className={tab}>Solicitudes</NavLink>
        {esAdmin && <NavLink to="/admin/escuelas" className={tab}>Escuelas</NavLink>}
        {esAdmin && <NavLink to="/admin/usuarios" className={tab}>Usuarios</NavLink>}
        <NavLink to="/admin/alertas" className={tab}>Alertas</NavLink>
      </nav>

      <Routes>
        <Route index element={<Navigate to="estaciones" replace />} />
        <Route path="estaciones" element={<EstacionesPage />} />
        <Route path="solicitudes" element={<SolicitudesPage />} />
        {esAdmin && <Route path="escuelas" element={<EscuelasPage />} />}
        {esAdmin && <Route path="usuarios" element={<UsuariosPage />} />}
        <Route path="alertas" element={<AlertasPage />} />
        <Route path="*" element={<Navigate to="estaciones" replace />} />
      </Routes>
    </div>
  );
}

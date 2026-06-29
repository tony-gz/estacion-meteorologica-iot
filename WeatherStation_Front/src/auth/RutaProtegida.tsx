import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Rol } from '../lib/types';

interface Props {
  children: ReactNode;
  roles?: Rol[];
}

/** Exige autenticación y, opcionalmente, alguno de los roles indicados. */
export function RutaProtegida({ children, roles }: Props) {
  const { autenticado, tieneRol } = useAuth();
  const location = useLocation();

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  // Autenticado pero sin el rol requerido: lo enviamos a la home (estaciones)
  // en lugar de dejarlo en un callejón sin salida.
  if (roles && roles.length > 0 && !tieneRol(...roles)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

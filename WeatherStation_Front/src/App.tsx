import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PublicoPage } from './pages/PublicoPage';
import { EstacionDetallePage } from './pages/EstacionDetallePage';
import { LoginPage } from './pages/LoginPage';
import { SolicitarEstacionPage } from './pages/SolicitarEstacionPage';
import { AdminPage } from './pages/admin/AdminPage';
import { RutaProtegida } from './auth/RutaProtegida';
import { useAuth } from './auth/AuthContext';

/**
 * Landing en la raíz: sin cuenta muestra la vista pública (estaciones + clima,
 * sin IA); con sesión, la home completa (detalle + asistente de IA).
 */
function Inicio() {
  const { autenticado } = useAuth();
  return autenticado ? <HomePage /> : <PublicoPage />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="publico" element={<PublicoPage />} />
        <Route index element={<Inicio />} />
        <Route
          path="estaciones/:id"
          element={
            <RutaProtegida>
              <EstacionDetallePage />
            </RutaProtegida>
          }
        />
        <Route
          path="solicitar-estacion"
          element={
            <RutaProtegida>
              <SolicitarEstacionPage />
            </RutaProtegida>
          }
        />
        <Route
          path="admin/*"
          element={
            <RutaProtegida roles={['ADMIN', 'RESPONSABLE']}>
              <AdminPage />
            </RutaProtegida>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

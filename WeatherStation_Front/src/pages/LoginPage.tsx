import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { mensajeError } from '../lib/api';

type Modo = 'login' | 'registro';

export function LoginPage() {
  const { login, registrar } = useAuth();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [modo, setModo] = useState<Modo>(
    searchParams.get('mode') === 'registro' ? 'registro' : 'login'
  );
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        await registrar(nombre, email, password);
      }
      navigate('/', { replace: true }); // siempre al dashboard de estaciones
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 bg-white rounded-xl shadow-sm border border-slate-200 p-6 dark:bg-slate-800 dark:border-slate-700">
      <h1 className="text-xl font-bold text-slate-800 mb-1 dark:text-slate-100">
        {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </h1>
      <p className="text-slate-500 text-sm mb-5 dark:text-slate-400">
        {modo === 'login'
          ? 'Accede a la red meteorológica.'
          : 'Regístrate para consultar el clima y usar la IA.'}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {modo === 'registro' && (
          <Campo label="Nombre" value={nombre} onChange={setNombre}
                 type="text" autoComplete="name" required />
        )}
        <Campo label="Email" value={email} onChange={setEmail}
               type="email" autoComplete="email" required />
        <Campo label="Contraseña" value={password} onChange={setPassword}
               type="password" autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
               required minLength={8} />

        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button type="submit" disabled={cargando}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium rounded-md py-2 transition-colors">
          {cargando ? 'Procesando…' : modo === 'login' ? 'Entrar' : 'Registrarme'}
        </button>
      </form>

      <button
        onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(null); }}
        className="mt-4 text-sm text-sky-600 hover:underline w-full text-center"
      >
        {modo === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
        <Link to="/publico" className="text-sm text-slate-500 hover:text-sky-600 hover:underline dark:text-slate-400">
          Ver el clima de la red sin iniciar sesión →
        </Link>
      </div>
    </div>
  );
}

interface CampoProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}

function Campo({ label, value, onChange, ...rest }: CampoProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                   dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
      />
    </label>
  );
}

import { useState, type FormEvent } from 'react';
import {
  useUsuarios, useCrearUsuario, useActualizarUsuario, useEliminarUsuario,
} from '../../lib/adminQueries';
import { mensajeError } from '../../lib/api';
import { fmtFechaHora } from '../../lib/format';
import { Modal } from '../../components/Modal';
import type { Rol, Usuario } from '../../lib/types';

const ROLES: Rol[] = ['ADMIN', 'INVESTIGADOR', 'USUARIO'];

export function UsuariosPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useUsuarios(page);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [creando, setCreando] = useState(false);

  const eliminar = useEliminarUsuario();

  function onEliminar(u: Usuario) {
    if (confirm(`¿Eliminar a ${u.nombre} (${u.email})?`)) {
      eliminar.mutate(u.id);
    }
  }

  if (isLoading) return <p className="text-slate-500">Cargando usuarios…</p>;
  if (error) return <p className="text-rose-700">{mensajeError(error)}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{data?.totalElements ?? 0} usuarios</p>
        <button
          onClick={() => setCreando(true)}
          className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-md px-4 py-2"
        >
          + Nuevo usuario
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left dark:bg-slate-700/50 dark:text-slate-400">
            <tr>
              <Th>Nombre</Th><Th>Email</Th><Th>Rol</Th><Th>Estado</Th><Th>Creado</Th><Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {data?.content.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-700">
                <Td>{u.nombre}</Td>
                <Td>{u.email}</Td>
                <Td><RolBadge rol={u.rol} /></Td>
                <Td>{u.activo
                  ? <span className="text-emerald-600">Activo</span>
                  : <span className="text-slate-400">Inactivo</span>}</Td>
                <Td className="text-slate-400">{fmtFechaHora(u.createdAt)}</Td>
                <Td>
                  <button onClick={() => setEditando(u)} className="text-sky-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => onEliminar(u)} className="text-rose-600 hover:underline">Eliminar</button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-slate-300 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300">Anterior</button>
          <span className="text-slate-500 dark:text-slate-400">Página {page + 1} de {data.totalPages}</span>
          <button disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-slate-300 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300">Siguiente</button>
        </div>
      )}

      {creando && <CrearModal onCerrar={() => setCreando(false)} />}
      {editando && <EditarModal usuario={editando} onCerrar={() => setEditando(null)} />}
    </div>
  );
}

function CrearModal({ onCerrar }: { onCerrar: () => void }) {
  const crear = useCrearUsuario();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('USUARIO');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    crear.mutate({ nombre, email, password, rol }, { onSuccess: onCerrar });
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Nuevo usuario">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Nombre" value={nombre} onChange={setNombre} required minLength={2} />
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Input label="Contraseña" type="password" value={password} onChange={setPassword} required minLength={8} />
        <SelectRol value={rol} onChange={setRol} />
        {crear.isError && <Err msg={mensajeError(crear.error)} />}
        <Acciones cargando={crear.isPending} onCerrar={onCerrar} />
      </form>
    </Modal>
  );
}

function EditarModal({ usuario, onCerrar }: { usuario: Usuario; onCerrar: () => void }) {
  const actualizar = useActualizarUsuario();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [email, setEmail] = useState(usuario.email);
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [activo, setActivo] = useState(usuario.activo);
  const [password, setPassword] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    actualizar.mutate(
      { id: usuario.id, input: { nombre, email, rol, activo, password: password || undefined } },
      { onSuccess: onCerrar },
    );
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Editar: ${usuario.nombre}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Nombre" value={nombre} onChange={setNombre} minLength={2} />
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <SelectRol value={rol} onChange={setRol} />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activo
        </label>
        <Input label="Nueva contraseña (opcional)" type="password" value={password}
               onChange={setPassword} placeholder="Dejar en blanco para no cambiar" />
        {actualizar.isError && <Err msg={mensajeError(actualizar.error)} />}
        <Acciones cargando={actualizar.isPending} onCerrar={onCerrar} />
      </form>
    </Modal>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}
function RolBadge({ rol }: { rol: Rol }) {
  const c = rol === 'ADMIN' ? 'bg-rose-100 text-rose-700'
    : rol === 'INVESTIGADOR' ? 'bg-indigo-100 text-indigo-700'
    : 'bg-slate-100 text-slate-600';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c}`}>{rol}</span>;
}
function Err({ msg }: { msg: string }) {
  return <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{msg}</div>;
}
function Acciones({ cargando, onCerrar }: { cargando: boolean; onCerrar: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300">Cancelar</button>
      <button type="submit" disabled={cargando} className="px-4 py-2 text-sm rounded-md bg-sky-600 text-white disabled:opacity-60">
        {cargando ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
function SelectRol({ value, onChange }: { value: Rol; onChange: (r: Rol) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Rol</span>
      <select value={value} onChange={(e) => onChange(e.target.value as Rol)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </label>
  );
}
interface InputProps {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; minLength?: number; placeholder?: string;
}
function Input({ label, value, onChange, type = 'text', ...rest }: InputProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">{label}</span>
      <input {...rest} type={type} value={value} onChange={(e) => onChange(e.target.value)}
             className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-sky-500
                        dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" />
    </label>
  );
}

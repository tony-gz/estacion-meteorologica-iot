export function EstadoBadge({ enLinea }: { enLinea: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
        enLinea ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${enLinea ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {enLinea ? 'En línea' : 'Sin conexión'}
    </span>
  );
}

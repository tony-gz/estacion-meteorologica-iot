import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Lectura } from '../lib/types';
import { fmtDiaHora } from '../lib/format';

interface Props {
  datos: Lectura[];
  campo: keyof Lectura;
  titulo: string;
  color: string;
  unidad: string;
}

export function Grafica({ datos, campo, titulo, color, unidad }: Props) {
  const data = datos.map((l) => ({ t: fmtDiaHora(l.timestamp), valor: l[campo] as number }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 dark:bg-slate-800 dark:border-slate-700">
      <h4 className="text-sm font-semibold text-slate-700 mb-2 dark:text-slate-200">
        {titulo} <span className="text-slate-400 font-normal">({unidad})</span>
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={40} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={40} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
            }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            itemStyle={{ color: '#334155' }}
            formatter={(v) => [`${v} ${unidad}`, titulo]}
          />
          <Line type="monotone" dataKey="valor" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

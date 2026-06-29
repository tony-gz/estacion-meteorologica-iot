import type { Lectura } from './types';

// Mismas columnas que exportaba el dashboard HTML original.
const COLUMNAS = [
  'Fecha', 'Hora', 'Temperatura_C', 'Humedad_%', 'Presion_hPa',
  'Viento_kmh', 'Direccion_grados', 'Direccion', 'Lluvia_mm',
];

function num(n: number | null | undefined, dec: number): string {
  return n === null || n === undefined || Number.isNaN(n) ? '' : n.toFixed(dec);
}

/**
 * Descarga el historial de una estación como CSV (UTF-8 con BOM para Excel).
 * Genera el archivo en el cliente a partir de las lecturas ya cargadas.
 */
export function descargarHistorialCsv(
  nombreEstacion: string,
  etiquetaRango: string,
  lecturas: Lectura[],
) {
  const filas = lecturas.map((r) => {
    const t = new Date(r.timestamp);
    return [
      t.toLocaleDateString('es-MX'),
      t.toLocaleTimeString('es-MX'),
      num(r.temperatura, 2),
      num(r.humedad, 1),
      num(r.presion, 2),
      num(r.vientoKmh, 2),
      num(r.vientoGrados, 1),
      r.vientoDir ?? '',
      num(r.lluviaMm, 2),
    ].join(',');
  });

  const csv = [COLUMNAS.join(','), ...filas].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreEstacion.replace(/\s+/g, '_')}_${etiquetaRango}_${fecha}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

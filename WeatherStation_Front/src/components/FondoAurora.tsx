import { useEffect, useRef } from 'react';

// Tono base por blob (HSL). El tono rota con el tiempo → la aurora cambia de color.
const BLOBS = [
  { hue: 200, x: 0.2, y: 0.35, r: 0.55, sx: 0.00007, sy: 0.00005, ph: 0 },
  { hue: 255, x: 0.72, y: 0.28, r: 0.6, sx: -0.00005, sy: 0.00006, ph: 1.6 },
  { hue: 290, x: 0.5, y: 0.75, r: 0.55, sx: 0.00006, sy: -0.00004, ph: 3.1 },
  { hue: 165, x: 0.88, y: 0.7, r: 0.45, sx: -0.00006, sy: -0.00005, ph: 4.4 },
];

// Velocidad de rotación del color (grados por ms). Ciclo completo ≈ 60 s.
const HUE_SPEED = 0.006;

/** Fondo neutro y profesional: degradados (blobs) que se desplazan suavemente. */
export function FondoAurora() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = ref.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    const cv = canvasEl;
    const ctx = context;

    let w = 0;
    let h = 0;
    function redimensionar() {
      const dpr = window.devicePixelRatio || 1;
      const rect = cv.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let raf = 0;
    function frame(t: number) {
      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, '#0b1220');
      base.addColorStop(1, '#131d33');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      const escala = Math.max(w, h);
      for (const b of BLOBS) {
        const cx = (b.x + Math.sin(t * b.sx + b.ph) * 0.12) * w;
        const cy = (b.y + Math.cos(t * b.sy + b.ph) * 0.12) * h;
        const rad = b.r * escala * (0.85 + 0.15 * Math.sin(t * 0.0003 + b.ph));
        const hue = (b.hue + t * HUE_SPEED) % 360;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `hsla(${hue}, 80%, 62%, 0.42)`);
        g.addColorStop(1, `hsla(${hue}, 80%, 62%, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }
      ctx.globalCompositeOperation = 'source-over';

      // Viñeta para dar profundidad.
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(2,6,23,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(frame);
    }

    redimensionar();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(redimensionar);
    ro.observe(cv);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

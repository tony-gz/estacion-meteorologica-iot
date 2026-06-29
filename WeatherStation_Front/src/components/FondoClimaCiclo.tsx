import { useEffect, useRef } from 'react';

/**
 * Fondo de cielo animado que CICLA solo entre estados del clima
 * (soleado → nublado → lluvia → tormenta → noche → atardecer) con transiciones
 * suaves (crossfade). Pensado para el hero de la landing. Todo en canvas.
 */
type Estado = 'day' | 'cloudy' | 'rain' | 'storm' | 'night' | 'sunset';

const CICLO: Estado[] = ['day', 'cloudy', 'rain', 'storm', 'night', 'sunset'];
const DURACION_MS = 7000;    // tiempo visible por estado
const TRANSICION_MS = 2600;  // duración del crossfade

interface Gota { x: number; y: number; len: number; speed: number; alpha: number; capa: number; }
interface Nube { x: number; y: number; w: number; h: number; speed: number; alpha: number; }
interface Estrella { x: number; y: number; r: number; fase: number; }
interface Escena { estado: Estado; nubes: Nube[]; gotas: Gota[]; estrellas: Estrella[]; flash: number; }

const SKY: Record<Estado, Array<[number, string]>> = {
  day:    [[0, '#075985'], [0.5, '#0ea5e9'], [1, '#7dd3fc']],
  cloudy: [[0, '#334155'], [0.5, '#64748b'], [1, '#94a3b8']],
  rain:   [[0, '#0f172a'], [0.5, '#243244'], [1, '#3b4a5e']],
  storm:  [[0, '#0b1120'], [0.5, '#1e293b'], [1, '#334155']],
  night:  [[0, '#020617'], [0.55, '#0b1326'], [1, '#111d36']],
  sunset: [[0, '#0f172a'], [0.45, '#7c2d12'], [0.8, '#ea580c'], [1, '#fbbf24']],
};

export function FondoClimaCiclo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    const cv = canvasEl;
    const ctx = context;

    let w = 0;
    let h = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const smooth = (x: number) => x * x * (3 - 2 * x);

    function crearEscena(estado: Estado): Escena {
      const numNubes = estado === 'rain' || estado === 'storm' ? 6 : estado === 'cloudy' ? 7 : 4;
      const nubes: Nube[] = Array.from({ length: numNubes }, () => ({
        x: rand(-0.2 * w, w), y: rand(8, h * 0.55), w: rand(120, 260), h: rand(34, 64),
        speed: rand(0.06, 0.22), alpha: rand(0.1, 0.26),
      }));
      const nGotas = estado === 'storm' ? 240 : estado === 'rain' ? 150 : 0;
      const gotas: Gota[] = Array.from({ length: nGotas }, () => {
        const capa = Math.random() < 0.5 ? 0 : 1;
        return {
          x: rand(0, w), y: rand(0, h),
          len: capa ? rand(12, 22) : rand(6, 12),
          speed: capa ? rand(7, 12) : rand(3.5, 6),
          alpha: capa ? rand(0.35, 0.65) : rand(0.15, 0.35),
          capa,
        };
      });
      const estrellas: Estrella[] = estado === 'night'
        ? Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(0, h * 0.85), r: rand(0.4, 1.5), fase: rand(0, 6.28) }))
        : [];
      return { estado, nubes, gotas, estrellas, flash: 0 };
    }

    let current = crearEscena(CICLO[0]);
    let prev: Escena | null = null;
    let idx = 0;
    let t = 1;
    let tCambio = 0;

    function redimensionar() {
      const dpr = window.devicePixelRatio || 1;
      const rect = cv.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      current = crearEscena(current.estado);
      prev = null;
      t = 1;
    }

    // ── Dibujo ──
    function dibujarCielo(estado: Estado, alpha: number) {
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      for (const [stop, color] of SKY[estado]) g.addColorStop(stop, color);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    function blob(x: number, y: number, r: number, color: string, a: number) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${color},${a})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function dibujarSol(estado: Estado) {
      if (estado !== 'day' && estado !== 'sunset') return;
      const sx = w * 0.82;
      const sy = estado === 'sunset' ? h * 0.55 : h * 0.32;
      const c1 = estado === 'sunset' ? '254,215,170' : '253,224,140';
      const c2 = estado === 'sunset' ? '254,200,120' : '254,240,160';
      blob(sx, sy, 140, c1, 0.45);
      blob(sx, sy, 64, c2, 0.9);
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = estado === 'sunset' ? 'rgba(255,236,190,0.98)' : 'rgba(255,251,200,0.98)';
      ctx.fill();
    }

    function dibujarLuna(estado: Estado) {
      if (estado !== 'night') return;
      const mx = w * 0.82;
      const my = h * 0.3;
      blob(mx, my, 70, '226,232,240', 0.18);
      ctx.beginPath();
      ctx.arc(mx, my, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + 8, my - 5, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0b1326';
      ctx.fill();
    }

    function dibujarNubes(e: Escena) {
      const oscuras = e.estado === 'rain' || e.estado === 'storm' || e.estado === 'cloudy';
      const tono = oscuras ? '71,85,105' : '248,250,252';
      e.nubes.forEach((c) => {
        c.x += c.speed;
        if (c.x > w + c.w) c.x = -c.w;
        const a = e.estado === 'day' || e.estado === 'sunset' ? c.alpha : c.alpha * 1.6;
        const blobs: Array<[number, number, number]> = [
          [0, 0, c.h], [c.w * 0.3, -c.h * 0.35, c.h * 0.85], [c.w * 0.6, 0, c.h], [c.w * 0.3, c.h * 0.2, c.h * 0.7],
        ];
        for (const [dx, dy, r] of blobs) blob(c.x + dx, c.y + dy, r, tono, a);
      });
    }

    function dibujarLluvia(e: Escena) {
      e.gotas.forEach((p) => {
        p.y += p.speed;
        p.x -= p.speed * 0.28;
        if (p.y > h) { p.y = -p.len; p.x = rand(0, w); }
        ctx.strokeStyle = `rgba(186,214,247,${p.alpha})`;
        ctx.lineWidth = p.capa ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.speed * 0.28 * 0.9, p.y + p.len);
        ctx.stroke();
      });
    }

    function dibujarRelampago(e: Escena) {
      if (e.estado !== 'storm') return;
      if (e.flash <= 0 && Math.random() < 0.006) e.flash = 1;
      if (e.flash > 0) {
        ctx.fillStyle = `rgba(226,232,240,${e.flash * 0.5})`;
        ctx.fillRect(0, 0, w, h);
        e.flash *= 0.88;
        if (e.flash < 0.02) e.flash = 0;
      }
    }

    function dibujarEstrellas(e: Escena, now: number, alpha: number) {
      e.estrellas.forEach((s) => {
        const tw = 0.55 + 0.45 * Math.sin(now / 600 + s.fase);
        ctx.globalAlpha = tw * alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function dibujarElementos(e: Escena, alpha: number, now: number) {
      ctx.globalAlpha = alpha;
      dibujarSol(e.estado);
      dibujarLuna(e.estado);
      dibujarNubes(e);
      dibujarLluvia(e);
      dibujarRelampago(e);
      ctx.globalAlpha = 1;
      if (e.estrellas.length) dibujarEstrellas(e, now, alpha);
    }

    function dibujarVignette() {
      const fg = ctx.createLinearGradient(0, h * 0.35, 0, h);
      fg.addColorStop(0, 'rgba(2,6,23,0)');
      fg.addColorStop(1, 'rgba(2,6,23,0.55)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, h * 0.35, w, h * 0.65);
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.8);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(2,6,23,0.4)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }

    let raf = 0;
    let last = performance.now();
    function animar(now: number) {
      const dt = now - last;
      last = now;

      if (tCambio === 0) tCambio = now;
      if (t >= 1 && now - tCambio > DURACION_MS) {
        idx = (idx + 1) % CICLO.length;
        prev = current;
        current = crearEscena(CICLO[idx]);
        t = 0;
        tCambio = now;
      }
      if (prev && t < 1) {
        t = Math.min(1, t + dt / TRANSICION_MS);
        if (t >= 1) prev = null;
      }

      const et = smooth(t);
      // Base de cielo siempre opaca (escena anterior o actual), y cruce encima.
      if (prev) {
        dibujarCielo(prev.estado, 1);
        dibujarCielo(current.estado, et);
        dibujarElementos(prev, 1 - et, now);
        dibujarElementos(current, et, now);
      } else {
        dibujarCielo(current.estado, 1);
        dibujarElementos(current, 1, now);
      }
      dibujarVignette();
      raf = requestAnimationFrame(animar);
    }

    redimensionar();
    raf = requestAnimationFrame(animar);
    const ro = new ResizeObserver(redimensionar);
    ro.observe(cv);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

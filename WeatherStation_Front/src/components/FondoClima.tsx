import { useEffect, useRef } from 'react';

type Estado = 'day' | 'night' | 'rain' | 'storm';

interface Props {
  lluviaMm: number;
  vientoKmh: number;
}

export function calcularEstado(lluvia: number, viento: number): Estado {
  const hr = new Date().getHours();
  if (lluvia > 0 && viento > 30) return 'storm';
  if (lluvia > 0) return 'rain';
  if (hr < 6 || hr >= 20) return 'night';
  return 'day';
}

interface Gota { x: number; y: number; len: number; speed: number; alpha: number; capa: number; }
interface Nube { x: number; y: number; w: number; h: number; speed: number; alpha: number; }
interface Estrella { x: number; y: number; r: number; fase: number; }

/**
 * Cielo animado realista en canvas, según el clima: día/atardecer/noche,
 * lluvia y tormenta. Incluye sol con resplandor, nubes suaves, lluvia en capas,
 * relámpagos, luna, estrellas titilantes y viñeta para dar profundidad.
 */
export function FondoClima({ lluviaMm, vientoKmh }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estado = calcularEstado(lluviaMm, vientoKmh);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    const cv = canvasEl;
    const ctx = context;

    let w = 0;
    let h = 0;
    let gotas: Gota[] = [];
    let nubes: Nube[] = [];
    let estrellas: Estrella[] = [];
    let flash = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function redimensionar() {
      const dpr = window.devicePixelRatio || 1;
      const rect = cv.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      inicializar();
    }

    function inicializar() {
      const numNubes = estado === 'rain' || estado === 'storm' ? 6 : 4;
      nubes = Array.from({ length: numNubes }, () => ({
        x: rand(-0.2 * w, w), y: rand(8, h * 0.55), w: rand(120, 260), h: rand(34, 64),
        speed: rand(0.06, 0.22), alpha: rand(0.1, 0.26),
      }));
      const n = estado === 'storm' ? 240 : estado === 'rain' ? 150 : 0;
      gotas = Array.from({ length: n }, () => {
        const capa = Math.random() < 0.5 ? 0 : 1; // 0 = lejana, 1 = cercana
        return {
          x: rand(0, w), y: rand(0, h),
          len: capa ? rand(12, 22) : rand(6, 12),
          speed: capa ? rand(7, 12) : rand(3.5, 6),
          alpha: capa ? rand(0.35, 0.65) : rand(0.15, 0.35),
          capa,
        };
      });
      estrellas = estado === 'night'
        ? Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(0, h * 0.85), r: rand(0.4, 1.5), fase: rand(0, 6.28) }))
        : [];
    }

    function dibujarCielo() {
      let g: CanvasGradient;
      if (estado === 'night') {
        g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#020617');
        g.addColorStop(0.55, '#0b1326');
        g.addColorStop(1, '#111d36');
      } else if (estado === 'rain' || estado === 'storm') {
        g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0f172a');
        g.addColorStop(0.5, '#243244');
        g.addColorStop(1, '#3b4a5e');
      } else {
        const hr = new Date().getHours();
        g = ctx.createLinearGradient(0, 0, 0, h);
        if (hr >= 6 && hr < 10) {
          g.addColorStop(0, '#0c4a6e'); g.addColorStop(0.45, '#9333ea'); g.addColorStop(0.8, '#fb7185'); g.addColorStop(1, '#fb923c');
        } else if (hr >= 18 && hr < 21) {
          g.addColorStop(0, '#0f172a'); g.addColorStop(0.45, '#7c2d12'); g.addColorStop(0.8, '#ea580c'); g.addColorStop(1, '#fbbf24');
        } else {
          g.addColorStop(0, '#075985'); g.addColorStop(0.5, '#0ea5e9'); g.addColorStop(1, '#7dd3fc');
        }
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    function blobSuave(x: number, y: number, r: number, color: string, alpha: number) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function dibujarSol() {
      if (estado !== 'day') return;
      const sx = w * 0.82;
      const sy = h * 0.32;
      blobSuave(sx, sy, 130, '253,224,140', 0.5);
      blobSuave(sx, sy, 60, '254,240,160', 0.9);
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,251,200,0.98)';
      ctx.fill();
    }

    function dibujarLuna() {
      if (estado !== 'night') return;
      const mx = w * 0.82;
      const my = h * 0.3;
      blobSuave(mx, my, 70, '226,232,240', 0.18);
      ctx.beginPath();
      ctx.arc(mx, my, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      // sombra para dar relieve a la luna
      ctx.beginPath();
      ctx.arc(mx + 8, my - 5, 18, 0, Math.PI * 2);
      ctx.fillStyle = estado === 'night' ? '#0b1326' : '#0b1326';
      ctx.fill();
    }

    function dibujarNubes() {
      const tono = estado === 'rain' || estado === 'storm' ? '71,85,105' : '248,250,252';
      nubes.forEach((c) => {
        c.x += c.speed;
        if (c.x > w + c.w) c.x = -c.w;
        const a = (estado === 'day' ? c.alpha : c.alpha * 1.6);
        const blobs: Array<[number, number, number]> = [
          [0, 0, c.h], [c.w * 0.3, -c.h * 0.35, c.h * 0.85], [c.w * 0.6, 0, c.h], [c.w * 0.3, c.h * 0.2, c.h * 0.7],
        ];
        for (const [dx, dy, r] of blobs) blobSuave(c.x + dx, c.y + dy, r, tono, a);
      });
    }

    function dibujarLluvia() {
      gotas.forEach((p) => {
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
      // bruma
      const bruma = ctx.createLinearGradient(0, 0, 0, h);
      bruma.addColorStop(0, 'rgba(148,163,184,0.06)');
      bruma.addColorStop(1, 'rgba(148,163,184,0.12)');
      ctx.fillStyle = bruma;
      ctx.fillRect(0, 0, w, h);
    }

    function dibujarRelampago() {
      if (estado !== 'storm') return;
      if (flash <= 0 && Math.random() < 0.006) flash = 1;
      if (flash > 0) {
        ctx.fillStyle = `rgba(226,232,240,${flash * 0.5})`;
        ctx.fillRect(0, 0, w, h);
        flash *= 0.88;
        if (flash < 0.02) flash = 0;
      }
    }

    function dibujarEstrellas(t: number) {
      estrellas.forEach((s) => {
        const tw = 0.55 + 0.45 * Math.sin(t / 600 + s.fase);
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function dibujarVignette() {
      // difuminado inferior para integrar el texto
      const fg = ctx.createLinearGradient(0, h * 0.35, 0, h);
      fg.addColorStop(0, 'rgba(2,6,23,0)');
      fg.addColorStop(1, 'rgba(2,6,23,0.6)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, h * 0.35, w, h * 0.65);
      // viñeta en bordes
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.8);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(2,6,23,0.4)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }

    let raf = 0;
    function animar(t: number) {
      dibujarCielo();
      dibujarSol();
      dibujarLuna();
      if (estado === 'night') dibujarEstrellas(t);
      dibujarNubes();
      if (estado === 'rain' || estado === 'storm') dibujarLluvia();
      dibujarRelampago();
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
  }, [estado]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

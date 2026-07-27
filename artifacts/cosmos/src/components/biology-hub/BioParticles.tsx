import { useEffect, useRef, memo } from 'react';

// ─── Biology Hub — Floating Particle Field ─────────────────────────────────────
// Canvas-based particles: DNA dots, helices, and organic shapes
// Runs at ~60 FPS using requestAnimationFrame

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  alphaDir: number;
  color: string;
  type: 'dot' | 'ring' | 'cross';
  rotation: number;
  rotSpeed: number;
}

interface BioParticlesProps {
  count?: number;
  className?: string;
}

const COLORS = [
  'rgba(52,211,153,',   // emerald
  'rgba(45,212,191,',   // teal
  'rgba(163,230,53,',   // lime
  'rgba(56,189,248,',   // sky
  'rgba(167,139,250,',  // violet
  'rgba(34,211,238,',   // cyan
];

function createParticle(w: number, h: number): Particle {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const types: Particle['type'][] = ['dot', 'dot', 'dot', 'ring', 'cross'];
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    radius: Math.random() * 2.5 + 1,
    alpha: Math.random() * 0.5 + 0.1,
    alphaDir: Math.random() > 0.5 ? 1 : -1,
    color,
    type: types[Math.floor(Math.random() * types.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  if (p.type === 'dot') {
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `${p.color}${p.alpha})`;
    ctx.fill();
  } else if (p.type === 'ring') {
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 2, 0, Math.PI * 2);
    ctx.strokeStyle = `${p.color}${p.alpha * 0.7})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else {
    // cross / plus
    const s = p.radius * 2.5;
    ctx.strokeStyle = `${p.color}${p.alpha * 0.6})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
    ctx.moveTo(0, -s); ctx.lineTo(0, s);
    ctx.stroke();
  }

  ctx.restore();
}

const BioParticles = memo(({ count = 60, className = '' }: BioParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      particles.current = Array.from({ length: count }, () =>
        createParticle(canvas.width, canvas.height)
      );
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = () => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles.current) {
        // Move
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        // Wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Pulse alpha
        p.alpha += p.alphaDir * 0.003;
        if (p.alpha > 0.65) { p.alpha = 0.65; p.alphaDir = -1; }
        if (p.alpha < 0.05) { p.alpha = 0.05; p.alphaDir =  1; }

        drawParticle(ctx, p);
      }

      // Draw faint connection lines between close particles
      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const a = particles.current[i];
          const b = particles.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            const lineAlpha = (1 - dist / 80) * 0.08;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(52,211,153,${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.8 }}
    />
  );
});

BioParticles.displayName = 'BioParticles';
export default BioParticles;

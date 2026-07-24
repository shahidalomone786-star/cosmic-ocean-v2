import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Matter from 'matter-js';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CS  = 560;            // canvas logical size — CSS scales to fill container
const FR  = 44;             // frame (wood border) width
const PS  = CS - 2 * FR;   // play-area side = 472
const CX  = CS / 2;        // 280
const CY  = CS / 2;        // 280
const PR  = 24;             // pocket radius
const CR  = 12;             // coin radius
const SR  = 17;             // striker radius
const MAX_POWER    = 22;
const SETTLE_VEL   = 0.15;
const SETTLE_TICKS = 55;

// Striker baselines — pulled in from edges for cleaner play area
const BLACK_BASELINE_Y = FR + 38;
const WHITE_BASELINE_Y = FR + PS - 38;
const STR_MIN_X = FR + PR + SR + 6;
const STR_MAX_X = FR + PS - PR - SR - 6;

const POCKETS = [
  { x: FR,      y: FR      },
  { x: FR + PS, y: FR      },
  { x: FR,      y: FR + PS },
  { x: FR + PS, y: FR + PS },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// AVATARS
// ─────────────────────────────────────────────────────────────────────────────
export const CARROM_AVATARS = [
  { name: 'Mom',      image: '/mehera.jpg',
    role: 'Grandmaster Strategist', noise: 1.5,  delay: 900  },
  { name: 'Einstein', image: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg',
    role: 'Theoretical Physicist',  noise: 28,   delay: 1500 },
  { name: 'Feynman',  image: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg',
    role: 'Quantum Pioneer',        noise: 25,   delay: 1300 },
  { name: 'Sagan',    image: '/carl-sagan.jpg',
    role: 'Cosmos Explorer',        noise: 12,   delay: 1000 },
  { name: 'Tesla',    image: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg',
    role: 'Electrical Visionary',   noise: 10,   delay: 950  },
] as const;

type CarromAvatar = (typeof CARROM_AVATARS)[number];
type GameMode   = 'pvp' | 'pva' | 'spectate';
type Player     = 'black' | 'white';
type CoinColor  = 'black' | 'white' | 'red';
type GamePhase  = 'aiming' | 'shooting' | 'result';

interface CoinState {
  id:       number;
  body:     Matter.Body;
  color:    CoinColor;
  pocketed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// COIN LAYOUT  (9 black + 9 white + 1 red queen = 19)
// ─────────────────────────────────────────────────────────────────────────────
function getInitialLayout(): { x: number; y: number; color: CoinColor }[] {
  const out: { x: number; y: number; color: CoinColor }[] = [];
  out.push({ x: CX, y: CY, color: 'red' });
  const r1 = CR * 2 + 0.5;
  for (let i = 0; i < 6; i++) {
    const a = (i * 60) * (Math.PI / 180);
    out.push({ x: CX + r1 * Math.cos(a), y: CY + r1 * Math.sin(a),
      color: i % 2 === 0 ? 'black' : 'white' });
  }
  const r2 = CR * 4 + 1;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30) * (Math.PI / 180);
    out.push({ x: CX + r2 * Math.cos(a), y: CY + r2 * Math.sin(a),
      color: i % 2 === 0 ? 'white' : 'black' });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI SHOT CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
function computeAIShot(
  coins: CoinState[], aiColor: Player, strikerY: number, noiseDeg: number,
): { sx: number; angle: number; power: number } {
  const rand = () => (Math.random() - 0.5) * 2;
  const targets = coins.filter(c => c.color === aiColor && !c.pocketed);
  for (const t of targets) {
    const tx = t.body.position.x, ty = t.body.position.y;
    for (const p of POCKETS) {
      if (Math.abs(p.y - ty) < 2) continue;
      const sx = tx - (ty - strikerY) * ((p.x - tx) / (p.y - ty));
      if (sx < STR_MIN_X || sx > STR_MAX_X) continue;
      const noiseRad = (noiseDeg * Math.PI / 180) * rand();
      const base = Math.atan2(ty - strikerY, tx - sx);
      return { sx: sx + rand() * noiseDeg * 0.4, angle: base + noiseRad,
        power: MAX_POWER * (0.72 + Math.random() * 0.24) };
    }
  }
  const coin = targets[Math.floor(Math.random() * Math.max(1, targets.length))];
  if (!coin) return { sx: CX, angle: strikerY < CY ? Math.PI / 2 : -Math.PI / 2, power: MAX_POWER * 0.5 };
  const tx = coin.body.position.x, ty = coin.body.position.y;
  const sx = Math.max(STR_MIN_X, Math.min(STR_MAX_X, tx + rand() * 30));
  return { sx, angle: Math.atan2(ty - strikerY, tx - sx) + (noiseDeg * Math.PI / 180) * rand(),
    power: MAX_POWER * 0.65 };
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUND
// ─────────────────────────────────────────────────────────────────────────────
function playCoinSound() {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.16);
  } catch { /* silent */ }
}

function playPocketSound() {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.24, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.48);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM CANVAS DRAWING
// ─────────────────────────────────────────────────────────────────────────────
let starCache: Array<{ x: number; y: number; r: number; a: number }> | null = null;
function getStars() {
  if (!starCache) {
    starCache = Array.from({ length: 55 }, () => ({
      x: FR + 8 + Math.random() * (PS - 16),
      y: FR + 8 + Math.random() * (PS - 16),
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.45 + 0.08,
    }));
  }
  return starCache;
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  humanTurn: boolean,
  humanColor: Player | null,
  phase: GamePhase,
) {
  // ── Wood frame ──
  const fg = ctx.createLinearGradient(0, 0, CS, CS);
  fg.addColorStop(0,    '#6b3a0e');
  fg.addColorStop(0.12, '#a06522');
  fg.addColorStop(0.35, '#d4943a');
  fg.addColorStop(0.5,  '#e8b050');
  fg.addColorStop(0.65, '#d4943a');
  fg.addColorStop(0.88, '#a06522');
  fg.addColorStop(1,    '#6b3a0e');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.roundRect(0, 0, CS, CS, 16);
  ctx.fill();

  // Wood grain overlay
  const grain = ctx.createLinearGradient(0, 0, CS, CS);
  grain.addColorStop(0,   'rgba(255,180,80,0.12)');
  grain.addColorStop(0.3, 'rgba(0,0,0,0.1)');
  grain.addColorStop(0.6, 'rgba(255,180,80,0.08)');
  grain.addColorStop(1,   'rgba(0,0,0,0.15)');
  ctx.fillStyle = grain;
  ctx.beginPath(); ctx.roundRect(0, 0, CS, CS, 16); ctx.fill();

  // Outer gold border
  ctx.save();
  ctx.shadowBlur  = 8;
  ctx.shadowColor = 'rgba(220,160,50,0.6)';
  ctx.strokeStyle = '#c8a030';
  ctx.lineWidth   = 3;
  ctx.beginPath(); ctx.roundRect(2, 2, CS - 4, CS - 4, 14); ctx.stroke();
  ctx.restore();

  // Inner trim line
  ctx.strokeStyle = 'rgba(200,150,50,0.45)';
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(FR - 5, FR - 5, PS + 10, PS + 10);

  // ── Cosmic felt surface ──
  const felt = ctx.createRadialGradient(CX, CY, 0, CX, CY, PS * 0.75);
  felt.addColorStop(0,   '#1c1050');
  felt.addColorStop(0.45,'#110c38');
  felt.addColorStop(1,   '#060418');
  ctx.fillStyle = felt;
  ctx.fillRect(FR, FR, PS, PS);

  // Subtle vignette
  const vign = ctx.createRadialGradient(CX, CY, PS * 0.3, CX, CY, PS * 0.72);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vign;
  ctx.fillRect(FR, FR, PS, PS);

  // Stars
  for (const s of getStars()) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.fill();
  }

  // ── Corner diagonal cuts ──
  ctx.strokeStyle = 'rgba(210,170,90,0.32)';
  ctx.lineWidth   = 1.3;
  const diagLen = PR + 16;
  [
    [FR + diagLen, FR,      FR,           FR + diagLen],
    [FR + PS - diagLen, FR, FR + PS,      FR + diagLen],
    [FR,           FR + PS - diagLen, FR + diagLen, FR + PS],
    [FR + PS, FR + PS - diagLen, FR + PS - diagLen, FR + PS],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });

  // ── Pockets ──
  for (const p of POCKETS) {
    // Glow halo
    const halo = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, PR * 2.4);
    halo.addColorStop(0,   'rgba(0,0,0,0.92)');
    halo.addColorStop(0.6, 'rgba(0,0,0,0.4)');
    halo.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(p.x, p.y, PR * 2.4, 0, Math.PI * 2); ctx.fill();

    // Hole
    ctx.beginPath(); ctx.arc(p.x, p.y, PR, 0, Math.PI * 2);
    ctx.fillStyle = '#000'; ctx.fill();

    // Gold rim
    ctx.save();
    ctx.shadowBlur  = 6;
    ctx.shadowColor = 'rgba(200,140,40,0.7)';
    ctx.strokeStyle = 'rgba(200,140,40,0.75)';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    ctx.restore();

    // Inner depth ring
    ctx.beginPath(); ctx.arc(p.x, p.y, PR * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,200,80,0.1)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // ── Center circles ──
  // Outer decorative
  ctx.beginPath(); ctx.arc(CX, CY, CR * 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200,160,80,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  // Main circle
  ctx.beginPath(); ctx.arc(CX, CY, CR * 5.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200,160,80,0.38)'; ctx.lineWidth = 1.5; ctx.stroke();
  // Inner
  ctx.beginPath(); ctx.arc(CX, CY, CR * 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200,160,80,0.2)'; ctx.lineWidth = 1; ctx.stroke();

  // ── Player baselines ──
  const isHumanAiming = humanTurn && phase === 'aiming';

  const drawBaseline = (y: number, color: string, active: boolean) => {
    ctx.save();
    if (active) {
      ctx.shadowBlur  = 18;
      ctx.shadowColor = color;
    }
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(FR + 52, y);
    ctx.lineTo(FR + PS - 52, y);
    ctx.strokeStyle = active ? color : 'rgba(200,160,80,0.2)';
    ctx.lineWidth   = active ? 2 : 1;
    ctx.stroke();
    ctx.restore();
  };

  drawBaseline(BLACK_BASELINE_Y, 'rgba(180,130,255,0.95)', isHumanAiming && humanColor === 'black');
  drawBaseline(WHITE_BASELINE_Y, 'rgba(255,210,80,0.95)',  isHumanAiming && humanColor === 'white');
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, color: CoinColor) {
  const r = CR;
  // Drop shadow
  ctx.beginPath(); ctx.arc(x + 2.5, y + 2.5, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();

  // Main body
  const g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.38, 0, x, y, r);
  if (color === 'red') {
    g.addColorStop(0,   '#ff8888'); g.addColorStop(0.45, '#dc2626'); g.addColorStop(1, '#7f1010');
  } else if (color === 'black') {
    g.addColorStop(0,   '#6a6a90'); g.addColorStop(0.45, '#252535'); g.addColorStop(1, '#0a0a12');
  } else {
    g.addColorStop(0,   '#faf5e4'); g.addColorStop(0.45, '#d4c88a'); g.addColorStop(1, '#9a8850');
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();

  // Rim
  ctx.save();
  ctx.shadowBlur  = color === 'red' ? 8 : 4;
  ctx.shadowColor = color === 'red' ? 'rgba(255,100,100,0.5)' : color === 'black' ? 'rgba(100,100,200,0.3)' : 'rgba(255,230,150,0.3)';
  ctx.strokeStyle = color === 'red' ? 'rgba(255,150,150,0.75)' : color === 'black' ? 'rgba(120,120,200,0.55)' : 'rgba(240,215,140,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Specular highlight
  const sg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x - r * 0.1, y - r * 0.1, r * 0.5);
  sg.addColorStop(0, 'rgba(255,255,255,0.4)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = sg; ctx.fill();

  // Queen cross
  if (color === 'red') {
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(255,200,180,0.9)';
    ctx.strokeStyle = 'rgba(255,220,200,0.95)'; ctx.lineWidth = 1.5;
    const h = r * 0.44;
    ctx.beginPath();
    ctx.moveTo(x - h, y); ctx.lineTo(x + h, y);
    ctx.moveTo(x, y - h); ctx.lineTo(x, y + h);
    ctx.stroke();
    ctx.restore();
  }
}

function drawStriker(ctx: CanvasRenderingContext2D, x: number, y: number, playerColor: Player, pulsing: boolean) {
  const pulse = pulsing ? (0.5 + 0.5 * Math.sin(Date.now() / 400)) : 0;
  const glowColor = playerColor === 'white' ? 'rgba(255,215,80,1)' : 'rgba(180,130,255,1)';

  // Pulsing outer ring
  if (pulsing) {
    ctx.save();
    ctx.shadowBlur  = 24 + pulse * 22;
    ctx.shadowColor = glowColor;
    ctx.strokeStyle = playerColor === 'white'
      ? `rgba(255,215,80,${0.3 + pulse * 0.55})`
      : `rgba(180,130,255,${0.3 + pulse * 0.55})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, SR + 5 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Drop shadow
  ctx.beginPath(); ctx.arc(x + 3, y + 3, SR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();

  // Body gradient
  const bg = ctx.createRadialGradient(x - SR * 0.32, y - SR * 0.36, 0, x, y, SR);
  if (playerColor === 'white') {
    bg.addColorStop(0,   '#fef0c0'); bg.addColorStop(0.55, '#c8a030'); bg.addColorStop(1, '#6a5010');
  } else {
    bg.addColorStop(0,   '#8070d0'); bg.addColorStop(0.55, '#302870'); bg.addColorStop(1, '#100820');
  }
  ctx.beginPath(); ctx.arc(x, y, SR, 0, Math.PI * 2);
  ctx.fillStyle = bg; ctx.fill();

  // Glowing rim
  ctx.save();
  ctx.shadowBlur  = pulsing ? 14 + pulse * 14 : 8;
  ctx.shadowColor = glowColor;
  ctx.strokeStyle = playerColor === 'white' ? 'rgba(255,215,80,0.95)' : 'rgba(180,130,255,0.95)';
  ctx.lineWidth   = 2.5;
  ctx.beginPath(); ctx.arc(x, y, SR, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Specular highlight
  const sp = ctx.createRadialGradient(x - SR * 0.3, y - SR * 0.33, 0, x, y, SR * 0.65);
  sp.addColorStop(0, 'rgba(255,255,255,0.38)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(x, y, SR, 0, Math.PI * 2);
  ctx.fillStyle = sp; ctx.fill();
}

function drawAimLine(ctx: CanvasRenderingContext2D, sx: number, sy: number, angle: number, power: number) {
  const len = power * 14;
  const ex  = sx + Math.cos(angle) * len;
  const ey  = sy + Math.sin(angle) * len;

  // Gradient line
  const lg = ctx.createLinearGradient(sx, sy, ex, ey);
  lg.addColorStop(0, 'rgba(255,220,70,0.95)');
  lg.addColorStop(0.6, 'rgba(255,180,30,0.6)');
  lg.addColorStop(1, 'rgba(255,140,0,0)');

  ctx.save();
  ctx.shadowBlur  = 10;
  ctx.shadowColor = 'rgba(255,200,0,0.6)';
  ctx.setLineDash([8, 5]);
  ctx.strokeStyle = lg;
  ctx.lineWidth   = 2.5;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.setLineDash([]);

  // Power dots along line
  const numDots = Math.floor(power / 2.5);
  for (let i = 1; i <= numDots; i++) {
    const t  = i / (numDots + 1);
    const px = sx + Math.cos(angle) * len * t;
    const py = sy + Math.sin(angle) * len * t;
    const r  = 3 * (1 - t * 0.6);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,200,40,${0.9 - t * 0.75})`; ctx.fill();
  }

  // Arrowhead
  const hl = 12; const la = angle + 2.55; const ra = angle - 2.55;
  ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(255,200,0,0.9)';
  ctx.fillStyle = 'rgba(255,220,60,0.95)';
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hl * Math.cos(la), ey - hl * Math.sin(la));
  ctx.lineTo(ex - hl * Math.cos(ra), ey - hl * Math.sin(ra));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// CARROM BOARD — the live game canvas
// ─────────────────────────────────────────────────────────────────────────────
interface BoardProps {
  mode:         GameMode;
  myColor:      Player;
  blackAvatar?: CarromAvatar;
  whiteAvatar?: CarromAvatar;
  onGameEnd:    (myScore: number, oppScore: number, mode: GameMode, opponent?: string) => void;
}

function CarromBoard({ mode, myColor, blackAvatar, whiteAvatar, onGameEnd }: BoardProps) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const engineRef     = useRef<Matter.Engine | null>(null);
  const coinsRef      = useRef<CoinState[]>([]);
  const strikerRef    = useRef<Matter.Body | null>(null);
  const rafRef        = useRef<number>(0);
  const phaseRef      = useRef<GamePhase>('aiming');
  const turnRef       = useRef<Player>('black');
  const scoreRef      = useRef({ black: 0, white: 0 });
  const strikerXRef   = useRef(CX);
  const aimRef        = useRef<{ angle: number; power: number } | null>(null);
  const draggingRef   = useRef(false);
  const dragStartRef  = useRef({ x: 0, y: 0 });
  const queenByRef    = useRef<Player | null>(null);
  const coverRef      = useRef(false);
  const aiTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref-forwarded callbacks (fix stale-closure bug in RAF loop)
  const passReadyRef  = useRef(false);
  const nextTurnRef   = useRef<(pocketed: boolean) => void>(() => {});

  const [phase,     setPhase]     = useState<GamePhase>('aiming');
  const [turn,      setTurn]      = useState<Player>('black');
  const [scores,    setScores]    = useState({ black: 0, white: 0 });
  const [strikerX,  setStrikerX]  = useState(CX);
  const [message,   setMessage]   = useState('Black goes first');
  const [passReady, setPassReady] = useState(false);
  const [hint,      setHint]      = useState(true); // show one-time control hint

  // Keep passReadyRef in sync with state
  useEffect(() => { passReadyRef.current = passReady; }, [passReady]);

  // ── Is current turn a human? (ref-safe version for the animation loop) ──────
  const isHumanTurnNow = useCallback((): boolean => {
    if (mode === 'pvp')       return !passReadyRef.current;
    if (mode === 'spectate')  return false;
    return turnRef.current === myColor;
  }, [mode, myColor]);

  // ── AI shot dispatcher ─────────────────────────────────────────────────────
  const fireAI = useCallback((t: Player, avatar: CarromAvatar) => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setMessage(`${avatar.name} is thinking…`);
    aiTimerRef.current = setTimeout(() => {
      const strikerY = t === 'black' ? BLACK_BASELINE_Y : WHITE_BASELINE_Y;
      const shot     = computeAIShot(coinsRef.current, t, strikerY, avatar.noise);
      const striker  = strikerRef.current;
      if (!striker) return;
      const sx = Math.max(STR_MIN_X, Math.min(STR_MAX_X, shot.sx));
      Matter.Body.setPosition(striker, { x: sx, y: strikerY });
      Matter.Body.setVelocity(striker,  { x: 0, y: 0 });
      Matter.Body.setStatic(striker, false);
      Matter.Body.setVelocity(striker, { x: Math.cos(shot.angle) * shot.power, y: Math.sin(shot.angle) * shot.power });
      phaseRef.current = 'shooting';
      setPhase('shooting');
    }, avatar.delay);
  }, []);

  // ── Next turn logic ────────────────────────────────────────────────────────
  const nextTurn = useCallback((lastShotPocketed: boolean) => {
    const blackLeft = coinsRef.current.filter(c => c.color === 'black' && !c.pocketed).length;
    const whiteLeft = coinsRef.current.filter(c => c.color === 'white' && !c.pocketed).length;

    if (blackLeft === 0 || whiteLeft === 0) {
      phaseRef.current = 'result';
      setPhase('result');
      setMessage(blackLeft === 0 ? 'Black wins!' : 'White wins!');
      onGameEnd(
        scoreRef.current[myColor],
        scoreRef.current[myColor === 'black' ? 'white' : 'black'],
        mode,
        mode === 'pva' ? (myColor === 'black' ? whiteAvatar?.name : blackAvatar?.name) : undefined,
      );
      return;
    }

    if (!lastShotPocketed) turnRef.current = turnRef.current === 'black' ? 'white' : 'black';
    setTurn(turnRef.current);
    const t = turnRef.current;
    setMessage(t === 'black' ? "Black's turn" : "White's turn");

    if (mode === 'pvp') {
      setPassReady(true);
      return;
    }

    const avatar = t === 'black' ? blackAvatar : whiteAvatar;
    if (avatar && (mode === 'spectate' || (mode === 'pva' && t !== myColor))) {
      fireAI(t, avatar);
    }
  }, [mode, myColor, blackAvatar, whiteAvatar, onGameEnd, fireAI]);

  // Always expose latest nextTurn to the RAF loop via ref
  useEffect(() => { nextTurnRef.current = nextTurn; }, [nextTurn]);

  // ── Physics init (runs once) ───────────────────────────────────────────────
  useEffect(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    engineRef.current = engine;
    const world = engine.world;

    const coinOpts = { restitution: 0.78, friction: 0.018, frictionAir: 0.012, frictionStatic: 0.02, label: 'coin' };
    const wallOpts = { isStatic: true, restitution: 0.75, friction: 0.05, label: 'wall' };

    const gap  = PR + 6;
    const wthk = 14;
    Matter.World.add(world, [
      Matter.Bodies.rectangle(CX,       FR - wthk / 2,      PS - gap * 2, wthk, wallOpts),
      Matter.Bodies.rectangle(CX,       FR + PS + wthk / 2, PS - gap * 2, wthk, wallOpts),
      Matter.Bodies.rectangle(FR - wthk / 2, CY,            wthk, PS - gap * 2, wallOpts),
      Matter.Bodies.rectangle(FR + PS + wthk / 2, CY,       wthk, PS - gap * 2, wallOpts),
    ]);

    const layout  = getInitialLayout();
    coinsRef.current = layout.map((pos, i) => {
      const body = Matter.Bodies.circle(pos.x, pos.y, CR, { ...coinOpts, label: `coin-${i}` });
      Matter.World.add(world, body);
      return { id: i, body, color: pos.color, pocketed: false };
    });

    const striker = Matter.Bodies.circle(-300, -300, SR, { restitution: 0.7, friction: 0.02, frictionAir: 0.02, label: 'striker' });
    Matter.World.add(world, striker);
    strikerRef.current = striker;

    // Audio on collision
    Matter.Events.on(engine, 'collisionStart', (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        const la = pair.bodyA.label ?? '', lb = pair.bodyB.label ?? '';
        if ((la.startsWith('coin') || la === 'striker') && (lb.startsWith('coin') || lb === 'striker')) {
          playCoinSound();
        }
      }
    });

    // ── RAF loop ─────────────────────────────────────────────────────────────
    let settled = 0;
    const loop = () => {
      Matter.Engine.update(engine, 1000 / 60);
      const canvas = canvasRef.current;
      const ctx    = canvas?.getContext('2d');

      // ── Pocket detection ──
      let pocketed = false;
      for (const coin of coinsRef.current) {
        if (coin.pocketed) continue;
        const { x, y } = coin.body.position;
        for (const p of POCKETS) {
          if (Math.hypot(x - p.x, y - p.y) < PR + 1) {
            coin.pocketed = true;
            Matter.World.remove(world, coin.body);
            playPocketSound();
            if (coin.color === 'red') {
              queenByRef.current = turnRef.current;
              coverRef.current   = true;
            } else {
              if (coin.color === turnRef.current) {
                scoreRef.current[turnRef.current]++;
                setScores({ ...scoreRef.current });
              }
              if (coverRef.current && queenByRef.current === turnRef.current && coin.color === turnRef.current) {
                scoreRef.current[turnRef.current] += 3;
                setScores({ ...scoreRef.current });
                queenByRef.current = null;
                coverRef.current   = false;
              }
            }
            pocketed = true;
          }
        }
      }

      // ── Striker foul ──
      if (striker.position.x > 0) {
        for (const p of POCKETS) {
          if (Math.hypot(striker.position.x - p.x, striker.position.y - p.y) < PR + 1) {
            Matter.Body.setPosition(striker, { x: -300, y: -300 });
            Matter.Body.setVelocity(striker,  { x: 0, y: 0 });
            phaseRef.current = 'aiming'; setPhase('aiming');
            nextTurnRef.current(false);
            break;
          }
        }
      }

      // ── Settle detection ──
      if (phaseRef.current === 'shooting') {
        const bodies = [...coinsRef.current.filter(c => !c.pocketed).map(c => c.body), striker];
        const moving = bodies.some(b => Math.abs(b.velocity.x) > SETTLE_VEL || Math.abs(b.velocity.y) > SETTLE_VEL);
        if (!moving) {
          settled++;
          if (settled >= SETTLE_TICKS) {
            settled = 0;
            phaseRef.current = 'aiming'; setPhase('aiming');
            Matter.Body.setPosition(striker, { x: -300, y: -300 });
            Matter.Body.setVelocity(striker,  { x: 0, y: 0 });
            if (coverRef.current) {
              coverRef.current = false; queenByRef.current = null;
              // Return queen to centre
              const qb = Matter.Bodies.circle(CX, CY, CR, { restitution: 0.78, friction: 0.018, frictionAir: 0.012, label: 'queen-return' });
              coinsRef.current.push({ id: Date.now(), body: qb, color: 'red', pocketed: false });
              Matter.World.add(world, qb);
            }
            nextTurnRef.current(pocketed);
          }
        } else { settled = 0; }
      }

      // ── Render ──
      if (ctx && canvas) {
        const humanNow = isHumanTurnNow();
        const phase    = phaseRef.current;
        ctx.clearRect(0, 0, CS, CS);

        // Board
        drawBoard(ctx, humanNow, myColor, phase);

        // Coins
        for (const coin of coinsRef.current) {
          if (coin.pocketed) continue;
          drawCoin(ctx, coin.body.position.x, coin.body.position.y, coin.color);
        }

        // Physics striker (moving, after shot)
        if (striker.position.x > 0) {
          drawStriker(ctx, striker.position.x, striker.position.y, turnRef.current, false);
        }

        // Preview striker on baseline (human aiming phase)
        if (humanNow && phase === 'aiming') {
          const sy = turnRef.current === 'black' ? BLACK_BASELINE_Y : WHITE_BASELINE_Y;
          drawStriker(ctx, strikerXRef.current, sy, turnRef.current, true);

          // Aim line
          if (aimRef.current && draggingRef.current) {
            drawAimLine(ctx, strikerXRef.current, sy, aimRef.current.angle, aimRef.current.power);
          }

          // "Drag here" hint arrow when not yet dragging
          if (!draggingRef.current) {
            const sy2 = sy;
            ctx.save();
            ctx.fillStyle = 'rgba(255,220,80,0.7)';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('← drag to aim & shoot →', CX, sy2 + (turnRef.current === 'black' ? 16 : -16));
            ctx.restore();
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // ── Trigger AI first move if AI goes first ────────────────────────────
    const aiFirst = mode === 'spectate' || (mode === 'pva' && myColor !== 'black');
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    if (aiFirst) {
      initTimer = setTimeout(() => nextTurnRef.current(false), 700);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (initTimer) clearTimeout(initTimer);
      Matter.Engine.clear(engine);
      Matter.World.clear(world, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas pos helper ──────────────────────────────────────────────────────
  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect    = canvas.getBoundingClientRect();
    const scale   = CS / rect.width;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
  }, []);

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isHumanTurnNow() || phaseRef.current !== 'aiming') return;
    const pos = getCanvasPos(e);
    draggingRef.current  = true;
    dragStartRef.current = pos;
    aimRef.current       = null;
    setHint(false);
  }, [isHumanTurnNow, getCanvasPos]);

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingRef.current || !isHumanTurnNow()) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    // Direction = dragStart → current (flick style: "drag where you want striker to go")
    const dx  = pos.x - dragStartRef.current.x;
    const dy  = pos.y - dragStartRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) { aimRef.current = null; return; }
    const angle = Math.atan2(dy, dx);
    const power = Math.min(dist / 9, MAX_POWER);
    aimRef.current = { angle, power };
  }, [isHumanTurnNow, getCanvasPos]);

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current || !isHumanTurnNow() || phaseRef.current !== 'aiming') {
      draggingRef.current = false; return;
    }
    draggingRef.current = false;
    const aim = aimRef.current;
    if (!aim || aim.power < 0.6) { aimRef.current = null; return; }

    const striker = strikerRef.current;
    if (!striker) return;
    const t  = turnRef.current;
    const sy = t === 'black' ? BLACK_BASELINE_Y : WHITE_BASELINE_Y;
    const sx = strikerXRef.current;

    Matter.Body.setPosition(striker, { x: sx, y: sy });
    Matter.Body.setVelocity(striker,  { x: 0, y: 0 });
    Matter.Body.setStatic(striker, false);
    Matter.Body.setVelocity(striker, {
      x: Math.cos(aim.angle) * aim.power * 1.5,
      y: Math.sin(aim.angle) * aim.power * 1.5,
    });
    aimRef.current   = null;
    phaseRef.current = 'shooting';
    setPhase('shooting');
  }, [isHumanTurnNow]);

  const handleSlider = (v: number) => {
    strikerXRef.current = v; setStrikerX(v);
  };

  const confirmPass = () => setPassReady(false);
  const humanTurn   = isHumanTurnNow();
  const isAiming    = phase === 'aiming';

  return (
    <div className="flex flex-col items-center gap-3 w-full">

      {/* ── Score bar ── */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: 'radial-gradient(circle at 35% 35%, #6a6a90, #0a0a12)', border: '1.5px solid rgba(120,120,200,0.6)', boxShadow: turn === 'black' ? '0 0 10px rgba(160,140,255,0.7)' : 'none' }} />
          <span className={`text-[12px] font-mono ${turn === 'black' ? 'text-white font-bold' : 'text-white/35'}`}>
            {mode === 'pva' && myColor !== 'black' ? (blackAvatar?.name ?? 'Black') : 'Black'}
          </span>
          <span className="text-[20px] font-light ml-1 text-white">{scores.black}</span>
        </div>

        <p className="text-[9px] uppercase tracking-[0.25em] font-mono text-white/25">{message}</p>

        <div className="flex items-center gap-2.5">
          <span className="text-[20px] font-light mr-1 text-white">{scores.white}</span>
          <span className={`text-[12px] font-mono ${turn === 'white' ? 'text-white font-bold' : 'text-white/35'}`}>
            {mode === 'pva' && myColor !== 'white' ? (whiteAvatar?.name ?? 'White') : 'White'}
          </span>
          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: 'radial-gradient(circle at 35% 35%, #faf5e4, #9a8850)', border: '1.5px solid rgba(240,215,140,0.7)', boxShadow: turn === 'white' ? '0 0 10px rgba(255,210,80,0.7)' : 'none' }} />
        </div>
      </div>

      {/* ── Canvas (full-width, square) ── */}
      <div className="w-full relative">
        <canvas
          ref={canvasRef}
          width={CS} height={CS}
          style={{ width: '100%', height: 'auto', borderRadius: 14, touchAction: 'none',
            cursor: humanTurn && isAiming ? 'crosshair' : 'default',
            boxShadow: '0 0 40px rgba(100,60,180,0.4), 0 8px 32px rgba(0,0,0,0.7)' }}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}   onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />

        {/* AI thinking overlay */}
        {!humanTurn && isAiming && (
          <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full" style={{ background: 'rgba(10,8,28,0.82)', border: '1px solid rgba(180,130,255,0.3)', backdropFilter: 'blur(12px)' }}>
              <div className="w-4 h-4 rounded-full border-2 border-purple-400/20 border-t-purple-400 animate-spin" />
              <span className="text-[11px] font-mono text-purple-300">{message}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Striker position slider (human aiming) ── */}
      {humanTurn && isAiming && !passReady && (
        <div className="w-full px-2">
          <p className="text-center text-[10px] uppercase tracking-[0.22em] font-mono mb-1.5 text-white/30">
            ← Slide to position striker
          </p>
          <input type="range" min={STR_MIN_X} max={STR_MAX_X}
            value={strikerX}
            onChange={e => handleSlider(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          {hint && (
            <p className="text-center text-[10px] font-mono mt-1 text-amber-400/60">
              Then drag on the board to aim &amp; release to shoot
            </p>
          )}
        </div>
      )}

      {/* ── PvP pass prompt ── */}
      {passReady && mode === 'pvp' && (
        <div className="w-full p-4 rounded-2xl text-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <p className="text-[13px] font-semibold mb-3 text-purple-300">
            Pass to {turn === 'black' ? 'Black' : 'White'} player
          </p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={confirmPass}
            className="px-8 py-2.5 rounded-xl text-[12px] font-mono uppercase tracking-wider text-white"
            style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.6),rgba(109,40,217,0.65))', border: '1px solid rgba(139,92,246,0.4)' }}>
            I'm ready
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Mode Select
// ─────────────────────────────────────────────────────────────────────────────
function ModeSelectScreen({ onSelect }: { onSelect: (m: GameMode) => void }) {
  const modes = [
    { id: 'pvp'      as GameMode, icon: '👥', label: 'Pass & Play',  desc: 'Two humans, one device'      },
    { id: 'pva'      as GameMode, icon: '🤖', label: 'vs Avatar',    desc: 'Challenge an AI opponent'    },
    { id: 'spectate' as GameMode, icon: '👁️',  label: 'Spectate',     desc: 'Watch two AIs battle it out' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-[10px] uppercase tracking-[0.3em] font-mono text-white/30 mb-2">Select Game Mode</p>
      {modes.map(m => (
        <motion.button key={m.id} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(m.id)}
          className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <span className="text-3xl">{m.icon}</span>
          <div>
            <p className="text-[14px] font-semibold text-white">{m.label}</p>
            <p className="text-[12px] mt-0.5 text-white/40">{m.desc}</p>
          </div>
          <svg viewBox="0 0 24 24" className="w-4 h-4 ml-auto stroke-white/20" fill="none" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </motion.button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Avatar Select
// ─────────────────────────────────────────────────────────────────────────────
function AvatarSelectScreen({ onSelect, title }: { onSelect: (av: CarromAvatar) => void; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-[10px] uppercase tracking-[0.3em] font-mono text-white/30 mb-1">{title}</p>
      {CARROM_AVATARS.map(av => (
        <motion.button key={av.name} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(av)}
          className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <img src={av.image} alt={av.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            style={{ border: '2px solid rgba(139,92,246,0.4)' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white">{av.name}</p>
            <p className="text-[11px] text-white/40">{av.role}</p>
          </div>
          {/* Skill dots */}
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <p className="text-[9px] uppercase tracking-widest font-mono text-white/25">Skill</p>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => {
                const lvl = av.noise <= 3 ? 5 : av.noise <= 8 ? 4 : av.noise <= 15 ? 3 : av.noise <= 20 ? 2 : 1;
                return <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= lvl ? (lvl >= 5 ? 'bg-red-500' : lvl >= 4 ? 'bg-orange-400' : lvl >= 3 ? 'bg-yellow-400' : 'bg-green-400') : 'bg-white/10'}`} />;
              })}
            </div>
            <p className={`text-[9px] font-mono ${av.noise <= 3 ? 'text-red-400' : av.noise <= 8 ? 'text-orange-400' : av.noise <= 15 ? 'text-yellow-400' : 'text-green-400'}`}>
              {av.noise <= 3 ? 'Grandmaster' : av.noise <= 8 ? 'Expert' : av.noise <= 15 ? 'Intermediate' : 'Beginner'}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Color Select
// ─────────────────────────────────────────────────────────────────────────────
function ColorSelectScreen({ onSelect }: { onSelect: (c: Player) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-[10px] uppercase tracking-[0.3em] font-mono text-white/30">Choose Your Side</p>
      <p className="text-center text-[12px] text-white/40">Black opens the game</p>
      <div className="flex gap-4">
        {(['black', 'white'] as const).map(color => (
          <motion.button key={color} whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(color)}
            className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div className="w-16 h-16 rounded-full" style={
              color === 'black'
                ? { background: 'radial-gradient(circle at 35% 35%, #6a6a90, #0a0a12)', border: '2px solid rgba(120,120,200,0.6)', boxShadow: '0 0 20px rgba(140,120,255,0.45)' }
                : { background: 'radial-gradient(circle at 35% 35%, #faf5e4, #9a8850)', border: '2px solid rgba(240,215,140,0.7)', boxShadow: '0 0 20px rgba(255,210,80,0.4)' }
            } />
            <p className="text-[14px] font-semibold capitalize text-white">{color}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Result
// ─────────────────────────────────────────────────────────────────────────────
function ResultScreen({ myScore, oppScore, onPlayAgain, onClose }: {
  myScore: number; oppScore: number; onPlayAgain: () => void; onClose: () => void;
}) {
  const won = myScore > oppScore, draw = myScore === oppScore;
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="text-6xl">{won ? '🏆' : draw ? '🤝' : '😔'}</div>
      <p className="text-[24px] font-bold text-white">{won ? 'You Win!' : draw ? 'Draw!' : 'Opponent Wins'}</p>
      <div className="flex gap-8 px-10 py-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-center">
          <p className="text-[32px] font-light text-white">{myScore}</p>
          <p className="text-[9px] uppercase tracking-widest font-mono text-white/30">You</p>
        </div>
        <div className="w-[1px] self-stretch bg-white/10" />
        <div className="text-center">
          <p className="text-[32px] font-light text-white">{oppScore}</p>
          <p className="text-[9px] uppercase tracking-widest font-mono text-white/30">Opponent</p>
        </div>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <motion.button whileTap={{ scale: 0.96 }} onClick={onPlayAgain}
          className="flex-1 py-3.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.55),rgba(109,40,217,0.6))', border: '1px solid rgba(139,92,246,0.4)' }}>
          Play Again
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onClose}
          className="flex-1 py-3.5 rounded-xl text-[13px] font-semibold text-white/55 border border-white/10">
          Close
        </motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT MODAL
// ─────────────────────────────────────────────────────────────────────────────
type Screen = 'mode' | 'avatar1' | 'avatar2' | 'color' | 'game' | 'result';

export default function CosmicCarromModal({ onClose }: { lm?: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const [screen,     setScreen]     = useState<Screen>('mode');
  const [gameMode,   setGameMode]   = useState<GameMode>('pva');
  const [myColor,    setMyColor]    = useState<Player>('black');
  const [avatar1,    setAvatar1]    = useState<CarromAvatar | null>(null);
  const [avatar2,    setAvatar2]    = useState<CarromAvatar | null>(null);
  const [resultData, setResultData] = useState<{ my: number; opp: number } | null>(null);
  const [gameKey,    setGameKey]    = useState(0);

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setScreen(mode === 'pvp' ? 'game' : 'avatar1');
  };

  const handleAvatar1 = (av: CarromAvatar) => {
    setAvatar1(av);
    setScreen(gameMode === 'spectate' ? 'avatar2' : 'color');
  };

  const handleAvatar2 = (av: CarromAvatar) => { setAvatar2(av); setScreen('game'); };
  const handleColor   = (c: Player) => { setMyColor(c); setScreen('game'); };

  const handleGameEnd = async (myScore: number, oppScore: number, mode: GameMode, opponent?: string) => {
    setResultData({ my: myScore, opp: oppScore });
    setScreen('result');
    if (user && mode !== 'spectate') {
      const result: 'win' | 'loss' | 'draw' = myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw';
      await supabase.from('carrom_history').insert({
        user_id: user.id, mode, opponent: opponent ?? null, result,
        my_score: myScore, opp_score: oppScore,
        profit: result === 'win' ? 1 : result === 'loss' ? -1 : 0,
      });
    }
  };

  const playAgain = () => { setGameKey(k => k + 1); setResultData(null); setScreen('game'); };
  const goBack    = () => { if (screen === 'mode') onClose(); else setScreen('mode'); };

  const blackAvatar = gameMode === 'pva'
    ? (myColor === 'black' ? undefined : avatar1 ?? undefined)
    : gameMode === 'spectate' ? avatar1 ?? undefined : undefined;
  const whiteAvatar = gameMode === 'pva'
    ? (myColor === 'white' ? undefined : avatar1 ?? undefined)
    : gameMode === 'spectate' ? avatar2 ?? undefined : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[300] flex flex-col overflow-hidden"
      style={{ background: '#06040f' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 h-14"
        style={{ background: 'rgba(10,8,22,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        <motion.button whileTap={{ scale: 0.94 }} onClick={goBack}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-mono text-white/40 hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {screen === 'mode' ? 'Close' : 'Back'}
        </motion.button>

        <div className="flex items-center gap-2.5">
          <span className="text-[20px]">🎯</span>
          <span className="text-[15px] font-bold tracking-tight text-white">Cosmic Carrom</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Content — game screen uses full width, others use centered column */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          {screen === 'game' ? (
            <motion.div key={`game-${gameKey}`} className="w-full px-2 py-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CarromBoard key={gameKey} mode={gameMode} myColor={myColor}
                blackAvatar={blackAvatar} whiteAvatar={whiteAvatar}
                onGameEnd={handleGameEnd} />
            </motion.div>
          ) : (
            <motion.div key={screen} className="max-w-md mx-auto px-4 py-6"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {screen === 'mode'    && <ModeSelectScreen onSelect={handleModeSelect} />}
              {screen === 'avatar1' && (
                <AvatarSelectScreen onSelect={handleAvatar1}
                  title={gameMode === 'spectate' ? 'Choose Black Player' : 'Choose Your Opponent'} />
              )}
              {screen === 'avatar2' && (
                <AvatarSelectScreen onSelect={handleAvatar2} title="Choose White Player" />
              )}
              {screen === 'color'   && <ColorSelectScreen onSelect={handleColor} />}
              {screen === 'result'  && resultData && (
                <ResultScreen myScore={resultData.my} oppScore={resultData.opp}
                  onPlayAgain={playAgain} onClose={onClose} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

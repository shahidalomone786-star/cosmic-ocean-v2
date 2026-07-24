import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Matter from 'matter-js';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CS  = 460;           // canvas pixel size (square)
const FR  = 34;            // frame (wood border) width
const PS  = CS - 2 * FR;  // play-area side = 392
const CX  = CS / 2;        // board center X
const CY  = CS / 2;        // board center Y
const PR  = 20;            // pocket radius
const CR  = 11;            // coin radius
const SR  = 14;            // striker radius
const MAX_POWER    = 20;
const SETTLE_VEL   = 0.15;
const SETTLE_TICKS = 45;

const POCKETS = [
  { x: FR,      y: FR      }, // TL
  { x: FR + PS, y: FR      }, // TR
  { x: FR,      y: FR + PS }, // BL
  { x: FR + PS, y: FR + PS }, // BR
] as const;

// Striker baseline constraints
const STR_MIN_X = FR + PR + SR + 2;
const STR_MAX_X = FR + PS - PR - SR - 2;

// ─────────────────────────────────────────────────────────────────────────────
// AVATARS
// ─────────────────────────────────────────────────────────────────────────────
export const CARROM_AVATARS = [
  { name: 'Mom',     image: '/mehera.jpg',
    role: 'Grandmaster Strategist', noise: 1.5, delay: 900  },
  { name: 'Einstein',image: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg',
    role: 'Theoretical Physicist',  noise: 28,  delay: 1500 },
  { name: 'Feynman', image: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg',
    role: 'Quantum Pioneer',        noise: 25,  delay: 1300 },
  { name: 'Sagan',   image: '/carl-sagan.jpg',
    role: 'Cosmos Explorer',        noise: 12,  delay: 1000 },
  { name: 'Tesla',   image: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg',
    role: 'Electrical Visionary',   noise: 10,  delay: 950  },
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
// INITIAL COIN LAYOUT  (9 black + 9 white + 1 red queen = 19 pieces)
// ─────────────────────────────────────────────────────────────────────────────
function getInitialLayout(): { x: number; y: number; color: CoinColor }[] {
  const out: { x: number; y: number; color: CoinColor }[] = [];
  out.push({ x: CX, y: CY, color: 'red' });

  // Inner ring — 6 coins touching queen
  const r1 = CR * 2 + 0.5;
  for (let i = 0; i < 6; i++) {
    const a = (i * 60) * (Math.PI / 180);
    out.push({ x: CX + r1 * Math.cos(a), y: CY + r1 * Math.sin(a),
      color: i % 2 === 0 ? 'black' : 'white' });
  }

  // Outer ring — 12 coins
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
  coins: CoinState[],
  aiColor: Player,
  strikerY: number,
  noiseDeg: number,
): { sx: number; angle: number; power: number } {
  const rand = () => (Math.random() - 0.5) * 2;
  const targets = coins.filter(c => c.color === aiColor && !c.pocketed);

  // Try to find a direct pocket shot
  for (const t of targets) {
    const tx = t.body.position.x;
    const ty = t.body.position.y;
    for (const p of POCKETS) {
      if (Math.abs(p.y - ty) < 2) continue;
      // Striker must be collinear: striker → coin → pocket
      const sx = tx - (ty - strikerY) * ((p.x - tx) / (p.y - ty));
      if (sx < STR_MIN_X || sx > STR_MAX_X) continue;

      const noiseRad = (noiseDeg * Math.PI / 180) * rand();
      const base     = Math.atan2(ty - strikerY, tx - sx);
      return {
        sx:    sx + rand() * noiseDeg * 0.4,
        angle: base + noiseRad,
        power: MAX_POWER * (0.72 + Math.random() * 0.24),
      };
    }
  }

  // Fallback — aim at random own coin with noise
  const coin = targets[Math.floor(Math.random() * Math.max(1, targets.length))];
  if (!coin) return { sx: CX, angle: strikerY < CY ? Math.PI / 2 : -Math.PI / 2, power: MAX_POWER * 0.5 };
  const tx   = coin.body.position.x;
  const ty   = coin.body.position.y;
  const sx   = Math.max(STR_MIN_X, Math.min(STR_MAX_X, tx + rand() * 30));
  const base = Math.atan2(ty - strikerY, tx - sx);
  return {
    sx,
    angle: base + (noiseDeg * Math.PI / 180) * rand(),
    power: MAX_POWER * 0.65,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS DRAWING HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function drawBoard(ctx: CanvasRenderingContext2D, lm: boolean) {
  // Wood frame
  const frameGrad = ctx.createLinearGradient(0, 0, CS, CS);
  frameGrad.addColorStop(0,   lm ? '#c8a165' : '#7c4a1a');
  frameGrad.addColorStop(0.5, lm ? '#e8c07a' : '#a0601e');
  frameGrad.addColorStop(1,   lm ? '#c8a165' : '#7c4a1a');
  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  ctx.roundRect(0, 0, CS, CS, 10);
  ctx.fill();

  // Frame border
  ctx.strokeStyle = lm ? '#8b5e1f' : '#3d200a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Felt surface
  const feltGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, PS * 0.7);
  feltGrad.addColorStop(0,   lm ? '#4a7c59' : '#1e5c33');
  feltGrad.addColorStop(1,   lm ? '#355c40' : '#143d22');
  ctx.fillStyle = feltGrad;
  ctx.fillRect(FR, FR, PS, PS);

  // Diagonal corner lines
  ctx.strokeStyle = lm ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  const diag = PR + 10;
  const corners = [
    [FR + diag, FR,      FR,      FR + diag],
    [FR + PS - diag, FR,      FR + PS, FR + diag],
    [FR, FR + PS - diag, FR + diag, FR + PS],
    [FR + PS, FR + PS - diag, FR + PS - diag, FR + PS],
  ];
  for (const [x1, y1, x2, y2] of corners) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // Pockets
  for (const p of POCKETS) {
    // Shadow
    ctx.beginPath();
    ctx.arc(p.x, p.y, PR + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    // Hole
    ctx.beginPath();
    ctx.arc(p.x, p.y, PR, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
    // Net mesh hint
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(CX, CY, CR * 5, 0, Math.PI * 2);
  ctx.strokeStyle = lm ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Inner center dot
  ctx.beginPath();
  ctx.arc(CX, CY, 3, 0, Math.PI * 2);
  ctx.fillStyle = lm ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
  ctx.fill();

  // Baseline lines (bottom for white/player)
  const baselineY = FR + PS - 28;
  ctx.strokeStyle = lm ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(FR + 40, baselineY);
  ctx.lineTo(FR + PS - 40, baselineY);
  ctx.stroke();

  // Top baseline (for black / opponent)
  const topBaselineY = FR + 28;
  ctx.beginPath();
  ctx.moveTo(FR + 40, topBaselineY);
  ctx.lineTo(FR + PS - 40, topBaselineY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: CoinColor,
  radius: number,
  lm: boolean,
) {
  // Shadow
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 1.5, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();

  // Coin body
  const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  if (color === 'red') {
    grad.addColorStop(0, '#ff6b6b');
    grad.addColorStop(1, '#b91c1c');
  } else if (color === 'black') {
    grad.addColorStop(0, '#4a4a5a');
    grad.addColorStop(1, '#1a1a2a');
  } else {
    grad.addColorStop(0, '#f5f0e8');
    grad.addColorStop(1, '#c8bba0');
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Rim
  ctx.strokeStyle = color === 'red'
    ? 'rgba(220,50,50,0.7)'
    : color === 'black'
      ? 'rgba(80,80,100,0.6)'
      : 'rgba(200,190,170,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Highlight
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();

  // Queen cross mark
  if (color === 'red') {
    ctx.strokeStyle = 'rgba(255,200,180,0.8)';
    ctx.lineWidth   = 1.2;
    const h = radius * 0.45;
    ctx.beginPath();
    ctx.moveTo(x - h, y); ctx.lineTo(x + h, y);
    ctx.moveTo(x, y - h); ctx.lineTo(x, y + h);
    ctx.stroke();
  }
}

function drawStriker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  playerColor: Player,
) {
  // Shadow
  ctx.beginPath();
  ctx.arc(x + 2, y + 2, SR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();

  // Body
  const grad = ctx.createRadialGradient(x - SR * 0.3, y - SR * 0.3, 0, x, y, SR);
  if (playerColor === 'white') {
    grad.addColorStop(0, '#e8dcc8');
    grad.addColorStop(1, '#a89878');
  } else {
    grad.addColorStop(0, '#6a6a8a');
    grad.addColorStop(1, '#2a2a3a');
  }
  ctx.beginPath();
  ctx.arc(x, y, SR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Rim glow
  ctx.strokeStyle = playerColor === 'white'
    ? 'rgba(255,220,150,0.9)'
    : 'rgba(150,150,220,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight
  ctx.beginPath();
  ctx.arc(x - SR * 0.28, y - SR * 0.28, SR * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  angle: number,
  power: number,
) {
  const ex = sx + Math.cos(angle) * power * 10;
  const ey = sy + Math.sin(angle) * power * 10;

  // Dashed line
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(255,220,100,0.7)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrow tip
  const headLen = 10;
  const l1 = angle + 2.5;
  const l2 = angle - 2.5;
  ctx.fillStyle = 'rgba(255,220,100,0.9)';
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - headLen * Math.cos(l1), ey - headLen * Math.sin(l1));
  ctx.lineTo(ex - headLen * Math.cos(l2), ey - headLen * Math.sin(l2));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function playCoinSound() {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
  } catch { /* silent */ }
}

function playPocketSound() {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARROM BOARD — the live game canvas
// ─────────────────────────────────────────────────────────────────────────────
interface BoardProps {
  mode:       GameMode;
  myColor:    Player;
  blackAvatar?: CarromAvatar;
  whiteAvatar?: CarromAvatar;
  lm?:        boolean;
  onGameEnd:  (myScore: number, oppScore: number, mode: GameMode, opponent?: string) => void;
}

function CarromBoard({ mode, myColor, blackAvatar, whiteAvatar, lm, onGameEnd }: BoardProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const engineRef   = useRef<Matter.Engine | null>(null);
  const coinsRef    = useRef<CoinState[]>([]);
  const strikerRef  = useRef<Matter.Body | null>(null);
  const rafRef      = useRef<number>(0);
  const phaseRef    = useRef<GamePhase>('aiming');
  const turnRef     = useRef<Player>('black');
  const settleRef   = useRef(0);
  const aiTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strikerXRef = useRef(CX); // current slider X for striker
  const aimRef      = useRef<{ angle: number; power: number } | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef= useRef({ x: 0, y: 0 });
  const queenPocketedByRef = useRef<Player | null>(null);
  const coverNeededRef     = useRef(false);

  const [turn,      setTurn]      = useState<Player>('black');
  const [phase,     setPhase]     = useState<GamePhase>('aiming');
  const [scores,    setScores]    = useState({ black: 0, white: 0 });
  const [strikerX,  setStrikerX]  = useState(CX);
  const [message,   setMessage]   = useState('Black goes first');
  const [passReady, setPassReady] = useState(false); // for PvP: "Pass device" prompt

  // ── Determine if current player is human or AI ──────────────────────────
  const isHumanTurn = useCallback((): boolean => {
    const t = turnRef.current;
    if (mode === 'pvp') return !passReady;
    if (mode === 'spectate') return false;
    return t === myColor;
  }, [mode, myColor, passReady]);

  // ── Score counter ──────────────────────────────────────────────────────────
  const scoreRef = useRef({ black: 0, white: 0 });

  // ── Initialize Matter.js ──────────────────────────────────────────────────
  useEffect(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    engineRef.current = engine;
    const world  = engine.world;

    // Physics options
    const coinOpts = {
      restitution: 0.78, friction: 0.018,
      frictionAir: 0.012, frictionStatic: 0.02,
      label: 'coin',
    };
    const wallOpts = { isStatic: true, restitution: 0.75, friction: 0.05, label: 'wall' };

    // Walls (gap at corners for pockets)
    const gap  = PR + 4;
    const wthk = 12;
    const walls = [
      Matter.Bodies.rectangle(CX, FR - wthk / 2,     PS - gap * 2, wthk, wallOpts),
      Matter.Bodies.rectangle(CX, FR + PS + wthk / 2, PS - gap * 2, wthk, wallOpts),
      Matter.Bodies.rectangle(FR - wthk / 2, CY,     wthk, PS - gap * 2, wallOpts),
      Matter.Bodies.rectangle(FR + PS + wthk / 2, CY, wthk, PS - gap * 2, wallOpts),
    ];
    Matter.World.add(world, walls);

    // Coins
    const layout = getInitialLayout();
    const coinBodies: CoinState[] = layout.map((pos, i) => {
      const body = Matter.Bodies.circle(pos.x, pos.y, CR, { ...coinOpts, label: `coin-${i}` });
      Matter.World.add(world, body);
      return { id: i, body, color: pos.color, pocketed: false };
    });
    coinsRef.current = coinBodies;

    // Striker (starts off-screen)
    const striker = Matter.Bodies.circle(-200, -200, SR, {
      restitution: 0.7, friction: 0.02, frictionAir: 0.02, label: 'striker',
    });
    Matter.World.add(world, striker);
    strikerRef.current = striker;

    // Collision audio
    Matter.Events.on(engine, 'collisionStart', (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        const { bodyA, bodyB } = pair;
        if (
          (bodyA.label?.startsWith('coin') || bodyA.label === 'striker') &&
          (bodyB.label?.startsWith('coin') || bodyB.label === 'striker')
        ) {
          playCoinSound();
        }
      }
    });

    // RAF game loop
    let settled = 0;
    const loop = () => {
      Matter.Engine.update(engine, 1000 / 60);
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      // Pocket detection — any coin within pocket radius
      let pocketed = false;
      for (const coin of coinsRef.current) {
        if (coin.pocketed) continue;
        const { x, y } = coin.body.position;
        for (const p of POCKETS) {
          const dist = Math.hypot(x - p.x, y - p.y);
          if (dist < PR + 2) {
            coin.pocketed = true;
            Matter.World.remove(world, coin.body);
            playPocketSound();

            if (coin.color === 'red') {
              queenPocketedByRef.current = turnRef.current;
              coverNeededRef.current     = true;
            } else {
              if (coin.color === turnRef.current) {
                // Sank own coin → +1 point
                scoreRef.current[turnRef.current]++;
                setScores({ ...scoreRef.current });
              } else {
                // Sank opponent's coin → foul (no extra point)
              }
              // Cover the queen?
              if (coverNeededRef.current && queenPocketedByRef.current === turnRef.current && coin.color === turnRef.current) {
                // Queen is covered — bonus points
                scoreRef.current[turnRef.current] += 3;
                setScores({ ...scoreRef.current });
                queenPocketedByRef.current = null;
                coverNeededRef.current     = false;
              }
            }
            pocketed = true;
          }
        }
      }

      // Check striker pocketed (foul)
      if (strikerRef.current) {
        const sp = strikerRef.current.position;
        for (const p of POCKETS) {
          if (Math.hypot(sp.x - p.x, sp.y - p.y) < PR + 2) {
            // Foul: move striker off-screen and switch turn
            Matter.Body.setPosition(strikerRef.current, { x: -300, y: -300 });
            Matter.Body.setVelocity(strikerRef.current, { x: 0, y: 0 });
            phaseRef.current = 'aiming';
            setPhase('aiming');
            void nextTurn(false);
            break;
          }
        }
      }

      // Settle detection
      const allBodies = coinsRef.current.filter(c => !c.pocketed).map(c => c.body);
      if (strikerRef.current) allBodies.push(strikerRef.current);
      const moving = allBodies.some(b => {
        const v = b.velocity;
        return Math.abs(v.x) > SETTLE_VEL || Math.abs(v.y) > SETTLE_VEL;
      });

      if (phaseRef.current === 'shooting') {
        if (!moving) {
          settled++;
          if (settled >= SETTLE_TICKS) {
            settled = 0;
            phaseRef.current = 'aiming';
            setPhase('aiming');
            // Move striker off-screen
            if (strikerRef.current) {
              Matter.Body.setPosition(strikerRef.current, { x: -300, y: -300 });
              Matter.Body.setVelocity(strikerRef.current, { x: 0, y: 0 });
            }
            // Handle queen not covered
            if (coverNeededRef.current) {
              coverNeededRef.current     = false;
              queenPocketedByRef.current = null;
              // Return queen to center
              const queenCoin = { id: 999, body: Matter.Bodies.circle(CX, CY, CR, { restitution: 0.78, friction: 0.018, frictionAir: 0.012, label: 'queen-return' }), color: 'red' as CoinColor, pocketed: false };
              coinsRef.current.push(queenCoin);
              Matter.World.add(world, queenCoin.body);
            }
            void nextTurn(pocketed);
          }
        } else {
          settled = 0;
        }
      }

      // Draw frame
      render(ctx);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      Matter.Engine.clear(engine);
      Matter.World.clear(world, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Next turn logic ────────────────────────────────────────────────────────
  const nextTurn = useCallback(async (lastShotPocketed: boolean) => {
    // Check game end (9 coins per side)
    const blackLeft = coinsRef.current.filter(c => c.color === 'black' && !c.pocketed).length;
    const whiteLeft = coinsRef.current.filter(c => c.color === 'white' && !c.pocketed).length;

    if (blackLeft === 0 || whiteLeft === 0) {
      phaseRef.current = 'result';
      setPhase('result');
      setMessage(blackLeft === 0 ? 'Black wins!' : 'White wins!');
      onGameEnd(scoreRef.current[myColor], scoreRef.current[myColor === 'black' ? 'white' : 'black'], mode,
        mode === 'pva' ? (myColor === 'black' ? whiteAvatar?.name : blackAvatar?.name) : undefined);
      return;
    }

    // Same player continues if they pocketed
    if (!lastShotPocketed) {
      turnRef.current = turnRef.current === 'black' ? 'white' : 'black';
    }
    setTurn(turnRef.current);

    const t   = turnRef.current;
    const msg = t === 'black' ? "Black's turn" : "White's turn";
    setMessage(msg);

    // PvP pass-device prompt
    if (mode === 'pvp') {
      setPassReady(true);
      return;
    }

    // Is this an AI turn?
    const avatar = t === 'black' ? blackAvatar : whiteAvatar;
    if (avatar && ((mode === 'spectate') || (mode === 'pva' && t !== myColor))) {
      const delay = avatar.delay;
      setMessage(`${avatar.name} is thinking…`);
      aiTimerRef.current = setTimeout(() => {
        const strikerY = t === 'black' ? FR + 18 : FR + PS - 18;
        const shot = computeAIShot(coinsRef.current, t, strikerY, avatar.noise);
        // Move striker to position
        if (strikerRef.current) {
          const sx = Math.max(STR_MIN_X, Math.min(STR_MAX_X, shot.sx));
          Matter.Body.setPosition(strikerRef.current, { x: sx, y: strikerY });
          Matter.Body.setVelocity(strikerRef.current, { x: 0, y: 0 });
          Matter.Body.setStatic(strikerRef.current, false);
          // Apply impulse
          const vx = Math.cos(shot.angle) * shot.power;
          const vy = Math.sin(shot.angle) * shot.power;
          Matter.Body.setVelocity(strikerRef.current, { x: vx, y: vy });
          phaseRef.current = 'shooting';
          setPhase('shooting');
        }
      }, delay);
    }
  }, [mode, myColor, blackAvatar, whiteAvatar, onGameEnd]);

  // ── Pointer events (human aiming) ─────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect   = canvas.getBoundingClientRect();
    const scale  = CS / rect.width;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
  };

  const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isHumanTurn() || phaseRef.current !== 'aiming') return;
    const pos = getCanvasPos(e);
    draggingRef.current   = true;
    dragStartRef.current  = pos;
  }, [isHumanTurn]);

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingRef.current || !isHumanTurn()) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const t   = turnRef.current;
    const sy  = t === 'black' ? FR + 18 : FR + PS - 18;
    const sx  = strikerXRef.current;
    const dx  = pos.x - sx;
    const dy  = pos.y - sy;
    const dist = Math.min(Math.hypot(dx, dy), MAX_POWER * 8);
    const angle = Math.atan2(dy, dx);
    const power = dist / 8;
    aimRef.current = { angle, power };
  }, [isHumanTurn]);

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current || !isHumanTurn() || phaseRef.current !== 'aiming') return;
    draggingRef.current = false;
    const aim = aimRef.current;
    if (!aim || aim.power < 0.3) { aimRef.current = null; return; }

    const t  = turnRef.current;
    const sy = t === 'black' ? FR + 18 : FR + PS - 18;
    const sx = strikerXRef.current;

    if (strikerRef.current) {
      Matter.Body.setPosition(strikerRef.current, { x: sx, y: sy });
      Matter.Body.setVelocity(strikerRef.current, { x: 0, y: 0 });
      Matter.Body.setStatic(strikerRef.current, false);
      const vx = Math.cos(aim.angle) * aim.power * 1.4;
      const vy = Math.sin(aim.angle) * aim.power * 1.4;
      Matter.Body.setVelocity(strikerRef.current, { x: vx, y: vy });
    }
    aimRef.current   = null;
    phaseRef.current = 'shooting';
    setPhase('shooting');
  }, [isHumanTurn]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const render = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CS, CS);
    drawBoard(ctx, lm ?? false);

    // Coins
    for (const coin of coinsRef.current) {
      if (coin.pocketed) continue;
      const { x, y } = coin.body.position;
      drawCoin(ctx, x, y, coin.color, CR, lm ?? false);
    }

    // Striker (if on board)
    if (strikerRef.current) {
      const sp = strikerRef.current.position;
      if (sp.x > 0) {
        drawStriker(ctx, sp.x, sp.y, turnRef.current);
      }
    }

    // Aim line (human turn, aiming phase)
    if (phaseRef.current === 'aiming' && isHumanTurn() && aimRef.current && draggingRef.current) {
      const t  = turnRef.current;
      const sy = t === 'black' ? FR + 18 : FR + PS - 18;
      drawAimLine(ctx, strikerXRef.current, sy, aimRef.current.angle, aimRef.current.power);
    }

    // Preview striker position (human aiming)
    if (phaseRef.current === 'aiming' && isHumanTurn()) {
      const t  = turnRef.current;
      const sy = t === 'black' ? FR + 18 : FR + PS - 18;
      drawStriker(ctx, strikerXRef.current, sy, t);
    }
  };

  // Keep strikerXRef in sync with slider
  const handleSliderChange = (v: number) => {
    strikerXRef.current = v;
    setStrikerX(v);
  };

  // PvP: confirm pass
  const confirmPass = () => {
    setPassReady(false);
  };

  const humanTurn = isHumanTurn();
  const isAiming  = phase === 'aiming';

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Score bar */}
      <div className={`w-full flex items-center justify-between px-4 py-2 rounded-xl ${lm ? 'bg-black/[0.05]' : 'bg-white/[0.04]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#1a1a2a] border border-white/20" />
          <span className={`text-[12px] font-mono ${turn === 'black' && !passReady ? (lm ? 'text-gray-900 font-bold' : 'text-white font-bold') : (lm ? 'text-gray-500' : 'text-white/40')}`}>
            {mode === 'pva' && myColor !== 'black' ? (blackAvatar?.name ?? 'Black') : 'Black'}
          </span>
          <span className={`text-[16px] font-light ml-1 ${lm ? 'text-gray-900' : 'text-white'}`}>{scores.black}</span>
        </div>

        <div className={`text-[10px] uppercase tracking-widest font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>
          {message}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[16px] font-light mr-1 ${lm ? 'text-gray-900' : 'text-white'}`}>{scores.white}</span>
          <span className={`text-[12px] font-mono ${turn === 'white' && !passReady ? (lm ? 'text-gray-900 font-bold' : 'text-white font-bold') : (lm ? 'text-gray-500' : 'text-white/40')}`}>
            {mode === 'pva' && myColor !== 'white' ? (whiteAvatar?.name ?? 'White') : 'White'}
          </span>
          <div className="w-4 h-4 rounded-full bg-[#f5f0e8] border border-black/20" />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ width: CS, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CS} height={CS}
          style={{ width: '100%', height: 'auto', touchAction: 'none', cursor: humanTurn && isAiming ? 'crosshair' : 'default', borderRadius: 12 }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>

      {/* Striker slider (human aiming only) */}
      {humanTurn && isAiming && !passReady && (
        <div className="w-full px-2">
          <p className={`text-center text-[10px] uppercase tracking-widest font-mono mb-1 ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            Slide to position · Drag canvas to aim · Release to shoot
          </p>
          <input
            type="range"
            min={STR_MIN_X}
            max={STR_MAX_X}
            value={strikerX}
            onChange={e => handleSliderChange(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>
      )}

      {/* PvP pass prompt */}
      {passReady && mode === 'pvp' && (
        <div className={`w-full p-4 rounded-xl text-center ${lm ? 'bg-purple-50 border border-purple-200' : 'bg-purple-500/10 border border-purple-500/25'}`}>
          <p className={`text-[13px] font-semibold mb-3 ${lm ? 'text-purple-700' : 'text-purple-300'}`}>
            Pass to {turn === 'black' ? 'Black' : 'White'} player
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={confirmPass}
            className={`px-6 py-2 rounded-xl text-[12px] font-mono uppercase tracking-wider ${lm ? 'bg-purple-600 text-white' : 'text-white'}`}
            style={lm ? undefined : { background: 'linear-gradient(135deg,rgba(139,92,246,0.6),rgba(109,40,217,0.65))', border: '1px solid rgba(139,92,246,0.4)' }}
          >
            Ready
          </motion.button>
        </div>
      )}

      {/* AI thinking indicator */}
      {!humanTurn && phase === 'aiming' && !passReady && (
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full border-2 animate-spin ${lm ? 'border-gray-200 border-t-purple-500' : 'border-white/10 border-t-purple-400'}`} />
          <span className={`text-[11px] font-mono ${lm ? 'text-gray-500' : 'text-white/40'}`}>{message}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Mode Select
// ─────────────────────────────────────────────────────────────────────────────
function ModeSelectScreen({ onSelect, lm }: {
  onSelect: (mode: GameMode) => void;
  lm?: boolean;
}) {
  const modes = [
    { id: 'pvp'      as GameMode, icon: '👥', label: 'Pass & Play',     desc: 'Two humans, one device'      },
    { id: 'pva'      as GameMode, icon: '🤖', label: 'vs Avatar',       desc: 'Challenge an AI opponent'    },
    { id: 'spectate' as GameMode, icon: '👁️',  label: 'Spectate',        desc: 'Watch two AIs battle it out' },
  ];
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className={`text-center text-[10px] uppercase tracking-[0.3em] font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>
        Select Game Mode
      </p>
      {modes.map(m => (
        <motion.button
          key={m.id}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(m.id)}
          className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${lm ? 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm' : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18]'}`}
        >
          <span className="text-3xl">{m.icon}</span>
          <div>
            <p className={`text-[14px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>{m.label}</p>
            <p className={`text-[12px] mt-0.5 ${lm ? 'text-gray-500' : 'text-white/40'}`}>{m.desc}</p>
          </div>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ml-auto flex-shrink-0 ${lm ? 'stroke-gray-300' : 'stroke-white/20'}`} fill="none" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </motion.button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Avatar Select
// ─────────────────────────────────────────────────────────────────────────────
function AvatarSelectScreen({ onSelect, title, lm }: {
  onSelect: (avatar: CarromAvatar) => void;
  title:    string;
  lm?:      boolean;
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <p className={`text-center text-[10px] uppercase tracking-[0.3em] font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>{title}</p>
      {CARROM_AVATARS.map(av => (
        <motion.button
          key={av.name}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(av)}
          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${lm ? 'bg-white border-gray-200 hover:border-purple-300' : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.16]'}`}
        >
          <img src={av.image} alt={av.name}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-purple-400/30"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-[14px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>{av.name}</p>
            <p className={`text-[11px] ${lm ? 'text-gray-500' : 'text-white/40'}`}>{av.role}</p>
          </div>
          {/* Difficulty indicator */}
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <p className={`text-[9px] uppercase tracking-widest font-mono ${lm ? 'text-gray-400' : 'text-white/25'}`}>Skill</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${
                  av.noise <= 5  ? (i <= 5 ? 'bg-red-500'    : 'bg-white/10') :
                  av.noise <= 15 ? (i <= 3 ? 'bg-yellow-500' : 'bg-white/10') :
                                   (i <= 1 ? 'bg-green-400'  : 'bg-white/10')
                }`} />
              ))}
            </div>
            <p className={`text-[9px] font-mono ${av.noise <= 5 ? 'text-red-400' : av.noise <= 15 ? 'text-yellow-400' : 'text-green-400'}`}>
              {av.noise <= 5 ? 'Grandmaster' : av.noise <= 15 ? 'Intermediate' : 'Novice'}
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
function ColorSelectScreen({ onSelect, lm }: {
  onSelect: (color: Player) => void;
  lm?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className={`text-center text-[10px] uppercase tracking-[0.3em] font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>Choose Your Side</p>
      <p className={`text-center text-[12px] ${lm ? 'text-gray-500' : 'text-white/40'}`}>Black goes first</p>
      <div className="flex gap-3">
        {(['black', 'white'] as const).map(color => (
          <motion.button key={color} whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(color)}
            className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${lm ? 'bg-white border-gray-200 hover:border-purple-300' : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'}`}
          >
            <div className={`w-14 h-14 rounded-full border-2 shadow-lg ${
              color === 'black'
                ? 'bg-[#1a1a2a] border-white/20 shadow-white/5'
                : 'bg-[#f5f0e8] border-black/15 shadow-black/5'
            }`} />
            <p className={`text-[13px] font-semibold capitalize ${lm ? 'text-gray-900' : 'text-white'}`}>{color}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Result
// ─────────────────────────────────────────────────────────────────────────────
function ResultScreen({ myScore, oppScore, myColor, lm, onPlayAgain, onClose }: {
  myScore: number; oppScore: number; myColor: Player;
  lm?: boolean; onPlayAgain: () => void; onClose: () => void;
}) {
  const won = myScore > oppScore;
  const draw = myScore === oppScore;
  return (
    <div className="flex flex-col items-center gap-5 py-8 w-full">
      <div className="text-6xl">{won ? '🏆' : draw ? '🤝' : '😔'}</div>
      <p className={`text-[22px] font-bold ${lm ? 'text-gray-900' : 'text-white'}`}>
        {won ? 'You Win!' : draw ? 'Draw!' : 'Opponent Wins'}
      </p>
      <div className={`flex gap-6 px-8 py-4 rounded-2xl border ${lm ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.04] border-white/[0.08]'}`}>
        <div className="text-center">
          <p className={`text-[28px] font-light ${lm ? 'text-gray-900' : 'text-white'}`}>{myScore}</p>
          <p className={`text-[9px] uppercase tracking-widest font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>You</p>
        </div>
        <div className={`w-[1px] self-stretch ${lm ? 'bg-gray-200' : 'bg-white/10'}`} />
        <div className="text-center">
          <p className={`text-[28px] font-light ${lm ? 'text-gray-900' : 'text-white'}`}>{oppScore}</p>
          <p className={`text-[9px] uppercase tracking-widest font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>Opponent</p>
        </div>
      </div>
      <div className="flex gap-3 w-full">
        <motion.button whileTap={{ scale: 0.96 }} onClick={onPlayAgain}
          className={`flex-1 py-3 rounded-xl text-[13px] font-semibold ${lm ? 'bg-purple-600 text-white' : 'text-white'}`}
          style={lm ? undefined : { background: 'linear-gradient(135deg,rgba(139,92,246,0.55),rgba(109,40,217,0.6))', border: '1px solid rgba(139,92,246,0.4)' }}
        >
          Play Again
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onClose}
          className={`flex-1 py-3 rounded-xl text-[13px] font-semibold border ${lm ? 'border-gray-200 text-gray-700' : 'border-white/[0.12] text-white/60'}`}
        >
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

export default function CosmicCarromModal({ lm, onClose }: { lm?: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const [screen,      setScreen]      = useState<Screen>('mode');
  const [gameMode,    setGameMode]    = useState<GameMode>('pva');
  const [myColor,     setMyColor]     = useState<Player>('black');
  const [avatar1,     setAvatar1]     = useState<CarromAvatar | null>(null); // black (for pva=opponent, spectate=black)
  const [avatar2,     setAvatar2]     = useState<CarromAvatar | null>(null); // white (spectate)
  const [resultData,  setResultData]  = useState<{ my: number; opp: number } | null>(null);
  const [gameKey,     setGameKey]     = useState(0);

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === 'pvp') { setScreen('game'); }
    else if (mode === 'pva') { setScreen('avatar1'); }
    else { setScreen('avatar1'); }
  };

  const handleAvatar1 = (av: CarromAvatar) => {
    setAvatar1(av);
    if (gameMode === 'spectate') setScreen('avatar2');
    else setScreen('color');
  };

  const handleAvatar2 = (av: CarromAvatar) => {
    setAvatar2(av);
    setScreen('game');
  };

  const handleColorSelect = (color: Player) => {
    setMyColor(color);
    setScreen('game');
  };

  const handleGameEnd = async (myScore: number, oppScore: number, mode: GameMode, opponent?: string) => {
    setResultData({ my: myScore, opp: oppScore });
    setScreen('result');

    if (user && mode !== 'spectate') {
      const result: 'win' | 'loss' | 'draw' =
        myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw';
      await supabase.from('carrom_history').insert({
        user_id:   user.id,
        mode,
        opponent:  opponent ?? null,
        result,
        my_score:  myScore,
        opp_score: oppScore,
        profit:    result === 'win' ? 1 : result === 'loss' ? -1 : 0,
      });
    }
  };

  const playAgain = () => {
    setGameKey(k => k + 1);
    setResultData(null);
    setScreen('game');
  };

  // Determine black/white avatar for game
  const blackAvatar = gameMode === 'pva'
    ? (myColor === 'black' ? null : avatar1 ?? undefined)
    : gameMode === 'spectate' ? avatar1 ?? undefined : undefined;
  const whiteAvatar = gameMode === 'pva'
    ? (myColor === 'white' ? null : avatar1 ?? undefined)
    : gameMode === 'spectate' ? avatar2 ?? undefined : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-0 z-[300] flex flex-col overflow-hidden ${lm ? 'bg-gray-50' : 'bg-[#080810]'}`}
    >
      {/* Header */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 h-14 border-b ${lm ? 'bg-white border-gray-100' : 'bg-[#0a0a18] border-white/[0.06]'}`}>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={screen === 'mode' ? onClose : () => setScreen('mode')}
          className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-mono ${lm ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></svg>
          {screen === 'mode' ? 'Close' : 'Back'}
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="text-[18px]">🎯</span>
          <span className={`text-[15px] font-bold tracking-tight ${lm ? 'text-gray-900' : 'text-white'}`}>Cosmic Carrom</span>
        </div>

        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="max-w-md mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            {screen === 'mode' && (
              <motion.div key="mode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ModeSelectScreen onSelect={handleModeSelect} lm={lm} />
              </motion.div>
            )}
            {screen === 'avatar1' && (
              <motion.div key="avatar1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <AvatarSelectScreen
                  onSelect={handleAvatar1} lm={lm}
                  title={gameMode === 'spectate' ? 'Choose Black Player' : 'Choose Your Opponent'}
                />
              </motion.div>
            )}
            {screen === 'avatar2' && (
              <motion.div key="avatar2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <AvatarSelectScreen onSelect={handleAvatar2} lm={lm} title="Choose White Player" />
              </motion.div>
            )}
            {screen === 'color' && (
              <motion.div key="color" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ColorSelectScreen onSelect={handleColorSelect} lm={lm} />
              </motion.div>
            )}
            {screen === 'game' && (
              <motion.div key={`game-${gameKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CarromBoard
                  key={gameKey}
                  mode={gameMode}
                  myColor={myColor}
                  blackAvatar={blackAvatar as CarromAvatar | undefined}
                  whiteAvatar={whiteAvatar as CarromAvatar | undefined}
                  lm={lm}
                  onGameEnd={handleGameEnd}
                />
              </motion.div>
            )}
            {screen === 'result' && resultData && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <ResultScreen
                  myScore={resultData.my} oppScore={resultData.opp}
                  myColor={myColor} lm={lm}
                  onPlayAgain={playAgain}
                  onClose={onClose}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ─── Avatar definitions ────────────────────────────────────────────────────────
const CHESS_AVATARS = [
  { name: 'Albert Einstein', role: 'Theoretical Physicist',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg', depth: 3 },
  { name: 'Richard Feynman', role: 'Quantum Pioneer',
    image: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg', depth: 3 },
  { name: 'Carl Sagan', role: 'Cosmos Explorer',
    image: '/carl-sagan.jpg', depth: 3 },
  { name: 'Nikola Tesla', role: 'Electrical Visionary',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg', depth: 3 },
  { name: 'Mahera Jannat', role: 'Ultimate Supporter & Guide',
    image: '/mehera.jpg', depth: 1 },
] as const;

type ChessAvatar = (typeof CHESS_AVATARS)[number];
type GameMode   = 'pass-and-play' | 'challenge-avatar' | 'clash-of-geniuses';
type Screen     = 'mode-select' | 'avatar-select-challenge' | 'avatar-select-clash-white' | 'avatar-select-clash-black' | 'board';

// ─── Piece-square tables (white's perspective, index 0 = a8) ─────────────────
const PST_PAWN   = [ 0, 0, 0, 0, 0, 0, 0, 0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0 ];
const PST_KNIGHT = [ -50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50 ];
const PST_BISHOP = [ -20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20 ];
const PST_ROOK   = [ 0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0 ];
const PST_QUEEN  = [ -20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20 ];
const PST_KING   = [ -30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20 ];

const PIECE_VALUES: Record<string, number> = { p:100, n:320, b:330, r:500, q:900, k:20000 };
const MATERIAL_VALUES: Record<string, number> = { p:1, n:3, b:3, r:5, q:9 };
const PST_MAP: Record<string, number[]> = { p:PST_PAWN, n:PST_KNIGHT, b:PST_BISHOP, r:PST_ROOK, q:PST_QUEEN, k:PST_KING };

const INIT_TIME = 600; // 10 minutes in seconds

// ─── Audio: Web Audio API click/thud sound ────────────────────────────────────
function playMoveSound() {
  try {
    const AudioCtx = (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
    oscillator.addEventListener('ended', () => { void ctx.close().catch(() => undefined); }, { once: true });
  } catch { /* silent fail */ }
}

// ─── Material advantage calc ──────────────────────────────────────────────────
function getMaterialScore(chess: Chess): { white: number; black: number; advantage: number; leader: 'w' | 'b' | 'even' } {
  let w = 0, b = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.type === 'k') continue;
      const val = MATERIAL_VALUES[sq.type] ?? 0;
      if (sq.color === 'w') w += val; else b += val;
    }
  }
  const diff = w - b;
  return { white: w, black: b, advantage: Math.abs(diff), leader: diff > 0 ? 'w' : diff < 0 ? 'b' : 'even' };
}

// ─── Evaluation ───────────────────────────────────────────────────────────────
function squareIdx(sq: string): number {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  return (7 - rank) * 8 + file;
}

function evaluateBoard(chess: Chess): number {
  let score = 0;
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p) continue;
      const sq = p.square;
      const idx = squareIdx(sq);
      const pst = PST_MAP[p.type] ?? [];
      const pstVal = p.color === 'w' ? (pst[idx] ?? 0) : (pst[63 - idx] ?? 0);
      const val = PIECE_VALUES[p.type] + pstVal;
      score += p.color === 'w' ? val : -val;
    }
  }
  return score;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, maximising: boolean): number {
  if (depth === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) return maximising ? -99999 : 99999;
    if (chess.isDraw()) return 0;
    return evaluateBoard(chess);
  }
  const moves = chess.moves();
  if (maximising) {
    let best = -Infinity;
    for (const m of moves) {
      chess.move(m); best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false)); chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      chess.move(m); best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true)); chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(chess: Chess, depth: number): string | null {
  const moves = chess.moves();
  if (moves.length === 0) return null;
  if (depth <= 1) return moves[Math.floor(Math.random() * moves.length)]; // Mahera: random
  const isWhite = chess.turn() === 'w';
  let bestMove: string | null = null;
  let bestScore = isWhite ? -Infinity : Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();
    if (isWhite ? score > bestScore : score < bestScore) { bestScore = score; bestMove = m; }
  }
  return bestMove;
}

// ─── Time formatter ───────────────────────────────────────────────────────────
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { onClose: () => void; lm?: boolean; onGameEnd?: (result: 'win' | 'loss') => void; }

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function GrandmasterChessModal({ onClose, lm, onGameEnd }: Props) {
  const [screen,          setScreen]          = useState<Screen>('mode-select');
  const [gameMode,        setGameMode]        = useState<GameMode>('pass-and-play');
  const [challengeAvatar, setChallengeAvatar] = useState<ChessAvatar | null>(null);
  const [clashWhite,      setClashWhite]      = useState<ChessAvatar | null>(null);
  const [clashBlack,      setClashBlack]      = useState<ChessAvatar | null>(null);

  const [game,        setGame]        = useState(() => new Chess());
  const [fen,         setFen]         = useState(() => new Chess().fen());
  const [status,      setStatus]      = useState('');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isAIThinking,setIsAIThinking]= useState(false);
  const [whiteTime,   setWhiteTime]   = useState(INIT_TIME);
  const [blackTime,   setBlackTime]   = useState(INIT_TIME);

  const aiThinkingRef   = useRef(false);
  const clashTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef= useRef<ReturnType<typeof setInterval> | null>(null);
  const gameOverRef     = useRef(false);
  // Always-current ref so the interval can read turn without restarting
  const gameRef         = useRef<Chess>(game);
  useEffect(() => { gameRef.current = game; }, [game]);

  // ── Clock: persistent tick — reads gameRef so both timers always count ──
  // KEY FIX: depends only on [screen], NOT [fen].
  // Previously the interval restarted on every fen change (each move), so the
  // 1 000 ms tick never fired during the AI's 200 ms think window → black
  // timer was stuck.  Now the interval runs continuously and reads the live
  // turn from gameRef.current at each tick.
  useEffect(() => {
    if (screen !== 'board') return;
    timerIntervalRef.current = setInterval(() => {
      if (gameRef.current.isGameOver() || gameOverRef.current) return;
      if (gameRef.current.turn() === 'w') {
        setWhiteTime(t => {
          if (t <= 1) { gameOverRef.current = true; setStatus('White ran out of time. Black wins.'); return 0; }
          return t - 1;
        });
      } else {
        setBlackTime(t => {
          if (t <= 1) { gameOverRef.current = true; setStatus('Black ran out of time. White wins.'); return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [screen]); // only restart when entering/leaving board, never on each move

  // ── Status helper ────────────────────────────────────────────────────────
  const computeStatus = useCallback((g: Chess, mode: GameMode, wAv?: ChessAvatar | null, bAv?: ChessAvatar | null): string => {
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w'
        ? (mode === 'challenge-avatar' ? (bAv?.name ?? 'Black') : 'Black')
        : (mode === 'challenge-avatar' ? 'You' : 'White');
      return `Checkmate — ${winner} wins.`;
    }
    if (g.isStalemate())            return 'Stalemate — draw.';
    if (g.isThreefoldRepetition())  return 'Draw by threefold repetition.';
    if (g.isInsufficientMaterial()) return 'Draw — insufficient material.';
    if (g.isDraw())                 return 'Draw.';
    if (g.isGameOver())             return 'Game over.';
    const inCheck = g.inCheck();
    if (mode === 'challenge-avatar') {
      return g.turn() === 'w'
        ? (inCheck ? 'You are in check — your move.' : 'Your move (White)')
        : (inCheck ? `${bAv?.name ?? 'AI'} is in check!` : `${bAv?.name ?? 'AI'} is thinking…`);
    }
    if (mode === 'clash-of-geniuses') {
      const mover = g.turn() === 'w' ? (wAv?.name ?? 'White') : (bAv?.name ?? 'Black');
      return inCheck ? `${mover} is in check!` : `${mover}'s move…`;
    }
    return inCheck ? `${g.turn() === 'w' ? 'White' : 'Black'} is in check!`
                   : `${g.turn() === 'w' ? 'White' : 'Black'}'s turn`;
  }, []);

  // ── AI trigger ───────────────────────────────────────────────────────────
  const triggerAIMove = useCallback((currentGame: Chess, depth: number, wAv?: ChessAvatar | null, bAv?: ChessAvatar | null, mode?: GameMode) => {
    if (currentGame.isGameOver() || gameOverRef.current) return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    setIsAIThinking(true);
    setTimeout(() => {
      const bestMove = getBestMove(currentGame, depth);
      if (bestMove) {
        const ng = new Chess(currentGame.fen());
        ng.move(bestMove);
        const over = ng.isGameOver();
        if (over) {
          gameOverRef.current = true;
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          if (clashTimerRef.current)    clearTimeout(clashTimerRef.current);
        }
        setGame(ng);
        setFen(ng.fen());
        setMoveHistory(prev => [...prev, bestMove]);
        setStatus(computeStatus(ng, mode ?? 'challenge-avatar', wAv, bAv));
        playMoveSound();
      }
      aiThinkingRef.current = false;
      setIsAIThinking(false);
    }, 200);
  }, [computeStatus]);

  // ── Challenge mode: AI on black's turn ───────────────────────────────────
  useEffect(() => {
    if (screen !== 'board' || gameMode !== 'challenge-avatar' || !challengeAvatar) return;
    if (gameOverRef.current || game.isGameOver()) {
      setStatus(computeStatus(game, gameMode, null, challengeAvatar));
      return;
    }
    setStatus(computeStatus(game, gameMode, null, challengeAvatar));
    if (game.turn() === 'b' && !aiThinkingRef.current) {
      triggerAIMove(game, challengeAvatar.depth, null, challengeAvatar, gameMode);
    }
  }, [screen, gameMode, game, challengeAvatar, computeStatus, triggerAIMove]);

  // ── Clash of Geniuses: both AIs take turns ───────────────────────────────
  useEffect(() => {
    if (screen !== 'board' || gameMode !== 'clash-of-geniuses' || !clashWhite || !clashBlack) return;
    if (gameOverRef.current || game.isGameOver()) {
      setStatus(computeStatus(game, gameMode, clashWhite, clashBlack));
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    setStatus(computeStatus(game, gameMode, clashWhite, clashBlack));
    if (aiThinkingRef.current) return;
    const avatar = game.turn() === 'w' ? clashWhite : clashBlack;
    clashTimerRef.current = setTimeout(() => {
      triggerAIMove(game, avatar.depth, clashWhite, clashBlack, gameMode);
    }, 1000);
    return () => { if (clashTimerRef.current) clearTimeout(clashTimerRef.current); };
  }, [screen, gameMode, game, clashWhite, clashBlack, computeStatus, triggerAIMove]);

  // ── Pass & Play status ───────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'board' || gameMode !== 'pass-and-play') return;
    if (game.isGameOver()) {
      gameOverRef.current = true;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    setStatus(computeStatus(game, gameMode));
  }, [screen, gameMode, game, computeStatus]);

  // ── Report result to parent (challenge-avatar mode only) ─────────────────
  useEffect(() => {
    if (gameMode !== 'challenge-avatar' || !onGameEnd) return;
    if (!game.isCheckmate()) return;
    // After checkmate, game.turn() is the player who IS in checkmate.
    // Black in checkmate → user (white) won; white in checkmate → user lost.
    onGameEnd(game.turn() === 'b' ? 'win' : 'loss');
  }, [game, gameMode, onGameEnd]);

  // ── Human move ───────────────────────────────────────────────────────────
  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => {
      if (!targetSquare) return false;
      if (gameMode === 'clash-of-geniuses') return false;
      if (gameMode === 'challenge-avatar' && game.turn() === 'b') return false;
      if (isAIThinking || gameOverRef.current) return false;
      if (game.isGameOver()) return false;
      try {
        const ng = new Chess(game.fen());
        const move = ng.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (!move) return false;
        if (ng.isGameOver()) {
          gameOverRef.current = true;
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        setGame(ng);
        setFen(ng.fen());
        setMoveHistory(prev => [...prev, move.san]);
        playMoveSound();
        return true;
      } catch { return false; }
    },
    [game, gameMode, isAIThinking]
  );

  // ── Start / Reset game ───────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (clashTimerRef.current) clearTimeout(clashTimerRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    aiThinkingRef.current = false;
    gameOverRef.current   = false;
    const fresh = new Chess();
    setGame(fresh);
    setFen(fresh.fen());
    setMoveHistory([]);
    setStatus('');
    setIsAIThinking(false);
    setWhiteTime(INIT_TIME);
    setBlackTime(INIT_TIME);
    setScreen('board');
  }, []);

  const resetBoard = useCallback(() => {
    if (clashTimerRef.current) clearTimeout(clashTimerRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    aiThinkingRef.current = false;
    gameOverRef.current   = false;
    const fresh = new Chess();
    setGame(fresh);
    setFen(fresh.fen());
    setMoveHistory([]);
    setStatus('');
    setIsAIThinking(false);
    setWhiteTime(INIT_TIME);
    setBlackTime(INIT_TIME);
  }, []);

  const handleBack = () => {
    if (clashTimerRef.current) clearTimeout(clashTimerRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    aiThinkingRef.current = false;
    gameOverRef.current   = false;
    if (screen === 'board') { resetBoard(); setScreen('mode-select'); }
    else if (screen === 'avatar-select-challenge')  setScreen('mode-select');
    else if (screen === 'avatar-select-clash-white') setScreen('mode-select');
    else if (screen === 'avatar-select-clash-black') setScreen('avatar-select-clash-white');
    else onClose();
  };

  // ── Player info ──────────────────────────────────────────────────────────
  const material = getMaterialScore(game);
  const whitePlayerName = gameMode === 'challenge-avatar' ? 'You' : gameMode === 'clash-of-geniuses' ? (clashWhite?.name ?? 'White') : 'White';
  const blackPlayerName = gameMode === 'challenge-avatar' ? (challengeAvatar?.name ?? 'AI') : gameMode === 'clash-of-geniuses' ? (clashBlack?.name ?? 'Black') : 'Black';
  const whiteImage      = gameMode === 'clash-of-geniuses' ? clashWhite?.image : undefined;
  const blackImage      = gameMode === 'challenge-avatar' ? challengeAvatar?.image : gameMode === 'clash-of-geniuses' ? clashBlack?.image : undefined;

  // ── Shared shell ─────────────────────────────────────────────────────────
  return (
    <motion.div
      key="chess-modal"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-0 z-[300] flex flex-col overflow-hidden ${lm ? 'bg-white text-slate-900' : 'bg-[#0b0d14] text-white'}`}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${lm ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0d0f18]'}`}>
        <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }} onClick={handleBack}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-all ${
            lm ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
          }`}>
          <span>&#8592;</span><span>Back</span>
        </motion.button>
        <div className="flex-1 min-w-0">
          <span className={`text-[13px] font-semibold tracking-wide truncate ${lm ? 'text-slate-900' : 'text-slate-100'}`}>
            {screen === 'mode-select'              ? 'Grandmaster Chess'             :
             screen === 'avatar-select-challenge'  ? 'Choose Your Opponent'          :
             screen === 'avatar-select-clash-white'? 'Clash — Select White'          :
             screen === 'avatar-select-clash-black'? 'Clash — Select Black'          :
             gameMode === 'pass-and-play'          ? 'Pass & Play'                   :
             gameMode === 'challenge-avatar'        ? `You vs ${challengeAvatar?.name ?? ''}` :
             `${clashWhite?.name ?? 'White'} vs ${clashBlack?.name ?? 'Black'}`}
          </span>
        </div>
        <button onClick={onClose}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[13px] transition-all ${
            lm ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100' : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-700'
          }`}>&#x2715;</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {screen === 'mode-select' && (
            <ModeSelectScreen key="ms" lm={lm} onSelect={(mode) => {
              setGameMode(mode);
              if (mode === 'pass-and-play')       startGame();
              else if (mode === 'challenge-avatar') setScreen('avatar-select-challenge');
              else                                  setScreen('avatar-select-clash-white');
            }} />
          )}
          {screen === 'avatar-select-challenge' && (
            <AvatarSelectScreen key="ac" lm={lm} title="Choose your opponent" subtitle="Scientists use Depth-3 Minimax — they are formidable."
              onSelect={(av) => { setChallengeAvatar(av as ChessAvatar); startGame(); }} />
          )}
          {screen === 'avatar-select-clash-white' && (
            <AvatarSelectScreen key="cw" lm={lm} title="White player" subtitle="This genius opens with the white pieces."
              onSelect={(av) => { setClashWhite(av as ChessAvatar); setScreen('avatar-select-clash-black'); }} />
          )}
          {screen === 'avatar-select-clash-black' && (
            <AvatarSelectScreen key="cb" lm={lm} title="Black player" subtitle="This genius plays the black pieces."
              excludeName={clashWhite?.name}
              onSelect={(av) => { setClashBlack(av as ChessAvatar); startGame(); }} />
          )}
          {screen === 'board' && (
            <BoardScreen key="board" lm={lm} fen={fen} status={status} moveHistory={moveHistory}
              isAIThinking={isAIThinking}
              whitePlayerName={whitePlayerName} blackPlayerName={blackPlayerName}
              whiteImage={whiteImage} blackImage={blackImage}
              whiteTime={whiteTime} blackTime={blackTime}
              materialWhite={material.white} materialBlack={material.black}
              materialLeader={material.leader} materialAdv={material.advantage}
              onPieceDrop={onPieceDrop} onReset={resetBoard}
              game={game} gameMode={gameMode}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Mode Select ──────────────────────────────────────────────────────────────
function ModeSelectScreen({ lm, onSelect }: { lm?: boolean; onSelect: (m: GameMode) => void }) {
  const modes: { id: GameMode; symbol: string; title: string; desc: string }[] = [
    { id: 'pass-and-play',     symbol: '♙', title: 'Pass & Play',        desc: 'Two players, one device — take turns on the same board.' },
    { id: 'challenge-avatar',  symbol: '♖', title: 'Challenge an Avatar', desc: 'Face a genius avatar powered by Minimax AI.' },
    { id: 'clash-of-geniuses', symbol: '♛', title: 'Clash of Geniuses',  desc: 'Watch two AI avatars battle it out automatically.' },
  ];
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:0.22 }}
      className="flex flex-col items-center justify-center min-h-full px-6 py-14">
      <div className="text-center mb-10">
        <div className={`text-5xl mb-4 font-light ${lm ? 'text-slate-300' : 'text-slate-600'}`} style={{ fontFamily: 'serif' }}>♛</div>
        <h1 className={`text-2xl font-bold tracking-tight mb-2 ${lm ? 'text-slate-900' : 'text-slate-100'}`}>Grandmaster Chess</h1>
        <p className={`text-sm ${lm ? 'text-slate-500' : 'text-slate-500'}`}>Select a game mode to begin</p>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-3">
        {modes.map(m => (
          <motion.button key={m.id} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => onSelect(m.id)}
            className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 group ${
              lm ? 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                 : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70'
            }`}>
            <div className="flex items-center gap-4">
              <span className={`text-2xl w-8 text-center font-light ${lm ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontFamily: 'serif' }}>{m.symbol}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-[14px] ${lm ? 'text-slate-900' : 'text-slate-100'}`}>{m.title}</p>
                <p className={`text-[12px] mt-0.5 ${lm ? 'text-slate-500' : 'text-slate-500'}`}>{m.desc}</p>
              </div>
              <span className={`text-lg opacity-30 group-hover:opacity-60 transition-opacity`}>›</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Avatar Select ────────────────────────────────────────────────────────────
function AvatarSelectScreen({ lm, title, subtitle, onSelect, excludeName }:
  { lm?: boolean; title: string; subtitle: string; onSelect: (av: typeof CHESS_AVATARS[number]) => void; excludeName?: string }) {
  const avatars = CHESS_AVATARS.filter(a => a.name !== excludeName);
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:0.22 }}
      className="flex flex-col items-center min-h-full px-6 py-10">
      <h2 className={`text-xl font-bold tracking-tight mb-1 ${lm ? 'text-slate-900' : 'text-slate-100'}`}>{title}</h2>
      <p className={`text-[12px] mb-8 text-center ${lm ? 'text-slate-500' : 'text-slate-500'}`}>{subtitle}</p>
      <div className="w-full max-w-md grid grid-cols-2 sm:grid-cols-3 gap-3">
        {avatars.map(av => (
          <motion.button key={av.name} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => onSelect(av)}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 ${
              lm ? 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                 : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70'
            }`}>
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-500/30 shadow-md">
              <img src={av.image} alt={av.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="text-center">
              <p className={`text-[12px] font-semibold leading-tight ${lm ? 'text-slate-900' : 'text-slate-100'}`}>{av.name}</p>
              <p className={`text-[10px] mt-0.5 ${lm ? 'text-slate-500' : 'text-slate-500'}`}>{av.role}</p>
              <span className={`mt-2 inline-block text-[9px] px-2 py-0.5 rounded font-medium uppercase tracking-wide ${
                av.depth >= 3
                  ? (lm ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-red-900/30 text-red-400 border border-red-700/40')
                  : (lm ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40')
              }`}>
                {av.depth >= 3 ? 'Formidable' : 'Friendly'}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Board Screen ─────────────────────────────────────────────────────────────
function BoardScreen({ lm, fen, status, moveHistory, isAIThinking,
  whitePlayerName, blackPlayerName, whiteImage, blackImage,
  whiteTime, blackTime, materialWhite, materialBlack, materialLeader, materialAdv,
  onPieceDrop, onReset, game, gameMode,
}: {
  lm?: boolean; fen: string; status: string; moveHistory: string[]; isAIThinking: boolean;
  whitePlayerName: string; blackPlayerName: string; whiteImage?: string; blackImage?: string;
  whiteTime: number; blackTime: number;
  materialWhite: number; materialBlack: number; materialLeader: 'w' | 'b' | 'even'; materialAdv: number;
  onPieceDrop: (a: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => boolean;
  onReset: () => void; game: Chess; gameMode: GameMode;
}) {
  const historyRef    = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [boardWidth,  setBoardWidth]  = useState(360);
  const [selSquare,   setSelSquare]   = useState<string | null>(null);
  const [optSquares,  setOptSquares]  = useState<Record<string, React.CSSProperties>>({});

  // Responsive board width
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setBoardWidth(Math.min(Math.max(w - 8, 280), 600));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-scroll move history
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [moveHistory]);

  // Square click: show valid moves
  const onSquareClick = useCallback(({ square }: { piece?: unknown; square: string }) => {
    if (gameMode === 'clash-of-geniuses') return;
    if (isAIThinking) return;
    if (game.isGameOver()) return;

    // If a piece was already selected and we click a destination — attempt move
    if (selSquare && optSquares[square]) {
      const success = onPieceDrop({ piece: undefined, sourceSquare: selSquare, targetSquare: square });
      if (success) { setSelSquare(null); setOptSquares({}); return; }
    }

    // Select a new piece
    const piece = game.get(square as Parameters<typeof game.get>[0]);
    if (!piece) { setSelSquare(null); setOptSquares({}); return; }
    if (gameMode === 'challenge-avatar' && game.turn() !== piece.color) { setSelSquare(null); setOptSquares({}); return; }

    try {
      const moves = game.moves({ square: square as Parameters<typeof game.get>[0], verbose: true }) as { to: string }[];
      if (moves.length === 0) { setSelSquare(null); setOptSquares({}); return; }

      const styles: Record<string, React.CSSProperties> = {
        [square]: { background: lm ? 'rgba(59,130,246,0.25)' : 'rgba(99,179,237,0.30)', borderRadius: '4px' },
      };
      for (const m of moves) {
        const hasPiece = !!game.get(m.to as Parameters<typeof game.get>[0]);
        styles[m.to] = hasPiece
          ? { background: 'radial-gradient(circle, rgba(239,68,68,0.45) 60%, transparent 70%)' }
          : { background: 'radial-gradient(circle, rgba(148,163,184,0.55) 28%, transparent 30%)' };
      }
      setSelSquare(square);
      setOptSquares(styles);
    } catch { setSelSquare(null); setOptSquares({}); }
  }, [game, gameMode, isAIThinking, lm, selSquare, optSquares, onPieceDrop]);

  // Clear selection on drop
  const handleDrop = useCallback((args: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => {
    const ok = onPieceDrop(args);
    if (ok) { setSelSquare(null); setOptSquares({}); }
    return ok;
  }, [onPieceDrop]);

  const movePairs: string[][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) movePairs.push([moveHistory[i], moveHistory[i+1] ?? '']);

  const gameOver = game.isGameOver() || (whiteTime === 0) || (blackTime === 0);
  const activeTurn = game.turn();

  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.22 }}
      className="flex flex-col items-center px-3 py-3 min-h-full">

      {/* Black player (top) */}
      <PlayerStrip
        name={blackPlayerName} image={blackImage} lm={lm} color="black"
        isActive={activeTurn === 'b' && !gameOver}
        isThinking={isAIThinking && gameMode !== 'pass-and-play' && activeTurn === 'b'}
        time={blackTime} timeLow={blackTime <= 30}
        materialAdv={materialLeader === 'b' ? materialAdv : 0}
      />

      {/* Board */}
      <div ref={containerRef} className="w-full max-w-[620px] my-2">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: handleDrop,
            onSquareClick,
            boardOrientation: 'white',
            boardStyle: {
              borderRadius: '8px',
              boxShadow: lm
                ? '0 4px 24px rgba(0,0,0,0.12)'
                : '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
            },
            darkSquareStyle:  { backgroundColor: lm ? '#4a6580' : '#1e3a5f' },
            lightSquareStyle: { backgroundColor: lm ? '#d4dde8' : '#2d4a6e' },
            squareStyles: optSquares,
            allowDrawingArrows: true,
            allowDragging: gameMode !== 'clash-of-geniuses',
          }}
        />
      </div>

      {/* White player (bottom) */}
      <PlayerStrip
        name={whitePlayerName} image={whiteImage} lm={lm} color="white"
        isActive={activeTurn === 'w' && !gameOver}
        isThinking={false}
        time={whiteTime} timeLow={whiteTime <= 30}
        materialAdv={materialLeader === 'w' ? materialAdv : 0}
      />

      {/* Status */}
      <div className={`mt-2 w-full max-w-[620px] px-4 py-2 rounded-lg text-center text-[12px] font-medium ${
        lm ? 'bg-slate-100 text-slate-600' : 'bg-slate-800/60 text-slate-400'
      }`}>
        {status || (isAIThinking ? 'Calculating…' : 'Game in progress')}
      </div>

      {/* New Game */}
      <div className="mt-2 w-full max-w-[620px]">
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onReset}
          className={`w-full py-2 rounded-lg text-[12px] font-semibold border transition-all ${
            lm ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
               : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-800/70'
          }`}>
          New Game
        </motion.button>
      </div>

      {/* Move History */}
      {moveHistory.length > 0 && (
        <div className={`mt-3 w-full max-w-[620px] rounded-xl overflow-hidden border ${lm ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-medium border-b ${
            lm ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-800/60 text-slate-600 border-slate-800'
          }`}>Move History</div>
          <div ref={historyRef} className={`max-h-32 overflow-y-auto ${lm ? 'bg-white' : 'bg-[#0b0d14]'}`}>
            <table className="w-full text-[11px]">
              <tbody>
                {movePairs.map((pair, i) => (
                  <tr key={i} className={i % 2 === 0 ? (lm ? 'bg-slate-50/60' : 'bg-slate-800/20') : ''}>
                    <td className={`w-8 pl-3 pr-1 py-0.5 text-right tabular-nums ${lm ? 'text-slate-400' : 'text-slate-600'}`}>{i+1}.</td>
                    <td className={`px-2 py-0.5 font-mono ${lm ? 'text-slate-700' : 'text-slate-300'}`}>{pair[0]}</td>
                    <td className={`px-2 py-0.5 font-mono ${lm ? 'text-slate-700' : 'text-slate-300'}`}>{pair[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="h-4" />
    </motion.div>
  );
}

// ─── Player Strip ─────────────────────────────────────────────────────────────
function PlayerStrip({ name, image, lm, color, isActive, isThinking, time, timeLow, materialAdv }:
  { name: string; image?: string; lm?: boolean; color: 'white' | 'black'; isActive: boolean;
    isThinking: boolean; time: number; timeLow: boolean; materialAdv: number }) {
  return (
    <div className={`flex items-center gap-3 w-full max-w-[620px] px-3 py-2 rounded-xl transition-all duration-300 ${
      isActive
        ? (lm ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'bg-slate-700/50 border border-slate-600')
        : (lm ? 'bg-slate-50 border border-slate-200' : 'bg-slate-800/30 border border-slate-800/60')
    }`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 flex items-center justify-center text-base ${
        color === 'white'
          ? (lm ? 'border-slate-300 bg-slate-100' : 'border-slate-600 bg-slate-700')
          : (lm ? 'border-slate-500 bg-slate-700' : 'border-slate-600 bg-slate-800')
      }`}>
        {image
          ? <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
          : <span style={{ fontFamily: 'serif' }}>{color === 'white' ? '♔' : '♚'}</span>}
      </div>

      {/* Name + material */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-[13px] font-semibold truncate ${lm ? 'text-slate-900' : 'text-slate-100'}`}>{name}</p>
          {materialAdv > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              lm ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/40 text-blue-300'
            }`}>+{materialAdv}</span>
          )}
          {isThinking && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className={`text-[10px] font-medium ${lm ? 'text-slate-500' : 'text-slate-500'}`}>
              thinking…
            </motion.span>
          )}
        </div>
        <p className={`text-[10px] uppercase tracking-wide ${lm ? 'text-slate-400' : 'text-slate-600'}`}>
          {color === 'white' ? 'White' : 'Black'}
        </p>
      </div>

      {/* Timer */}
      <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg tabular-nums font-mono text-[14px] font-bold transition-all ${
        timeLow
          ? (lm ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-red-900/30 text-red-400 border border-red-700/40')
          : isActive
            ? (lm ? 'bg-white text-slate-900 border border-slate-300 shadow-sm' : 'bg-slate-700 text-slate-100 border border-slate-600')
            : (lm ? 'text-slate-400 border border-transparent' : 'text-slate-600 border border-transparent')
      }`}>
        {formatTime(time)}
      </div>
    </div>
  );
}

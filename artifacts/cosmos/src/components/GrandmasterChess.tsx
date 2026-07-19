import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ─── Avatar definitions (mirrored from App.tsx AVATARS) ───────────────────────
const CHESS_AVATARS = [
  {
    name: 'Albert Einstein',
    role: 'Theoretical Physicist',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg',
    depth: 3,
  },
  {
    name: 'Richard Feynman',
    role: 'Quantum Pioneer',
    image: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg',
    depth: 3,
  },
  {
    name: 'Carl Sagan',
    role: 'Cosmos Explorer',
    image: '/carl-sagan.jpg',
    depth: 3,
  },
  {
    name: 'Nikola Tesla',
    role: 'Electrical Visionary',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg',
    depth: 3,
  },
  {
    name: 'Mahera Jannat',
    role: 'Ultimate Supporter & Guide',
    image: '/mehera.jpg',
    depth: 1,
  },
] as const;

type ChessAvatar = (typeof CHESS_AVATARS)[number];
type GameMode = 'pass-and-play' | 'challenge-avatar' | 'clash-of-geniuses';
type Screen = 'mode-select' | 'avatar-select-challenge' | 'avatar-select-clash-white' | 'avatar-select-clash-black' | 'board';

// ─── Piece-square tables (from white's perspective, rank 0 = rank 1) ──────────
const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];
const PST_KNIGHT = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];
const PST_BISHOP = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];
const PST_ROOK = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];
const PST_QUEEN = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];
const PST_KING_MID = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

const PST_MAP: Record<string, number[]> = {
  p: PST_PAWN, n: PST_KNIGHT, b: PST_BISHOP, r: PST_ROOK, q: PST_QUEEN, k: PST_KING_MID,
};

function squareIndex(square: string): number {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  return (7 - rank) * 8 + file;
}

function evaluateBoard(chess: Chess): number {
  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const sq = String.fromCharCode('a'.charCodeAt(0) + f) + (8 - r).toString();
      const idx = squareIndex(sq);
      const pst = PST_MAP[piece.type] ?? [];
      const pstVal = piece.color === 'w' ? (pst[idx] ?? 0) : (pst[63 - idx] ?? 0);
      const val = PIECE_VALUES[piece.type] + pstVal;
      score += piece.color === 'w' ? val : -val;
    }
  }
  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
): number {
  if (depth === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) return maximising ? -99999 : 99999;
    return evaluateBoard(chess);
  }
  const moves = chess.moves();
  if (maximising) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(chess: Chess, depth: number): string | null {
  const moves = chess.moves();
  if (moves.length === 0) return null;

  // Depth 1 = random (Mahera)
  if (depth <= 1) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const isWhite = chess.turn() === 'w';
  let bestMove: string | null = null;
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();
    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface GrandmasterChessProps {
  onClose: () => void;
  lm?: boolean;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function GrandmasterChessModal({ onClose, lm }: GrandmasterChessProps) {
  const [screen, setScreen] = useState<Screen>('mode-select');
  const [gameMode, setGameMode] = useState<GameMode>('pass-and-play');

  // For "Challenge Avatar": user plays white, avatar plays black
  const [challengeAvatar, setChallengeAvatar] = useState<ChessAvatar | null>(null);

  // For "Clash of Geniuses": two AIs
  const [clashWhite, setClashWhite] = useState<ChessAvatar | null>(null);
  const [clashBlack, setClashBlack] = useState<ChessAvatar | null>(null);

  // Board state
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(new Chess().fen());
  const [status, setStatus] = useState('');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const aiThinkingRef = useRef(false);
  const clashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startGame = useCallback((mode: GameMode, white?: ChessAvatar | null, black?: ChessAvatar | null) => {
    const fresh = new Chess();
    setGame(fresh);
    setFen(fresh.fen());
    setMoveHistory([]);
    setStatus('');
    setIsAIThinking(false);
    aiThinkingRef.current = false;
    setScreen('board');
  }, []);

  // ── Compute status string ────────────────────────────────────────────────
  const computeStatus = useCallback((g: Chess, mode: GameMode, whiteAvatar?: ChessAvatar | null, blackAvatar?: ChessAvatar | null) => {
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w'
        ? (mode === 'challenge-avatar' ? blackAvatar?.name ?? 'Black' : 'Black')
        : (mode === 'challenge-avatar' ? 'You' : 'White');
      return `♛ Checkmate! ${winner} wins.`;
    }
    if (g.isDraw()) {
      if (g.isStalemate()) return '🤝 Stalemate — draw.';
      if (g.isThreefoldRepetition()) return '🤝 Draw by threefold repetition.';
      if (g.isInsufficientMaterial()) return '🤝 Draw — insufficient material.';
      return '🤝 Draw.';
    }
    if (g.isGameOver()) return '🏁 Game over.';
    const turn = g.turn() === 'w' ? 'White' : 'Black';
    const inCheck = g.inCheck();
    if (mode === 'challenge-avatar') {
      const playerTurn = g.turn() === 'w';
      return playerTurn
        ? (inCheck ? '⚠️ You are in check! Your move.' : '🎯 Your move (White)')
        : (inCheck ? `⚠️ ${blackAvatar?.name ?? 'AI'} in check!` : `🤖 ${blackAvatar?.name ?? 'AI'} is thinking…`);
    }
    if (mode === 'clash-of-geniuses') {
      const mover = g.turn() === 'w' ? (whiteAvatar?.name ?? 'White') : (blackAvatar?.name ?? 'Black');
      return inCheck ? `⚠️ ${mover} is in check!` : `🤖 ${mover}'s turn…`;
    }
    return inCheck ? `⚠️ ${turn} is in check!` : `${turn}'s turn`;
  }, []);

  // ── AI move trigger ──────────────────────────────────────────────────────
  const triggerAIMove = useCallback((currentGame: Chess, depth: number) => {
    if (currentGame.isGameOver()) return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    setIsAIThinking(true);

    // Run in a micro-task to let React render "thinking" state first
    setTimeout(() => {
      const bestMove = getBestMove(currentGame, depth);
      if (bestMove) {
        const newGame = new Chess(currentGame.fen());
        newGame.move(bestMove);
        setGame(newGame);
        setFen(newGame.fen());
        setMoveHistory(prev => [...prev, bestMove]);
      }
      aiThinkingRef.current = false;
      setIsAIThinking(false);
    }, 200);
  }, []);

  // ── Effect: AI auto-play for challenge mode ──────────────────────────────
  useEffect(() => {
    if (screen !== 'board') return;
    if (gameMode !== 'challenge-avatar') return;
    if (!challengeAvatar) return;
    if (game.isGameOver()) {
      setStatus(computeStatus(game, gameMode, null, challengeAvatar));
      return;
    }
    setStatus(computeStatus(game, gameMode, null, challengeAvatar));

    // It's the AI's turn (black)
    if (game.turn() === 'b' && !aiThinkingRef.current) {
      triggerAIMove(game, challengeAvatar.depth);
    }
  }, [screen, gameMode, game, challengeAvatar, computeStatus, triggerAIMove]);

  // ── Effect: Clash of Geniuses auto-play ─────────────────────────────────
  useEffect(() => {
    if (screen !== 'board') return;
    if (gameMode !== 'clash-of-geniuses') return;
    if (!clashWhite || !clashBlack) return;
    if (game.isGameOver()) {
      setStatus(computeStatus(game, gameMode, clashWhite, clashBlack));
      return;
    }
    setStatus(computeStatus(game, gameMode, clashWhite, clashBlack));

    if (aiThinkingRef.current) return;

    const avatar = game.turn() === 'w' ? clashWhite : clashBlack;
    clashTimerRef.current = setTimeout(() => {
      triggerAIMove(game, avatar.depth);
    }, 1000);

    return () => {
      if (clashTimerRef.current) clearTimeout(clashTimerRef.current);
    };
  }, [screen, gameMode, game, clashWhite, clashBlack, computeStatus, triggerAIMove]);

  // ── Pass & Play status ───────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'board') return;
    if (gameMode !== 'pass-and-play') return;
    setStatus(computeStatus(game, gameMode));
  }, [screen, gameMode, game, computeStatus]);

  // ── Human move handler ───────────────────────────────────────────────────
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    if (gameMode === 'clash-of-geniuses') return false;
    if (gameMode === 'challenge-avatar' && game.turn() === 'b') return false;
    if (isAIThinking) return false;
    if (game.isGameOver()) return false;

    const newGame = new Chess(game.fen());
    const move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (!move) return false;

    setGame(newGame);
    setFen(newGame.fen());
    setMoveHistory(prev => [...prev, move.san]);
    return true;
  }, [game, gameMode, isAIThinking]);

  // ── Helpers: player names for board display ──────────────────────────────
  const whitePlayerName = gameMode === 'challenge-avatar' ? 'You' :
    gameMode === 'clash-of-geniuses' ? (clashWhite?.name ?? 'White') : 'White';
  const blackPlayerName = gameMode === 'challenge-avatar' ? (challengeAvatar?.name ?? 'AI') :
    gameMode === 'clash-of-geniuses' ? (clashBlack?.name ?? 'Black') : 'Black';
  const whiteImage = gameMode === 'clash-of-geniuses' ? clashWhite?.image : undefined;
  const blackImage = gameMode === 'challenge-avatar' ? challengeAvatar?.image :
    gameMode === 'clash-of-geniuses' ? clashBlack?.image : undefined;

  // ── Reset board ──────────────────────────────────────────────────────────
  const resetBoard = () => {
    if (clashTimerRef.current) clearTimeout(clashTimerRef.current);
    aiThinkingRef.current = false;
    const fresh = new Chess();
    setGame(fresh);
    setFen(fresh.fen());
    setMoveHistory([]);
    setIsAIThinking(false);
    setStatus('');
  };

  const handleBack = () => {
    if (clashTimerRef.current) clearTimeout(clashTimerRef.current);
    aiThinkingRef.current = false;
    if (screen === 'board') {
      setScreen('mode-select');
      resetBoard();
    } else if (screen === 'avatar-select-challenge') {
      setScreen('mode-select');
    } else if (screen === 'avatar-select-clash-white') {
      setScreen('mode-select');
    } else if (screen === 'avatar-select-clash-black') {
      setScreen('avatar-select-clash-white');
    } else {
      onClose();
    }
  };

  // ─── Shared modal shell ────────────────────────────────────────────────
  const bg = lm
    ? 'bg-white/95 text-slate-900'
    : 'bg-[rgba(6,6,16,0.97)] text-white';

  return (
    <motion.div
      key="chess-modal"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-0 z-[300] flex flex-col overflow-hidden ${bg}`}
      style={{ backdropFilter: 'blur(24px)' }}
    >
      {/* ── Header ── */}
      <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${
        lm ? 'border-slate-200 bg-white/95' : 'border-white/[0.10] bg-[rgba(10,10,20,0.85)]'
      }`}>
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[13px] transition-all duration-200 min-w-[80px] ${
            lm
              ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200'
              : 'bg-white/[0.10] text-white border border-white/[0.15] hover:bg-white/[0.18]'
          }`}
        >
          <span className="text-[15px] leading-none">←</span>
          <span>Back</span>
        </motion.button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`hidden sm:inline text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border flex-shrink-0 ${
            lm ? 'border-violet-300/60 text-violet-700 bg-violet-50' : 'border-violet-400/30 text-violet-300/80 bg-violet-500/10'
          }`}>
            ♟️ Chess
          </span>
          <span className={`text-[13px] font-semibold tracking-wide truncate ${lm ? 'text-slate-900' : 'text-white/90'}`}>
            {screen === 'mode-select' ? 'Grandmaster Chess' :
             screen === 'avatar-select-challenge' ? 'Choose Your Opponent' :
             screen === 'avatar-select-clash-white' ? 'Clash of Geniuses — White' :
             screen === 'avatar-select-clash-black' ? 'Clash of Geniuses — Black' :
             gameMode === 'pass-and-play' ? 'Pass & Play' :
             gameMode === 'challenge-avatar' ? `You vs ${challengeAvatar?.name ?? ''}` :
             `${clashWhite?.name ?? 'White'} vs ${clashBlack?.name ?? 'Black'}`}
          </span>
        </div>

        <button
          onClick={onClose}
          className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-[14px] transition-all duration-200 ${
            lm
              ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'border-white/[0.12] bg-white/[0.08] text-white/60 hover:bg-white/[0.15]'
          }`}
        >✕</button>
      </div>

      {/* ── Screen Content ── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {screen === 'mode-select' && (
            <ModeSelectScreen key="mode-select" lm={lm} onSelect={(mode) => {
              setGameMode(mode);
              if (mode === 'pass-and-play') {
                startGame(mode);
              } else if (mode === 'challenge-avatar') {
                setScreen('avatar-select-challenge');
              } else {
                setScreen('avatar-select-clash-white');
              }
            }} />
          )}

          {screen === 'avatar-select-challenge' && (
            <AvatarSelectScreen
              key="avatar-challenge"
              lm={lm}
              title="Who will you challenge?"
              subtitle="Scientists play at Depth 3 — they are formidable."
              onSelect={(av) => {
                setChallengeAvatar(av as ChessAvatar);
                startGame('challenge-avatar');
              }}
            />
          )}

          {screen === 'avatar-select-clash-white' && (
            <AvatarSelectScreen
              key="clash-white"
              lm={lm}
              title="Select White player"
              subtitle="This genius will play with the white pieces."
              onSelect={(av) => {
                setClashWhite(av as ChessAvatar);
                setScreen('avatar-select-clash-black');
              }}
            />
          )}

          {screen === 'avatar-select-clash-black' && (
            <AvatarSelectScreen
              key="clash-black"
              lm={lm}
              title="Select Black player"
              subtitle="This genius will challenge with the black pieces."
              excludeName={clashWhite?.name}
              onSelect={(av) => {
                const black = av as ChessAvatar;
                setClashBlack(black);
                startGame('clash-of-geniuses', clashWhite, black);
              }}
            />
          )}

          {screen === 'board' && (
            <BoardScreen
              key="board"
              lm={lm}
              fen={fen}
              status={status}
              moveHistory={moveHistory}
              isAIThinking={isAIThinking}
              whitePlayerName={whitePlayerName}
              blackPlayerName={blackPlayerName}
              whiteImage={whiteImage}
              blackImage={blackImage}
              onPieceDrop={onPieceDrop}
              onReset={resetBoard}
              gameOver={game.isGameOver()}
              gameMode={gameMode}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Mode Select Screen ────────────────────────────────────────────────────────
function ModeSelectScreen({ lm, onSelect }: { lm?: boolean; onSelect: (m: GameMode) => void }) {
  const modes: { id: GameMode; icon: string; title: string; desc: string; color: string }[] = [
    {
      id: 'pass-and-play',
      icon: '🤝',
      title: 'Pass & Play',
      desc: 'Two players share one device. Take turns making moves.',
      color: lm ? 'from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400' : 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 hover:border-emerald-400/50',
    },
    {
      id: 'challenge-avatar',
      icon: '🤖',
      title: 'Challenge an Avatar',
      desc: 'Play against a genius avatar powered by Minimax AI.',
      color: lm ? 'from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400' : 'from-violet-500/10 to-purple-500/10 border-violet-500/20 hover:border-violet-400/50',
    },
    {
      id: 'clash-of-geniuses',
      icon: '⚡',
      title: 'Clash of Geniuses',
      desc: 'Watch two AI avatars battle it out automatically.',
      color: lm ? 'from-amber-50 to-orange-50 border-amber-200 hover:border-amber-400' : 'from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-400/50',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center min-h-full px-6 py-12"
    >
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">♛</div>
        <h1 className={`text-2xl font-bold tracking-tight mb-2 ${lm ? 'text-slate-900' : 'text-white'}`}>
          Grandmaster Chess
        </h1>
        <p className={`text-sm ${lm ? 'text-slate-500' : 'text-white/40'}`}>
          Choose your game mode to begin
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(mode.id)}
            className={`w-full text-left p-5 rounded-2xl border bg-gradient-to-br transition-all duration-200 ${mode.color}`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{mode.icon}</span>
              <div>
                <p className={`font-semibold text-[15px] ${lm ? 'text-slate-900' : 'text-white'}`}>{mode.title}</p>
                <p className={`text-[12px] mt-0.5 ${lm ? 'text-slate-500' : 'text-white/40'}`}>{mode.desc}</p>
              </div>
              <span className={`ml-auto text-xl opacity-40`}>›</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Avatar Select Screen ──────────────────────────────────────────────────────
function AvatarSelectScreen({
  lm, title, subtitle, onSelect, excludeName,
}: {
  lm?: boolean;
  title: string;
  subtitle: string;
  onSelect: (av: typeof CHESS_AVATARS[number]) => void;
  excludeName?: string;
}) {
  const avatars = CHESS_AVATARS.filter(a => a.name !== excludeName);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center min-h-full px-6 py-10"
    >
      <h2 className={`text-xl font-bold tracking-tight mb-1 ${lm ? 'text-slate-900' : 'text-white'}`}>{title}</h2>
      <p className={`text-[12px] mb-8 text-center ${lm ? 'text-slate-500' : 'text-white/40'}`}>{subtitle}</p>

      <div className="w-full max-w-md grid grid-cols-2 gap-4 sm:grid-cols-3">
        {avatars.map((av) => (
          <motion.button
            key={av.name}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(av)}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
              lm
                ? 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100'
                : 'border-white/[0.08] bg-white/[0.04] hover:border-violet-400/40 hover:bg-white/[0.08]'
            }`}
          >
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
              <img src={av.image} alt={av.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="text-center">
              <p className={`text-[12px] font-semibold leading-tight ${lm ? 'text-slate-900' : 'text-white'}`}>{av.name}</p>
              <p className={`text-[10px] mt-0.5 ${lm ? 'text-slate-500' : 'text-white/40'}`}>{av.role}</p>
              <span className={`mt-1.5 inline-block text-[9px] px-2 py-0.5 rounded-full border ${
                av.depth >= 3
                  ? (lm ? 'border-red-200 text-red-600 bg-red-50' : 'border-red-400/30 text-red-300 bg-red-500/10')
                  : (lm ? 'border-green-200 text-green-600 bg-green-50' : 'border-green-400/30 text-green-300 bg-green-500/10')
              }`}>
                {av.depth >= 3 ? '⚠ Formidable' : '✦ Friendly'}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Board Screen ──────────────────────────────────────────────────────────────
function BoardScreen({
  lm, fen, status, moveHistory, isAIThinking,
  whitePlayerName, blackPlayerName, whiteImage, blackImage,
  onPieceDrop, onReset, gameOver, gameMode,
}: {
  lm?: boolean;
  fen: string;
  status: string;
  moveHistory: string[];
  isAIThinking: boolean;
  whitePlayerName: string;
  blackPlayerName: string;
  whiteImage?: string;
  blackImage?: string;
  onPieceDrop: (args: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => boolean;
  onReset: () => void;
  gameOver: boolean;
  gameMode: GameMode;
}) {
  const historyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Pair moves into rows
  const movePairs: string[][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push([moveHistory[i], moveHistory[i + 1] ?? '']);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center px-4 py-4 min-h-full"
    >
      {/* ── Black player (opponent, at top) ── */}
      <PlayerBadge name={blackPlayerName} image={blackImage} lm={lm} isThinking={isAIThinking && gameMode !== 'pass-and-play'} color="black" />

      {/* ── Board ── */}
      <div className="w-full max-w-[480px] my-3">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop,
            boardOrientation: 'white',
            boardStyle: {
              borderRadius: '12px',
              boxShadow: lm
                ? '0 8px 32px rgba(0,0,0,0.15)'
                : '0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
            },
            darkSquareStyle: { backgroundColor: lm ? '#6d8fa8' : '#4a3f6b' },
            lightSquareStyle: { backgroundColor: lm ? '#e8dfc8' : '#c8b8e8' },
            allowDrawingArrows: true,
            allowDragging: gameMode !== 'clash-of-geniuses',
          }}
        />
      </div>

      {/* ── White player (user, at bottom) ── */}
      <PlayerBadge name={whitePlayerName} image={whiteImage} lm={lm} isThinking={false} color="white" />

      {/* ── Status bar ── */}
      <div className={`mt-3 w-full max-w-[480px] px-4 py-2.5 rounded-xl text-center text-[12px] font-medium ${
        lm ? 'bg-slate-100 text-slate-700' : 'bg-white/[0.06] text-white/70'
      }`}>
        {status || (isAIThinking ? '🤖 AI is thinking…' : '♟ Game in progress')}
      </div>

      {/* ── Controls ── */}
      <div className="mt-3 flex gap-3 w-full max-w-[480px]">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onReset}
          className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold border transition-all duration-200 ${
            lm
              ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              : 'border-white/[0.12] bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white'
          }`}
        >
          🔄 New Game
        </motion.button>
      </div>

      {/* ── Move history ── */}
      {moveHistory.length > 0 && (
        <div className={`mt-4 w-full max-w-[480px] rounded-xl overflow-hidden border ${
          lm ? 'border-slate-200' : 'border-white/[0.08]'
        }`}>
          <div className={`px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-medium border-b ${
            lm ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white/[0.04] text-white/30 border-white/[0.08]'
          }`}>
            Move History
          </div>
          <div
            ref={historyRef}
            className={`max-h-36 overflow-y-auto p-2 ${lm ? 'bg-white' : 'bg-white/[0.02]'}`}
          >
            <table className="w-full text-[11px]">
              <tbody>
                {movePairs.map((pair, i) => (
                  <tr key={i} className={i % 2 === 0
                    ? (lm ? 'bg-slate-50' : 'bg-white/[0.02]')
                    : ''
                  }>
                    <td className={`w-8 px-2 py-0.5 text-right ${lm ? 'text-slate-400' : 'text-white/25'}`}>{i + 1}.</td>
                    <td className={`px-2 py-0.5 font-mono ${lm ? 'text-slate-700' : 'text-white/70'}`}>{pair[0]}</td>
                    <td className={`px-2 py-0.5 font-mono ${lm ? 'text-slate-700' : 'text-white/70'}`}>{pair[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="h-6" />
    </motion.div>
  );
}

// ─── Player Badge ──────────────────────────────────────────────────────────────
function PlayerBadge({
  name, image, lm, isThinking, color,
}: {
  name: string;
  image?: string;
  lm?: boolean;
  isThinking: boolean;
  color: 'white' | 'black';
}) {
  return (
    <div className={`flex items-center gap-3 w-full max-w-[480px] px-3 py-2.5 rounded-xl ${
      lm ? 'bg-slate-50 border border-slate-200' : 'bg-white/[0.05] border border-white/[0.08]'
    }`}>
      <div className={`w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0 flex items-center justify-center font-bold text-sm ${
        color === 'white'
          ? (lm ? 'border-slate-300 bg-white text-slate-400' : 'border-white/30 bg-white/10 text-white/40')
          : (lm ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-500/30 bg-slate-800/50 text-white/40')
      }`}>
        {image
          ? <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
          : (color === 'white' ? '♔' : '♚')}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold truncate ${lm ? 'text-slate-900' : 'text-white'}`}>{name}</p>
        <p className={`text-[10px] ${lm ? 'text-slate-500' : 'text-white/30'}`}>
          {color === 'white' ? '♙ White' : '♟ Black'}
        </p>
      </div>
      {isThinking && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            lm ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-300'
          }`}
        >
          thinking…
        </motion.div>
      )}
    </div>
  );
}

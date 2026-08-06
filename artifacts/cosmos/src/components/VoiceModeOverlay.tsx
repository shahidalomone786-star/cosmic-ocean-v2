import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AudioLines,
  Captions,
  Check,
  CircleAlert,
  LoaderCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  Radio,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from 'lucide-react';

export type VoiceModeState =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'reasoning'
  | 'generating'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'offline'
  | 'reconnecting'
  | 'error';

export interface VoiceModeOverlayProps {
  state: VoiceModeState;
  statusText: string;
  transcript: string;
  assistantText: string;
  micLevel: number;
  outputLevel: number;
  captionsEnabled: boolean;
  onClose: () => void;
  onToggleCaptions: () => void;
  onInterrupt: () => void;
}

type OrbConfig = {
  label: string;
  eyebrow: string;
  color: string;
  softColor: string;
  icon: ReactNode;
  orbScale: number;
};

const PARTICLES = [
  [4, 13, 1.5, 16, 0.3],
  [11, 77, 1, 22, 0.18],
  [17, 30, 2, 19, 0.22],
  [22, 91, 1, 27, 0.2],
  [29, 17, 1, 24, 0.32],
  [34, 66, 1.5, 20, 0.2],
  [41, 38, 0.8, 17, 0.25],
  [47, 84, 1, 29, 0.18],
  [53, 12, 1.2, 23, 0.24],
  [59, 56, 1.8, 18, 0.2],
  [63, 25, 0.8, 31, 0.31],
  [68, 73, 1, 21, 0.2],
  [74, 43, 1.4, 25, 0.19],
  [79, 8, 0.8, 20, 0.27],
  [83, 62, 1.2, 28, 0.2],
  [88, 32, 1, 18, 0.24],
  [94, 86, 1.7, 26, 0.16],
  [8, 48, 0.7, 28, 0.18],
  [25, 55, 0.8, 15, 0.26],
  [38, 6, 1, 18, 0.22],
  [56, 93, 0.8, 24, 0.28],
  [72, 16, 0.7, 21, 0.22],
  [91, 52, 0.9, 19, 0.21],
];

const MIC_WAVE = [0.34, 0.5, 0.72, 0.44, 0.83, 0.58, 0.38, 0.7, 0.92, 0.64, 0.43, 0.68, 0.8, 0.52, 0.36, 0.58, 0.74, 0.46];
const OUTPUT_WAVE = [0.3, 0.48, 0.66, 0.86, 0.56, 0.4, 0.72, 0.94, 0.62, 0.42, 0.78, 0.56, 0.88, 0.68, 0.46, 0.36, 0.6, 0.76, 0.48, 0.34];

const clampLevel = (level: number) => Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0));

const getOrbConfig = (state: VoiceModeState): OrbConfig => {
  switch (state) {
    case 'listening':
      return {
        label: 'Listening',
        eyebrow: 'Voice input',
        color: '#8ee9dc',
        softColor: 'rgba(142, 233, 220, 0.22)',
        icon: <Mic aria-hidden="true" />,
        orbScale: 1.04,
      };
    case 'thinking':
      return {
        label: 'Thinking',
        eyebrow: 'Processing',
        color: '#b6b0ff',
        softColor: 'rgba(182, 176, 255, 0.22)',
        icon: <MoreHorizontal aria-hidden="true" />,
        orbScale: 0.97,
      };
    case 'understanding':
      return {
        label: 'Understanding',
        eyebrow: 'Transcription',
        color: '#9ce4e2',
        softColor: 'rgba(156, 228, 226, 0.2)',
        icon: <LoaderCircle aria-hidden="true" />,
        orbScale: 0.99,
      };
    case 'reasoning':
      return {
        label: 'Reasoning',
        eyebrow: 'Considering',
        color: '#b6b0ff',
        softColor: 'rgba(182, 176, 255, 0.22)',
        icon: <MoreHorizontal aria-hidden="true" />,
        orbScale: 0.97,
      };
    case 'generating':
      return {
        label: 'Generating',
        eyebrow: 'Forming a response',
        color: '#c7b9ff',
        softColor: 'rgba(199, 185, 255, 0.22)',
        icon: <Sparkles aria-hidden="true" />,
        orbScale: 1.02,
      };
    case 'speaking':
      return {
        label: 'Speaking',
        eyebrow: 'Singularity output',
        color: '#f0c99b',
        softColor: 'rgba(240, 201, 155, 0.22)',
        icon: <AudioLines aria-hidden="true" />,
        orbScale: 1.06,
      };
    case 'interrupted':
      return {
        label: 'Interrupted',
        eyebrow: 'Output paused',
        color: '#f0b7c0',
        softColor: 'rgba(240, 183, 192, 0.2)',
        icon: <Pause aria-hidden="true" />,
        orbScale: 0.94,
      };
    case 'offline':
      return {
        label: 'Offline',
        eyebrow: 'Connection unavailable',
        color: '#b3bcc7',
        softColor: 'rgba(179, 188, 199, 0.18)',
        icon: <MicOff aria-hidden="true" />,
        orbScale: 0.9,
      };
    case 'reconnecting':
      return {
        label: 'Reconnecting',
        eyebrow: 'Restoring signal',
        color: '#e5cf91',
        softColor: 'rgba(229, 207, 145, 0.19)',
        icon: <RotateCcw aria-hidden="true" />,
        orbScale: 0.98,
      };
    case 'error':
      return {
        label: 'Voice unavailable',
        eyebrow: 'Needs attention',
        color: '#f0b7c0',
        softColor: 'rgba(240, 183, 192, 0.2)',
        icon: <CircleAlert aria-hidden="true" />,
        orbScale: 0.92,
      };
    case 'idle':
    default:
      return {
        label: 'Ready',
        eyebrow: 'Voice mode',
        color: '#a9c5ff',
        softColor: 'rgba(169, 197, 255, 0.2)',
        icon: <Radio aria-hidden="true" />,
        orbScale: 1,
      };
  }
};

const Waveform = ({
  level,
  bars,
  color,
  label,
  reducedMotion,
}: {
  level: number;
  bars: number[];
  color: string;
  label: string;
  reducedMotion: boolean;
}) => {
  const safeLevel = clampLevel(level);

  return (
    <div className="voice-wave" aria-label={`${label} level ${(safeLevel * 100).toFixed(0)} percent`}>
      {bars.map((multiplier, index) => {
        const height = 7 + safeLevel * multiplier * 34;
        return (
          <motion.span
            key={`${label}-${index}`}
            className="voice-wave__bar"
            animate={{ height }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            style={{ backgroundColor: color }}
            data-testid={`wave-bar-${label.toLowerCase().replace(/\s+/g, '-')}-${index}`}
          />
        );
      })}
    </div>
  );
};

export function VoiceModeOverlay({
  state,
  statusText,
  transcript,
  assistantText,
  micLevel,
  outputLevel,
  captionsEnabled,
  onClose,
  onToggleCaptions,
  onInterrupt,
}: VoiceModeOverlayProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const orb = useMemo(() => getOrbConfig(state), [state]);
  const safeMicLevel = clampLevel(micLevel);
  const safeOutputLevel = clampLevel(outputLevel);

  useEffect(() => {
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  const styleVars = {
    '--voice-color': orb.color,
    '--voice-soft-color': orb.softColor,
  } as CSSProperties;

  const animatedOrb = reducedMotion
    ? { scale: orb.orbScale, opacity: 1 }
    : state === 'thinking' || state === 'understanding' || state === 'reasoning' || state === 'generating'
      ? { scale: [orb.orbScale, orb.orbScale * 1.025, orb.orbScale], opacity: [0.88, 1, 0.88] }
      : state === 'offline'
        ? { scale: orb.orbScale, opacity: 0.62 }
        : { scale: [orb.orbScale * 0.98, orb.orbScale * 1.03, orb.orbScale * 0.98], opacity: [0.9, 1, 0.9] };

  const orbTransition = reducedMotion
    ? { duration: 0 }
    : state === 'reconnecting'
      ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const }
      : { duration: state === 'speaking' ? 2.6 : 4.8, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.div
      className="voice-overlay"
      style={styleVars}
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-mode-title"
      aria-describedby="voice-mode-status"
      data-testid="voice-mode-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
    >
      <style>{`
        .voice-overlay {
          --voice-ink: #edf0f6;
          --voice-muted: rgba(221, 226, 237, .58);
          position: fixed;
          inset: 0;
          z-index: 80;
          overflow: hidden;
          color: var(--voice-ink);
          background:
            radial-gradient(ellipse 75% 55% at 50% 44%, rgba(36, 44, 93, .42) 0%, rgba(16, 20, 47, .2) 42%, transparent 74%),
            radial-gradient(ellipse 100% 80% at 0% 100%, rgba(23, 64, 76, .26), transparent 58%),
            radial-gradient(ellipse 75% 70% at 100% 0%, rgba(71, 43, 101, .22), transparent 61%),
            #080b18;
          font-family: var(--app-font-sans, 'DM Sans', sans-serif);
          isolation: isolate;
        }
        .voice-overlay::before {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          content: '';
          opacity: .28;
          background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(ellipse at center, black, transparent 74%);
        }
        .voice-overlay__veil {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(ellipse at center, transparent 35%, rgba(2, 4, 12, .42) 100%);
        }
        .voice-particles {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
        }
        .voice-particle {
          position: absolute;
          border-radius: 50%;
          background: rgba(211, 225, 255, .72);
          box-shadow: 0 0 10px rgba(169, 197, 255, .24);
        }
        .voice-overlay__header, .voice-overlay__footer {
          position: absolute;
          right: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-right: max(22px, env(safe-area-inset-right));
          padding-left: max(22px, env(safe-area-inset-left));
        }
        .voice-overlay__header {
          top: 0;
          padding-top: max(22px, env(safe-area-inset-top));
        }
        .voice-overlay__footer {
          bottom: 0;
          padding-bottom: max(22px, env(safe-area-inset-bottom));
        }
        .voice-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: rgba(235, 239, 248, .86);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .22em;
          text-transform: uppercase;
        }
        .voice-brand__mark {
          display: grid;
          width: 29px;
          height: 29px;
          place-items: center;
          border: 1px solid rgba(196, 214, 255, .3);
          border-radius: 50%;
          color: var(--voice-color);
          background: rgba(156, 179, 255, .08);
        }
        .voice-brand__mark svg { width: 14px; height: 14px; }
        .voice-action {
          display: inline-flex;
          min-width: 44px;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid rgba(217, 226, 246, .16);
          border-radius: 999px;
          color: rgba(239, 242, 249, .76);
          background: rgba(17, 22, 43, .44);
          cursor: pointer;
          font: inherit;
          transition: color 180ms ease, border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
          backdrop-filter: blur(16px);
        }
        .voice-action:hover { color: #fff; border-color: rgba(217, 226, 246, .4); background: rgba(32, 40, 70, .62); }
        .voice-action:active { transform: scale(.96); }
        .voice-action:focus-visible { outline: 2px solid var(--voice-color); outline-offset: 3px; }
        .voice-action svg { width: 17px; height: 17px; }
        .voice-action--captions { padding: 0 15px; font-size: 12px; letter-spacing: .03em; }
        .voice-action--captions[data-active="true"] { border-color: color-mix(in srgb, var(--voice-color) 58%, transparent); color: var(--voice-color); background: color-mix(in srgb, var(--voice-color) 11%, transparent); }
        .voice-action--close { width: 44px; padding: 0; }
        .voice-stage {
          position: relative;
          display: flex;
          width: 100%;
          height: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 92px 20px 170px;
        }
        .voice-stage__state {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: clamp(25px, 5vh, 54px);
          color: var(--voice-color);
          font-size: 11px;
          font-weight: 650;
          letter-spacing: .17em;
          text-transform: uppercase;
        }
        .voice-stage__state svg { width: 15px; height: 15px; }
        .voice-stage__orb-wrap {
          position: relative;
          display: grid;
          width: min(64vw, 370px);
          aspect-ratio: 1;
          place-items: center;
        }
        .voice-stage__orb-wrap::before, .voice-stage__orb-wrap::after {
          position: absolute;
          content: '';
          border: 1px solid color-mix(in srgb, var(--voice-color) 25%, transparent);
          border-radius: 50%;
          pointer-events: none;
        }
        .voice-stage__orb-wrap::before { inset: 5%; opacity: .55; }
        .voice-stage__orb-wrap::after { inset: -10%; opacity: .18; border-style: dashed; }
        .voice-orb-halo {
          position: absolute;
          width: 72%;
          height: 72%;
          border-radius: 50%;
          background: var(--voice-soft-color);
          filter: blur(32px);
          opacity: .82;
        }
        .voice-orb {
          position: relative;
          display: grid;
          width: 57%;
          height: 57%;
          place-items: center;
          overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--voice-color) 76%, #fff);
          border-radius: 50%;
          color: var(--voice-color);
          background:
            radial-gradient(circle at 34% 29%, rgba(255,255,255,.9), transparent 3%),
            radial-gradient(circle at 42% 38%, color-mix(in srgb, var(--voice-color) 62%, #1b1f48), transparent 29%),
            radial-gradient(circle at 60% 68%, rgba(7, 10, 29, .96), transparent 68%),
            #121736;
          box-shadow: inset -22px -24px 38px rgba(0, 0, 0, .48), inset 10px 10px 24px rgba(255,255,255,.16), 0 0 38px var(--voice-soft-color), 0 0 110px color-mix(in srgb, var(--voice-soft-color) 75%, transparent);
        }
        .voice-orb::before {
          position: absolute;
          inset: 12%;
          border: 1px solid color-mix(in srgb, var(--voice-color) 38%, transparent);
          border-radius: 50%;
          content: '';
        }
        .voice-orb::after {
          position: absolute;
          top: 13%;
          right: 20%;
          width: 18%;
          height: 10%;
          border-radius: 50%;
          background: rgba(255,255,255,.28);
          filter: blur(4px);
          content: '';
          transform: rotate(-28deg);
        }
        .voice-orb svg { position: relative; z-index: 1; width: 25px; height: 25px; stroke-width: 1.55; }
        .voice-stage__name {
          margin: clamp(26px, 4vh, 41px) 0 0;
          color: rgba(247, 248, 252, .94);
          font-family: var(--app-font-heading, 'Space Grotesk', sans-serif);
          font-size: clamp(25px, 4vw, 34px);
          font-weight: 450;
          letter-spacing: -.035em;
        }
        .voice-stage__status {
          max-width: min(560px, 90vw);
          margin: 9px 0 0;
          color: var(--voice-muted);
          font-size: 14px;
          line-height: 1.55;
          text-align: center;
        }
        .voice-caption {
          position: absolute;
          bottom: 93px;
          display: flex;
          width: min(680px, calc(100% - 36px));
          flex-direction: column;
          gap: 10px;
          padding: 14px 17px;
          border: 1px solid rgba(221, 229, 248, .1);
          border-radius: 14px;
          background: rgba(16, 21, 42, .46);
          box-shadow: 0 14px 48px rgba(0, 0, 0, .12);
          backdrop-filter: blur(18px);
        }
        .voice-caption__line {
          display: flex;
          gap: 12px;
          min-height: 20px;
          color: rgba(240, 243, 250, .82);
          font-size: 13px;
          line-height: 1.5;
        }
        .voice-caption__line + .voice-caption__line { padding-top: 10px; border-top: 1px solid rgba(221, 229, 248, .08); }
        .voice-caption__label {
          flex: 0 0 auto;
          color: var(--voice-color);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .14em;
          line-height: 1.8;
          text-transform: uppercase;
        }
        .voice-caption__empty { color: rgba(221, 226, 237, .38); font-style: italic; }
        .voice-meters {
          display: flex;
          align-items: center;
          gap: clamp(15px, 3vw, 27px);
        }
        .voice-meter {
          display: flex;
          width: clamp(106px, 17vw, 155px);
          align-items: center;
          gap: 9px;
        }
        .voice-meter__label {
          color: rgba(221, 226, 237, .43);
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .13em;
          text-transform: uppercase;
        }
        .voice-wave {
          display: flex;
          height: 42px;
          flex: 1;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }
        .voice-wave__bar { display: block; width: 2px; min-height: 5px; border-radius: 999px; opacity: .82; }
        .voice-interrupt {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          gap: 9px;
          padding: 0 18px;
          border: 1px solid rgba(240, 183, 192, .36);
          border-radius: 999px;
          color: #f1c4cc;
          background: rgba(105, 47, 65, .26);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          letter-spacing: .02em;
          transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
          backdrop-filter: blur(16px);
        }
        .voice-interrupt:hover { border-color: rgba(240, 183, 192, .7); background: rgba(131, 58, 77, .4); }
        .voice-interrupt:active { transform: scale(.97); }
        .voice-interrupt:focus-visible { outline: 2px solid #f0b7c0; outline-offset: 3px; }
        .voice-interrupt svg { width: 15px; height: 15px; }
        @media (max-width: 620px) {
          .voice-stage { padding: 78px 14px 175px; }
          .voice-stage__orb-wrap { width: min(73vw, 320px); }
          .voice-caption { bottom: 96px; width: calc(100% - 28px); }
          .voice-overlay__footer { align-items: flex-end; }
          .voice-meter { width: 82px; flex-direction: column-reverse; align-items: flex-start; gap: 2px; }
          .voice-wave { width: 82px; height: 34px; }
          .voice-meters { gap: 10px; }
          .voice-interrupt { padding: 0 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .voice-action, .voice-interrupt { transition: none; }
          .voice-orb-halo { filter: blur(20px); }
        }
      `}</style>

      <div className="voice-overlay__veil" aria-hidden="true" />
      <div className="voice-particles" aria-hidden="true">
        {PARTICLES.map(([left, top, size, duration, delay], index) => (
          <motion.span
            key={`particle-${index}`}
            className="voice-particle"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
            animate={reducedMotion ? { opacity: 0.35 } : { y: [0, -9, 0], x: [0, 4, 0], opacity: [0.18, 0.62, 0.18] }}
            transition={reducedMotion ? { duration: 0 } : { duration, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <header className="voice-overlay__header">
        <div className="voice-brand">
          <span className="voice-brand__mark"><Sparkles aria-hidden="true" /></span>
          <span id="voice-mode-title">Singularity / Voice</span>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          className="voice-action voice-action--close"
          onClick={onClose}
          aria-label="Close voice mode"
          data-testid="button-close-voice-mode"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <main className="voice-stage">
        <div className="voice-stage__state" id="voice-mode-status" aria-live="polite" data-testid="status-voice-mode">
          {orb.icon}
          <span>{orb.eyebrow}</span>
        </div>

        <div className="voice-stage__orb-wrap" aria-hidden="true">
          <motion.div
            className="voice-orb-halo"
            animate={reducedMotion ? { opacity: 0.62 } : { opacity: [0.5, 0.86, 0.5], scale: [0.94, 1.05, 0.94] }}
            transition={reducedMotion ? { duration: 0 } : { duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div className="voice-orb" animate={animatedOrb} transition={orbTransition}>
            {orb.icon}
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.h1
            key={orb.label}
            className="voice-stage__name"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            data-testid="text-voice-state"
          >
            {orb.label}
          </motion.h1>
        </AnimatePresence>
        <p className="voice-stage__status" data-testid="text-voice-status">{statusText}</p>

        {captionsEnabled && (
          <section className="voice-caption" aria-label="Voice transcript and assistant response" aria-live="polite" data-testid="region-voice-captions">
            <div className="voice-caption__line" data-testid="text-voice-transcript">
              <span className="voice-caption__label">You</span>
              <span className={transcript ? '' : 'voice-caption__empty'}>{transcript || 'Waiting for your voice'}</span>
            </div>
            <div className="voice-caption__line" data-testid="text-voice-assistant">
              <span className="voice-caption__label">AI</span>
              <span className={assistantText ? '' : 'voice-caption__empty'}>{assistantText || 'No response yet'}</span>
            </div>
          </section>
        )}
      </main>

      <footer className="voice-overlay__footer">
        <div className="voice-meters" aria-label="Live audio levels">
          <div className="voice-meter" data-testid="meter-microphone">
            <span className="voice-meter__label">Mic</span>
            <Waveform level={safeMicLevel} bars={MIC_WAVE} color="#8ee9dc" label="Microphone" reducedMotion={reducedMotion} />
          </div>
          <div className="voice-meter" data-testid="meter-ai-output">
            <span className="voice-meter__label">Output</span>
            <Waveform level={safeOutputLevel} bars={OUTPUT_WAVE} color="#f0c99b" label="AI output" reducedMotion={reducedMotion} />
          </div>
        </div>

        <div className="voice-overlay__controls">
          <button
            type="button"
            className="voice-action voice-action--captions"
            data-active={captionsEnabled}
            aria-pressed={captionsEnabled}
            onClick={onToggleCaptions}
            data-testid="button-toggle-captions"
          >
            {captionsEnabled ? <Check aria-hidden="true" /> : <Captions aria-hidden="true" />}
            <span>{captionsEnabled ? 'Captions on' : 'Captions'}</span>
          </button>
          <button type="button" className="voice-interrupt" onClick={onInterrupt} data-testid="button-interrupt-voice">
            {state === 'speaking' || state === 'thinking' || state === 'understanding' || state === 'reasoning' || state === 'generating'
              ? <Square aria-hidden="true" />
              : <CircleAlert aria-hidden="true" />}
            <span>{state === 'speaking' || state === 'thinking' || state === 'understanding' || state === 'reasoning' || state === 'generating' ? 'Stop' : 'Interrupt'}</span>
          </button>
        </div>
      </footer>
    </motion.div>
  );
}

export default VoiceModeOverlay;
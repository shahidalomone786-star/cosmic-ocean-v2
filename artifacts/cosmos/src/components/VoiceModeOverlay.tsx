import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';

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
  isMuted: boolean;
  speakerEnabled: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onRetryMicrophone: () => void;
}

type VisualState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'offline';

const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

function visualState(state: VoiceModeState): VisualState {
  if (state === 'listening') return 'listening';
  if (state === 'speaking') return 'speaking';
  if (state === 'interrupted') return 'interrupted';
  if (state === 'offline' || state === 'error') return 'offline';
  if (state === 'understanding' || state === 'reasoning' || state === 'generating' || state === 'thinking' || state === 'reconnecting') return 'thinking';
  return 'idle';
}

const STATUS_COPY: Record<VisualState, string> = {
  idle: 'Waiting for you…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  interrupted: 'Listening again…',
  offline: 'Reconnecting…',
};

const ORB_COLORS: Record<VisualState, { color: string; glow: string }> = {
  idle: { color: '#b6b7ff', glow: 'rgba(116, 115, 255, .26)' },
  listening: { color: '#7de4d3', glow: 'rgba(73, 220, 195, .34)' },
  thinking: { color: '#c3b5ff', glow: 'rgba(136, 103, 255, .32)' },
  speaking: { color: '#ffd09d', glow: 'rgba(255, 176, 97, .36)' },
  interrupted: { color: '#f0bac7', glow: 'rgba(231, 119, 151, .29)' },
  offline: { color: '#a4aabd', glow: 'rgba(125, 132, 161, .16)' },
};

function orbMotion(mode: VisualState, level: number, reducedMotion: boolean) {
  const reactive = mode === 'listening' || mode === 'speaking' ? clamp(level) : 0;
  const base = mode === 'listening' ? 1.02 : mode === 'speaking' ? 1.04 : mode === 'thinking' ? .98 : mode === 'interrupted' ? .91 : mode === 'offline' ? .88 : 1;
  const liveScale = base + reactive * (mode === 'speaking' ? .08 : .12);
  if (reducedMotion) return { scale: liveScale, rotate: 0, opacity: mode === 'offline' ? .62 : 1 };
  if (mode === 'interrupted') return { scale: [.88, 1.02, .96], rotate: [0, -2, 1], opacity: [1, .82, 1] };
  if (mode === 'offline') return { scale: .88, rotate: 0, opacity: .62 };
  if (mode === 'thinking') return { scale: [.97, 1.01, .97], rotate: [0, 180, 360], opacity: [.78, 1, .78] };
  if (mode === 'listening') return { scale: [liveScale * .97, liveScale, liveScale * .97], rotate: [0, 1, 0], opacity: [.9, 1, .9] };
  if (mode === 'speaking') return { scale: [liveScale * .98, liveScale, liveScale * .98], rotate: [0, -1, 0], opacity: [.9, 1, .9] };
  return { scale: [1, 1.035, 1], rotate: [0, 1, 0], opacity: [.88, 1, .88] };
}

function motionTransition(mode: VisualState, reducedMotion: boolean) {
  if (reducedMotion) return { duration: 0 };
  if (mode === 'interrupted') return { type: 'spring' as const, stiffness: 500, damping: 28, mass: .55 };
  if (mode === 'thinking') return { type: 'spring' as const, stiffness: 70, damping: 16, mass: .8, repeat: Infinity, repeatType: 'mirror' as const, repeatDelay: .18 };
  return { type: 'spring' as const, stiffness: 90, damping: 18, mass: .75, repeat: Infinity, repeatType: 'mirror' as const, repeatDelay: .55 };
}

export function VoiceModeOverlay({
  state,
  statusText,
  transcript,
  assistantText,
  micLevel,
  outputLevel,
  isMuted,
  speakerEnabled,
  onClose,
  onToggleMute,
  onToggleSpeaker,
  onRetryMicrophone,
}: VoiceModeOverlayProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const subtitleTimerRef = useRef<number | null>(null);
  const [mode, setMode] = useState<VisualState>(visualState(state));
  const [subtitle, setSubtitle] = useState('');

  const visual = visualState(state);
  const colors = ORB_COLORS[visual];
  const audioLevel = visual === 'speaking' ? outputLevel : micLevel;
  const liveStatus = statusText || STATUS_COPY[visual];
  const nextSubtitle = visual === 'speaking' ? assistantText : transcript;
  const microphoneNeedsRetry = state === 'error';

  useEffect(() => setMode(visual), [visual]);
  useEffect(() => {
    if (subtitleTimerRef.current !== null) window.clearTimeout(subtitleTimerRef.current);
    if (!nextSubtitle.trim()) {
      setSubtitle('');
      return;
    }
    setSubtitle(nextSubtitle.trim());
    subtitleTimerRef.current = window.setTimeout(() => setSubtitle(''), 3000);
    return () => {
      if (subtitleTimerRef.current !== null) window.clearTimeout(subtitleTimerRef.current);
    };
  }, [nextSubtitle]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      if (subtitleTimerRef.current !== null) window.clearTimeout(subtitleTimerRef.current);
    };
  }, [onClose]);

  const orbStyle = useMemo(() => ({
    '--orb-color': colors.color,
    '--orb-glow': colors.glow,
  }) as CSSProperties, [colors]);

  return (
    <motion.div
      className="voice-v2"
      style={orbStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Voice mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : .24 }}
      data-testid="voice-mode-overlay"
    >
      <div className="voice-v2__atmosphere" aria-hidden="true" />
      <header className="voice-v2__header">
        <button
          ref={closeButtonRef}
          type="button"
          className="voice-v2__icon-button"
          onClick={onClose}
          aria-label="Close voice mode"
          data-testid="button-close-voice-mode"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <main className="voice-v2__stage">
        <motion.div
          className={`voice-v2__orb voice-v2__orb--${mode}`}
          animate={orbMotion(mode, audioLevel, reducedMotion)}
          transition={motionTransition(mode, reducedMotion)}
          aria-hidden="true"
        >
          <motion.div
            className="voice-v2__orb-core"
            animate={reducedMotion ? { scale: 1 } : { scale: mode === 'thinking' ? [1, .92, 1] : 1 }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 16, repeat: Infinity, repeatType: 'mirror', repeatDelay: .3 }}
          />
          <span className="voice-v2__orb-highlight" />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.p
            key={`${mode}-${liveStatus}`}
            className="voice-v2__status"
            aria-live="polite"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : .18 }}
            data-testid="text-voice-status"
          >
            {liveStatus || STATUS_COPY[mode]}
          </motion.p>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {subtitle && (
          <motion.p
            className="voice-v2__subtitle"
            key={subtitle}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : .2 }}
            aria-live="polite"
            data-testid="text-voice-subtitle"
          >
            {subtitle}
          </motion.p>
        )}
      </AnimatePresence>

      <nav className="voice-v2__dock" aria-label="Voice controls">
        <button
          type="button"
          className="voice-v2__control"
          onClick={microphoneNeedsRetry ? onRetryMicrophone : onToggleMute}
          aria-pressed={isMuted}
          aria-label={microphoneNeedsRetry ? 'Try microphone again' : (isMuted ? 'Unmute microphone' : 'Mute microphone')}
          data-testid="button-toggle-voice-mute"
        >
          {microphoneNeedsRetry ? <Mic aria-hidden="true" /> : (isMuted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />)}
          <span>{microphoneNeedsRetry ? 'Try again' : (isMuted ? 'Unmute' : 'Mute')}</span>
        </button>
        <button
          type="button"
          className="voice-v2__end"
          onClick={onClose}
          aria-label="End conversation"
          data-testid="button-end-voice-conversation"
        >
          <span />
        </button>
        <button
          type="button"
          className="voice-v2__control"
          onClick={onToggleSpeaker}
          aria-pressed={!speakerEnabled}
          aria-label={speakerEnabled ? 'Mute speaker' : 'Unmute speaker'}
          data-testid="button-toggle-voice-speaker"
        >
          {speakerEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          <span>{speakerEnabled ? 'Speaker' : 'Silent'}</span>
        </button>
      </nav>

      <style>{`
        .voice-v2 {
          position: fixed;
          inset: 0;
          z-index: 80;
          overflow: hidden;
          isolation: isolate;
          color: #f4f5fb;
          background: #08091a;
          font-family: var(--app-font-sans, 'DM Sans', sans-serif);
          overscroll-behavior: none;
          touch-action: manipulation;
        }
        .voice-v2__atmosphere {
          position: absolute;
          inset: -22%;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 43%, color-mix(in srgb, var(--orb-glow) 100%, transparent), transparent 26%),
            radial-gradient(circle at 16% 100%, rgba(30, 84, 93, .18), transparent 34%),
            radial-gradient(circle at 90% 0%, rgba(94, 51, 123, .18), transparent 38%);
          transition: background 480ms ease;
        }
        .voice-v2__header {
          position: absolute;
          top: 0;
          left: 0;
          padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-left));
        }
        .voice-v2__icon-button {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 1px solid rgba(238, 240, 255, .14);
          border-radius: 50%;
          color: rgba(246, 247, 255, .82);
          background: rgba(12, 15, 38, .45);
          cursor: pointer;
          backdrop-filter: blur(18px);
          transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
        }
        .voice-v2__icon-button:hover { border-color: rgba(238, 240, 255, .3); background: rgba(38, 40, 78, .52); }
        .voice-v2__icon-button:active { transform: scale(.94); }
        .voice-v2__icon-button:focus-visible, .voice-v2__control:focus-visible, .voice-v2__end:focus-visible { outline: 2px solid var(--orb-color); outline-offset: 3px; }
        .voice-v2__icon-button svg { width: 18px; height: 18px; stroke-width: 1.6; }
        .voice-v2__stage {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          align-content: center;
          gap: clamp(26px, 5vh, 46px);
          padding: 80px 20px 150px;
        }
        .voice-v2__orb {
          position: relative;
          width: clamp(180px, 52vw, 270px);
          aspect-ratio: 1;
          border: 1px solid color-mix(in srgb, var(--orb-color) 72%, white);
          border-radius: 50%;
          background:
            radial-gradient(circle at 31% 25%, rgba(255,255,255,.92), transparent 3%),
            radial-gradient(circle at 38% 34%, color-mix(in srgb, var(--orb-color) 74%, #273068), transparent 23%),
            radial-gradient(circle at 66% 70%, rgba(5, 8, 27, .98), transparent 67%),
            #151a43;
          box-shadow: inset -28px -30px 48px rgba(0,0,0,.56), inset 14px 12px 30px rgba(255,255,255,.15), 0 0 34px var(--orb-glow), 0 0 120px color-mix(in srgb, var(--orb-glow) 78%, transparent);
          will-change: transform, opacity;
        }
        .voice-v2__orb::before {
          position: absolute;
          inset: -10%;
          border: 1px solid color-mix(in srgb, var(--orb-color) 20%, transparent);
          border-radius: 50%;
          content: '';
        }
        .voice-v2__orb::after {
          position: absolute;
          inset: 13%;
          border: 1px solid color-mix(in srgb, var(--orb-color) 30%, transparent);
          border-radius: 50%;
          content: '';
        }
        .voice-v2__orb--listening::before { inset: -15%; border-width: 2px; opacity: .62; }
        .voice-v2__orb--speaking::before { inset: -12%; border-width: 2px; opacity: .72; }
        .voice-v2__orb--thinking::before { border-style: dashed; opacity: .5; }
        .voice-v2__orb--offline { filter: saturate(.5); }
        .voice-v2__orb-core {
          position: absolute;
          inset: 22%;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 25%, color-mix(in srgb, var(--orb-color) 55%, white), transparent 20%), radial-gradient(circle at 55% 60%, color-mix(in srgb, var(--orb-color) 32%, #12183f), #0d1230);
          opacity: .8;
        }
        .voice-v2__orb-highlight {
          position: absolute;
          top: 14%;
          right: 22%;
          width: 18%;
          height: 9%;
          border-radius: 50%;
          background: rgba(255,255,255,.26);
          filter: blur(4px);
          transform: rotate(-25deg);
        }
        .voice-v2__status {
          min-height: 22px;
          margin: 0;
          color: rgba(243, 245, 252, .68);
          font-size: 13px;
          letter-spacing: .025em;
          text-align: center;
        }
        .voice-v2__subtitle {
          position: absolute;
          right: max(18px, env(safe-area-inset-right));
          bottom: calc(112px + env(safe-area-inset-bottom));
          left: max(18px, env(safe-area-inset-left));
          display: -webkit-box;
          max-width: 620px;
          margin: 0 auto;
          overflow: hidden;
          color: rgba(255,255,255,.92);
          font-size: 15px;
          line-height: 1.42;
          text-align: center;
          text-shadow: 0 2px 12px rgba(0,0,0,.8);
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .voice-v2__dock {
          position: absolute;
          right: 50%;
          bottom: max(18px, env(safe-area-inset-bottom));
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(24px, 8vw, 62px);
          min-height: 68px;
          padding: 8px 22px;
          border: 1px solid rgba(233, 237, 255, .12);
          border-radius: 999px;
          background: rgba(15, 18, 42, .68);
          box-shadow: 0 18px 48px rgba(0,0,0,.24), inset 0 1px rgba(255,255,255,.06);
          transform: translateX(50%);
          backdrop-filter: blur(22px);
        }
        .voice-v2__control {
          display: flex;
          min-width: 52px;
          min-height: 52px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          border: 0;
          border-radius: 14px;
          color: rgba(238, 240, 253, .68);
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 9px;
          letter-spacing: .03em;
          transition: color 180ms ease, background 180ms ease, transform 180ms ease;
        }
        .voice-v2__control:hover { color: #fff; background: rgba(255,255,255,.08); }
        .voice-v2__control:active { transform: scale(.94); }
        .voice-v2__control svg { width: 18px; height: 18px; stroke-width: 1.7; }
        .voice-v2__end {
          display: grid;
          width: 52px;
          height: 52px;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: #e66e7f;
          box-shadow: 0 0 24px rgba(230,110,127,.26);
          cursor: pointer;
          transition: transform 180ms ease, filter 180ms ease;
        }
        .voice-v2__end:hover { filter: brightness(1.08); }
        .voice-v2__end:active { transform: scale(.92); }
        .voice-v2__end span { width: 17px; height: 17px; border-radius: 4px; background: #fff; }
        @media (max-width: 520px) {
          .voice-v2__stage { padding-bottom: 145px; }
          .voice-v2__orb { width: min(58vw, 220px); }
          .voice-v2__dock { gap: 22px; padding-inline: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .voice-v2__icon-button, .voice-v2__control, .voice-v2__end { transition: none; }
        }
      `}</style>
    </motion.div>
  );
}

export default VoiceModeOverlay;
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import * as Three from 'three';

type CosmicRunApi = {
  startGame: (container: HTMLElement, options?: Record<string, unknown>) => {
    destroy: () => void;
  };
};

type CosmicRunModule = {
  default?: CosmicRunApi;
};

type CosmicRunWindow = Window & {
  CosmicRun?: CosmicRunApi;
  THREE?: typeof Three;
};

type CosmicRunProps = {
  onClose: () => void;
};

const THREE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
let threeCdnPromise: Promise<typeof Three> | null = null;

function formatRuntimeError(error: unknown): string {
  if (error instanceof Error) return error.stack || `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

function loadThreeFromCdn(gameWindow: CosmicRunWindow): Promise<typeof Three> {
  if (gameWindow.THREE) return Promise.resolve(gameWindow.THREE);
  if (threeCdnPromise) return threeCdnPromise;

  threeCdnPromise = new Promise<typeof Three>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = THREE_CDN_URL;
    script.async = true;
    script.dataset.cosmicRunThree = 'true';
    script.onload = () => {
      if (gameWindow.THREE) {
        resolve(gameWindow.THREE);
      } else {
        reject(new Error(`Three.js loaded from ${THREE_CDN_URL}, but window.THREE is still undefined`));
      }
    };
    script.onerror = () => reject(new Error(`Unable to load Three.js from ${THREE_CDN_URL}`));
    document.head.appendChild(script);
  }).catch((error) => {
    threeCdnPromise = null;
    throw error;
  });

  return threeCdnPromise;
}

export default function CosmicRun({ onClose }: CosmicRunProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    let cancelled = false;
    let game: { destroy: () => void } | null = null;

    const showRuntimeError = (error: unknown) => {
      const details = formatRuntimeError(error);
      console.error('Cosmic Run runtime error:', error);
      try {
        game?.destroy();
      } catch (destroyError) {
        console.error('Cosmic Run cleanup error:', destroyError);
      }
      game = null;
      if (!cancelled) {
        setErrorDetails(details);
        setStatus('error');
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (event.error || event.message) showRuntimeError(event.error || new Error(event.message));
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      showRuntimeError(event.reason);
    };
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const mountGame = async () => {
      try {
        const gameWindow = window as CosmicRunWindow;
        if (!gameWindow.THREE) {
          try {
            await loadThreeFromCdn(gameWindow);
          } catch (cdnError) {
            // The bundled module is a local fallback when a browser blocks the CDN.
            gameWindow.THREE = Three;
            console.warn('Falling back to bundled Three.js after CDN load failure:', cdnError);
          }
        }
        if (!gameWindow.THREE) throw new Error('Three.js is missing: window.THREE is undefined');

        // Keep the original engine as the single source of gameplay truth.
        // It is loaded only after this modal opens.
        // The source engine is intentionally kept as a plain browser script
        // outside the React bundle; Vite serves it as a lazy module.
        // @ts-expect-error Cosmic Run is a JavaScript engine without a TS surface.
        const engineModule = (await import('../../../../cosmic-run/cosmic-run.js')) as CosmicRunModule;
        const engine = gameWindow.CosmicRun ?? engineModule.default;
        const container = containerRef.current;
        if (cancelled || !container) return;
        if (!engine) throw new Error('Cosmic Run engine API was not exported by the lazy module');

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled || !container.isConnected) return;

        game = engine.startGame(container);
        if (!container.querySelector('canvas')) {
          throw new Error('Cosmic Run renderer did not append a canvas to its container');
        }
        if (!cancelled) setStatus('ready');
      } catch (error) {
        showRuntimeError(error);
      }
    };

    void mountGame();

    return () => {
      cancelled = true;
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      game?.destroy();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[400] overflow-hidden bg-[#0a0e27]"
      role="dialog"
      aria-modal="true"
      aria-label="Cosmic Run"
      data-testid="cosmic-run-modal"
    >
      <div ref={containerRef} className="cosmic-run-surface absolute inset-0 h-full w-full min-h-0 min-w-0 overflow-hidden" />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[220] grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-[#0a0e27]/70 text-white/75 shadow-lg backdrop-blur-md transition-colors hover:border-cyan-300/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        aria-label="Close Cosmic Run"
        data-testid="button-close-cosmic-run"
      >
        <X size={18} strokeWidth={1.8} />
      </button>

      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 z-[210] grid place-items-center bg-[#0a0e27] text-cyan-300">
          <div className="flex flex-col items-center gap-4">
            <LoaderCircle size={30} className="animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]">Loading cosmic engines</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-[210] overflow-auto bg-[#0a0e27] px-6 py-20 text-white">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-300">Cosmic Run unavailable</p>
            <p className="mt-2 max-w-xl text-sm text-white/55">The 3D engine threw the following runtime error:</p>
            <pre
              data-testid="cosmic-run-error"
              className="mt-5 max-h-[50vh] w-full overflow-auto rounded-lg border border-red-400/30 bg-black/40 p-4 text-left font-mono text-xs leading-relaxed text-red-200 shadow-inner whitespace-pre-wrap break-words"
            >
              {errorDetails || 'Unknown Cosmic Run runtime error'}
            </pre>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full border border-white/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-cyan-300/60 hover:text-white"
            >
              Return to Free Games
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
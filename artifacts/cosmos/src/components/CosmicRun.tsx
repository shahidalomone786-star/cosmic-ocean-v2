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

export default function CosmicRun({ onClose }: CosmicRunProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let game: { destroy: () => void } | null = null;

    const mountGame = async () => {
      try {
        const gameWindow = window as CosmicRunWindow;
        gameWindow.THREE = Three;

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
        if (!cancelled) {
          console.error('Failed to mount Cosmic Run:', error);
          setStatus('error');
        }
      }
    };

    void mountGame();

    return () => {
      cancelled = true;
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
        <div className="absolute inset-0 z-[210] grid place-items-center bg-[#0a0e27] px-6 text-center text-white">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-300">Cosmic Run unavailable</p>
            <p className="mt-2 max-w-sm text-sm text-white/55">The 3D engine could not be mounted. Close this view and try again.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full border border-white/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-cyan-300/60 hover:text-white"
            >
              Return to Free Games
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
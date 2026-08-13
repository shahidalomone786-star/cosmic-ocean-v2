import { X } from 'lucide-react';

type CosmicRunProps = {
  onClose: () => void;
};

export default function CosmicRun({ onClose }: CosmicRunProps) {
  return (
    <div
      className="fixed inset-0 z-[400] overflow-hidden bg-[#0a0e27]"
      role="dialog"
      aria-modal="true"
      aria-label="Cosmic Run"
      data-testid="cosmic-run-modal"
    >
      <iframe
        src="/cosmic-run/index.html"
        title="Cosmic Run"
        className="absolute inset-0 h-full w-full border-0 bg-[#0a0e27]"
        allow="autoplay"
        style={{ width: '100%', height: '100%', border: 'none', background: '#0a0e27', display: 'block' }}
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[220] grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-[#0a0e27]/70 text-white/75 shadow-lg backdrop-blur-md transition-colors hover:border-cyan-300/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        aria-label="Close Cosmic Run"
        data-testid="button-close-cosmic-run"
      >
        <X size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
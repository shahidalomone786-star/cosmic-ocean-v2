type AgeGateModalProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

const ADULT_QUERY_TERMS = [
  'nsfw',
  'porn',
  'pornography',
  'hentai',
  'rule34',
  'r34',
  'explicit',
  'erotic',
  'lewd',
  'nude',
  'naked',
  'sexual',
  'sex',
  'boobs',
  'tits',
  'penis',
  'dick',
  'vagina',
  'vulva',
  'orgasm',
  'blowjob',
  'handjob',
  'anal',
  'bdsm',
  'fetish',
];

const MINOR_SAFETY_TERMS = /\b(?:child|children|kid|kids|minor|underage|loli|lolita|shota|teen|teens|teenage|schoolgirl|schoolboy)\b/i;

export function isAdultQuery(query: string): boolean {
  const normalized = query.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized || MINOR_SAFETY_TERMS.test(normalized)) return false;
  const terms = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));
  return ADULT_QUERY_TERMS.some((term) => terms.has(term));
}

export default function AgeGateModal({ onConfirm, onCancel }: AgeGateModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/80 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      data-testid="overlay-age-gate"
    >
      <div
        className="bg-[#0a0c14]/95 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-description"
        data-testid="dialog-age-gate"
      >
        <h2
          id="age-gate-title"
          className="text-sm font-semibold tracking-widest text-neutral-300 uppercase"
        >
          Archival Content Advisory
        </h2>
        <p id="age-gate-description" className="text-sm text-neutral-400 mt-2 mb-6">
          This query matches mature/adult collections (18+). Please verify your age to initialize the federated connector pipeline.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/[0.08] px-4 py-2 text-sm text-neutral-100 transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            onClick={onConfirm}
            data-testid="button-age-gate-confirm"
          >
            I am 18+ / Proceed
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            onClick={onCancel}
            data-testid="button-age-gate-cancel"
          >
            Exit / Under 18
          </button>
        </div>
      </div>
    </div>
  );
}
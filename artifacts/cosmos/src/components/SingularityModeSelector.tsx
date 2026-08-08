import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, FlaskConical, Gauge, Layers3, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  SINGULARITY_MODES,
  type SingularityMode,
  type SingularityModeOption,
} from '@/lib/singularityModes';

const modeIcons = {
  pro: Layers3,
  max: Sparkles,
  flash: Zap,
  research: FlaskConical,
} as const;

const modeAccents = {
  pro: {
    icon: 'text-sky-200',
    dot: 'bg-sky-200',
    active: 'border-sky-200/25 bg-sky-200/[0.09]',
    glow: 'shadow-[0_0_26px_rgba(125,211,252,0.10)]',
  },
  max: {
    icon: 'text-violet-200',
    dot: 'bg-violet-200',
    active: 'border-violet-200/25 bg-violet-200/[0.09]',
    glow: 'shadow-[0_0_26px_rgba(196,181,253,0.10)]',
  },
  flash: {
    icon: 'text-amber-200',
    dot: 'bg-amber-200',
    active: 'border-amber-200/25 bg-amber-200/[0.09]',
    glow: 'shadow-[0_0_26px_rgba(253,230,138,0.10)]',
  },
  research: {
    icon: 'text-emerald-200',
    dot: 'bg-emerald-200',
    active: 'border-emerald-200/25 bg-emerald-200/[0.09]',
    glow: 'shadow-[0_0_26px_rgba(167,243,208,0.10)]',
  },
} as const;

function ModeIcon({ mode, size = 13 }: { mode: SingularityMode; size?: number }) {
  const Icon = modeIcons[mode];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export default function SingularityModeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: SingularityMode;
  onChange: (mode: SingularityMode) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(0, SINGULARITY_MODES.findIndex(mode => mode.id === value)),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reducedMotion = useReducedMotion();
  const selected = SINGULARITY_MODES.find(mode => mode.id === value) ?? SINGULARITY_MODES[0];
  const selectedAccent = modeAccents[selected.id];

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const index = Math.max(0, SINGULARITY_MODES.findIndex(mode => mode.id === value));
    setFocusedIndex(index);
    requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }, [open, value]);

  const selectMode = (mode: SingularityModeOption) => {
    onChange(mode.id);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const mode = SINGULARITY_MODES[focusedIndex];
      if (mode) selectMode(mode);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? SINGULARITY_MODES.length - 1
        : (focusedIndex + (event.key === 'ArrowDown' ? 1 : -1) + SINGULARITY_MODES.length) % SINGULARITY_MODES.length;
    setFocusedIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div ref={containerRef} className="relative ml-auto shrink-0">
      <button
        type="button"
        data-mode-trigger
        ref={triggerRef}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Singularity mode: ${selected.name}. ${selected.description}`}
        className={`group flex max-w-[9.5rem] items-center gap-2 rounded-xl border px-2.5 py-2
          text-left transition-[background-color,border-color,box-shadow,transform] duration-200
          hover:-translate-y-px hover:bg-white/[0.06] focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-sky-200/40 disabled:cursor-not-allowed
          disabled:opacity-50 sm:max-w-none ${selectedAccent.active} ${selectedAccent.glow}`}
      >
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ${selectedAccent.icon}`}>
          <ModeIcon mode={selected.id} size={13} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white/78">
            {selected.name}
          </span>
          <span className="hidden truncate text-[10px] leading-4 text-white/35 sm:block">
            {selected.description}
          </span>
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.8}
          className={`ml-0.5 shrink-0 text-white/35 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            aria-label="Choose a Singularity mode"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[min(19rem,calc(100vw-2rem))]
              overflow-hidden rounded-2xl border border-white/[0.11] bg-[#111117]/[0.98]
              p-1.5 shadow-[0_22px_70px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.06)]
              backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 px-3 pb-2 pt-2">
              <Gauge size={11} className="text-white/30" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/32">
                Operating mode
              </span>
            </div>
            {SINGULARITY_MODES.map((mode, index) => {
              const Icon = modeIcons[mode.id];
              const accent = modeAccents[mode.id];
              const isSelected = value === mode.id;
              return (
                <button
                  key={mode.id}
                  ref={element => { optionRefs.current[index] = element; }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setFocusedIndex(index)}
                  onClick={() => selectMode(mode)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left
                    transition-[background-color,border-color,transform] duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/35
                    ${isSelected ? `${accent.active} ${accent.glow}` : 'border-transparent hover:border-white/[0.08] hover:bg-white/[0.045]'}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.055] ${accent.icon}`}>
                    <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/82">
                      {mode.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-white/40">
                      {mode.description}
                    </span>
                  </span>
                  {isSelected && <Check size={14} className={accent.icon} strokeWidth={2.2} aria-hidden="true" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
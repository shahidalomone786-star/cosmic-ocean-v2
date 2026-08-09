import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import CosmicAtelierMark from './CosmicAtelierMark';

interface CosmicAtelierEntryProps {
  lm: boolean;
  onOpen: () => void;
}

const atelierEase = [0.16, 1, 0.3, 1] as const;

export const CosmicAtelierEntry = ({ lm, onOpen }: CosmicAtelierEntryProps) => {
  const line = lm ? 'rgba(84, 64, 133, .18)' : 'rgba(214, 205, 255, .13)';
  const primary = lm ? '#33255f' : '#f2efff';
  const secondary = lm ? 'rgba(51, 37, 95, .62)' : 'rgba(230, 225, 247, .52)';

  return (
    <motion.button
      type="button"
      data-testid="button-open-cosmic-atelier"
      onClick={onOpen}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.68, ease: atelierEase, delay: 0.16 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.992 }}
      className="group relative mb-6 mt-2 block w-full overflow-hidden rounded-[1.65rem] text-left outline-none transition-shadow duration-500 focus-visible:ring-2 focus-visible:ring-violet-300/60"
      style={{
        color: primary,
        border: `1px solid ${line}`,
        background: lm
          ? 'linear-gradient(110deg, rgba(252,250,255,.98), rgba(241,239,250,.94) 58%, rgba(231,235,249,.95))'
          : 'linear-gradient(110deg, rgba(19, 18, 33, .96), rgba(13, 17, 31, .94) 58%, rgba(16, 25, 38, .95))',
        boxShadow: lm
          ? '0 14px 38px rgba(57, 37, 103, .1)'
          : '0 16px 45px rgba(0, 0, 0, .26), inset 0 1px 0 rgba(255,255,255,.055)',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
        style={{ background: lm ? 'rgba(165, 124, 255, .16)' : 'rgba(132, 103, 244, .14)' }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[42%] w-px opacity-40"
        style={{ background: `linear-gradient(transparent, ${lm ? 'rgba(87, 68, 137, .18)' : 'rgba(193, 181, 247, .16)'}, transparent)` }}
      />
      <div className="relative z-10 flex items-center gap-5 px-5 py-5 sm:gap-7 sm:px-8 sm:py-6">
        <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center sm:h-[92px] sm:w-[92px]">
          <span className="absolute inset-1 rounded-full border border-violet-300/15 transition-transform duration-700 group-hover:rotate-12" />
          <CosmicAtelierMark size={84} muted={lm} className="transition-transform duration-700 group-hover:scale-[1.06]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300/80 shadow-[0_0_12px_rgba(184,146,255,.75)]" />
            <span className="text-[9px] font-medium uppercase tracking-[.28em]" style={{ color: secondary }}>Private collection</span>
          </div>
          <h2 className="mb-1 text-[1.35rem] font-medium tracking-[-.04em] sm:text-[1.65rem]" style={{ fontFamily: 'var(--app-font-heading)' }}>
            ✦ Cosmic Atelier
          </h2>
          <p className="text-[11px] leading-relaxed sm:text-[12px]" style={{ color: secondary }}>Explore the Cosmic Collection</p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          style={{ borderColor: line, color: secondary, background: lm ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.035)' }}
        >
          <ArrowUpRight size={15} strokeWidth={1.5} />
        </span>
      </div>
      <div className="absolute inset-x-8 bottom-0 h-px opacity-70" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,146,255,.48), rgba(120,216,209,.3), transparent)' }} />
    </motion.button>
  );
};
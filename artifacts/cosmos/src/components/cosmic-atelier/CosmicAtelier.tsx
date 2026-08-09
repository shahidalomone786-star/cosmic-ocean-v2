import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import CosmicAtelierMark from './CosmicAtelierMark';

interface CosmicAtelierProps {
  lm: boolean;
  onClose: () => void;
}

const atelierEase = [0.16, 1, 0.3, 1] as const;

const CosmicAtelier = ({ lm, onClose }: CosmicAtelierProps) => {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.62, ease: atelierEase };
  const exitTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.32, ease: atelierEase };

  return (
    <AnimatePresence>
      <motion.main
        data-testid="surface-cosmic-atelier"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cosmic-atelier-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition}
        className={`fixed inset-0 z-[500] min-h-[100dvh] overflow-y-auto ${lm ? 'text-[#2f2548]' : 'text-[#f2efff]'}`}
        style={{
          background: lm
            ? 'radial-gradient(ellipse 75% 60% at 70% -10%, rgba(184,146,255,.2), transparent 65%), #ecebf4'
            : 'radial-gradient(ellipse 70% 58% at 67% -12%, rgba(114,82,202,.18), transparent 62%), radial-gradient(ellipse 55% 50% at 100% 80%, rgba(45,155,166,.08), transparent 66%), #080a12',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
          transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.08 }}
          className="mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-5 pb-10 sm:px-8 lg:px-14"
        >
          <header className="flex h-[76px] shrink-0 items-center justify-between border-b" style={{ borderColor: lm ? 'rgba(62, 42, 101, .14)' : 'rgba(221, 214, 255, .1)' }}>
            <button
              type="button"
              data-testid="button-back-from-cosmic-atelier"
              onClick={onClose}
              className="group inline-flex items-center gap-2 rounded-full py-2 pr-3 text-[11px] font-medium tracking-[.08em] transition-colors duration-200 hover:text-violet-200 focus-visible:ring-2 focus-visible:ring-violet-300/60"
              style={{ color: lm ? 'rgba(47, 37, 72, .68)' : 'rgba(235, 230, 249, .62)' }}
            >
              <ArrowLeft size={15} strokeWidth={1.5} className="transition-transform duration-200 group-hover:-translate-x-1" />
              Return to portal
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden text-[9px] uppercase tracking-[.3em] sm:inline" style={{ color: lm ? 'rgba(47,37,72,.42)' : 'rgba(235,230,249,.36)' }}>Cosmos / Store</span>
              <button
                type="button"
                data-testid="button-close-cosmic-atelier"
                aria-label="Close Cosmic Atelier"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 hover:-rotate-3 hover:bg-white/[.08] focus-visible:ring-2 focus-visible:ring-violet-300/60"
                style={{ borderColor: lm ? 'rgba(62, 42, 101, .16)' : 'rgba(221, 214, 255, .14)', color: lm ? 'rgba(47,37,72,.62)' : 'rgba(235,230,249,.66)' }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </header>

          <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(320px,480px)] lg:gap-20 lg:py-20">
            <div className="max-w-[670px]">
              <motion.div
                initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.18 }}
                className="mb-8 flex items-center gap-3"
              >
                <CosmicAtelierMark size={32} muted={lm} />
                <span className="text-[10px] font-medium uppercase tracking-[.34em]" style={{ color: lm ? 'rgba(69, 49, 111, .62)' : 'rgba(198, 181, 255, .64)' }}>Cosmic Atelier · 01</span>
              </motion.div>
              <motion.h1
                id="cosmic-atelier-title"
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.24 }}
                className="max-w-[720px] text-[clamp(3.6rem,10vw,8.6rem)] font-light leading-[.88] tracking-[-.085em]"
                style={{ fontFamily: 'var(--app-font-heading)' }}
              >
                Cosmic
                <span className="block" style={{ color: lm ? '#6f4db0' : '#c4a5ff' }}>Atelier</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.3 }}
                className="mt-8 max-w-[430px] text-[14px] leading-[1.8] sm:text-[15px]"
                style={{ color: lm ? 'rgba(47, 37, 72, .62)' : 'rgba(228, 224, 243, .58)' }}
              >
                A considered space for objects shaped by curiosity, distance, and the quiet geometry of the cosmos.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : .94, y: shouldReduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.22 }}
              className="relative min-h-[310px] overflow-hidden rounded-[2rem] border p-7 sm:p-9"
              style={{
                borderColor: lm ? 'rgba(73, 51, 121, .16)' : 'rgba(213, 201, 255, .14)',
                background: lm ? 'rgba(255, 255, 255, .38)' : 'rgba(255,255,255,.035)',
                boxShadow: lm ? '0 20px 60px rgba(61, 42, 108, .08)' : '0 24px 70px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: lm ? 'rgba(184,146,255,.16)' : 'rgba(141,105,241,.12)' }} />
              <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] uppercase tracking-[.3em]" style={{ color: lm ? 'rgba(69,49,111,.48)' : 'rgba(226,220,246,.42)' }}>Curated space</span>
                  <span className="text-[10px] font-mono" style={{ color: lm ? 'rgba(69,49,111,.38)' : 'rgba(226,220,246,.28)' }}>CA / 001</span>
                </div>
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="h-px w-9" style={{ background: lm ? 'rgba(111,77,176,.45)' : 'rgba(196,165,255,.55)' }} />
                    <span className="text-[10px] uppercase tracking-[.2em]" style={{ color: lm ? 'rgba(69,49,111,.58)' : 'rgba(226,220,246,.48)' }}>Collection opening soon</span>
                  </div>
                  <h2 className="max-w-[290px] text-[2rem] font-light leading-[1.02] tracking-[-.055em] sm:text-[2.45rem]" style={{ fontFamily: 'var(--app-font-heading)' }}>
                    The first orbit is taking shape.
                  </h2>
                  <p className="mt-4 max-w-[310px] text-[12px] leading-[1.7]" style={{ color: lm ? 'rgba(47,37,72,.55)' : 'rgba(228,224,243,.48)' }}>
                    We are assembling a small, precise collection. Nothing here is for sale yet.
                  </p>
                </div>
              </div>
            </motion.div>
          </section>

          <footer className="flex flex-col gap-3 border-t py-5 text-[10px] uppercase tracking-[.2em] sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: lm ? 'rgba(62,42,101,.14)' : 'rgba(221,214,255,.1)', color: lm ? 'rgba(47,37,72,.4)' : 'rgba(235,230,249,.34)' }}>
            <span>For the curious, by Cosmos</span>
            <span>Collection notes will appear here first</span>
          </footer>
        </motion.div>
      </motion.main>
    </AnimatePresence>
  );
};

export default CosmicAtelier;
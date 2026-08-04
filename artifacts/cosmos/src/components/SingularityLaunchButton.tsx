/**
 * SingularityLaunchButton — ultra-premium cosmic launch button
 * ─────────────────────────────────────────────────────────────
 * Self-contained component that manages its own open/close state
 * and renders the SingularityChat overlay when active.
 *
 * Design language: deep dark glassmorphism matching the Cosmos
 * portal aesthetic — obsidian glass, fine white borders, inner
 * highlight, breathing emerald status dot, shimmer on hover.
 */

import { useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Orbit } from 'lucide-react';
import { useLocation } from 'wouter';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SingularityLaunchButton() {
  const [, setLocation] = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      {/* ── Floating Launch Button ── */}
      <div className="relative flex items-center justify-center select-none">

        {/* Outer breathing glow ring — absolute, sits behind the button */}
        {!prefersReducedMotion && (
          <>
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-[22px] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.22) 0%, rgba(16,185,129,0.10) 40%, transparent 72%)',
                filter: 'blur(12px)',
              }}
              animate={isHovered
                ? { opacity: [0.6, 1, 0.6], scale: [1, 1.06, 1] }
                : { opacity: [0.25, 0.45, 0.25], scale: [0.96, 1.02, 0.96] }
              }
              transition={{ duration: isHovered ? 1.4 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* secondary wider ring */}
            <motion.div
              aria-hidden="true"
              className="absolute rounded-[26px] pointer-events-none"
              style={{
                inset: '-8px',
                background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.10) 0%, transparent 65%)',
                filter: 'blur(18px)',
              }}
              animate={{ opacity: [0.0, 0.30, 0.0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            />
          </>
        )}

        {/* ── The Button ── */}
        <motion.button
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ scale: 1.025, y: -1 }}
          whileTap={{ scale: 0.97, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={() => setLocation('/chat')}
          aria-label="Open Singularity Nexus — AI chat powered by GPT-OSS-120B"
          className="relative overflow-hidden flex items-center gap-3.5 px-5 py-3.5 rounded-[20px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          style={{
            background: 'rgba(8,8,8,0.90)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.15)',
              'inset 0 -1px 0 rgba(0,0,0,0.4)',
              '0 8px 32px rgba(0,0,0,0.7)',
              '0 2px 8px rgba(0,0,0,0.5)',
            ].join(', '),
          }}
        >
          {/* ── Shimmer sweep on hover ── */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                ref={shimmerRef}
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                initial={{ x: '-110%', skewX: '-20deg', opacity: 0.9 }}
                animate={{ x: '130%', skewX: '-20deg', opacity: 0.0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 35%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.07) 65%, transparent 100%)',
                  width: '60%',
                }}
              />
            )}
          </AnimatePresence>

          {/* ── Icon with hover rotation ── */}
          <div
            className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <motion.div
              animate={isHovered
                ? { rotate: 180 }
                : { rotate: 0 }
              }
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Orbit
                size={17}
                strokeWidth={1.7}
                className="text-white/80"
                aria-hidden="true"
              />
            </motion.div>

            {/* Inner icon glow on hover */}
            {!prefersReducedMotion && (
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                animate={isHovered
                  ? { opacity: 1, scale: 1.1 }
                  : { opacity: 0, scale: 0.9 }
                }
                transition={{ duration: 0.3 }}
                style={{
                  background: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)',
                }}
              />
            )}
          </div>

          {/* ── Text block ── */}
          <div className="flex flex-col min-w-0">
            <span
              className="text-[13.5px] font-semibold tracking-[-0.01em] text-white/95 leading-tight"
              style={{ fontFamily: 'var(--app-font-heading, system-ui)' }}
            >
              Singularity Nexus
            </span>
            <span
              className="text-[9.5px] tracking-[0.18em] text-white/38 mt-0.5 uppercase"
              style={{ fontFamily: 'ui-monospace, "Cascadia Code", "JetBrains Mono", monospace' }}
            >
              GPT-OSS-120B CORE
            </span>
          </div>

          {/* ── AI status dot ── */}
          <div className="flex-shrink-0 flex items-center gap-1.5 ml-1" aria-label="AI core online">
            <div className="relative w-2 h-2">
              {/* Pulsing outer ring */}
              {!prefersReducedMotion && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.9, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {/* Solid core */}
              <div className="absolute inset-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </div>
          </div>
        </motion.button>
      </div>

    </>
  );
}

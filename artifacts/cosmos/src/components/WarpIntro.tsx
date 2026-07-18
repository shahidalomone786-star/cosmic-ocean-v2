import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// ─── Sci-Fi Warp Intro — ultra-minimalist, 1.5 s total ───────────────────────
// Sequence: black → glowing dot → horizontal lightspeed flash → fills screen → fades to reveal UI
// No text. No particles. Pure geometry.
export default function WarpIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'dot' | 'line' | 'fill' | 'fade'>('dot');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('line'), 180);   // dot  → lightspeed flash
    const t2 = setTimeout(() => setPhase('fill'), 480);   // line → fill screen white
    const t3 = setTimeout(() => setPhase('fade'), 820);   // start fading overlay
    const t4 = setTimeout(onDone,                 1500);  // unmount
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  // Use scaleX / scaleY on a full-screen white div to avoid cross-unit interpolation issues.
  // On a ~1280×720 viewport:
  //   dot  → scaleX: 0.004 ≈ 5 px wide,  scaleY: 0.007 ≈ 5 px tall
  //   line → scaleX: 1     = full width,  scaleY: 0.002 ≈ 1-2 px tall  (the "flash")
  //   fill → scaleX: 1     = full width,  scaleY: 1     = full height
  const scaleX = phase === 'dot'  ? 0.004 : 1;
  const scaleY = phase === 'dot'  ? 0.007
               : phase === 'line' ? 0.002
               : 1;

  const transitionLine = { duration: 0.22, ease: [0.9, 0, 0.1, 1] as const };
  const transitionFill = { duration: 0.27, ease: [0.4, 0, 0.2, 1] as const };

  return (
    // Outer: pitch-black backdrop that fades to reveal the app underneath
    <motion.div
      key="warp-bg"
      className="fixed inset-0 z-[9999] bg-black overflow-hidden"
      animate={{ opacity: phase === 'fade' ? 0 : 1 }}
      transition={{ duration: phase === 'fade' ? 0.68 : 0, ease: 'easeInOut' }}
    >
      {/* White shape — dot → line → fill */}
      <motion.div
        className="absolute inset-0 bg-white"
        style={{
          transformOrigin: 'center',
          // Soft glow around the shape so the dot and line read clearly against black
          filter: 'blur(0px)',
          boxShadow: phase === 'fill' ? 'none' : '0 0 80px 24px rgba(255,255,255,0.55)',
        }}
        animate={{ scaleX, scaleY }}
        transition={
          phase === 'line' ? transitionLine :
          phase === 'fill' ? transitionFill :
          { duration: 0 }
        }
      />
    </motion.div>
  );
}

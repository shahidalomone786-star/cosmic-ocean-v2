import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── BigBang Cinematic Intro — plays once on first load ──────────────────────
// Duration: ~3.2 s then unmounts cleanly
export default function BigBangIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'ignite' | 'burst' | 'rays' | 'exit'>('ignite');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('burst'),  500);
    const t2 = setTimeout(() => setPhase('rays'),   1100);
    const t3 = setTimeout(() => setPhase('exit'),   2400);
    const t4 = setTimeout(() => onDone(),           3300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  // Generate deterministic star positions (no random on each render)
  const stars = Array.from({ length: 60 }, (_, i) => ({
    angle: (i / 60) * 360,
    dist:  55 + (i % 5) * 9,
    size:  1 + (i % 3) * 0.7,
    delay: (i % 8) * 0.04,
  }));

  const ringRays = Array.from({ length: 24 }, (_, i) => ({
    angle: i * 15,
    length: 120 + (i % 4) * 40,
    width:  1 + (i % 3) * 0.5,
    delay:  (i % 6) * 0.05,
  }));

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="big-bang"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: '#000' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          {/* ── Deep space star-field backdrop ── */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #0a0415 0%, #000 70%)' }} />

          {/* ── Ambient nebula rings ── */}
          {phase !== 'ignite' && (
            <>
              <motion.div
                className="absolute rounded-full"
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{ opacity: [0, 0.18, 0], scale: [0.1, 4, 7] }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                style={{
                  width: 600, height: 600,
                  background: 'radial-gradient(circle, rgba(138,43,226,0.4) 0%, rgba(72,0,255,0.15) 40%, transparent 70%)',
                  filter: 'blur(30px)',
                }}
              />
              <motion.div
                className="absolute rounded-full"
                initial={{ opacity: 0, scale: 0.05 }}
                animate={{ opacity: [0, 0.25, 0], scale: [0.05, 2.5, 6] }}
                transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
                style={{
                  width: 400, height: 400,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(100,180,255,0.3) 30%, transparent 65%)',
                  filter: 'blur(20px)',
                }}
              />
            </>
          )}

          {/* ── Singularity point — always visible ── */}
          <div className="absolute" style={{ transform: 'translate(-50%,-50%)', left: '50%', top: '50%' }}>

            {/* Pre-burst pulse rings */}
            {phase === 'ignite' && (
              <>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full border"
                    style={{
                      width: 8 + i * 14, height: 8 + i * 14,
                      left: '50%', top: '50%',
                      transform: 'translate(-50%,-50%)',
                      borderColor: 'rgba(180,140,255,0.5)',
                    }}
                    animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.6, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </>
            )}

            {/* Core singularity orb */}
            <motion.div
              className="absolute rounded-full"
              style={{
                left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                background: 'radial-gradient(circle, #fff 0%, #c8a0ff 25%, rgba(80,0,200,0.6) 60%, transparent 80%)',
                boxShadow: '0 0 40px 20px rgba(180,100,255,0.6), 0 0 80px 40px rgba(100,50,255,0.3)',
              }}
              initial={{ width: 12, height: 12, opacity: 0.8 }}
              animate={
                phase === 'ignite' ? { width: 12, height: 12, opacity: [0.6, 1, 0.6] } :
                phase === 'burst'  ? { width: 280, height: 280, opacity: [1, 0.9, 0] } :
                                     { width: 0,   height: 0,   opacity: 0 }
              }
              transition={
                phase === 'ignite' ? { duration: 0.6, repeat: Infinity } :
                phase === 'burst'  ? { duration: 0.55, ease: [0.4, 0, 0.2, 1] } :
                                     { duration: 0.2 }
              }
            />

            {/* Burst shockwave ring */}
            {phase === 'burst' && (
              <motion.div
                className="absolute rounded-full border-2"
                style={{
                  left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                  borderColor: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 0 30px rgba(180,120,255,0.8)',
                }}
                initial={{ width: 20, height: 20, opacity: 1 }}
                animate={{ width: 900, height: 900, opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            )}

            {/* ── Cosmic rays shooting outward ── */}
            {(phase === 'rays' || phase === 'burst') && ringRays.map((ray, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: '50%', top: '50%',
                  width: ray.width, height: 0,
                  transformOrigin: '0 0',
                  transform: `rotate(${ray.angle}deg)`,
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: [0, 1, 0.6, 0],
                  opacity: [0, 1, 0.5, 0],
                  height: [0, ray.length, ray.length * 0.8, 0],
                }}
                transition={{ duration: 1.0, delay: ray.delay, ease: 'easeOut' }}
              >
                <div style={{
                  width: ray.width,
                  height: ray.length,
                  background: `linear-gradient(to bottom, rgba(200,160,255,0.9), transparent)`,
                  borderRadius: 999,
                }} />
              </motion.div>
            ))}

            {/* ── Star particles ── */}
            {phase === 'rays' && stars.map((star, i) => {
              const rad = (star.angle * Math.PI) / 180;
              const tx  = Math.cos(rad) * star.dist * 15;
              const ty  = Math.sin(rad) * star.dist * 15;
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: star.size, height: star.size,
                    left: '50%', top: '50%',
                    marginLeft: -star.size / 2, marginTop: -star.size / 2,
                    boxShadow: `0 0 ${star.size * 2}px rgba(200,180,255,0.8)`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{ x: tx, y: ty, opacity: [0, 1, 0.7, 0], scale: [0, 1.5, 1, 0] }}
                  transition={{ duration: 1.1, delay: star.delay, ease: 'easeOut' }}
                />
              );
            })}
          </div>

          {/* ── Cosmic text reveal ── */}
          {phase === 'rays' && (
            <motion.div
              className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span
                className="text-white/80 text-[11px] uppercase tracking-[0.45em] font-light"
                style={{ textShadow: '0 0 20px rgba(180,120,255,0.8)' }}
              >
                In the beginning
              </span>
              <span
                className="text-white/40 text-[9px] uppercase tracking-[0.3em]"
              >
                13.8 billion years ago
              </span>
            </motion.div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

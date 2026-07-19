import { motion } from 'framer-motion';

const features = [
  'AI-Powered Science Conversations',
  'Interactive Physics Simulations',
  'Grandmaster Chess AI',
  'NASA Deep-Sky Archive',
];

export const Scene5 = () => {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full z-10 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(16px)' }}
      transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background — nebula at low opacity for continuity */}
      <motion.div
        className="absolute inset-0 z-0 mix-blend-screen"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/nebula.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.15, scale: 1.0 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />

      {/* Deep vignette */}
      <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 20%, rgba(8,12,24,0.97) 100%)' }} />

      {/* Orbiting ring decoration */}
      <motion.div
        className="absolute w-[55vw] h-[55vw] rounded-full border border-[rgba(201,168,76,0.08)] z-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-[38vw] h-[38vw] rounded-full border border-[rgba(79,195,247,0.06)] z-0"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating particles */}
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full z-0"
          style={{
            width: `${(i % 3) + 1}px`,
            height: `${(i % 3) + 1}px`,
            backgroundColor: i % 2 === 0 ? 'var(--color-accent)' : 'var(--color-bright)',
            left: `${10 + (i * 5.3) % 80}%`,
            top: `${5 + (i * 7.1) % 90}%`,
          }}
          animate={{ opacity: [0.1, 0.7, 0.1], y: [0, -12, 0] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        />
      ))}

      {/* Main content */}
      <div className="z-10 text-center relative flex flex-col items-center">

        {/* Eyebrow */}
        <motion.p
          className="font-mono text-[1vw] uppercase tracking-[0.5em] text-[var(--color-text-secondary)] mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Begin Your Journey
        </motion.p>

        {/* COSMOS wordmark */}
        <motion.div
          initial={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)', y: 40 }}
          animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', y: 0 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.9 }}
        >
          <h1 className="text-[11vw] leading-none font-display text-gradient-gold tracking-widest font-light">
            COSMOS
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-[2vw] font-body text-[var(--color-text-secondary)] uppercase font-light tracking-[0.4em] mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.2 }}
        >
          Science. Explored.
        </motion.p>

        {/* Divider */}
        <motion.div
          className="flex items-center gap-6 mt-10 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3 }}
        >
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent to-[var(--color-accent)]" />
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
          <div className="w-24 h-[1px] bg-gradient-to-l from-transparent to-[var(--color-accent)]" />
        </motion.div>

        {/* Feature list */}
        <div className="flex flex-col items-center gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 3.4 + i * 0.18, ease: 'easeOut' }}
            >
              <motion.div
                className="w-[5px] h-[5px] rounded-full bg-[var(--color-accent)]"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              />
              <p className="font-body text-[1.3vw] text-[var(--color-text-secondary)] tracking-wide">{f}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA pill */}
        <motion.div
          className="mt-10 px-10 py-4 border border-[var(--color-accent)] rounded-full bg-[rgba(201,168,76,0.06)] font-display text-[1.4vw] text-gradient-gold tracking-widest"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 4.6, type: 'spring', stiffness: 80 }}
        >
          Discover Now
        </motion.div>
      </div>

      {/* Decorative vertical lines */}
      <motion.div
        className="absolute top-0 bottom-0 left-[15%] w-[1px] bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.08)] to-transparent z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
      />
      <motion.div
        className="absolute top-0 bottom-0 right-[15%] w-[1px] bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.08)] to-transparent z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1.3 }}
      />
    </motion.div>
  );
};

import { motion } from 'framer-motion';

const NASA_IMAGES = [
  { label: 'Pillars of Creation', color: 'rgba(201,168,76,0.4)' },
  { label: 'Crab Nebula', color: 'rgba(79,195,247,0.4)' },
  { label: 'Andromeda Galaxy', color: 'rgba(149,117,205,0.4)' },
  { label: 'Solar Flare', color: 'rgba(255,138,76,0.4)' },
];

const stats = [
  { value: '93B', label: 'Light Years', sub: 'Observable Universe' },
  { value: '2T+', label: 'Galaxies', sub: 'Estimated Count' },
  { value: '13.8B', label: 'Years', sub: 'Age of Cosmos' },
];

export const Scene4 = () => {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full z-10 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(12px)' }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background — deep starfield */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/nebula.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1.0, opacity: 0.25 }}
        transition={{ duration: 5, ease: 'easeOut' }}
      />

      {/* Radial vignette */}
      <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(8,12,24,0.95) 100%)' }} />

      {/* Section label */}
      <motion.div
        className="absolute top-[12vh] text-center z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4 }}
      >
        <p className="font-mono text-[1.1vw] uppercase tracking-[0.4em] text-[var(--color-text-secondary)]">
          NASA Image Archive
        </p>
        <motion.h2
          className="text-[4.5vw] font-display text-gradient-gold mt-2 tracking-wide"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, delay: 0.8 }}
        >
          Explore the Universe
        </motion.h2>
        <motion.div
          className="w-[1px] h-10 bg-gradient-to-b from-[var(--color-accent)] to-transparent mx-auto mt-4"
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        />
      </motion.div>

      {/* Image Grid */}
      <div className="w-[75vw] grid grid-cols-4 gap-[1.5vw] mt-[8vh] z-10 relative">
        {NASA_IMAGES.map((img, i) => (
          <motion.div
            key={img.label}
            className="aspect-[3/4] rounded-xl overflow-hidden relative glass-panel border border-[rgba(255,255,255,0.08)]"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 1.6 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Placeholder colour swatch representing the image */}
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 40% 40%, ${img.color}, rgba(8,12,24,0.9))` }}
            />
            {/* Scan-line overlay */}
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px)' }} />
            {/* Label */}
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-[rgba(8,12,24,0.95)] to-transparent p-4">
              <p className="font-mono text-[0.9vw] text-[var(--color-text-secondary)] uppercase tracking-widest">{img.label}</p>
            </div>
            {/* Corner accent */}
            <motion.div
              className="absolute top-3 right-3 w-2 h-2 rounded-full"
              style={{ backgroundColor: img.color.replace('0.4', '1') }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Stats Row */}
      <motion.div
        className="flex gap-[6vw] mt-[5vh] z-10 relative"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 2.8 }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 3 + i * 0.2 }}
          >
            <p className="font-display text-[3.5vw] text-gradient-gold leading-none">{s.value}</p>
            <p className="font-body text-[1.1vw] text-[var(--color-text-primary)] mt-1">{s.label}</p>
            <p className="font-mono text-[0.8vw] text-[var(--color-text-secondary)] mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

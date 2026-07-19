import { motion } from 'framer-motion';

export const Scene3 = () => {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full z-10 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: "blur(10px)" }}
      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background Image - Chess Atmosphere */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
        initial={{ y: 50, scale: 1.1 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 4, ease: "easeOut" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/chess-atmosphere.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="absolute top-[15vh] w-full text-center z-20">
        <motion.h2 
          className="text-[4vw] font-display text-gradient-gold tracking-wide"
          initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.5 }}
        >
          Grandmaster AI
        </motion.h2>
        <motion.div 
          className="w-[1px] h-12 bg-gradient-to-b from-[var(--color-accent)] to-transparent mx-auto mt-4"
          initial={{ height: 0 }}
          animate={{ height: 48 }}
          transition={{ duration: 1, delay: 1 }}
        />
      </div>

      {/* Chess Avatars & Board UI */}
      <div className="w-[80vw] h-[50vh] relative mt-[10vh] z-10 flex items-center justify-between">
        
        {/* Einstein Avatar (Left) */}
        <motion.div 
          className="relative w-[25%]"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.5, delay: 1.2, type: "spring", stiffness: 50 }}
        >
          <div className="aspect-[3/4] relative rounded-lg overflow-hidden glass-panel border-[rgba(201,168,76,0.3)] border">
            <motion.img 
              src={`${import.meta.env.BASE_URL}images/einstein-avatar.png`}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 5, ease: "easeOut" }}
            />
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-[var(--color-bg-dark)] to-transparent p-4">
              <p className="font-display text-[2vw] text-white">Einstein</p>
              <p className="font-mono text-[1vw] text-[var(--color-text-secondary)]">ELO: 2850</p>
            </div>
          </div>
        </motion.div>

        {/* Center UI - Match info */}
        <motion.div 
          className="flex flex-col items-center justify-center w-[30%]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 2 }}
        >
          <div className="text-[3vw] font-display text-[var(--color-text-muted)] italic mb-4">VS</div>
          
          <motion.div 
            className="flex gap-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 3 }}
          >
            <div className="bg-[var(--color-bg-dark)] border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded text-center font-mono">
              <span className="block text-[0.8vw] text-[var(--color-text-secondary)] uppercase">White</span>
              <span className="text-[1.5vw]">10:00</span>
            </div>
            <div className="bg-[var(--color-bg-dark)] border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded text-center font-mono">
              <span className="block text-[0.8vw] text-[var(--color-text-secondary)] uppercase">Black</span>
              <span className="text-[1.5vw]">09:42</span>
            </div>
          </motion.div>

          <motion.div
            className="text-[1.2vw] font-mono text-[var(--color-accent)] border border-[var(--color-accent)] px-6 py-2 rounded-full bg-[rgba(201,168,76,0.1)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 3.5 }}
          >
            Evaluating Position...
          </motion.div>
        </motion.div>

        {/* Feynman Avatar (Right) */}
        <motion.div 
          className="relative w-[25%]"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.5, delay: 1.5, type: "spring", stiffness: 50 }}
        >
          <div className="aspect-[3/4] relative rounded-lg overflow-hidden glass-panel border-[rgba(79,195,247,0.3)] border">
            <motion.img 
              src={`${import.meta.env.BASE_URL}images/feynman-avatar.png`}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 5, ease: "easeOut" }}
            />
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-[var(--color-bg-dark)] to-transparent p-4 text-right">
              <p className="font-display text-[2vw] text-white">Feynman</p>
              <p className="font-mono text-[1vw] text-[var(--color-text-secondary)]">ELO: 2845</p>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

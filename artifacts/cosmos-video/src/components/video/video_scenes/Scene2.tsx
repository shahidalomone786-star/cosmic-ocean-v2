import { motion } from 'framer-motion';

export const Scene2 = () => {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full z-10 flex items-center justify-between px-[10vw]"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100, filter: "blur(10px)" }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background Image - Physics Art */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-30 mix-blend-screen"
        initial={{ scale: 1.2, filter: "blur(20px)" }}
        animate={{ scale: 1.0, filter: "blur(0px)" }}
        transition={{ duration: 3, ease: "easeOut" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/physics-art.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content Left */}
      <div className="w-[40%] z-10 relative">
        <motion.div
          className="w-12 h-[2px] bg-[var(--color-bright)] mb-8"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "circOut" }}
        />
        
        <motion.h2 
          className="text-[5vw] leading-[1.1] font-display text-[var(--color-text-primary)] mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
        >
          Interactive <br/>
          <span className="text-gradient-gold italic">Simulations</span>
        </motion.h2>
        
        <motion.p
          className="text-[1.5vw] font-body text-[var(--color-text-secondary)] font-light max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
        >
          PhET-powered physics engines. Wave interference, quantum tunneling, and orbital mechanics in real-time.
        </motion.p>
      </div>

      {/* Abstract Animated Diagram Right */}
      <div className="w-[45%] h-[60vh] relative z-10">
        <div className="absolute inset-0 glass-panel rounded-2xl overflow-hidden border border-[rgba(79,195,247,0.2)]">
           {/* Grid lines */}
           <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(79,195,247,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           
           {/* Animated Wave 1 */}
           <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <motion.path
               d="M0,50 Q25,20 50,50 T100,50"
               fill="none"
               stroke="var(--color-bright)"
               strokeWidth="0.5"
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 0.8 }}
               transition={{ duration: 2, delay: 1.5, ease: "easeInOut" }}
             />
             <motion.path
               d="M0,50 Q25,80 50,50 T100,50"
               fill="none"
               stroke="var(--color-accent)"
               strokeWidth="0.5"
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 0.6 }}
               transition={{ duration: 2, delay: 2, ease: "easeInOut" }}
             />
           </svg>

           {/* Floating UI Elements inside diagram */}
           <motion.div 
             className="absolute top-[20%] left-[60%] bg-[rgba(8,12,24,0.8)] border border-[var(--color-bright)] rounded px-4 py-2 text-[var(--color-bright)] font-mono text-[1vw]"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5, delay: 2.5, type: "spring" }}
           >
             Ψ(x,t) = Ae^(i(kx-ωt))
           </motion.div>
           
           <motion.div 
             className="absolute bottom-[20%] left-[20%] bg-[rgba(8,12,24,0.8)] border border-[var(--color-accent)] rounded px-4 py-2 text-[var(--color-accent)] font-mono text-[1vw]"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5, delay: 3, type: "spring" }}
           >
             E = mc²
           </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

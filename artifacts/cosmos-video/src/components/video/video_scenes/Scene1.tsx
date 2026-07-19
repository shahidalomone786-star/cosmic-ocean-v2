import { motion } from 'framer-motion';

export const Scene1 = () => {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background Image */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
        initial={{ scale: 1.1, rotate: 1 }}
        animate={{ scale: 1.0, rotate: 0 }}
        transition={{ duration: 10, ease: "linear" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/nebula.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Slow floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[var(--color-accent)] z-0"
          initial={{ 
            x: `${Math.random() * 100}vw`, 
            y: `${Math.random() * 100}vh`,
            opacity: Math.random() * 0.5 + 0.1,
            scale: Math.random() * 2 + 0.5
          }}
          animate={{ 
            y: [`${Math.random() * 100}vh`, `${Math.random() * 100}vh`],
            opacity: [0.1, 0.6, 0.1]
          }}
          transition={{ 
            duration: Math.random() * 5 + 5, 
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2
          }}
        />
      ))}

      <div className="z-10 text-center relative mt-10">
        <motion.div
          initial={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)', y: 50 }}
          animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', y: 0 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 1 }}
        >
          <h1 className="text-[12vw] leading-none font-display text-gradient-gold tracking-widest font-light">
            COSMOS
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20, letterSpacing: '0.2em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '0.5em' }}
          transition={{ duration: 2, ease: "easeOut", delay: 2.5 }}
        >
          <p className="text-[2vw] font-body text-[var(--color-text-secondary)] uppercase font-light mt-8">
            Science. Explored.
          </p>
        </motion.div>
      </div>
      
      {/* Decorative vertical lines */}
      <motion.div 
        className="absolute top-0 bottom-0 left-[20%] w-[1px] bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.1)] to-transparent z-0"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: '100%', opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
      />
      <motion.div 
        className="absolute top-0 bottom-0 right-[20%] w-[1px] bg-gradient-to-b from-transparent via-[rgba(201,168,76,0.1)] to-transparent z-0"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: '100%', opacity: 1 }}
        transition={{ duration: 2, delay: 0.8 }}
      />
    </motion.div>
  );
};

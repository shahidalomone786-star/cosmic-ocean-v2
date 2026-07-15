import { useState, useRef, Component } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import type { Group } from "three";

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function QuantumField() {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.x -= 0.0003;
      ref.current.rotation.y -= 0.0005;
    }
  });
  return (
    <group ref={ref}>
      <Stars radius={50} depth={50} count={8000} factor={9} saturation={0} fade speed={2} />
    </group>
  );
}

export default function MasterpieceHome() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      
      <div className="absolute inset-0 z-0">
        <WebGLErrorBoundary fallback={<div className="w-full h-full bg-black" />}>
          <Canvas camera={{ position: [0, 0, 1] }}>
            <color attach="background" args={['#000000']} />
            <QuantumField />
          </Canvas>
        </WebGLErrorBoundary>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
      </div>

      <motion.div 
        className="z-10 flex flex-col items-center w-full px-6"
        animate={{ y: isFocused ? -60 : 0 }} 
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        <motion.div 
          className="w-full max-w-[300px] relative group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} 
        >
          <div className="absolute inset-0 bg-white/5 rounded-full blur-md transition-all duration-500 group-hover:bg-white/10" />
          <input 
            type="text" 
            placeholder="Search the cosmos..." 
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="relative w-full py-2.5 px-5 text-xs tracking-wider rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-white placeholder-white/30 outline-none focus:bg-white/10 focus:border-white/30 transition-all duration-500 shadow-2xl"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/30 group-hover:text-white/80 transition-colors duration-300 text-sm">
            ✦
          </div>
        </motion.div>

        <motion.div 
          className="flex flex-wrap justify-center gap-2 mt-4 max-w-[300px]"
          animate={{ 
            opacity: isFocused ? 0 : 1, 
            y: isFocused ? 10 : 0, 
            filter: isFocused ? "blur(4px)" : "blur(0px)" 
          }}
          transition={{ duration: 0.4 }}
        >
          {['Quantum Mechanics', 'General Relativity', 'String Theory', 'Astrophysics'].map((tag, index) => (
            <motion.span 
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + (index * 0.1), duration: 0.8 }}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }}
              className="px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.25em] text-white/50 rounded-full border border-white/5 bg-white/5 backdrop-blur-md cursor-pointer transition-colors duration-300"
            >
              {tag}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </main>
  );
}

import { useState, useRef, useMemo, Component } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
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

/** Generates a soft circular glow texture via an offscreen canvas. */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0,  "rgba(255,255,255,1.0)");
  gradient.addColorStop(0.15, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.4,  "rgba(255,255,255,0.3)");
  gradient.addColorStop(0.75, "rgba(255,255,255,0.05)");
  gradient.addColorStop(1.0,  "rgba(255,255,255,0.0)");

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function SpiralGalaxy() {
  const ref = useRef<THREE.Points>(null);

  const glowTexture = useMemo(() => makeGlowTexture(), []);

  const { positions, colors } = useMemo(() => {
    const COUNT      = 35_000;
    const ARMS       = 4;
    const MAX_RADIUS = 5.0;

    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);

    // 5-stop cinematic color ramp: hot amber core → crimson → violet → cobalt → icy cyan
    const c0 = new THREE.Color("#ffe066"); // bright core flash
    const c1 = new THREE.Color("#ff5500"); // amber-orange
    const c2 = new THREE.Color("#cc0044"); // crimson inner arm
    const c3 = new THREE.Color("#5510bb"); // deep violet
    const c4 = new THREE.Color("#0055ff"); // cold cobalt
    const c5 = new THREE.Color("#00ffee"); // icy cyan tip

    const tmp = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const arm       = i % ARMS;
      const armOffset = (arm / ARMS) * Math.PI * 2;

      // Bias heavily toward inner region so the core is densely glowing
      const u = Math.random();
      const t = 1 - Math.sqrt(1 - u); // concave mapping → inner density
      const radius = t * MAX_RADIUS;

      // Spin angle increases with radius for realistic arm curvature
      const spinAngle = radius * 2.0;
      const angle     = armOffset + spinAngle;

      // Radial dust scatter – gaussian-ish by squaring
      const scatter      = Math.pow(Math.random(), 1.2) * 0.6 * (0.3 + t * 0.7);
      const scatterAngle = Math.random() * Math.PI * 2;

      // Disk thickness tapers sharply toward the edge
      const diskH = (Math.random() - 0.5) * 0.35 * Math.pow(1 - t, 1.5);

      positions[i * 3]     = Math.cos(angle) * radius + Math.cos(scatterAngle) * scatter;
      positions[i * 3 + 1] = diskH;
      positions[i * 3 + 2] = Math.sin(angle) * radius + Math.sin(scatterAngle) * scatter;

      // Smooth 6-stop color interpolation based on normalised radius
      const n = radius / MAX_RADIUS; // 0 → core, 1 → tip

      if (n < 0.05)       tmp.lerpColors(c0, c1, n / 0.05);
      else if (n < 0.2)   tmp.lerpColors(c1, c2, (n - 0.05) / 0.15);
      else if (n < 0.45)  tmp.lerpColors(c2, c3, (n - 0.2)  / 0.25);
      else if (n < 0.72)  tmp.lerpColors(c3, c4, (n - 0.45) / 0.27);
      else                tmp.lerpColors(c4, c5, (n - 0.72) / 0.28);

      colors[i * 3]     = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    return { positions, colors };
  }, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.0005; // slow majestic Y-axis spin
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors,    3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        map={glowTexture}
        alphaMap={glowTexture}
        vertexColors
        transparent
        opacity={1.0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        alphaTest={0.001}
      />
    </points>
  );
}

export default function MasterpieceHome() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">

      {/* ── 3D Galaxy Background ── */}
      <div className="absolute inset-0 z-0">
        <WebGLErrorBoundary fallback={<div className="w-full h-full bg-black" />}>
          <Canvas camera={{ position: [0, 4, 7], fov: 58 }}>
            <color attach="background" args={["#000000"]} />
            <SpiralGalaxy />
          </Canvas>
        </WebGLErrorBoundary>
        {/* Subtle edge vignette — keeps centre fully visible */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />
      </div>

      {/* ── UI Layer ── */}
      <motion.div
        className="z-10 flex flex-col items-center w-full px-6"
        animate={{ y: isFocused ? -60 : 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        {/* Search bar */}
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 group-hover:text-white/80 transition-colors duration-300 text-sm">
            ✦
          </div>
        </motion.div>

        {/* Suggestion tags */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mt-4 max-w-[300px]"
          animate={{
            opacity: isFocused ? 0 : 1,
            y:       isFocused ? 10 : 0,
            filter:  isFocused ? "blur(4px)" : "blur(0px)",
          }}
          transition={{ duration: 0.4 }}
        >
          {["Quantum Mechanics", "General Relativity", "String Theory", "Astrophysics"].map(
            (tag, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderColor: "rgba(255,255,255,0.3)",
                }}
                className="px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.25em] text-white/50 rounded-full border border-white/5 bg-white/5 backdrop-blur-md cursor-pointer transition-colors duration-300"
              >
                {tag}
              </motion.span>
            )
          )}
        </motion.div>
      </motion.div>
    </main>
  );
}

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

function makeGlowTexture(innerAlpha = 1.0): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;

  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0.0,  `rgba(255,255,255,${innerAlpha})`);
  g.addColorStop(0.12, "rgba(255,240,180,0.95)");
  g.addColorStop(0.3,  "rgba(255,180,80,0.55)");
  g.addColorStop(0.6,  "rgba(180,100,255,0.15)");
  g.addColorStop(1.0,  "rgba(0,0,0,0)");

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function SpiralGalaxy() {
  const groupRef = useRef<THREE.Group>(null);

  // Two textures: core is purer white, arms use the full warm glow
  const armTexture  = useMemo(() => makeGlowTexture(1.0), []);
  const coreTexture = useMemo(() => makeGlowTexture(1.0), []);

  // ── Spiral arm particles ──────────────────────────────────────────────
  const armGeo = useMemo(() => {
    const COUNT      = 35_000;
    const ARMS       = 4;
    const MAX_RADIUS = 4.5;

    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);

    const c0 = new THREE.Color("#ffe566");
    const c1 = new THREE.Color("#ff6600");
    const c2 = new THREE.Color("#dd0044");
    const c3 = new THREE.Color("#6622cc");
    const c4 = new THREE.Color("#1155ff");
    const c5 = new THREE.Color("#00eeff");
    const tmp = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const arm       = i % ARMS;
      const armOffset = (arm / ARMS) * Math.PI * 2;

      const u      = Math.random();
      const t      = 1 - Math.sqrt(1 - u);           // inner-biased
      const radius = t * MAX_RADIUS;

      const spinAngle    = radius * 2.2;
      const angle        = armOffset + spinAngle;

      const scatter      = Math.pow(Math.random(), 1.3) * 0.5 * (0.2 + t * 0.8);
      const scatterAngle = Math.random() * Math.PI * 2;
      const diskH        = (Math.random() - 0.5) * 0.3 * Math.pow(1 - t, 1.4);

      positions[i * 3]     = Math.cos(angle) * radius + Math.cos(scatterAngle) * scatter;
      positions[i * 3 + 1] = diskH;
      positions[i * 3 + 2] = Math.sin(angle) * radius + Math.sin(scatterAngle) * scatter;

      const n = radius / MAX_RADIUS;
      if      (n < 0.06) tmp.lerpColors(c0, c1, n / 0.06);
      else if (n < 0.22) tmp.lerpColors(c1, c2, (n - 0.06) / 0.16);
      else if (n < 0.48) tmp.lerpColors(c2, c3, (n - 0.22) / 0.26);
      else if (n < 0.74) tmp.lerpColors(c3, c4, (n - 0.48) / 0.26);
      else               tmp.lerpColors(c4, c5, (n - 0.74) / 0.26);

      colors[i * 3]     = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // ── Dense supercharged nucleus ────────────────────────────────────────
  const coreGeo = useMemo(() => {
    const COUNT = 4_000;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);

    const cWhite  = new THREE.Color("#ffffff");
    const cGold   = new THREE.Color("#ffe88a");
    const cOrange = new THREE.Color("#ff9933");
    const tmp     = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      // Gaussian-ish cluster strictly within radius 0.5
      const r     = Math.pow(Math.random(), 1.8) * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = (Math.random() - 0.5) * 0.18;    // tight disk

      positions[i * 3]     = Math.cos(theta) * r;
      positions[i * 3 + 1] = phi;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      // Very centre → pure white, mid → gold, edge → orange
      const n = r / 0.5;
      if (n < 0.35) tmp.lerpColors(cWhite, cGold,   n / 0.35);
      else          tmp.lerpColors(cGold,  cOrange, (n - 0.35) / 0.65);

      colors[i * 3]     = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005;
    }
  });

  const sharedMat = {
    vertexColors: true,
    transparent:  true,
    depthWrite:   false,
    blending:     THREE.AdditiveBlending,
    sizeAttenuation: true,
    alphaTest:    0.001,
  } as const;

  return (
    <group ref={groupRef}>
      {/* Spiral arms */}
      <points geometry={armGeo}>
        <pointsMaterial
          {...sharedMat}
          size={0.09}
          map={armTexture}
          alphaMap={armTexture}
          opacity={1.0}
        />
      </points>

      {/* Blinding nucleus */}
      <points geometry={coreGeo}>
        <pointsMaterial
          {...sharedMat}
          size={0.25}
          map={coreTexture}
          alphaMap={coreTexture}
          opacity={1.0}
        />
      </points>
    </group>
  );
}

export default function MasterpieceHome() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">

      {/* ── Galaxy canvas — no vignette, pure WebGL colors ── */}
      <div className="absolute inset-0 z-0">
        <WebGLErrorBoundary fallback={<div className="w-full h-full bg-black" />}>
          <Canvas camera={{ position: [0, 2.5, 4.5], fov: 60 }}>
            <color attach="background" args={["#000000"]} />
            <SpiralGalaxy />
          </Canvas>
        </WebGLErrorBoundary>
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

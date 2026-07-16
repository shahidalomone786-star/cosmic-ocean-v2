import { useState, useRef, useMemo, Component } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─── Error boundary ───────────────────────────────────────────────────────────
class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ─── Soft round glow point – vertex + fragment ────────────────────────────────
const VERT = /* glsl */`
  attribute vec3  aColor;
  attribute float aSize;
  varying   vec3  vColor;

  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  varying vec3 vColor;
  void main() {
    float d  = distance(gl_PointCoord, vec2(0.5)) * 2.0;
    float a  = pow(clamp(1.0 - d, 0.0, 1.0), 6.0);
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

// ─── Color ramp: warm golden core → deep indigo void ─────────────────────────
const RAMP = [
  { t: 0.00, c: new THREE.Color(0.95, 0.86, 0.52) }, // pale gold
  { t: 0.15, c: new THREE.Color(0.88, 0.62, 0.22) }, // warm amber
  { t: 0.35, c: new THREE.Color(0.55, 0.28, 0.18) }, // deep orange-rust
  { t: 0.55, c: new THREE.Color(0.22, 0.12, 0.38) }, // dusty indigo
  { t: 0.75, c: new THREE.Color(0.08, 0.05, 0.22) }, // dark blue-violet
  { t: 1.00, c: new THREE.Color(0.02, 0.01, 0.08) }, // near-void
];

function rampColor(n: number): THREE.Color {
  const v = Math.max(0, Math.min(1, n));
  for (let i = 1; i < RAMP.length; i++) {
    if (v <= RAMP[i].t) {
      const lo = RAMP[i - 1];
      const hi = RAMP[i];
      const u  = (v - lo.t) / (hi.t - lo.t);
      return new THREE.Color().lerpColors(lo.c, hi.c, u);
    }
  }
  return RAMP[RAMP.length - 1].c.clone();
}

// ─── Particle generation – no arms, pure organic scatter ─────────────────────
function buildGeo(): THREE.BufferGeometry {
  const TOTAL = 50_000;
  const MAX_R = 5.2;

  const pos   = new Float32Array(TOTAL * 3);
  const col   = new Float32Array(TOTAL * 3);
  const sizes = new Float32Array(TOTAL);

  for (let i = 0; i < TOTAL; i++) {
    // ── Radius via exponential distribution ──
    // -ln(U) gives an exponential; scale and clamp so most land 0–3 with a
    // long tail reaching MAX_R.  This makes the centre genuinely dense without
    // a hard blob cutoff.
    const raw    = -Math.log(1.0 - Math.random() * 0.9999) * 1.6;
    const radius = Math.min(raw, MAX_R);

    // ── Angle: fully random base + gentle differential-rotation swirl ──
    // No arm index, no branching.  The swirl factor (0.55) gives a smooth
    // galaxy-wide twist without creating discrete blades.
    const baseAngle  = Math.random() * Math.PI * 2;
    const swirl      = radius * 0.55;
    const angle      = baseAngle + swirl;

    // ── Heavy organic scatter on X and Z ──
    // Two independent exponential nudges in random directions so particles
    // spread into a broad, irregular cloud rather than a thin ring.
    const s1  = Math.pow(Math.random(), 0.45) * radius * 0.62;
    const s2  = Math.pow(Math.random(), 0.45) * radius * 0.38;
    const a1  = Math.random() * Math.PI * 2;
    const a2  = Math.random() * Math.PI * 2;

    const x = Math.cos(angle) * radius + Math.cos(a1) * s1 + Math.cos(a2) * s2;
    const z = Math.sin(angle) * radius + Math.sin(a1) * s1 + Math.sin(a2) * s2;

    // ── Disk height: thin but thicker near centre ──
    // Two uniform samples summed → bell-shaped distribution (no harsh cutoff).
    const halfH = 0.07 + 0.55 * Math.pow(Math.max(0, 1 - radius / MAX_R), 1.6);
    const y = (Math.random() + Math.random() - 1.0) * halfH;

    pos[i*3]   = x;
    pos[i*3+1] = y;
    pos[i*3+2] = z;

    // ── Color: based on actual final distance from origin ──
    const finalR = Math.sqrt(x*x + z*z);
    const n      = Math.min(1, finalR / MAX_R);

    // Slight per-particle brightness variation so the cloud looks textured
    const brightness = 0.65 + Math.random() * 0.45;
    const c = rampColor(n);
    col[i*3]   = c.r * brightness;
    col[i*3+1] = c.g * brightness;
    col[i*3+2] = c.b * brightness;

    // ── Size: larger near core, tiny at edges ──
    // Core particles are intentionally small-to-medium so they stay
    // semi-transparent and sum to a soft glow via additive blending,
    // rather than painting a solid white blob.
    const coreBoost = Math.max(0, 1 - radius / 1.2);
    sizes[i] = 0.30 + Math.random() * 0.55 + coreBoost * 1.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos,   3));
  geo.setAttribute("aColor",   new THREE.BufferAttribute(col,   3));
  geo.setAttribute("aSize",    new THREE.BufferAttribute(sizes, 1));
  return geo;
}

// ─── Three component ──────────────────────────────────────────────────────────
function GalaxyDisk() {
  const groupRef = useRef<THREE.Group>(null);
  const geo      = useMemo(() => buildGeo(), []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.00038;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geo}>
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MasterpieceHome() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">

      {/* Galaxy canvas */}
      <div className="absolute inset-0 z-0">
        <WebGLErrorBoundary fallback={<div className="w-full h-full bg-black" />}>
          <Canvas camera={{ position: [0, 3, 5], fov: 60 }}>
            <color attach="background" args={["#000000"]} />
            <GalaxyDisk />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              rotateSpeed={0.6}
            />
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      {/* UI layer */}
      <motion.div
        className="z-10 flex flex-col items-center w-full px-6 pointer-events-none"
        animate={{ y: isFocused ? -60 : 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        <motion.div
          className="w-full max-w-[300px] relative group pointer-events-auto"
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

        <motion.div
          className="flex flex-wrap justify-center gap-2 mt-4 max-w-[300px] pointer-events-auto"
          animate={{
            opacity: isFocused ? 0 : 1,
            y:       isFocused ? 10 : 0,
            filter:  isFocused ? "blur(4px)" : "blur(0px)",
          }}
          transition={{ duration: 0.4 }}
        >
          {["Quantum Mechanics", "General Relativity", "String Theory", "Astrophysics"].map(
            (tag, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + idx * 0.1, duration: 0.8 }}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.25)",
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

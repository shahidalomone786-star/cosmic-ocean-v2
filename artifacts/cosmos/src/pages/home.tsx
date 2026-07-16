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

// ─── Shaders ─────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
  attribute vec3  aColor;
  attribute float aSize;
  varying   vec3  vColor;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / -mvPosition.z);
    gl_Position  = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */`
  varying vec3 vColor;

  void main() {
    float d        = distance(gl_PointCoord, vec2(0.5));
    float strength = clamp(1.0 - d * 2.0, 0.0, 1.0);
    strength       = pow(strength, 8.0);
    if (strength < 0.001) discard;
    gl_FragColor   = vec4(vColor * strength, strength);
  }
`;

// ─── Colour palette — warm core, dusty purple wings ──────────────────────────
const C = {
  coreHot  : new THREE.Color(0.98, 0.92, 0.78), // pale warm cream
  coreGold : new THREE.Color(0.90, 0.66, 0.28), // amber-gold
  coreAmber: new THREE.Color(0.72, 0.40, 0.16), // deep amber
  midDust  : new THREE.Color(0.34, 0.22, 0.50), // dusty purple
  outerGas : new THREE.Color(0.18, 0.12, 0.32), // dark violet gas
  edgeFade : new THREE.Color(0.07, 0.05, 0.13), // near-black edge
};

function palette(n: number): THREE.Color {
  // n = 0 (core) … 1 (outer edge)
  const t = new THREE.Color();
  if      (n < 0.10) t.lerpColors(C.coreHot,   C.coreGold,  n / 0.10);
  else if (n < 0.26) t.lerpColors(C.coreGold,  C.coreAmber, (n - 0.10) / 0.16);
  else if (n < 0.50) t.lerpColors(C.coreAmber, C.midDust,   (n - 0.26) / 0.24);
  else if (n < 0.76) t.lerpColors(C.midDust,   C.outerGas,  (n - 0.50) / 0.26);
  else               t.lerpColors(C.outerGas,  C.edgeFade,  (n - 0.76) / 0.24);
  return t;
}

// Gaussian sample: sum of two uniforms → bell curve centred at 0
function gauss(): number { return (Math.random() + Math.random() - 1.0); }

// ─── Build geometry ───────────────────────────────────────────────────────────
function buildGeo(): THREE.BufferGeometry {
  const MAX_R        = 5.2;
  const CORE_COUNT   = 3_200;   // dense nucleus blob
  const DUST_COUNT   = 14_000;  // inter-arm haze scattered across the disk
  const ARM_COUNT    = 24_800;  // loose spiral arms with massive dispersion
  const TOTAL        = CORE_COUNT + DUST_COUNT + ARM_COUNT;
  const ARMS         = 3;

  const pos   = new Float32Array(TOTAL * 3);
  const col   = new Float32Array(TOTAL * 3);
  const sizes = new Float32Array(TOTAL);

  let i = 0;

  // — Nucleus: warm wide blob ————————————————————————————————————
  while (i < CORE_COUNT) {
    const r   = Math.pow(Math.random(), 1.6) * 0.8;
    const th  = Math.random() * Math.PI * 2;
    const ht  = gauss() * 0.18 * (1 - r / 0.8);

    pos[i*3]   = Math.cos(th) * r;
    pos[i*3+1] = ht;
    pos[i*3+2] = Math.sin(th) * r;

    const c = palette(r / 0.8 * 0.22);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    sizes[i] = 1.0 + Math.random() * 2.4;
    i++;
  }

  // — Ambient disk dust: fills the whole plane, no arms ————————————
  while (i < CORE_COUNT + DUST_COUNT) {
    // Random point inside an ellipse — creates a flat galactic disk background
    const r   = Math.sqrt(Math.random()) * MAX_R;       // uniform area distribution
    const th  = Math.random() * Math.PI * 2;
    const ht  = gauss() * 0.20 * (1 - (r / MAX_R) * 0.6);

    pos[i*3]   = Math.cos(th) * r;
    pos[i*3+1] = ht;
    pos[i*3+2] = Math.sin(th) * r;

    const n = r / MAX_R;
    const c = palette(Math.min(1, n * 1.05));
    col[i*3] = c.r * 0.55; col[i*3+1] = c.g * 0.55; col[i*3+2] = c.b * 0.55;
    sizes[i] = 0.35 + Math.random() * 0.65;
    i++;
  }

  // — Spiral arms: wide, fluffy, dispersed ——————————————————————————
  while (i < TOTAL) {
    const arm = (i - CORE_COUNT - DUST_COUNT) % ARMS;

    // Concave mapping: more particles cluster near the inner region
    const u      = Math.random();
    const t      = 1 - Math.sqrt(1 - u * 0.97);
    const radius = 0.8 + t * (MAX_R - 0.8);

    const armBase  = (arm / ARMS) * Math.PI * 2;
    const spinAngle = radius * 0.9;          // loose, open arms (was 1.85 — caused snake)
    const baseAngle = armBase + spinAngle;

    // ── MASSIVE dispersion: scatter proportional to radius ──
    // Perpendicular (tangential) scatter — gives arms width
    const tangScatter = gauss() * radius * 0.52;
    const tangAngle   = baseAngle + Math.PI / 2;
    // Radial scatter — blurs arm boundaries inward/outward
    const radScatter  = gauss() * radius * 0.38;

    const x = Math.cos(baseAngle) * (radius + radScatter) + Math.cos(tangAngle) * tangScatter;
    const z = Math.sin(baseAngle) * (radius + radScatter) + Math.sin(tangAngle) * tangScatter;
    // Disk height: thin but not a razor; wider near centre
    const ht = gauss() * 0.45 * Math.pow(Math.max(0, 1 - t), 1.2);

    pos[i*3]   = x;
    pos[i*3+1] = ht;
    pos[i*3+2] = z;

    const actualR = Math.sqrt(x*x + z*z);
    const n = Math.min(1, actualR / MAX_R);
    const c = palette(n);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    sizes[i] = 0.50 + Math.random() * (1.1 - t * 0.55);
    i++;
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
      groupRef.current.rotation.y += 0.00042;
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

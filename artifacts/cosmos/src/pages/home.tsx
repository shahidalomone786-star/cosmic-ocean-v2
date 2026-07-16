import { useState, useRef, useMemo, Component } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
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
    // perspective-correct point size
    gl_PointSize = aSize * (320.0 / -mvPosition.z);
    gl_Position  = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */`
  varying vec3 vColor;

  void main() {
    // Soft smoky gas puff — radial exponential falloff
    float d        = distance(gl_PointCoord, vec2(0.5));
    float strength = 1.0 - d * 2.0;          // 0 at edge, 1 at centre
    strength = clamp(strength, 0.0, 1.0);
    strength = pow(strength, 8.0);            // ultra-soft gaussian-like

    if (strength < 0.001) discard;
    gl_FragColor = vec4(vColor * strength, strength);
  }
`;

// ─── Realistic colour helpers ─────────────────────────────────────────────────
// All colours are desaturated, dark-space tones that bloom beautifully
// under additive blending without looking neon or candy.
const PALETTE = {
  coreFlash  : new THREE.Color(0.97, 0.93, 0.82), // pale warm cream
  coreGold   : new THREE.Color(0.88, 0.70, 0.36), // muted gold
  coreAmber  : new THREE.Color(0.70, 0.44, 0.20), // amber dust
  midIndigo  : new THREE.Color(0.28, 0.20, 0.48), // dusty indigo
  deepViolet : new THREE.Color(0.15, 0.10, 0.28), // deep space violet
  edgeDust   : new THREE.Color(0.08, 0.06, 0.14), // near-black charcoal
};

function lerpPalette(n: number): THREE.Color {
  // n = 0 (core) → 1 (outer edge)
  const tmp = new THREE.Color();
  if      (n < 0.08) tmp.lerpColors(PALETTE.coreFlash,  PALETTE.coreGold,   n / 0.08);
  else if (n < 0.22) tmp.lerpColors(PALETTE.coreGold,   PALETTE.coreAmber,  (n - 0.08) / 0.14);
  else if (n < 0.45) tmp.lerpColors(PALETTE.coreAmber,  PALETTE.midIndigo,  (n - 0.22) / 0.23);
  else if (n < 0.72) tmp.lerpColors(PALETTE.midIndigo,  PALETTE.deepViolet, (n - 0.45) / 0.27);
  else               tmp.lerpColors(PALETTE.deepViolet,  PALETTE.edgeDust,  (n - 0.72) / 0.28);
  return tmp;
}

// Cheap pseudo-noise: sum of offset sinusoids
function fbm(x: number, y: number): number {
  return (
    Math.sin(x * 1.7 + y * 2.3) * 0.50 +
    Math.sin(x * 3.1 - y * 1.9) * 0.25 +
    Math.sin(x * 5.7 + y * 4.1) * 0.13 +
    Math.sin(x * 9.3 - y * 7.5) * 0.06
  );
}

// ─── Galaxy geometry ──────────────────────────────────────────────────────────
function buildGalaxyGeo() {
  const TOTAL      = 42_000;
  const ARMS       = 3;          // odd arm count looks more organic
  const MAX_R      = 5.0;
  const CORE_COUNT = 2_500;      // nucleus particles embedded in the same mesh
  const ARM_COUNT  = TOTAL - CORE_COUNT;

  const positions  = new Float32Array(TOTAL * 3);
  const aColor     = new Float32Array(TOTAL * 3);
  const aSize      = new Float32Array(TOTAL);

  // — nucleus —
  for (let i = 0; i < CORE_COUNT; i++) {
    const r      = Math.pow(Math.random(), 2.2) * 0.55;   // gaussian-ish cluster
    const theta  = Math.random() * Math.PI * 2;
    const diskH  = (Math.random() - 0.5) * 0.12 * (1 - r / 0.55);

    positions[i * 3]     = Math.cos(theta) * r;
    positions[i * 3 + 1] = diskH;
    positions[i * 3 + 2] = Math.sin(theta) * r;

    const n   = r / 0.55;
    const col = lerpPalette(n * 0.18); // keep inside warm zone
    aColor[i * 3]     = col.r;
    aColor[i * 3 + 1] = col.g;
    aColor[i * 3 + 2] = col.b;

    // Core particles: softly varied sizes — some bigger for bloomed nucleus look
    aSize[i] = 0.9 + Math.random() * 2.2;
  }

  // — spiral arms with organic turbulence —
  for (let i = 0; i < ARM_COUNT; i++) {
    const idx = i + CORE_COUNT;
    const arm = i % ARMS;

    // Concave radial mapping → denser inner population
    const u      = Math.random();
    const t      = 1 - Math.sqrt(1 - u * 0.96);
    const radius = 0.55 + t * (MAX_R - 0.55); // start just outside nucleus

    const armBase  = (arm / ARMS) * Math.PI * 2;
    const spinBase = radius * 1.85;             // tightness of spiral

    // Organic turbulence: angular noise + radial displacement
    const px         = Math.cos(armBase + spinBase) * radius;
    const pz         = Math.sin(armBase + spinBase) * radius;
    const turbAngle  = fbm(px * 0.35, pz * 0.35) * 0.55;  // messy arm edges
    const turbRadius = fbm(pz * 0.28, px * 0.28) * 0.40 * radius;

    const angle  = armBase + spinBase + turbAngle;
    const r      = radius + turbRadius;

    // Gaussian scatter perpendicular to arm, widening toward edge
    const scatter      = Math.abs((Math.random() + Math.random() - 1) * 0.45 * (0.15 + t));
    const scatterAngle = Math.random() * Math.PI * 2;

    // Disk: sharp vertical falloff
    const diskH = (Math.random() - 0.5) * 0.35 * Math.pow(Math.max(0, 1 - t), 1.8);

    positions[idx * 3]     = Math.cos(angle) * r + Math.cos(scatterAngle) * scatter;
    positions[idx * 3 + 1] = diskH;
    positions[idx * 3 + 2] = Math.sin(angle) * r + Math.sin(scatterAngle) * scatter;

    // Colour by radius, with slight arm-specific hue shift for organic variety
    const n      = (r - 0.55) / (MAX_R - 0.55);
    const hShift = (arm / ARMS) * 0.05;           // tiny per-arm hue variation
    const col    = lerpPalette(Math.min(1, n + hShift));
    aColor[idx * 3]     = col.r;
    aColor[idx * 3 + 1] = col.g;
    aColor[idx * 3 + 2] = col.b;

    // Size: inner region slightly larger (brighter accretion), outer whispy
    aSize[idx] = 0.55 + Math.random() * (1.1 - t * 0.7);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aColor",   new THREE.BufferAttribute(aColor,    3));
  geo.setAttribute("aSize",    new THREE.BufferAttribute(aSize,     1));
  return geo;
}

// ─── Component ────────────────────────────────────────────────────────────────
function VolumetricNebula() {
  const groupRef = useRef<THREE.Group>(null);
  const geo      = useMemo(() => buildGalaxyGeo(), []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.00045; // slow, majestic spin
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

      {/* Galaxy — pure WebGL, no overlay */}
      <div className="absolute inset-0 z-0">
        <WebGLErrorBoundary fallback={<div className="w-full h-full bg-black" />}>
          <Canvas camera={{ position: [0, 3, 5], fov: 60 }}>
            <color attach="background" args={["#000000"]} />
            <VolumetricNebula />
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      {/* UI layer */}
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 group-hover:text-white/80 transition-colors duration-300 text-sm">
            ✦
          </div>
        </motion.div>

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
            (tag, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
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

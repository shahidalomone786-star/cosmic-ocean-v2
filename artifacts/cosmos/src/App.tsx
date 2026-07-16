import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// ─────────────────────────────────────────────
// SHADERS — soft smoky glow, not hard squares
// ─────────────────────────────────────────────
const vertexShader = `
  attribute float aScale;
  varying vec3 vColor;
  uniform float uSize;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // perspective-correct point size (shrinks with distance)
    gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);
    vColor = color;
  }
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float strength = 1.0 - smoothstep(0.0, 0.5, d);
    strength = pow(strength, 3.0); // soft falloff -> smoky puff, not a disc
    gl_FragColor = vec4(vColor, strength);
  }
`;

// ─────────────────────────────────────────────
// GALAXY PARTICLE GEOMETRY
// ─────────────────────────────────────────────
function GalaxyPoints() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 60000;

  const [positions, colors, scales] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const insideColor = new THREE.Color('#ffe9c4');  // hot white / golden amber core
    const outsideColor = new THREE.Color('#2e1a5e'); // deep indigo / violet edge

    const arms = 5;
    const spin = 1.4;
    const radiusMax = 5;
    const randomnessPower = 3; // Math.pow(random, 3) -> exponential clustering + long tail scatter

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // ~12% of particles form a spherical bulge at the core.
      // Without this the galaxy looks like a flat donut instead of a real 3D core.
      const isBulge = Math.random() < 0.12;

      if (isBulge) {
        const r = Math.pow(Math.random(), 3) * radiusMax * 0.25;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);

        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.cos(phi) * 0.6;
        positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        const mixed = insideColor.clone().lerp(outsideColor, r / radiusMax);
        colors[i3] = mixed.r;
        colors[i3 + 1] = mixed.g;
        colors[i3 + 2] = mixed.b;
        scales[i] = Math.random() * 1.5 + 0.8;
      } else {
        const radius = Math.pow(Math.random(), 2.2) * radiusMax;
        const armAngle = ((i % arms) / arms) * Math.PI * 2;
        const spinAngle = radius * spin;

        // Exponential scatter that GROWS with radius -> fluffy, continuous cloud,
        // not tight rigid branches.
        const randX =
          Math.pow(Math.random(), randomnessPower) *
          (Math.random() < 0.5 ? 1 : -1) *
          0.5 *
          radius;
        const randY =
          Math.pow(Math.random(), randomnessPower) *
          (Math.random() < 0.5 ? 1 : -1) *
          0.5 *
          (radius * 0.3);
        const randZ =
          Math.pow(Math.random(), randomnessPower) *
          (Math.random() < 0.5 ? 1 : -1) *
          0.5 *
          radius;

        // Angular jitter is the key to killing the "fan blade" look —
        // it blurs the arm boundary instead of leaving a clean sine curve.
        const angle = armAngle + spinAngle + (Math.random() - 0.5) * 0.5;

        positions[i3] = Math.cos(angle) * radius + randX;
        positions[i3 + 1] = randY;
        positions[i3 + 2] = Math.sin(angle) * radius + randZ;

        const mixed = insideColor.clone().lerp(outsideColor, radius / radiusMax);
        colors[i3] = mixed.r;
        colors[i3 + 1] = mixed.g;
        colors[i3 + 2] = mixed.b;
        scales[i] = Math.random() * 1.2 + 0.3;
      }
    }

    return [positions, colors, scales];
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uSize: {
        value: 18 * (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
      },
    }),
    []
  );

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={count} array={scales} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────────────────────────
// UI OVERLAY — frosted glass search + tags
// ─────────────────────────────────────────────
function SearchOverlay() {
  const [focused, setFocused] = useState(false);
  const tags = ['Quantum Mechanics', 'General Relativity', 'String Theory', 'Astrophysics'];

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <motion.div
        animate={{ y: focused ? -120 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="flex flex-col items-center gap-5 pointer-events-auto px-6 w-full max-w-md"
      >
        <div className="w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-5 py-3.5 shadow-2xl">
          <input
            type="text"
            placeholder="Search the cosmos..."
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent outline-none text-white placeholder-white/50 text-[15px] tracking-wide"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] uppercase tracking-wider text-white/70 backdrop-blur-md bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────
export default function App() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Canvas camera={{ position: [0, 2.5, 6], fov: 60 }} className="absolute inset-0 z-0">
        <ambientLight intensity={0.2} />
        <GalaxyPoints />
        <OrbitControls enableZoom={false} rotateSpeed={0.5} enablePan={false} />
      </Canvas>

      <SearchOverlay />
    </div>
  );
}

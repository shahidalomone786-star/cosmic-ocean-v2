import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ModelProps } from '../organData';

// ─── Kidney Model — Paired bean-shaped organs ─────────────────────────────────

const CLIP_PLANE = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.02);

function Label({ pos, text, bg, col }: {
  pos: [number,number,number]; text: string; bg: string; col: string;
}) {
  return (
    <Html position={pos} center distanceFactor={8} zIndexRange={[10, 100]}>
      <div style={{
        background: bg, backdropFilter: 'blur(8px)',
        border: `1px solid ${col}55`, color: col,
        padding: '2px 8px', borderRadius: 10,
        fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
        fontFamily: 'system-ui', pointerEvents: 'none',
        textShadow: '0 0 6px rgba(0,0,0,0.9)',
      }}>{text}</div>
    </Html>
  );
}

/** A single kidney: bean approximated by two overlapping spheres */
function Kidney({ side, wireframe, clip }: { side: 1 | -1; wireframe: boolean; clip: THREE.Plane[] }) {
  const x = side * 0.72;
  const lean = side * 0.22; // slight medial tilt

  return (
    <group position={[x, 0, 0]} rotation={[0, 0, lean]}>
      {/* Main body */}
      <mesh scale={[0.68, 1.0, 0.52]} castShadow receiveShadow>
        <sphereGeometry args={[0.82, 40, 40]} />
        <meshPhysicalMaterial
          color="#8b2020" roughness={0.48} metalness={0.04}
          emissive="#3a0808" emissiveIntensity={0.22}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Medial concavity (hilum) — darker indentation sphere */}
      <mesh position={[-side * 0.42, 0, 0.12]} scale={[0.28, 0.50, 0.32]}>
        <sphereGeometry args={[0.82, 24, 24]} />
        <meshPhysicalMaterial
          color="#5a1010" roughness={0.55}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Renal Cortex highlight */}
      <mesh scale={[0.68, 1.0, 0.52]}>
        <sphereGeometry args={[0.84, 32, 32]} />
        <meshPhysicalMaterial
          color="#a02828" roughness={0.60} transparent opacity={0.3}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Adrenal gland (small, triangular, on top) */}
      <mesh position={[0, 0.80, 0.08]} scale={[0.25, 0.22, 0.18]} castShadow>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshPhysicalMaterial
          color="#d4ac0d" roughness={0.55}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Renal artery (from aorta / medial side) */}
      <mesh position={[-side * 0.46, 0.08, 0.08]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.060, 0.055, 0.52, 10]} />
        <meshPhysicalMaterial
          color="#c0392b" roughness={0.50}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Renal vein */}
      <mesh position={[-side * 0.44, -0.06, 0.06]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.068, 0.062, 0.50, 10]} />
        <meshPhysicalMaterial
          color="#1a5276" roughness={0.50}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Ureter (going downward) */}
      <mesh position={[-side * 0.36, -0.82, 0.04]} rotation={[0.10, 0, 0.05]} castShadow>
        <cylinderGeometry args={[0.030, 0.030, 0.80, 8]} />
        <meshPhysicalMaterial
          color="#d4ac0d" roughness={0.60}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>
    </group>
  );
}

export default function KidneyModel({ autoRotate, showLabels, wireframe, crossSection }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current && autoRotate) groupRef.current.rotation.y += dt * 0.30;
  });

  const clip = crossSection ? [CLIP_PLANE] : [];

  return (
    <group ref={groupRef}>
      {/* Right Kidney */}
      <Kidney side={ 1} wireframe={wireframe} clip={clip} />
      {/* Left Kidney */}
      <Kidney side={-1} wireframe={wireframe} clip={clip} />

      {/* ── Aorta (central, between kidneys) ── */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 2.20, 12]} />
        <meshPhysicalMaterial
          color="#922b21" roughness={0.50}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Inferior Vena Cava ── */}
      <mesh position={[0.15, 0, -0.08]} castShadow>
        <cylinderGeometry args={[0.095, 0.095, 2.10, 12]} />
        <meshPhysicalMaterial
          color="#1a5276" roughness={0.50}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Labels ── */}
      {showLabels && (
        <>
          <Label pos={[ 1.12, 0.00, 0.52]} text="Right Kidney"   bg="rgba(90,10,10,0.85)"   col="#f1948a" />
          <Label pos={[-1.12, 0.00, 0.52]} text="Left Kidney"    bg="rgba(90,10,10,0.85)"   col="#f1948a" />
          <Label pos={[ 0.72, 0.90, 0.42]} text="Adrenal Gland"  bg="rgba(80,60,5,0.85)"    col="#f9e79f" />
          <Label pos={[ 0.28,-0.10, 0.52]} text="Aorta"          bg="rgba(100,20,20,0.85)"  col="#e74c3c" />
          <Label pos={[-0.24,-0.82, 0.52]} text="Ureter"         bg="rgba(70,55,5,0.85)"    col="#f0e68c" />
          <Label pos={[ 1.10, 0.10,-0.34]} text="Renal Cortex"   bg="rgba(70,10,10,0.85)"   col="#f5b7b1" />
        </>
      )}
    </group>
  );
}

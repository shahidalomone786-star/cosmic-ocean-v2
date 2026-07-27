import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ModelProps } from '../organData';

// ─── Lungs Model — Procedural respiratory anatomy ─────────────────────────────

const CLIP_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.05);

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

function Lobe({ pos, scale, wireframe, clip, dark = false }: {
  pos: [number,number,number]; scale: [number,number,number];
  wireframe: boolean; clip: THREE.Plane[]; dark?: boolean;
}) {
  return (
    <mesh position={pos} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[0.88, 40, 40]} />
      <meshPhysicalMaterial
        color={dark ? '#c9736e' : '#e8a09a'}
        roughness={0.55} metalness={0.02}
        emissive="#4a1010" emissiveIntensity={0.18}
        wireframe={wireframe} clippingPlanes={clip}
      />
    </mesh>
  );
}

export default function LungsModel({ autoRotate, showLabels, wireframe, crossSection, exploded }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current && autoRotate) groupRef.current.rotation.y += dt * 0.30;
  });

  const clip = crossSection ? [CLIP_PLANE] : [];
  const E = exploded;
  const RX = E ? 0.6 : 0; // explode offset X
  const LX = E ? 0.6 : 0;

  return (
    <group ref={groupRef}>
      {/* ─────────── RIGHT LUNG (3 lobes) ─────────── */}
      {/* Right Upper Lobe */}
      <Lobe pos={[0.52 + RX,  0.72, 0.04]} scale={[0.44, 0.58, 0.40]} wireframe={wireframe} clip={clip} />
      {/* Right Middle Lobe */}
      <Lobe pos={[0.56 + RX,  0.06, 0.08]} scale={[0.42, 0.44, 0.38]} wireframe={wireframe} clip={clip} dark />
      {/* Right Lower Lobe */}
      <Lobe pos={[0.50 + RX, -0.66, 0.02]} scale={[0.50, 0.62, 0.44]} wireframe={wireframe} clip={clip} />

      {/* ─────────── LEFT LUNG (2 lobes — narrower for heart) ─────────── */}
      {/* Left Upper Lobe */}
      <Lobe pos={[-0.48 - LX,  0.52, 0.04]} scale={[0.40, 0.64, 0.36]} wireframe={wireframe} clip={clip} />
      {/* Left Lower Lobe */}
      <Lobe pos={[-0.48 - LX, -0.56, 0.02]} scale={[0.42, 0.58, 0.40]} wireframe={wireframe} clip={clip} dark />

      {/* ─────────── TRACHEA ─────────── */}
      <mesh position={[0, 1.58, 0.10]} castShadow>
        <cylinderGeometry args={[0.095, 0.095, 0.68, 12]} />
        <meshPhysicalMaterial
          color="#d5cfc8" roughness={0.60}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Tracheal cartilage rings */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 1.32 - i * 0.10, 0.10]} castShadow>
          <torusGeometry args={[0.098, 0.018, 8, 16, Math.PI]} />
          <meshPhysicalMaterial
            color="#c8c0b0" roughness={0.65}
            wireframe={wireframe} clippingPlanes={clip}
          />
        </mesh>
      ))}

      {/* ─────────── MAIN BRONCHI ─────────── */}
      {/* Right main bronchus */}
      <mesh position={[0.20, 1.16, 0.05]} rotation={[0, 0, -0.52]} castShadow>
        <cylinderGeometry args={[0.068, 0.068, 0.46, 10]} />
        <meshPhysicalMaterial
          color="#d0cab8" roughness={0.60}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* Left main bronchus */}
      <mesh position={[-0.24, 1.14, 0.04]} rotation={[0, 0, 0.58]} castShadow>
        <cylinderGeometry args={[0.060, 0.060, 0.48, 10]} />
        <meshPhysicalMaterial
          color="#d0cab8" roughness={0.60}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ─────────── Cardiac Notch (indent in left lung) ─────────── */}
      {/* Represented by reduced scale on left lung front — already implicit */}

      {/* ─────────── Labels ─────────── */}
      {showLabels && !E && (
        <>
          <Label pos={[ 0.00,  1.92, 0.20]} text="Trachea"           bg="rgba(40,60,80,0.82)"    col="#85c1e9" />
          <Label pos={[ 0.82,  0.72, 0.30]} text="Right Upper Lobe"  bg="rgba(120,20,20,0.82)"   col="#f5b7b1" />
          <Label pos={[ 0.88,  0.04, 0.30]} text="Right Middle Lobe" bg="rgba(100,15,15,0.82)"   col="#f1948a" />
          <Label pos={[ 0.82, -0.68, 0.30]} text="Right Lower Lobe"  bg="rgba(80,10,10,0.82)"    col="#e74c3c" />
          <Label pos={[-0.82,  0.54, 0.28]} text="Left Upper Lobe"   bg="rgba(120,20,20,0.82)"   col="#f5b7b1" />
          <Label pos={[-0.82, -0.58, 0.28]} text="Left Lower Lobe"   bg="rgba(80,10,10,0.82)"    col="#e74c3c" />
          <Label pos={[ 0.32,  1.22, 0.28]} text="Right Bronchus"    bg="rgba(40,40,40,0.82)"    col="#aab7b8" />
        </>
      )}
    </group>
  );
}

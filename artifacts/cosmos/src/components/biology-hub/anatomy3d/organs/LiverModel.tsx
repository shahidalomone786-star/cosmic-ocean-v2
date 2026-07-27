import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ModelProps } from '../organData';

// ─── Liver Model — Largest internal organ ────────────────────────────────────

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

export default function LiverModel({ autoRotate, showLabels, wireframe, crossSection }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current && autoRotate) groupRef.current.rotation.y += dt * 0.28;
  });

  const clip = crossSection ? [CLIP_PLANE] : [];
  const mat = (color: string, emissive?: string) => (
    <meshPhysicalMaterial
      color={color} roughness={0.50} metalness={0.04}
      emissive={emissive ?? '#2a1000'} emissiveIntensity={0.18}
      wireframe={wireframe} clippingPlanes={clip}
    />
  );

  return (
    <group ref={groupRef}>
      {/* ── RIGHT LOBE (dominant ~3/4 of liver mass) ── */}
      <mesh position={[0.30, 0.14, 0]} scale={[1.08, 0.70, 0.82]} castShadow receiveShadow>
        <sphereGeometry args={[0.88, 44, 44]} />
        {mat('#8b4513')}
      </mesh>

      {/* ── LEFT LOBE (smaller) ── */}
      <mesh position={[-0.72, 0.10, 0]} scale={[0.64, 0.56, 0.68]} castShadow>
        <sphereGeometry args={[0.88, 36, 36]} />
        {mat('#7a3b0f')}
      </mesh>

      {/* ── CAUDATE LOBE (posterior, upper) ── */}
      <mesh position={[0.08, 0.54, -0.44]} scale={[0.32, 0.24, 0.28]}>
        <sphereGeometry args={[0.88, 24, 24]} />
        {mat('#6a3010')}
      </mesh>

      {/* ── QUADRATE LOBE (inferior, between GB and ligament) ── */}
      <mesh position={[0.12, -0.30, 0.28]} scale={[0.28, 0.22, 0.24]}>
        <sphereGeometry args={[0.88, 20, 20]} />
        {mat('#7a3a12')}
      </mesh>

      {/* ── GALLBLADDER (pear-shaped, green-tinted) ── */}
      {/* Body */}
      <mesh position={[0.32, -0.82, 0.36]} scale={[0.22, 0.38, 0.22]} castShadow>
        <sphereGeometry args={[0.88, 24, 24]} />
        <meshPhysicalMaterial
          color="#3a7a30" roughness={0.45} emissive="#0a2208" emissiveIntensity={0.22}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>
      {/* Neck */}
      <mesh position={[0.30, -0.54, 0.32]} scale={[0.09, 0.22, 0.09]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 1, 10]} />
        <meshPhysicalMaterial
          color="#2e6226" roughness={0.50} emissive="#081a06" emissiveIntensity={0.2}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── HEPATIC VEINS (3, draining to IVC) ── */}
      {[[-0.10, 0], [0.14, -0.14], [0.32, 0.12]].map(([ox, oz], i) => (
        <mesh key={i} position={[ox, 0.78, oz as number]} rotation={[0.18, 0, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.042, 0.38, 8]} />
          <meshPhysicalMaterial
            color="#1a5276" roughness={0.52}
            wireframe={wireframe} clippingPlanes={clip}
          />
        </mesh>
      ))}

      {/* ── PORTAL VEIN (large, inferior) ── */}
      <mesh position={[0.08, -0.48, 0.04]} rotation={[-0.24, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.52, 10]} />
        <meshPhysicalMaterial
          color="#6c3483" roughness={0.52}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── HEPATIC ARTERY (smaller, beside portal vein) ── */}
      <mesh position={[-0.06, -0.44, 0.08]} rotation={[-0.24, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.042, 0.042, 0.48, 8]} />
        <meshPhysicalMaterial
          color="#c0392b" roughness={0.50}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── COMMON BILE DUCT ── */}
      <mesh position={[0.22, -0.50, 0.18]} rotation={[-0.20, 0, 0.04]} castShadow>
        <cylinderGeometry args={[0.030, 0.030, 0.50, 8]} />
        <meshPhysicalMaterial
          color="#d4ac0d" roughness={0.55}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── FALCIFORM LIGAMENT (divides left/right, front surface) ── */}
      <mesh position={[-0.16, 0.10, 0.42]} rotation={[Math.PI / 2, 0, 0.08]} castShadow>
        <planeGeometry args={[0.04, 0.80]} />
        <meshPhysicalMaterial
          color="#d5d8dc" roughness={0.80} transparent opacity={0.55} side={THREE.DoubleSide}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Labels ── */}
      {showLabels && (
        <>
          <Label pos={[ 0.90, 0.14, 0.60]} text="Right Lobe"     bg="rgba(50,20,5,0.85)"   col="#e59866" />
          <Label pos={[-1.02, 0.10, 0.55]} text="Left Lobe"      bg="rgba(40,18,4,0.85)"   col="#e59866" />
          <Label pos={[ 0.45,-1.00, 0.60]} text="Gallbladder"    bg="rgba(10,40,8,0.85)"   col="#82e0aa" />
          <Label pos={[ 0.08, 0.62,-0.52]} text="Caudate Lobe"   bg="rgba(40,16,4,0.85)"   col="#d98e50" />
          <Label pos={[-0.12,-0.50, 0.52]} text="Portal Vein"    bg="rgba(50,10,60,0.85)"  col="#c39bd3" />
          <Label pos={[ 0.18,-0.50, 0.52]} text="Hepatic Artery" bg="rgba(80,10,10,0.85)"  col="#e74c3c" />
          <Label pos={[ 0.20, 0.88, 0.30]} text="Hepatic Veins"  bg="rgba(10,30,60,0.85)"  col="#7fb3d3" />
        </>
      )}
    </group>
  );
}

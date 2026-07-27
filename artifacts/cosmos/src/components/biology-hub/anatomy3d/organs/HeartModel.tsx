import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ModelProps } from '../organData';

// ─── Heart Model — Procedural cardiac anatomy ─────────────────────────────────
// Geometry: ventricles, atria, aortic arch, pulmonary trunk, vena cava, apex.
// No external resources — pure Three.js primitives.

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
        fontSize: 10, fontWeight: 700,
        whiteSpace: 'nowrap', fontFamily: 'system-ui',
        letterSpacing: '0.3px', pointerEvents: 'none',
        textShadow: '0 0 6px rgba(0,0,0,0.8)',
      }}>{text}</div>
    </Html>
  );
}

export default function HeartModel({ autoRotate, showLabels, wireframe, crossSection, exploded }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current && autoRotate) groupRef.current.rotation.y += dt * 0.35;
  });

  const clip = crossSection ? [CLIP_PLANE] : [];

  // ── Aortic arch curve ──
  const aortaCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.80,  0.12),
    new THREE.Vector3(-0.14, 1.20,  0.04),
    new THREE.Vector3(-0.38, 1.45,  -0.04),
    new THREE.Vector3(-0.60, 1.22, -0.14),
    new THREE.Vector3(-0.65, 0.72, -0.18),
  ]), []);

  // ── Pulmonary trunk curve ──
  const paTrunkCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.24,  0.72, 0.18),
    new THREE.Vector3(0.34,  1.10, 0.12),
    new THREE.Vector3(0.24,  1.30, -0.08),
  ]), []);

  const heartMat = (extra?: object) => (
    <meshPhysicalMaterial
      color="#c0392b" roughness={0.42} metalness={0.04}
      emissive="#5a0a0a" emissiveIntensity={0.2}
      wireframe={wireframe} clippingPlanes={clip} {...extra}
    />
  );

  // Exploded offsets
  const E = exploded;
  const lvPos:  [number,number,number] = E ? [-1.3, -0.2, 0] : [-0.20, -0.14,  0.00];
  const rvPos:  [number,number,number] = E ? [ 1.3,  0.1, 0] : [ 0.28,  0.02,  0.12];
  const laPos:  [number,number,number] = E ? [-0.6,  1.2,-0.5] : [-0.22,  0.58, -0.30];
  const raPos:  [number,number,number] = E ? [ 0.8,  1.0,-0.2] : [ 0.30,  0.48, -0.16];
  const apexPos:[number,number,number] = E ? [-0.2, -2.2, 0] : [-0.12, -1.10,  0.08];

  return (
    <group ref={groupRef}>
      {/* ── Left Ventricle (dominant) ── */}
      <mesh position={lvPos} scale={[0.88, 1.06, 0.82]} castShadow receiveShadow>
        <sphereGeometry args={[0.82, 56, 56]} />
        {heartMat()}
      </mesh>

      {/* ── Right Ventricle ── */}
      <mesh position={rvPos} scale={[0.68, 0.88, 0.64]} castShadow>
        <sphereGeometry args={[0.82, 48, 48]} />
        {heartMat()}
      </mesh>

      {/* ── Left Atrium ── */}
      <mesh position={laPos} scale={[0.50, 0.44, 0.46]} castShadow>
        <sphereGeometry args={[0.82, 32, 32]} />
        {heartMat()}
      </mesh>

      {/* ── Right Atrium ── */}
      <mesh position={raPos} scale={[0.46, 0.40, 0.40]} castShadow>
        <sphereGeometry args={[0.82, 32, 32]} />
        {heartMat()}
      </mesh>

      {/* ── Apex (conical tip) ── */}
      <mesh position={apexPos} rotation={[0, 0, -0.28]} castShadow>
        <coneGeometry args={[0.22, 0.50, 18]} />
        {heartMat()}
      </mesh>

      {/* ── Aortic arch ── */}
      <mesh castShadow>
        <tubeGeometry args={[aortaCurve, 28, 0.115, 10, false]} />
        <meshPhysicalMaterial
          color="#a93226" roughness={0.50} metalness={0.05}
          emissive="#4a0808" emissiveIntensity={0.25}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Pulmonary trunk (blue — deoxygenated) ── */}
      <mesh castShadow>
        <tubeGeometry args={[paTrunkCurve, 18, 0.092, 8, false]} />
        <meshPhysicalMaterial
          color="#2471a3" roughness={0.50} metalness={0.05}
          emissive="#0d2a4a" emissiveIntensity={0.25}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Superior Vena Cava ── */}
      <mesh position={[0.34, 1.00, -0.10]} rotation={[0.20, 0, 0]} castShadow>
        <cylinderGeometry args={[0.072, 0.072, 0.58, 10]} />
        <meshPhysicalMaterial
          color="#1a5276" roughness={0.55}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Inferior Vena Cava ── */}
      <mesh position={[0.30, -0.88, -0.14]} rotation={[0.16, 0, 0.10]} castShadow>
        <cylinderGeometry args={[0.090, 0.090, 0.42, 10]} />
        <meshPhysicalMaterial
          color="#1a5276" roughness={0.55}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Pulmonary veins (4 — left atrium back) ── */}
      {[[-0.10, -0.12], [0.10, -0.12], [-0.10, 0.08], [0.10, 0.08]].map(([ox, oy], i) => (
        <mesh key={i} position={[-0.22 + ox, 0.56, -0.62]} rotation={[-0.35, 0, 0]} castShadow>
          <cylinderGeometry args={[0.048, 0.048, 0.32, 8]} />
          <meshPhysicalMaterial
            color="#922b21" roughness={0.55}
            wireframe={wireframe} clippingPlanes={clip}
          />
        </mesh>
      ))}

      {/* ── Labels ── */}
      {showLabels && !E && (
        <>
          <Label pos={[-0.20, -0.14,  0.95]} text="Left Ventricle"    bg="rgba(140,20,20,0.82)"   col="#f1948a" />
          <Label pos={[ 0.28,  0.02,  0.88]} text="Right Ventricle"   bg="rgba(110,15,15,0.82)"   col="#f1948a" />
          <Label pos={[-0.50,  1.30, -0.00]} text="Aorta"             bg="rgba(20,40,80,0.82)"    col="#85c1e9" />
          <Label pos={[ 0.42,  1.26,  0.28]} text="Pulmonary Artery"  bg="rgba(20,60,110,0.82)"   col="#7fb3d3" />
          <Label pos={[-0.22,  0.78, -0.00]} text="Left Atrium"       bg="rgba(130,18,18,0.82)"   col="#f5b7b1" />
          <Label pos={[ 0.50,  0.68,  0.10]} text="Right Atrium"      bg="rgba(110,14,14,0.82)"   col="#f5b7b1" />
          <Label pos={[-0.12, -1.40,  0.28]} text="Apex"              bg="rgba(80,10,10,0.82)"    col="#e74c3c" />
        </>
      )}
    </group>
  );
}

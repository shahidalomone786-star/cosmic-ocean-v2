import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ModelProps } from '../organData';

// ─── DNA Double Helix — Parametric 3D ────────────────────────────────────────
// Pure Three.js parametric geometry. No external resources.
// Right-handed double helix, antiparallel strands, base-pair rungs.

const TURNS   = 4.5;
const HEIGHT  = 3.6;
const RADIUS  = 0.44;
const SEG     = 140; // curve smoothness
const N_PAIRS = 22;  // number of base pairs shown

// Base pair type colors: A-T (amber/blue), G-C (emerald/violet)
const PAIR_COLORS: [string, string][] = [
  ['#f59e0b', '#3b82f6'], // A-T
  ['#34d399', '#a78bfa'], // G-C
  ['#f59e0b', '#3b82f6'], // A-T
  ['#34d399', '#a78bfa'], // G-C
];

function Label({ pos, text, bg, col }: {
  pos: [number,number,number]; text: string; bg: string; col: string;
}) {
  return (
    <Html position={pos} center distanceFactor={9} zIndexRange={[10, 100]}>
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

export default function DNAModel({ autoRotate, showLabels, wireframe }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current && autoRotate) groupRef.current.rotation.y += dt * 0.22;
  });

  // ── Strand A (5'→3') ──
  const strandACurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const a = t * Math.PI * 2 * TURNS;
      pts.push(new THREE.Vector3(
        Math.cos(a) * RADIUS,
        t * HEIGHT - HEIGHT / 2,
        Math.sin(a) * RADIUS,
      ));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  // ── Strand B (3'→5', offset by π) ──
  const strandBCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const a = t * Math.PI * 2 * TURNS + Math.PI;
      pts.push(new THREE.Vector3(
        Math.cos(a) * RADIUS,
        t * HEIGHT - HEIGHT / 2,
        Math.sin(a) * RADIUS,
      ));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  // ── Base-pair geometry (position + orientation) ──
  const basePairs = useMemo(() => {
    const pairs: Array<{
      mid: THREE.Vector3;
      posA: THREE.Vector3;
      posB: THREE.Vector3;
      quaternion: THREE.Quaternion;
      halfLen: number;
      pairType: number;
    }> = [];

    for (let i = 0; i < N_PAIRS; i++) {
      const t = (i + 0.5) / N_PAIRS;
      const a = t * Math.PI * 2 * TURNS;
      const y = t * HEIGHT - HEIGHT / 2;

      const posA = new THREE.Vector3(Math.cos(a) * RADIUS, y, Math.sin(a) * RADIUS);
      const posB = new THREE.Vector3(Math.cos(a + Math.PI) * RADIUS, y, Math.sin(a + Math.PI) * RADIUS);
      const mid  = posA.clone().add(posB).multiplyScalar(0.5);

      const dir  = posB.clone().sub(posA).normalize();
      const up   = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

      pairs.push({ mid, posA, posB, quaternion: quat, halfLen: RADIUS * 0.9, pairType: i % 4 });
    }
    return pairs;
  }, []);

  return (
    <group ref={groupRef}>
      {/* ── Strand A backbone ── */}
      <mesh castShadow>
        <tubeGeometry args={[strandACurve, SEG, 0.048, 8, false]} />
        <meshPhysicalMaterial
          color="#10b981" roughness={0.35} metalness={0.15}
          emissive="#064e3b" emissiveIntensity={0.35}
          wireframe={wireframe}
        />
      </mesh>

      {/* ── Strand B backbone ── */}
      <mesh castShadow>
        <tubeGeometry args={[strandBCurve, SEG, 0.048, 8, false]} />
        <meshPhysicalMaterial
          color="#818cf8" roughness={0.35} metalness={0.15}
          emissive="#1e1b4b" emissiveIntensity={0.35}
          wireframe={wireframe}
        />
      </mesh>

      {/* ── Base pair rungs + nucleotide spheres ── */}
      {basePairs.map(({ mid, posA, posB, quaternion, halfLen, pairType }, i) => {
        const [c1, c2] = PAIR_COLORS[pairType];
        return (
          <group key={i}>
            {/* Connecting rung cylinder */}
            <mesh position={mid} quaternion={quaternion} castShadow>
              <cylinderGeometry args={[0.024, 0.024, halfLen * 2, 6]} />
              <meshPhysicalMaterial
                color="#e2e8f0" roughness={0.50} metalness={0.10}
                emissive="#1e293b" emissiveIntensity={0.15}
                wireframe={wireframe}
              />
            </mesh>

            {/* Nucleotide A (strand A side) */}
            <mesh position={posA} castShadow>
              <sphereGeometry args={[0.072, 10, 10]} />
              <meshPhysicalMaterial
                color={c1} roughness={0.30} metalness={0.20}
                emissive={c1} emissiveIntensity={0.40}
                wireframe={wireframe}
              />
            </mesh>

            {/* Nucleotide B (strand B side) */}
            <mesh position={posB} castShadow>
              <sphereGeometry args={[0.072, 10, 10]} />
              <meshPhysicalMaterial
                color={c2} roughness={0.30} metalness={0.20}
                emissive={c2} emissiveIntensity={0.40}
                wireframe={wireframe}
              />
            </mesh>
          </group>
        );
      })}

      {/* ── Labels ── */}
      {showLabels && (
        <>
          <Label pos={[ 0.72,  1.60, 0.10]} text="Strand A  5′→3′"        bg="rgba(10,60,40,0.85)"  col="#34d399" />
          <Label pos={[-0.72, -1.60, 0.10]} text="Strand B  3′→5′"        bg="rgba(30,20,60,0.85)"  col="#a78bfa" />
          <Label pos={[ 0.70,  0.00, 0.30]} text="Base Pair (A-T / G-C)"  bg="rgba(80,55,0,0.85)"   col="#f59e0b" />
          <Label pos={[ 0.52,  0.82, 0.36]} text="Sugar-Phosphate Backbone" bg="rgba(0,60,40,0.85)" col="#6ee7b7" />
          <Label pos={[-0.40, -0.50, 0.55]} text="Major Groove"            bg="rgba(30,30,60,0.85)"  col="#93c5fd" />
        </>
      )}
    </group>
  );
}

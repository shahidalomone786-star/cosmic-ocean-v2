import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ModelProps } from '../organData';

// ─── Skeleton Model — Simplified full human skeleton ─────────────────────────
// ~206 bones approximated by assembled Three.js primitives.

const CLIP_PLANE = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.02);

const BONE_COLOR    = '#e8dfc8';
const BONE_EMISSIVE = '#3a3018';

function Label({ pos, text, col }: { pos: [number,number,number]; text: string; col?: string }) {
  return (
    <Html position={pos} center distanceFactor={12} zIndexRange={[10, 100]}>
      <div style={{
        background: 'rgba(20,18,12,0.85)', backdropFilter: 'blur(8px)',
        border: `1px solid ${col ?? '#d4c9a8'}55`,
        color: col ?? '#e8dfc8',
        padding: '2px 8px', borderRadius: 10,
        fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
        fontFamily: 'system-ui', pointerEvents: 'none',
        textShadow: '0 0 6px rgba(0,0,0,0.9)',
      }}>{text}</div>
    </Html>
  );
}

function BoneMesh({ geo, pos, rot = [0,0,0] as [number,number,number], scale, wireframe, clip }: {
  geo: 'sphere'|'cylinder'|'box'|'cone'|'torus';
  pos: [number,number,number]; rot?: [number,number,number];
  scale?: [number,number,number]; wireframe: boolean; clip: THREE.Plane[];
  children?: React.ReactNode;
}) {
  return (
    <mesh position={pos} rotation={rot} scale={scale} castShadow receiveShadow>
      {geo === 'sphere'   && <sphereGeometry   args={[0.5, 20, 20]} />}
      {geo === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 12]} />}
      {geo === 'box'      && <boxGeometry      args={[1, 1, 1]} />}
      {geo === 'cone'     && <coneGeometry     args={[0.5, 1, 12]} />}
      {geo === 'torus'    && <torusGeometry    args={[0.5, 0.15, 8, 20]} />}
      <meshPhysicalMaterial
        color={BONE_COLOR} roughness={0.52} metalness={0.06}
        emissive={BONE_EMISSIVE} emissiveIntensity={0.08}
        wireframe={wireframe} clippingPlanes={clip}
      />
    </mesh>
  );
}

export default function SkeletonModel({ autoRotate, showLabels, wireframe, crossSection }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current && autoRotate) groupRef.current.rotation.y += dt * 0.20;
  });

  const clip = crossSection ? [CLIP_PLANE] : [];
  const W = wireframe;

  // ── Rib arc helper ──
  const ribY   = (i: number) => 1.90 - i * 0.22;
  const ribScX = (i: number) => 0.52 + i * 0.04;

  return (
    <group ref={groupRef}>

      {/* ════ SKULL ════ */}
      {/* Cranium */}
      <BoneMesh geo="sphere" pos={[0, 3.20, 0]} scale={[0.54, 0.60, 0.58]} wireframe={W} clip={clip} />
      {/* Mandible */}
      <BoneMesh geo="box" pos={[0, 2.72, 0.14]} scale={[0.42, 0.10, 0.30]} wireframe={W} clip={clip} />
      {/* Jaw joints */}
      <BoneMesh geo="sphere" pos={[-0.22, 2.82, 0]} scale={[0.07, 0.07, 0.07]} wireframe={W} clip={clip} />
      <BoneMesh geo="sphere" pos={[ 0.22, 2.82, 0]} scale={[0.07, 0.07, 0.07]} wireframe={W} clip={clip} />

      {/* ════ SPINE ════ */}
      {/* Cervical (7 vertebrae) */}
      {Array.from({ length: 7 }, (_, i) => (
        <BoneMesh key={`c${i}`} geo="cylinder" pos={[0, 2.58 - i * 0.12, -0.04]}
          scale={[0.10, 0.10, 0.10]} wireframe={W} clip={clip} />
      ))}
      {/* Thoracic (12) */}
      {Array.from({ length: 12 }, (_, i) => (
        <BoneMesh key={`t${i}`} geo="cylinder" pos={[0, 1.72 - i * 0.13, -0.04]}
          scale={[0.12, 0.11, 0.12]} wireframe={W} clip={clip} />
      ))}
      {/* Lumbar (5) */}
      {Array.from({ length: 5 }, (_, i) => (
        <BoneMesh key={`l${i}`} geo="cylinder" pos={[0, 0.14 - i * 0.13, -0.02]}
          scale={[0.14, 0.12, 0.14]} wireframe={W} clip={clip} />
      ))}
      {/* Sacrum */}
      <BoneMesh geo="box" pos={[0, -0.60, -0.02]} scale={[0.20, 0.28, 0.16]} wireframe={W} clip={clip} />

      {/* ════ CLAVICLES ════ */}
      <BoneMesh geo="cylinder" pos={[ 0.34, 2.22, 0.08]} rot={[0, 0, -1.50]} scale={[0.06, 0.40, 0.06]} wireframe={W} clip={clip} />
      <BoneMesh geo="cylinder" pos={[-0.34, 2.22, 0.08]} rot={[0, 0,  1.50]} scale={[0.06, 0.40, 0.06]} wireframe={W} clip={clip} />

      {/* ════ SCAPULAE ════ */}
      <BoneMesh geo="box" pos={[ 0.56, 1.90, -0.18]} scale={[0.28, 0.36, 0.04]} wireframe={W} clip={clip} />
      <BoneMesh geo="box" pos={[-0.56, 1.90, -0.18]} scale={[0.28, 0.36, 0.04]} wireframe={W} clip={clip} />

      {/* ════ STERNUM ════ */}
      <BoneMesh geo="box" pos={[0, 1.80, 0.18]} scale={[0.10, 0.72, 0.06]} wireframe={W} clip={clip} />

      {/* ════ RIBS (12 pairs) ════ */}
      {Array.from({ length: 12 }, (_, i) => {
        const y = ribY(i);
        const sx = ribScX(i);
        const rz = (Math.PI / 2) + (i * 0.015);
        return (
          <group key={`rib${i}`}>
            {/* Right rib */}
            <mesh position={[sx * 0.52, y, -0.08]} rotation={[0, 0, -rz]} castShadow>
              <torusGeometry args={[sx * 0.52, 0.028, 6, 24, Math.PI * 0.88]} />
              <meshPhysicalMaterial color={BONE_COLOR} roughness={0.52} emissive={BONE_EMISSIVE} emissiveIntensity={0.08} wireframe={W} clippingPlanes={clip} />
            </mesh>
            {/* Left rib */}
            <mesh position={[-sx * 0.52, y, -0.08]} rotation={[0, 0, rz]} castShadow>
              <torusGeometry args={[sx * 0.52, 0.028, 6, 24, Math.PI * 0.88]} />
              <meshPhysicalMaterial color={BONE_COLOR} roughness={0.52} emissive={BONE_EMISSIVE} emissiveIntensity={0.08} wireframe={W} clippingPlanes={clip} />
            </mesh>
          </group>
        );
      })}

      {/* ════ PELVIS ════ */}
      {/* Ilium (left/right) */}
      <BoneMesh geo="torus" pos={[ 0.24, -0.88, 0]} rot={[1.5, 0, 0.40]} scale={[0.42, 0.42, 0.60]} wireframe={W} clip={clip} />
      <BoneMesh geo="torus" pos={[-0.24, -0.88, 0]} rot={[1.5, 0,-0.40]} scale={[0.42, 0.42, 0.60]} wireframe={W} clip={clip} />

      {/* ════ ARMS ════ */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          {/* Shoulder ball */}
          <BoneMesh geo="sphere" pos={[side * 0.76, 2.10, 0]} scale={[0.10, 0.10, 0.10]} wireframe={W} clip={clip} />
          {/* Humerus */}
          <BoneMesh geo="cylinder" pos={[side * 0.82, 1.58, 0]} scale={[0.09, 0.68, 0.09]} wireframe={W} clip={clip} />
          {/* Elbow */}
          <BoneMesh geo="sphere" pos={[side * 0.88, 1.18, 0.04]} scale={[0.09, 0.09, 0.09]} wireframe={W} clip={clip} />
          {/* Radius */}
          <BoneMesh geo="cylinder" pos={[side * 0.90, 0.72, 0.04]} rot={[0.10, 0, 0]} scale={[0.062, 0.58, 0.062]} wireframe={W} clip={clip} />
          {/* Ulna */}
          <BoneMesh geo="cylinder" pos={[side * 0.96, 0.70, -0.02]} rot={[0.10, 0, 0]} scale={[0.052, 0.58, 0.052]} wireframe={W} clip={clip} />
          {/* Wrist cluster */}
          <BoneMesh geo="sphere" pos={[side * 0.92, 0.38, 0.04]} scale={[0.12, 0.06, 0.10]} wireframe={W} clip={clip} />
          {/* Metacarpals (simplified as 4 tiny cylinders) */}
          {[-0.06, -0.02, 0.02, 0.06].map((oz, mi) => (
            <BoneMesh key={mi} geo="cylinder" pos={[side * (0.90 + oz * side), 0.20, 0.02]}
              scale={[0.028, 0.18, 0.028]} wireframe={W} clip={clip} />
          ))}
        </group>
      ))}

      {/* ════ LEGS ════ */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          {/* Hip joint */}
          <BoneMesh geo="sphere" pos={[side * 0.26, -1.02, 0]} scale={[0.13, 0.13, 0.13]} wireframe={W} clip={clip} />
          {/* Femur */}
          <BoneMesh geo="cylinder" pos={[side * 0.28, -1.56, 0]} scale={[0.13, 0.88, 0.13]} wireframe={W} clip={clip} />
          {/* Patella */}
          <BoneMesh geo="sphere" pos={[side * 0.30, -2.08, 0.14]} scale={[0.09, 0.06, 0.06]} wireframe={W} clip={clip} />
          {/* Tibia */}
          <BoneMesh geo="cylinder" pos={[side * 0.26, -2.56, 0]} scale={[0.11, 0.80, 0.11]} wireframe={W} clip={clip} />
          {/* Fibula */}
          <BoneMesh geo="cylinder" pos={[side * 0.34, -2.54, 0]} scale={[0.055, 0.76, 0.055]} wireframe={W} clip={clip} />
          {/* Ankle */}
          <BoneMesh geo="sphere" pos={[side * 0.28, -3.00, 0.04]} scale={[0.11, 0.08, 0.11]} wireframe={W} clip={clip} />
          {/* Foot (calcaneus + toes simplified) */}
          <BoneMesh geo="box" pos={[side * 0.26, -3.14, 0.10]} scale={[0.18, 0.08, 0.40]} wireframe={W} clip={clip} />
        </group>
      ))}

      {/* ════ Labels ════ */}
      {showLabels && (
        <>
          <Label pos={[ 0.72, 3.20, 0.34]} text="Skull"      col="#e8dfc8" />
          <Label pos={[ 0.62, 2.22, 0.30]} text="Clavicle"   col="#d4c9a8" />
          <Label pos={[ 0.28, 1.80, 0.38]} text="Sternum"    col="#d4c9a8" />
          <Label pos={[ 0.88, 1.78, 0.30]} text="Ribs"       col="#c8bfa0" />
          <Label pos={[ 0.50,-0.88, 0.50]} text="Pelvis"     col="#e8dfc8" />
          <Label pos={[ 0.66, 1.58, 0.30]} text="Humerus"    col="#d4c9a8" />
          <Label pos={[ 0.60,-1.56, 0.30]} text="Femur"      col="#e8dfc8" />
          <Label pos={[ 0.56,-2.56, 0.28]} text="Tibia"      col="#d4c9a8" />
          <Label pos={[ 0.00, 0.50,-0.28]} text="Spine"      col="#c8bfa0" />
        </>
      )}
    </group>
  );
}

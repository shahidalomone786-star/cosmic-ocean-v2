import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ModelProps } from '../organData';

// ─── Brain Model — Procedural neural architecture ─────────────────────────────
// Hemispheres use vertex-displaced icosahedra for cortical texture.

const CLIP_PLANE = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.04);

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
        pointerEvents: 'none', textShadow: '0 0 6px rgba(0,0,0,0.9)',
      }}>{text}</div>
    </Html>
  );
}

/** Create a bumpy icosahedron simulating brain cortex folds */
function useGyralGeometry(radius: number, detail: number, bumpAmp: number) {
  return useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.sqrt(x * x + y * y + z * z);
      const bump =
        Math.sin(x * 9 + 0.5) * Math.sin(y * 9 + 0.8) * Math.sin(z * 9 + 1.2) * bumpAmp +
        Math.sin(x * 14 + 2.1) * Math.sin(z * 14 + 1.5) * (bumpAmp * 0.5);
      const scale = (r + bump) / r;
      pos.setXYZ(i, x * scale, y * scale, z * scale);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [radius, detail, bumpAmp]);
}

function GyralMesh({ geo, position, scale, wireframe, clip, color, emissive }: {
  geo: THREE.IcosahedronGeometry;
  position: [number,number,number];
  scale: [number,number,number];
  wireframe: boolean;
  clip: THREE.Plane[];
  color: string;
  emissive: string;
}) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <primitive object={geo} attach="geometry" />
      <meshPhysicalMaterial
        color={color} roughness={0.62} metalness={0.02}
        emissive={emissive} emissiveIntensity={0.12}
        wireframe={wireframe} clippingPlanes={clip}
      />
    </mesh>
  );
}

export default function BrainModel({ autoRotate, showLabels, wireframe, crossSection, exploded }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current && autoRotate) groupRef.current.rotation.y += dt * 0.28;
  });

  const clip = crossSection ? [CLIP_PLANE] : [];

  // Shared bumpy hemisphere geometry
  const hemiGeo = useGyralGeometry(0.88, 5, 0.042);
  const cerebGeo = useGyralGeometry(0.48, 4, 0.032);

  // Exploded offsets
  const E = exploded;

  return (
    <group ref={groupRef}>
      {/* ── Left Cerebral Hemisphere ── */}
      <GyralMesh
        geo={hemiGeo}
        position={E ? [-1.6, 0.1, 0] : [-0.34, 0.04, 0]}
        scale={[0.80, 0.74, 0.70]}
        wireframe={wireframe} clip={clip}
        color="#c8956c" emissive="#5a2010"
      />

      {/* ── Right Cerebral Hemisphere ── */}
      <GyralMesh
        geo={hemiGeo}
        position={E ? [ 1.6, 0.1, 0] : [ 0.34, 0.04, 0]}
        scale={[0.80, 0.74, 0.70]}
        wireframe={wireframe} clip={clip}
        color="#c8956c" emissive="#5a2010"
      />

      {/* ── Corpus Callosum (bridge between hemispheres) ── */}
      {!E && (
        <mesh position={[0, 0.24, -0.02]} scale={[0.12, 0.06, 0.58]} castShadow>
          <sphereGeometry args={[1, 16, 16]} />
          <meshPhysicalMaterial
            color="#ddb99a" roughness={0.55}
            wireframe={wireframe} clippingPlanes={clip}
          />
        </mesh>
      )}

      {/* ── Cerebellum ── */}
      <GyralMesh
        geo={cerebGeo}
        position={E ? [0, -1.8, -1.4] : [0, -0.62, -0.60]}
        scale={[1.0, 0.78, 0.88]}
        wireframe={wireframe} clip={clip}
        color="#b5836a" emissive="#4a1808"
      />

      {/* ── Brain Stem ── */}
      <mesh position={E ? [0, -2.5, -0.4] : [0, -1.08, -0.28]} rotation={[-0.18, 0, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.72, 14]} />
        <meshPhysicalMaterial
          color="#a87060" roughness={0.60}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Pons (widening on brain stem) ── */}
      <mesh position={E ? [0, -2.0, -0.35] : [0, -0.82, -0.30]} castShadow>
        <sphereGeometry args={[0.20, 16, 16]} />
        <meshPhysicalMaterial
          color="#b07868" roughness={0.58}
          wireframe={wireframe} clippingPlanes={clip}
        />
      </mesh>

      {/* ── Labels ── */}
      {showLabels && !E && (
        <>
          <Label pos={[-0.18, 0.45, 0.78]}  text="Frontal Lobe"     bg="rgba(20,50,120,0.82)"   col="#85c1e9" />
          <Label pos={[ 0.00, 0.72,-0.10]}  text="Parietal Lobe"    bg="rgba(20,100,50,0.82)"   col="#82e0aa" />
          <Label pos={[ 0.92,-0.18, 0.22]}  text="Temporal Lobe"    bg="rgba(120,60,20,0.82)"   col="#f0b27a" />
          <Label pos={[ 0.00, 0.10,-0.98]}  text="Occipital Lobe"   bg="rgba(90,20,120,0.82)"   col="#c39bd3" />
          <Label pos={[ 0.00,-0.72,-0.92]}  text="Cerebellum"       bg="rgba(120,20,20,0.82)"   col="#f1948a" />
          <Label pos={[ 0.00,-1.30,-0.38]}  text="Brain Stem"       bg="rgba(40,40,40,0.82)"    col="#aab7b8" />
          <Label pos={[ 0.00, 0.30, 0.00]}  text="Corpus Callosum"  bg="rgba(100,50,10,0.82)"   col="#f8c471" />
        </>
      )}
    </group>
  );
}

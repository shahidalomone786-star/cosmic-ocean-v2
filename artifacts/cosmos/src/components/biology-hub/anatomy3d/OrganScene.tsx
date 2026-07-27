import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import HeartModel    from './organs/HeartModel';
import BrainModel    from './organs/BrainModel';
import LungsModel    from './organs/LungsModel';
import SkeletonModel from './organs/SkeletonModel';
import KidneyModel   from './organs/KidneyModel';
import LiverModel    from './organs/LiverModel';
import DNAModel      from './organs/DNAModel';
import type { OrganId, ModelProps } from './organData';

// ─── OrganScene — lighting rig + organ dispatcher ─────────────────────────────
// Runs inside the R3F Canvas. Separating it from the canvas wrapper lets
// each organ control its own clipping without touching renderer state globally.

interface OrganSceneProps extends ModelProps {
  organId: OrganId;
}

/** Enable local clipping on the WebGL renderer when crossSection is on */
function ClippingController({ enabled }: { enabled: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.localClippingEnabled = enabled;
  }, [enabled, gl]);
  return null;
}

export default function OrganScene({ organId, ...props }: OrganSceneProps) {
  const modelProps: ModelProps = props;

  return (
    <>
      <ClippingController enabled={props.crossSection} />

      {/* ── Premium lighting rig ── */}
      {/* Key light — warm directional */}
      <directionalLight
        position={[6, 8, 6]} intensity={1.60}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />

      {/* Fill light — cool from opposite side */}
      <directionalLight position={[-5, 4, -4]} intensity={0.40} color="#7dd3fc" />

      {/* Rim light — back highlight */}
      <directionalLight position={[0, -3, -6]} intensity={0.30} color="#a78bfa" />

      {/* Soft ambient */}
      <ambientLight intensity={0.28} />

      {/* Hemisphere — sky/ground gradient */}
      <hemisphereLight args={['#e0f2fe', '#0f172a', 0.35]} />

      {/* Subtle bounce from below */}
      <pointLight position={[0, -4, 2]} intensity={0.20} color="#34d399" />

      {/* ── Organ ── */}
      {organId === 'heart'    && <HeartModel    {...modelProps} />}
      {organId === 'brain'    && <BrainModel    {...modelProps} />}
      {organId === 'lungs'    && <LungsModel    {...modelProps} />}
      {organId === 'skeleton' && <SkeletonModel {...modelProps} />}
      {organId === 'kidney'   && <KidneyModel   {...modelProps} />}
      {organId === 'liver'    && <LiverModel    {...modelProps} />}
      {organId === 'dna'      && <DNAModel      {...modelProps} />}

      {/* Ground plane for shadow reception */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial transparent opacity={0.18} />
      </mesh>
    </>
  );
}

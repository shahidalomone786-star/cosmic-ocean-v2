import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const MOBILE_PARTICLE_COUNT = 12_000;
const DESKTOP_PARTICLE_COUNT = 45_000;
const BIG_BANG_END = 0.2;

function easeInOutCubic(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

function getParticleCount(): number {
  return typeof window !== 'undefined' && window.innerWidth < 768
    ? MOBILE_PARTICLE_COUNT
    : DESKTOP_PARTICLE_COUNT;
}

function createBurstData(count: number) {
  const positions = new Float32Array(count * 3);
  const directions = new Float32Array(count * 3);
  const distances = new Float32Array(count);
  let seed = 8237;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let index = 0; index < count; index += 1) {
    const direction = new THREE.Vector3(
      random() * 2 - 1,
      random() * 2 - 1,
      random() * 2 - 1,
    ).normalize();
    const distance = Math.pow(random(), 0.58) * 10 + 0.35;
    const offset = index * 3;

    directions[offset] = direction.x;
    directions[offset + 1] = direction.y;
    directions[offset + 2] = direction.z;
    distances[index] = distance;
  }

  return { positions, directions, distances };
}

export default function BigBangScene({
  progressRef,
  reducedMotion = false,
}: {
  progressRef: React.MutableRefObject<number>;
  reducedMotion?: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();
  const particleCount = useMemo(getParticleCount, []);
  const burst = useMemo(() => createBurstData(particleCount), [particleCount]);
  const activeCount = particleCount;

  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    const core = coreRef.current;
    const progress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const explosionProgress = easeInOutCubic(
      (progress - 0.04) / (BIG_BANG_END - 0.04),
    );
    const corePulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 3.4) * 0.08;

    if (points) {
      const positionAttribute = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const radius = progress <= 0.04 ? 0.012 : explosionProgress;
      for (let index = 0; index < activeCount; index += 1) {
        const offset = index * 3;
        const distance = burst.distances[index] * radius;
        positionAttribute.setXYZ(
          index,
          burst.directions[offset] * distance,
          burst.directions[offset + 1] * distance,
          burst.directions[offset + 2] * distance,
        );
      }
      positionAttribute.needsUpdate = true;
      points.rotation.y = reducedMotion ? 0 : clock.elapsedTime * 0.025;
    }

    if (core) {
      core.scale.setScalar(corePulse);
      core.rotation.z = reducedMotion ? 0 : clock.elapsedTime * 0.12;
    }

    invalidate();
  });

  return (
    <group position={[0, 0, -2]}>
      <points ref={pointsRef}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            args={[burst.positions, 3]}
            count={particleCount}
            array={burst.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          attach="material"
          color="#b9f5f3"
          size={0.025}
          sizeAttenuation
          transparent
          opacity={0.72}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#eaffff" transparent opacity={0.95} />
      </mesh>
      <pointLight color="#8ff6f0" intensity={2.4} distance={4} decay={2} />
    </group>
  );
}

export { MOBILE_PARTICLE_COUNT, DESKTOP_PARTICLE_COUNT };

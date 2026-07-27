import { forwardRef, useImperativeHandle, useRef, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import OrganScene from './OrganScene';
import type { OrganId, ModelProps } from './organData';
import { ORGAN_DATA } from './organData';

// ─── OrganCanvas — R3F Canvas (lazy-loaded chunk) ────────────────────────────
// This file is the THREE.js bundle boundary: it's lazy-imported by OrganViewer
// so the WebGL runtime is only loaded when the user first opens the viewer.

export interface OrganCanvasHandle {
  resetCamera(): void;
}

interface OrganCanvasProps extends ModelProps {
  organId: OrganId;
}

/** Inner component — has access to useThree / camera */
function SceneCameraResetter({ organId, controlsRef }: {
  organId: OrganId;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  // Expose reset via ref on parent
  useImperativeHandle(controlsRef, () => ({
    resetCam() {
      const z = ORGAN_DATA[organId].cameraZ;
      camera.position.set(0, 0, z);
      camera.lookAt(0, 0, 0);
      if (controlsRef.current?.target) {
        controlsRef.current.target.set(0, 0, 0);
      }
    },
  }));
  return null;
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#34d399" wireframe />
    </mesh>
  );
}

const OrganCanvas = forwardRef<OrganCanvasHandle, OrganCanvasProps>(
  ({ organId, ...modelProps }, ref) => {
    const controlsRef = useRef<any>(null);

    // Expose reset camera handle upward
    useImperativeHandle(ref, () => ({
      resetCamera() {
        const controls = controlsRef.current;
        if (!controls) return;
        // OrbitControls.reset() restores the saved state
        controls.reset?.();
      },
    }));

    const organ = ORGAN_DATA[organId];

    return (
      <Canvas
        camera={{ position: [0, 0, organ.cameraZ], fov: 45, near: 0.01, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        shadows="soft"
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <OrganScene organId={organId} {...modelProps} />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.75}
          zoomSpeed={0.80}
          panSpeed={0.60}
          minDistance={1.2}
          maxDistance={22}
          makeDefault
        />
      </Canvas>
    );
  }
);

OrganCanvas.displayName = 'OrganCanvas';
export default OrganCanvas;

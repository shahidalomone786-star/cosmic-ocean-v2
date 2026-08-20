import { Component, type ErrorInfo, type ReactNode, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useReducedMotion, useScroll, type MotionValue } from 'framer-motion';
import BigBangScene from './hero/BigBangScene';

class HeroErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Cosmic Ocean hero] isolated scene failed', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function ScrollInvalidator({ progress }: { progress: MotionValue<number> }) {
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
    return progress.on('change', () => invalidate());
  }, [invalidate, progress]);

  return null;
}

export default function CosmicOceanCinematicHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reducedMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  useEffect(() => {
    const updateProgress = (value: number) => {
      progressRef.current = value;
    };
    updateProgress(scrollYProgress.get());
    return scrollYProgress.on('change', updateProgress);
  }, [scrollYProgress]);

  return (
    <HeroErrorBoundary>
      <div ref={heroRef} className="cosmic-ocean-cinematic-hero" aria-hidden="true">
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ position: [0, 0, 8], fov: 52, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ScrollInvalidator progress={scrollYProgress} />
          <BigBangScene progressRef={progressRef} reducedMotion={reducedMotion} />
        </Canvas>
      </div>
    </HeroErrorBoundary>
  );
}

export { HeroErrorBoundary };

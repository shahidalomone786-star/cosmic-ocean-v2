import { useCallback, useEffect, useRef, useState } from 'react';
import type { AstronomyObject } from '@workspace/api-client-react';
import { clampPan, clampZoom, focusPan, projectRecord, MAX_ZOOM } from '../coordinates';
import type { MapViewport } from '../types';
import type {
  CosmicNavigationState,
  CosmicNavigationViewport,
} from '../navigation';

const IDLE_STATE: CosmicNavigationState = {
  level: 'overview',
  isActive: false,
  progress: 0,
  target: null,
  status: 'Coordinate window ready',
};

const PHASES = [
  { level: 'overview' as const, start: 0, end: 0.18, fromZoom: 1, zoom: 1.35, status: 'Establishing reference frame' },
  { level: 'milky-way' as const, start: 0.18, end: 0.44, fromZoom: 1.35, zoom: 2.05, status: 'Crossing the galactic field' },
  { level: 'region' as const, start: 0.44, end: 0.72, fromZoom: 2.05, zoom: 3.25, status: 'Narrowing the coordinate window' },
  { level: 'object' as const, start: 0.72, end: 1, fromZoom: 3.25, zoom: MAX_ZOOM - 0.2, status: 'Resolving destination coordinates' },
];

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeInOut(value: number): number {
  return value < 0.5
    ? 2 * value * value
    : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function useCosmicMapTravel(currentViewport: MapViewport) {
  const [navigationState, setNavigationState] = useState<CosmicNavigationState>(IDLE_STATE);
  const [navigationViewport, setNavigationViewport] = useState<CosmicNavigationViewport>(null);
  const animationFrameRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (animationFrameRef.current != null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setNavigationViewport(null);
    setNavigationState(IDLE_STATE);
  }, []);

  const travelTo = useCallback((record: AstronomyObject) => {
    const point = projectRecord(record);
    if (!point) return;

    controllerRef.current?.abort();
    if (animationFrameRef.current != null) window.cancelAnimationFrame(animationFrameRef.current);
    const controller = new AbortController();
    controllerRef.current = controller;

    const destinationZoom = MAX_ZOOM - 0.2;
    const destinationPan = focusPan(point, destinationZoom);
    const startViewport = {
      zoom: clampZoom(currentViewport.zoom),
      pan: clampPan(currentViewport.pan, currentViewport.zoom),
    };
    const finish = () => {
      if (controller.signal.aborted) return;
      setNavigationViewport({ zoom: destinationZoom, pan: destinationPan });
      setNavigationState({
        level: 'destination',
        isActive: false,
        progress: 1,
        target: record,
        status: 'Destination acquired',
      });
      controllerRef.current = null;
      animationFrameRef.current = null;
    };

    setNavigationState({
      level: 'overview',
      isActive: true,
      progress: 0,
      target: record,
      status: PHASES[0].status,
    });
    setNavigationViewport(startViewport);

    if (prefersReducedMotion()) {
      finish();
      return;
    }

    const startedAt = performance.now();
    const duration = 2850;
    const animate = (now: number) => {
      if (controller.signal.aborted) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeInOut(progress);
      const phase = PHASES.find(item => eased <= item.end) ?? PHASES[PHASES.length - 1];
      const phaseProgress = Math.max(0, Math.min(1, (eased - phase.start) / (phase.end - phase.start)));
      const targetZoom = phase.zoom;
      const fromZoom = phase.level === 'overview' ? startViewport.zoom : phase.fromZoom;
      const zoom = interpolate(fromZoom, targetZoom, easeInOut(phaseProgress));
      const pan = {
        x: interpolate(startViewport.pan.x, destinationPan.x, easeInOut(eased)),
        y: interpolate(startViewport.pan.y, destinationPan.y, easeInOut(eased)),
      };

      setNavigationViewport({ zoom, pan });
      setNavigationState({
        level: phase.level,
        isActive: true,
        progress: eased,
        target: record,
        status: phase.status,
      });

      if (progress >= 1) {
        finish();
        return;
      }
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
  }, [currentViewport]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (animationFrameRef.current != null) window.cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    if (!navigationState.isActive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancel, navigationState.isActive]);

  return {
    navigationState,
    navigationViewport,
    travelTo,
    cancel,
  };
}
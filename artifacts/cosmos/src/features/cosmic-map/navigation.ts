import type { AstronomyObject } from '@workspace/api-client-react';
import type { MapViewport } from './types';

export type CosmicNavigationLevel =
  | 'overview'
  | 'milky-way'
  | 'region'
  | 'object'
  | 'destination';

export type CosmicNavigationState = {
  level: CosmicNavigationLevel;
  isActive: boolean;
  progress: number;
  target: AstronomyObject | null;
  status: string;
};

export type CosmicNavigationViewport = MapViewport | null;
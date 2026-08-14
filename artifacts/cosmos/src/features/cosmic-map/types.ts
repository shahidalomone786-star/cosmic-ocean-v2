import type { AstronomyObject, AstronomySearchParams } from '@workspace/api-client-react';

export type CosmicMapRecord = AstronomyObject;
export type CosmicMapCategory = AstronomySearchParams['category'];

export type SkyPoint = {
  x: number;
  y: number;
};

export type MapPan = {
  x: number;
  y: number;
};

export type MapViewport = {
  zoom: number;
  pan: MapPan;
};

export type CosmicMapDataState = {
  records: CosmicMapRecord[];
  positionedRecords: CosmicMapRecord[];
  invalidCoordinateCount: number;
  sourceStatus: Array<{ source: string; status: string; message: string | null }>;
  viewport: MapViewport;
  cacheSize: number;
  truncated: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isFocusedLoading: boolean;
  refetch: () => Promise<unknown>;
};
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getAstronomyMapQueryKey,
  getAstronomyObjectQueryKey,
  useAstronomyMap,
  useAstronomyObject,
  type AstronomySearchParams,
} from '@workspace/api-client-react';
import { mapViewportFromView } from '../coordinates';
import { createCosmicMapParams } from '../services/cosmicMapService';
import { CosmicMapSpatialIndex } from '../services/cosmicMapSpatialIndex';
import type { CosmicMapDataState, MapViewport } from '../types';

type UseCosmicMapDataOptions = {
  query?: string;
  category?: AstronomySearchParams['category'];
  focusId?: string;
  viewport: MapViewport;
};

const INITIAL_VIEWPORT: MapViewport = {
  zoom: 1,
  pan: { x: 0, y: 0 },
};

export function useCosmicMapData({
  query,
  category,
  focusId,
  viewport = INITIAL_VIEWPORT,
}: UseCosmicMapDataOptions): CosmicMapDataState {
  const normalizedFocusId = focusId?.trim() ?? '';
  const cache = useRef(new CosmicMapSpatialIndex());
  const cacheKey = `${query?.trim() ?? ''}|${category ?? ''}`;
  const cacheKeyRef = useRef(cacheKey);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [debouncedViewport, setDebouncedViewport] = useState(viewport);

  if (cacheKeyRef.current !== cacheKey) {
    cacheKeyRef.current = cacheKey;
    cache.current.clear();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedViewport(viewport), 280);
    return () => window.clearTimeout(timer);
  }, [viewport]);

  const mapParams = useMemo(
    () => createCosmicMapParams(query, category, mapViewportFromView(debouncedViewport.zoom, debouncedViewport.pan)),
    [category, debouncedViewport, query],
  );

  const map = useAstronomyMap(mapParams, {
    query: {
      queryKey: getAstronomyMapQueryKey(mapParams),
      enabled: mapParams.raMin < mapParams.raMax && mapParams.decMin < mapParams.decMax,
      staleTime: 3 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
    },
  });

  const focusedObject = useAstronomyObject(normalizedFocusId, {
    query: {
      queryKey: getAstronomyObjectQueryKey(normalizedFocusId),
      enabled: Boolean(normalizedFocusId),
      staleTime: 10 * 60 * 1000,
      retry: 1,
    },
  });

  useEffect(() => {
    if (map.data?.items?.length) {
      cache.current.upsert(map.data.items);
      setCacheVersion(version => version + 1);
    }
  }, [map.data]);

  useEffect(() => {
    if (focusedObject.data?.item) {
      cache.current.upsert([focusedObject.data.item]);
      setCacheVersion(version => version + 1);
    }
  }, [focusedObject.data?.item]);

  const positionedRecords = useMemo(
    () => cache.current.query({
      ...mapViewportFromView(viewport.zoom, viewport.pan),
    }),
    [cacheKey, cacheVersion, viewport],
  );
  const focusedRecord = focusedObject.data?.item;
  const records = useMemo(() => {
    if (!focusedRecord || positionedRecords.some(record => record.id === focusedRecord.id)) return positionedRecords;
    return [...positionedRecords, focusedRecord];
  }, [focusedRecord, positionedRecords]);
  const sourceStatus = useMemo(
    () => map.data?.sourceStatus ?? focusedObject.data?.sourceStatus ?? [],
    [focusedObject.data?.sourceStatus, map.data?.sourceStatus],
  );

  const refetch = async () => {
    await Promise.all([
      map.refetch(),
      normalizedFocusId ? focusedObject.refetch() : Promise.resolve(),
    ]);
  };

  return {
    records,
    positionedRecords,
    invalidCoordinateCount: cache.current.invalidCount,
    sourceStatus,
    viewport,
    cacheSize: cache.current.size,
    truncated: Boolean(map.data?.truncated),
    isLoading: map.isLoading || (Boolean(normalizedFocusId) && focusedObject.isLoading),
    isFetching: map.isFetching,
    isError: map.isError && positionedRecords.length === 0 && !focusedRecord,
    isFocusedLoading: Boolean(normalizedFocusId) && focusedObject.isLoading,
    refetch,
  };
}
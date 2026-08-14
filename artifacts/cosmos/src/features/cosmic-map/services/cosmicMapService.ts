import type {
  AstronomyObject,
  AstronomySearchParams,
  AstronomyMapParams,
} from '@workspace/api-client-react';
import { isValidSkyCoordinate } from '../coordinates';
import type { CosmicMapCategory, CosmicMapRecord } from '../types';

export const DEFAULT_COSMIC_MAP_QUERY = '';
export const COSMIC_MAP_PAGE_SIZE = 24;

export function normalizeMapQuery(query?: string): string {
  const normalized = query?.trim() ?? '';
  return normalized.length >= 2 ? normalized : '';
}

export function createCosmicMapSearchParams(
  query?: string,
  category?: CosmicMapCategory,
): AstronomySearchParams {
  return {
    q: normalizeMapQuery(query),
    pageSize: COSMIC_MAP_PAGE_SIZE,
    ...(category ? { category } : {}),
  };
}

export function createCosmicMapParams(
  query: string | undefined,
  category: CosmicMapCategory | undefined,
  viewport: { raMin: number; raMax: number; decMin: number; decMax: number; zoom: number },
): AstronomyMapParams {
  return {
    raMin: viewport.raMin,
    raMax: viewport.raMax,
    decMin: viewport.decMin,
    decMax: viewport.decMax,
    zoom: viewport.zoom,
    limit: 120,
    ...(query?.trim() ? { q: normalizeMapQuery(query) } : {}),
    ...(category ? { category } : {}),
  };
}

export function mergeUniqueRecords(
  searchRecords: AstronomyObject[] | undefined,
  focusedRecord: AstronomyObject | undefined,
): CosmicMapRecord[] {
  const byId = new Map<string, AstronomyObject>();
  for (const record of searchRecords ?? []) byId.set(record.id, record);
  if (focusedRecord) byId.set(focusedRecord.id, focusedRecord);
  return [...byId.values()];
}

export function selectPositionedRecords(records: CosmicMapRecord[]): CosmicMapRecord[] {
  return records.filter(isValidSkyCoordinate);
}
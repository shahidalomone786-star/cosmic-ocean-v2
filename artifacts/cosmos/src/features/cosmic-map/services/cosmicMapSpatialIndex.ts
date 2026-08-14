import type { AstronomyObject } from '@workspace/api-client-react';
import { isValidSkyCoordinate } from '../coordinates';

export type SpatialViewport = {
  raMin: number;
  raMax: number;
  decMin: number;
  decMax: number;
};

const GRID_COLUMNS = 24;
const GRID_ROWS = 12;
export const COSMIC_MAP_CACHE_LIMIT = 800;

function cellFor(record: AstronomyObject): string | null {
  if (!isValidSkyCoordinate(record)) return null;
  const ra = record.coordinates?.rightAscension ?? 0;
  const dec = record.coordinates?.declination ?? 0;
  const column = Math.min(GRID_COLUMNS - 1, Math.floor((ra / 360) * GRID_COLUMNS));
  const row = Math.min(GRID_ROWS - 1, Math.floor(((90 - dec) / 180) * GRID_ROWS));
  return `${column}:${row}`;
}

function cellsForViewport(viewport: SpatialViewport): string[] {
  const minColumn = Math.max(0, Math.floor((viewport.raMin / 360) * GRID_COLUMNS));
  const maxColumn = Math.min(GRID_COLUMNS - 1, Math.floor((viewport.raMax / 360) * GRID_COLUMNS));
  const minRow = Math.max(0, Math.floor(((90 - viewport.decMax) / 180) * GRID_ROWS));
  const maxRow = Math.min(GRID_ROWS - 1, Math.floor(((90 - viewport.decMin) / 180) * GRID_ROWS));
  const cells: string[] = [];
  for (let column = minColumn; column <= maxColumn; column += 1) {
    for (let row = minRow; row <= maxRow; row += 1) cells.push(`${column}:${row}`);
  }
  return cells;
}

/**
 * A small in-memory spatial index. The archive can return many records over a
 * session, so this keeps the plotted working set bounded while avoiding a
 * full-record scan for every pan or zoom.
 */
export class CosmicMapSpatialIndex {
  private readonly records = new Map<string, AstronomyObject>();
  private readonly cells = new Map<string, Set<string>>();

  constructor(private readonly limit = COSMIC_MAP_CACHE_LIMIT) {}

  clear() {
    this.records.clear();
    this.cells.clear();
  }

  upsert(records: AstronomyObject[]) {
    for (const record of records) {
      const previous = this.records.get(record.id);
      if (previous) this.removeFromCell(previous);
      this.records.set(record.id, record);
      const cell = cellFor(record);
      if (cell) {
        const ids = this.cells.get(cell) ?? new Set<string>();
        ids.add(record.id);
        this.cells.set(cell, ids);
      }
    }
    while (this.records.size > this.limit) {
      const firstId = this.records.keys().next().value as string | undefined;
      if (!firstId) break;
      const firstRecord = this.records.get(firstId);
      if (firstRecord) this.removeFromCell(firstRecord);
      this.records.delete(firstId);
    }
  }

  query(viewport: SpatialViewport): AstronomyObject[] {
    const candidateIds = new Set<string>();
    for (const cell of cellsForViewport(viewport)) {
      for (const id of this.cells.get(cell) ?? []) candidateIds.add(id);
    }
    return [...candidateIds]
      .map(id => this.records.get(id))
      .filter((record): record is AstronomyObject => Boolean(record))
      .filter(record => {
        if (!isValidSkyCoordinate(record)) return false;
        const ra = record.coordinates?.rightAscension ?? 0;
        const dec = record.coordinates?.declination ?? 0;
        return ra >= viewport.raMin && ra <= viewport.raMax
          && dec >= viewport.decMin && dec <= viewport.decMax;
      });
  }

  get size() {
    return this.records.size;
  }

  get invalidCount() {
    let count = 0;
    for (const record of this.records.values()) {
      if (!isValidSkyCoordinate(record)) count += 1;
    }
    return count;
  }

  private removeFromCell(record: AstronomyObject) {
    const cell = cellFor(record);
    if (!cell) return;
    const ids = this.cells.get(cell);
    ids?.delete(record.id);
    if (ids?.size === 0) this.cells.delete(cell);
  }
}
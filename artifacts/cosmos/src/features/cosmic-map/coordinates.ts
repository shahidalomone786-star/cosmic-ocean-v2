import type { AstronomyObject } from '@workspace/api-client-react';
import type { MapPan, SkyPoint } from './types';

export const SKY_PLOT = {
  width: 1200,
  height: 680,
  left: 68,
  top: 44,
  widthInner: 1066,
  heightInner: 540,
} as const;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

export function isValidSkyCoordinate(record: AstronomyObject): boolean {
  const ra = record.coordinates?.rightAscension;
  const dec = record.coordinates?.declination;
  return ra != null && dec != null
    && Number.isFinite(ra) && Number.isFinite(dec)
    && ra >= 0 && ra <= 360
    && dec >= -90 && dec <= 90;
}

export function projectRecord(record: AstronomyObject): SkyPoint | null {
  if (!isValidSkyCoordinate(record)) return null;
  const ra = record.coordinates?.rightAscension ?? 0;
  const dec = record.coordinates?.declination ?? 0;
  return {
    x: SKY_PLOT.left + (ra / 360) * SKY_PLOT.widthInner,
    y: SKY_PLOT.top + ((90 - dec) / 180) * SKY_PLOT.heightInner,
  };
}

export function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

export function clampPan(pan: MapPan, zoom: number): MapPan {
  const limitX = Math.max(0, (zoom - 1) * 510);
  const limitY = Math.max(0, (zoom - 1) * 255);
  return {
    x: Math.max(-limitX, Math.min(limitX, pan.x)),
    y: Math.max(-limitY, Math.min(limitY, pan.y)),
  };
}

export function focusPan(point: SkyPoint, zoom = 2.2): MapPan {
  return clampPan({
    x: SKY_PLOT.width / 2 - zoom * (point.x - SKY_PLOT.width / 2),
    y: SKY_PLOT.height / 2 - zoom * (point.y - SKY_PLOT.height / 2),
  }, zoom);
}

export function mapViewportFromView(zoom: number, pan: MapPan): {
  raMin: number;
  raMax: number;
  decMin: number;
  decMax: number;
  zoom: number;
} {
  const centerX = SKY_PLOT.width / 2;
  const centerY = SKY_PLOT.height / 2;
  const worldLeft = (0 - centerX - pan.x) / zoom + centerX;
  const worldRight = (SKY_PLOT.width - centerX - pan.x) / zoom + centerX;
  const worldTop = (0 - centerY - pan.y) / zoom + centerY;
  const worldBottom = (SKY_PLOT.height - centerY - pan.y) / zoom + centerY;
  return {
    raMin: clampCoordinate(((worldLeft - SKY_PLOT.left) / SKY_PLOT.widthInner) * 360, 0, 360),
    raMax: clampCoordinate(((worldRight - SKY_PLOT.left) / SKY_PLOT.widthInner) * 360, 0, 360),
    decMax: clampCoordinate(90 - ((worldTop - SKY_PLOT.top) / SKY_PLOT.heightInner) * 180, -90, 90),
    decMin: clampCoordinate(90 - ((worldBottom - SKY_PLOT.top) / SKY_PLOT.heightInner) * 180, -90, 90),
    zoom: Math.round(zoom * 100) / 100,
  };
}

function clampCoordinate(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatDegrees(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  return `${value.toFixed(digits)}°`;
}

export function formatCoordinatePair(record: AstronomyObject): string {
  const ra = record.coordinates?.rightAscension;
  const dec = record.coordinates?.declination;
  if (ra == null || dec == null) return 'Coordinates not returned';
  return `RA ${formatDegrees(ra)} · Dec ${formatDegrees(dec)}`;
}

export function markerTone(record: AstronomyObject): 'cyan' | 'violet' | 'amber' {
  const category = `${record.category} ${record.type}`.toLowerCase();
  if (category.includes('galax') || category.includes('nebula') || category.includes('black-hole')) return 'violet';
  if (category.includes('planet') || category.includes('moon')) return 'amber';
  return 'cyan';
}
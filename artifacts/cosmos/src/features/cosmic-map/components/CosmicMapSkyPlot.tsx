import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { Crosshair, Minus, Plus, RotateCcw, ScanLine } from 'lucide-react';
import type { AstronomyObject } from '@workspace/api-client-react';
import {
  clampPan,
  clampZoom,
  focusPan,
  formatCoordinatePair,
  markerTone,
  projectRecord,
  SKY_PLOT,
  MAX_ZOOM,
  MIN_ZOOM,
} from '../coordinates';
import type { MapPan, MapViewport, SkyPoint } from '../types';

type CosmicMapSkyPlotProps = {
  records: AstronomyObject[];
  selectedObjectId: string | null;
  onSelect: (record: AstronomyObject) => void;
  onViewportChange: (viewport: MapViewport) => void;
  isFetching?: boolean;
  requestError?: boolean;
  truncated?: boolean;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: MapPan;
};

export default function CosmicMapSkyPlot({
  records,
  selectedObjectId,
  onSelect,
  onViewportChange,
  isFetching = false,
  requestError = false,
  truncated = false,
}: CosmicMapSkyPlotProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<MapPan>({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const positionedRecords = useMemo(
    () => records
      .filter(record => Boolean(projectRecord(record))),
    [records],
  );
  const selectedPoint = useMemo(
    () => {
      const record = positionedRecords.find(item => item.id === selectedObjectId);
      return record ? projectRecord(record) : null;
    },
    [positionedRecords, selectedObjectId],
  );
  const displayItems = useMemo(
    () => {
      if (zoom < 2.5) return clusterRecords(positionedRecords, zoom);
      return positionedRecords.flatMap(record => {
        const point = projectRecord(record);
        return point ? [{ key: record.id, point, count: 1, record, records: [record] }] : [];
      });
    },
    [positionedRecords, zoom],
  );

  useEffect(() => {
    onViewportChangeRef.current(mapViewportFromCurrentView(zoom, pan));
  }, [pan, zoom]);

  useEffect(() => {
    if (!selectedPoint) return;
    const nextZoom = 2.2;
    setZoom(nextZoom);
    setPan(focusPan(selectedPoint, nextZoom));
  }, [selectedObjectId, selectedPoint]);

  const setZoomAroundCenter = (nextZoom: number) => {
    const bounded = clampZoom(nextZoom);
    setZoom(bounded);
    setPan(current => clampPan(current, bounded));
  };

  const zoomAtPoint = (point: SkyPoint, nextZoom: number) => {
    const bounded = clampZoom(nextZoom);
    setZoom(bounded);
    setPan(clampPan({
      x: SKY_PLOT.width / 2 - bounded * (point.x - SKY_PLOT.width / 2),
      y: SKY_PLOT.height / 2 - bounded * (point.y - SKY_PLOT.height / 2),
    }, bounded));
  };

  const resetView = () => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setZoomAroundCenter(zoom + (event.deltaY > 0 ? -.3 : .3));
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    if (target.closest?.('[data-cosmic-map-marker="true"]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        zoom,
      };
      setDragState(null);
      return;
    }
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
    });
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      setZoomAroundCenter(pinchRef.current.zoom * (distance / pinchRef.current.distance));
      return;
    }
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const scale = event.currentTarget.getBoundingClientRect().width / SKY_PLOT.width || 1;
    setPan(clampPan({
      x: dragState.origin.x + (event.clientX - dragState.startX) / scale,
      y: dragState.origin.y + (event.clientY - dragState.startY) / scale,
    }, zoom));
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  };

  const handleKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    const panStep = 42 / zoom;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const direction = {
        ArrowLeft: { x: panStep, y: 0 },
        ArrowRight: { x: -panStep, y: 0 },
        ArrowUp: { x: 0, y: panStep },
        ArrowDown: { x: 0, y: -panStep },
      }[event.key];
      setPan(current => clampPan({ x: current.x + direction.x, y: current.y + direction.y }, zoom));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setZoomAroundCenter(zoom + .5);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      setZoomAroundCenter(zoom - .5);
    } else if (event.key === '0') {
      event.preventDefault();
      resetView();
    }
  };

  return (
    <>
      <div className="cosmic-map-plot-toolbar">
        <div className="cosmic-map-plot-toolbar-copy">
          <span className="cosmic-map-plot-status">
            <i aria-hidden="true" /> {isFetching ? 'Reading viewport' : requestError ? 'Viewport response unavailable' : 'Coordinate window'}
          </span>
          <span className="cosmic-map-coordinate-readout">
            {selectedObjectId && selectedPoint ? `${formatCoordinatePair(records.find(record => record.id === selectedObjectId) ?? records[0])} · ${Math.round(zoom * 100)}%` : `RA 0°—360° · Dec +90°—−90° · ${Math.round(zoom * 100)}%`}
          </span>
        </div>
        <div className="cosmic-map-plot-controls" aria-label="Sky plot controls">
          <button type="button" className="cosmic-map-icon-button" onClick={() => setZoomAroundCenter(zoom - .5)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" data-testid="button-cosmic-map-zoom-out">
            <Minus size={16} aria-hidden="true" />
          </button>
          <button type="button" className="cosmic-map-icon-button" onClick={() => setZoomAroundCenter(zoom + .5)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" data-testid="button-cosmic-map-zoom-in">
            <Plus size={16} aria-hidden="true" />
          </button>
          <button type="button" className="cosmic-map-icon-button" onClick={resetView} aria-label="Reset sky plot" data-testid="button-cosmic-map-reset">
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={`cosmic-map-stage ${dragState ? 'is-panning' : ''}`}>
        <svg
          className="cosmic-map-svg"
          viewBox={`0 0 ${SKY_PLOT.width} ${SKY_PLOT.height}`}
          role="application"
          aria-label="Interactive right ascension and declination sky plot"
          tabIndex={0}
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleKeyboard}
          data-testid="plot-cosmic-map-sky"
        >
          <title>Real Atlas records plotted by right ascension and declination</title>
          <defs>
            <linearGradient id="cosmic-map-wash" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="hsl(187 71% 69% / .13)" />
              <stop offset="1" stopColor="hsl(250 58% 75% / .13)" />
            </linearGradient>
            <pattern id="cosmic-map-grid" width="106.6" height="90" patternUnits="userSpaceOnUse">
              <path d="M 106.6 0 L 0 0 0 90" fill="none" stroke="hsl(187 71% 69% / .08)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect className="cosmic-map-sky-background" x="0" y="0" width={SKY_PLOT.width} height={SKY_PLOT.height} />
          <g transform={`translate(${pan.x} ${pan.y}) translate(${SKY_PLOT.width / 2} ${SKY_PLOT.height / 2}) scale(${zoom}) translate(${-SKY_PLOT.width / 2} ${-SKY_PLOT.height / 2})`}>
            <rect className="cosmic-map-sky-wash" x={SKY_PLOT.left} y={SKY_PLOT.top} width={SKY_PLOT.widthInner} height={SKY_PLOT.heightInner} />
            <rect className="cosmic-map-sky-grid" x={SKY_PLOT.left} y={SKY_PLOT.top} width={SKY_PLOT.widthInner} height={SKY_PLOT.heightInner} />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].map(ra => {
              const x = SKY_PLOT.left + (ra / 360) * SKY_PLOT.widthInner;
              return <line key={`ra-${ra}`} className="cosmic-map-grid-line" x1={x} x2={x} y1={SKY_PLOT.top} y2={SKY_PLOT.top + SKY_PLOT.heightInner} />;
            })}
            {[-90, -60, -30, 0, 30, 60, 90].map(dec => {
              const y = SKY_PLOT.top + ((90 - dec) / 180) * SKY_PLOT.heightInner;
              return <line key={`dec-${dec}`} className="cosmic-map-grid-line" x1={SKY_PLOT.left} x2={SKY_PLOT.left + SKY_PLOT.widthInner} y1={y} y2={y} />;
            })}
            {displayItems.map(item => {
              if (item.count > 1) {
                return (
                  <g
                    key={item.key}
                    className="cosmic-map-cluster"
                    data-cosmic-map-marker="true"
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.count} real records in this coordinate region`}
                    onClick={() => zoomAtPoint(item.point, zoom + 1)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        zoomAtPoint(item.point, zoom + 1);
                      }
                    }}
                    data-testid={`button-cosmic-map-cluster-${item.key}`}
                  >
                    <circle className="cosmic-map-cluster-hit-area" cx={item.point.x} cy={item.point.y} r="22" />
                    <circle className="cosmic-map-cluster-ring" cx={item.point.x} cy={item.point.y} r={14 + Math.min(8, item.count / 5)} />
                    <circle className="cosmic-map-cluster-core" cx={item.point.x} cy={item.point.y} r="9" />
                    <text className="cosmic-map-cluster-count" x={item.point.x} y={item.point.y + 4}>{item.count}</text>
                  </g>
                );
              }
              const record = item.record;
              if (!record) return null;
              const tone = markerTone(record);
              const isSelected = record.id === selectedObjectId;
              return (
                <g
                  key={record.id}
                  className={`cosmic-map-marker is-${tone} ${isSelected ? 'is-selected' : ''}`}
                  data-cosmic-map-marker="true"
                  role="button"
                  tabIndex={0}
                  aria-label={`${record.name}, ${record.type || 'object'}, ${formatCoordinatePair(record)}`}
                  onClick={() => onSelect(record)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(record);
                    }
                  }}
                  data-testid={`button-cosmic-map-marker-${record.id}`}
                >
                  <circle className="cosmic-map-marker-hit-area" cx={item.point.x} cy={item.point.y} r="18" />
                  {isSelected && <circle className="cosmic-map-marker-ring" cx={item.point.x} cy={item.point.y} r="11" />}
                  <circle className="cosmic-map-marker-core" cx={item.point.x} cy={item.point.y} r={isSelected ? 5.4 : 3.8} />
                  {(zoom >= 3.2 || isSelected) && (
                    <text className="cosmic-map-marker-label" x={item.point.x + 10} y={item.point.y - 10}>{record.name}</text>
                  )}
                </g>
              );
            })}
          </g>
          <g aria-hidden="true">
            <text className="cosmic-map-axis-label" x={SKY_PLOT.left} y={SKY_PLOT.height - 24}>RA 0°</text>
            <text className="cosmic-map-axis-label" x={SKY_PLOT.left + SKY_PLOT.widthInner / 2 - 18} y={SKY_PLOT.height - 24}>180°</text>
            <text className="cosmic-map-axis-label" x={SKY_PLOT.left + SKY_PLOT.widthInner - 32} y={SKY_PLOT.height - 24}>360°</text>
            <text className="cosmic-map-axis-label" x="16" y={SKY_PLOT.top + 5}>+90°</text>
            <text className="cosmic-map-axis-label" x="26" y={SKY_PLOT.top + SKY_PLOT.heightInner / 2 + 4}>0°</text>
            <text className="cosmic-map-axis-label" x="16" y={SKY_PLOT.top + SKY_PLOT.heightInner}>−90°</text>
          </g>
        </svg>
         <span className="cosmic-map-plot-hint"><Crosshair size={12} aria-hidden="true" /> Drag to pan · wheel to zoom</span>
      </div>
      <div className="cosmic-map-plot-caption">
         <span><ScanLine size={12} aria-hidden="true" /> {positionedRecords.length} records in viewport · {displayItems.filter(item => item.count > 1).length} clusters</span>
         <span>{truncated ? 'Provider limit reached · ' : ''}Keyboard: arrows pan · + / − zoom · 0 reset</span>
      </div>
    </>
  );
}

type DisplayItem = {
  key: string;
  point: SkyPoint;
  count: number;
  record?: AstronomyObject;
  records: AstronomyObject[];
};

function clusterRecords(records: AstronomyObject[], zoom: number): DisplayItem[] {
  const cellSize = zoom < 1.5 ? 92 : 62;
  const buckets = new Map<string, { records: AstronomyObject[]; points: SkyPoint[] }>();
  for (const record of records) {
    const point = projectRecord(record);
    if (!point) continue;
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const bucket = buckets.get(key) ?? { records: [], points: [] };
    bucket.records.push(record);
    bucket.points.push(point);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].map(([key, bucket]) => {
    const point = bucket.points.reduce(
      (center, item) => ({ x: center.x + item.x / bucket.points.length, y: center.y + item.y / bucket.points.length }),
      { x: 0, y: 0 },
    );
    return {
      key: `cluster-${key}`,
      point,
      count: bucket.records.length,
      record: bucket.records.length === 1 ? bucket.records[0] : undefined,
      records: bucket.records,
    };
  });
}

function mapViewportFromCurrentView(zoom: number, pan: MapPan): MapViewport {
  return { zoom, pan };
}
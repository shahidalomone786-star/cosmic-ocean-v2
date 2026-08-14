import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  ArrowUpRight,
  Crosshair,
  Database,
  Eye,
  EyeOff,
  Info,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
} from 'lucide-react';
import type { AstronomyObject as ApiAstronomyObject } from '@workspace/api-client-react';

type CosmicAtlasVisualizationProps = {
  items: ApiAstronomyObject[];
  selectedObjectId: string | null;
  onSelect: (item: ApiAstronomyObject) => void;
  onExplore: (item: ApiAstronomyObject) => void;
  lm?: boolean;
  isLoading?: boolean;
};

type Pan = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; origin: Pan; moved: boolean };

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 560;
const PLOT = { left: 50, top: 48, width: 900, height: 440 };
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

// Presentation-only texture. These marks have no relationship to catalog records.
const DECORATIVE_STARS = [
  [74, 72, 1.4], [126, 155, .9], [178, 92, 1.1], [227, 418, 1.5], [268, 240, .8],
  [315, 112, 1.2], [357, 455, .75], [404, 188, 1.1], [451, 78, .72], [495, 398, 1.3],
  [535, 256, .8], [581, 126, 1.45], [627, 472, .9], [676, 214, 1.05], [718, 90, .7],
  [764, 362, 1.25], [814, 106, .8], [855, 446, 1.35], [899, 270, .8], [934, 164, 1.1],
  [103, 336, .65], [202, 52, .75], [338, 322, .68], [544, 486, .7], [744, 54, .75],
  [876, 330, .66],
] as const;

function isValidCoordinate(item: ApiAstronomyObject): boolean {
  const rightAscension = item.coordinates?.rightAscension;
  const declination = item.coordinates?.declination;
  return Number.isFinite(rightAscension) && Number.isFinite(declination)
    && rightAscension != null && declination != null
    && rightAscension >= 0 && rightAscension <= 360
    && declination >= -90 && declination <= 90;
}

function project(item: ApiAstronomyObject): { x: number; y: number } | null {
  if (!isValidCoordinate(item)) return null;
  const rightAscension = item.coordinates?.rightAscension ?? 0;
  const declination = item.coordinates?.declination ?? 0;
  return {
    x: PLOT.left + (rightAscension / 360) * PLOT.width,
    y: PLOT.top + ((90 - declination) / 180) * PLOT.height,
  };
}

function formatDistance(item: ApiAstronomyObject): string {
  if (item.distance?.value == null) return 'Not available';
  return `${item.distance.value} ${item.distance.unit ?? ''}`.trim();
}

function labelize(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, character => character.toUpperCase());
}

function safeMetadata(item: ApiAstronomyObject): Array<[string, string]> {
  return Object.entries(item.metadata ?? {})
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) && value !== '')
    .slice(0, 2)
    .map(([key, value]) => [labelize(key), String(value)]);
}

function categoryLabel(value: string): string {
  return value.replace(/-/g, ' ');
}

function markerColor(item: ApiAstronomyObject): string {
  const category = item.category.toLowerCase();
  if (category.includes('galax') || category.includes('nebula')) return 'violet';
  if (category.includes('planet') || category.includes('moon')) return 'amber';
  if (category.includes('mission') || category.includes('spacecraft')) return 'blue';
  return 'cyan';
}

export default function CosmicAtlasVisualization({
  items,
  selectedObjectId,
  onSelect,
  onExplore,
  lm = false,
  isLoading = false,
}: CosmicAtlasVisualizationProps) {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => new Set());
  const [dragState, setDragState] = useState<DragState | null>(null);

  const categories = useMemo(
    () => [...new Set(items.map(item => item.category).filter(Boolean))].sort(),
    [items],
  );
  const positionedItems = useMemo(
    () => items
      .map(item => ({ item, point: project(item) }))
      .filter((entry): entry is { item: ApiAstronomyObject; point: { x: number; y: number } } => Boolean(entry.point)),
    [items],
  );
  const visibleItems = useMemo(
    () => positionedItems.filter(({ item }) => !hiddenCategories.has(item.category)),
    [hiddenCategories, positionedItems],
  );
  const selectedItem = useMemo(
    () => items.find(item => item.id === selectedObjectId) ?? null,
    [items, selectedObjectId],
  );
  const selectedPoint = selectedItem ? project(selectedItem) : null;

  const clampPan = (next: Pan, nextZoom = zoom): Pan => {
    const limitX = Math.max(0, (nextZoom - 1) * 460);
    const limitY = Math.max(0, (nextZoom - 1) * 225);
    return {
      x: Math.max(-limitX, Math.min(limitX, next.x)),
      y: Math.max(-limitY, Math.min(limitY, next.y)),
    };
  };

  useEffect(() => {
    if (!selectedPoint) return;
    const focusZoom = 2;
    setZoom(focusZoom);
    setPan(clampPan({
      x: 500 - focusZoom * (selectedPoint.x - 500),
      y: 280 - focusZoom * (selectedPoint.y - 280),
    }, focusZoom));
  }, [selectedObjectId, selectedPoint]);

  const setZoomAroundCenter = (nextZoom: number) => {
    const bounded = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
    setZoom(bounded);
    setPan(current => clampPan(current, bounded));
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setZoomAroundCenter(zoom + (event.deltaY > 0 ? -.25 : .25));
  };

  const handlePanStart = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    if (target.closest?.('[data-catalog-marker="true"]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
      moved: false,
    });
  };

  const handlePanMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const scale = event.currentTarget.getBoundingClientRect().width / VIEWBOX_WIDTH || 1;
    const dx = (event.clientX - dragState.startX) / scale;
    const dy = (event.clientY - dragState.startY) / scale;
    setDragState(current => current ? { ...current, moved: current.moved || Math.abs(dx) + Math.abs(dy) > 4 } : current);
    setPan(clampPan({ x: dragState.origin.x + dx, y: dragState.origin.y + dy }));
  };

  const handlePanEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragState(null);
  };

  const resetView = () => {
    setZoom(ZOOM_MIN);
    setPan({ x: 0, y: 0 });
  };

  const toggleCategory = (category: string) => {
    setHiddenCategories(current => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <section className={`cosmic-atlas-visualization ${lm ? 'is-light' : ''}`} aria-labelledby="cosmic-atlas-visualization-title">
      <div className="cosmic-atlas-visualization-heading">
        <div>
          <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Coordinate window</p>
          <h2 id="cosmic-atlas-visualization-title">Sky <em>projection</em></h2>
        </div>
        <div className="cosmic-atlas-visualization-heading-meta">
          <span><ScanLine size={13} aria-hidden="true" /> Lightweight SVG renderer</span>
          <span>{positionedItems.length} positioned / {items.length} returned</span>
        </div>
      </div>

      <div className="cosmic-atlas-visualization-layout">
        <div className="cosmic-atlas-sky-card">
          <div className="cosmic-atlas-sky-toolbar">
            <div className="cosmic-atlas-sky-toolbar-copy">
              <span className="cosmic-atlas-sky-status"><i aria-hidden="true" /> Source coordinates only</span>
              <span className="cosmic-atlas-sky-scale">RA 0°—360° · Dec +90°—−90° · {Math.round(zoom * 100)}%</span>
            </div>
            <div className="cosmic-atlas-sky-controls" aria-label="Projection controls">
              <button type="button" onClick={() => setZoomAroundCenter(zoom - .5)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" data-testid="button-atlas-visualization-zoom-out"><Minus size={16} aria-hidden="true" /></button>
              <button type="button" onClick={() => setZoomAroundCenter(zoom + .5)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" data-testid="button-atlas-visualization-zoom-in"><Plus size={16} aria-hidden="true" /></button>
              <button type="button" onClick={resetView} aria-label="Reset projection view" data-testid="button-atlas-visualization-reset"><RotateCcw size={15} aria-hidden="true" /></button>
            </div>
          </div>

          {isLoading ? (
            <div className="cosmic-atlas-visualization-loading" aria-label="Loading coordinate projection">
              <span className="cosmic-atlas-visualization-loading-orbit" />
              <span className="cosmic-atlas-visualization-loading-line is-wide" />
              <span className="cosmic-atlas-visualization-loading-line" />
              <p>Reading returned coordinates</p>
            </div>
          ) : items.length === 0 ? (
            <div className="cosmic-atlas-visualization-empty">
              <Crosshair size={22} aria-hidden="true" />
              <strong>No returned records to position.</strong>
              <span>Run an archive search to open a source-backed sky window.</span>
            </div>
          ) : (
            <div className={`cosmic-atlas-sky-stage ${dragState ? 'is-panning' : ''}`}>
              <svg
                className="cosmic-atlas-sky-svg"
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                role="img"
                aria-label="Right ascension and declination coordinate projection"
                onWheel={handleWheel}
                onPointerDown={handlePanStart}
                onPointerMove={handlePanMove}
                onPointerUp={handlePanEnd}
                onPointerCancel={handlePanEnd}
              >
                <defs>
                  <linearGradient id="atlas-sky-wash" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="rgba(32, 100, 126, .18)" />
                    <stop offset="1" stopColor="rgba(101, 77, 156, .14)" />
                  </linearGradient>
                  <pattern id="atlas-sky-grid" width="90" height="110" patternUnits="userSpaceOnUse">
                    <path d="M 90 0 L 0 0 0 110" fill="none" stroke="rgba(160, 213, 231, .11)" strokeWidth=".8" />
                  </pattern>
                </defs>
                <rect className="cosmic-atlas-sky-background" x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx="2" />
                <g className="cosmic-atlas-sky-plot" transform={`translate(${pan.x} ${pan.y}) translate(500 280) scale(${zoom}) translate(-500 -280)`}>
                  <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill="url(#atlas-sky-wash)" />
                  <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill="url(#atlas-sky-grid)" />
                  {DECORATIVE_STARS.map(([x, y, radius], index) => (
                    <circle key={`decorative-${index}`} className="cosmic-atlas-decorative-star" cx={x} cy={y} r={radius} aria-hidden="true" />
                  ))}
                  {[0, 90, 180, 270, 360].map(ra => {
                    const x = PLOT.left + (ra / 360) * PLOT.width;
                    return <line key={`ra-${ra}`} className="cosmic-atlas-coordinate-line" x1={x} x2={x} y1={PLOT.top} y2={PLOT.top + PLOT.height} />;
                  })}
                  {[-90, -45, 0, 45, 90].map(dec => {
                    const y = PLOT.top + ((90 - dec) / 180) * PLOT.height;
                    return <line key={`dec-${dec}`} className="cosmic-atlas-coordinate-line" x1={PLOT.left} x2={PLOT.left + PLOT.width} y1={y} y2={y} />;
                  })}
                  {visibleItems.map(({ item, point }) => {
                    const isSelected = item.id === selectedObjectId;
                    return (
                      <g
                        key={item.id}
                        className={`cosmic-atlas-marker is-${markerColor(item)} ${isSelected ? 'is-selected' : ''}`}
                        data-catalog-marker="true"
                        role="button"
                        tabIndex={0}
                        aria-label={`${item.name}, ${item.type || 'object'}, ${item.source}`}
                        onClick={() => onSelect(item)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelect(item);
                          }
                        }}
                        data-testid={`button-atlas-marker-${item.id}`}
                      >
                        <circle className="cosmic-atlas-marker-hit-area" cx={point.x} cy={point.y} r="16" />
                        {isSelected && <circle className="cosmic-atlas-marker-ring" cx={point.x} cy={point.y} r="10" />}
                        <circle className="cosmic-atlas-marker-core" cx={point.x} cy={point.y} r={isSelected ? 5 : 3.4} />
                        <text x={point.x + 9} y={point.y - 9} className="cosmic-atlas-marker-label">{item.name}</text>
                      </g>
                    );
                  })}
                </g>
                <g className="cosmic-atlas-sky-axis-labels" aria-hidden="true">
                  <text x={PLOT.left} y={VIEWBOX_HEIGHT - 18}>RA 0°</text>
                  <text x={PLOT.left + PLOT.width / 2 - 18} y={VIEWBOX_HEIGHT - 18}>180°</text>
                  <text x={PLOT.left + PLOT.width - 28} y={VIEWBOX_HEIGHT - 18}>360°</text>
                  <text x="13" y={PLOT.top + 5}>+90°</text>
                  <text x="18" y={PLOT.top + PLOT.height / 2 + 4}>0°</text>
                  <text x="12" y={PLOT.top + PLOT.height}>−90°</text>
                </g>
              </svg>
              <div className="cosmic-atlas-sky-hint"><Crosshair size={12} aria-hidden="true" /> Drag to pan · scroll to zoom</div>
            </div>
          )}

          <div className="cosmic-atlas-sky-attribution">
            <span><Database size={12} aria-hidden="true" /> Normalized archive records</span>
            <span>Projection, not physical scale</span>
          </div>
        </div>

        <aside className="cosmic-atlas-visualization-sidebar" aria-label="Projection details">
          <section className="cosmic-atlas-category-panel" aria-labelledby="atlas-category-visibility-title">
            <div className="cosmic-atlas-sidebar-heading">
              <div>
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Layer controls</p>
                <h3 id="atlas-category-visibility-title">Visible <em>categories</em></h3>
              </div>
              <button type="button" onClick={() => setHiddenCategories(new Set())} className="cosmic-atlas-reset-layers" disabled={hiddenCategories.size === 0} data-testid="button-atlas-visualization-show-all">Show all</button>
            </div>
            <div className="cosmic-atlas-category-list">
              {categories.length === 0 ? (
                <span className="cosmic-atlas-sidebar-empty">Categories appear when archive records return.</span>
              ) : categories.map(category => {
                const hidden = hiddenCategories.has(category);
                const count = items.filter(item => item.category === category).length;
                return (
                  <button
                    type="button"
                    key={category}
                    className={`cosmic-atlas-category-toggle ${hidden ? 'is-hidden' : ''}`}
                    onClick={() => toggleCategory(category)}
                    aria-pressed={!hidden}
                    data-testid={`button-atlas-visualization-category-${category}`}
                  >
                    {hidden ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                    <span>{categoryLabel(category)}</span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="cosmic-atlas-selected-panel" aria-labelledby="atlas-selected-object-title" aria-live="polite">
            <div className="cosmic-atlas-sidebar-heading">
              <div>
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Record focus</p>
                <h3 id="atlas-selected-object-title">Selected <em>object</em></h3>
              </div>
              <Info size={15} aria-hidden="true" />
            </div>
            {selectedItem ? (
              <div className="cosmic-atlas-selected-record">
                <span className="cosmic-atlas-selected-type">{selectedItem.type || 'Object'} · {selectedItem.category}</span>
                <h4>{selectedItem.name}</h4>
                <dl>
                  <div><dt>Distance</dt><dd>{formatDistance(selectedItem)}</dd></div>
                  <div><dt>Source</dt><dd>{selectedItem.source}</dd></div>
                  <div><dt>Source ID / catalog</dt><dd>{selectedItem.sourceId || 'Not available'}</dd></div>
                  {safeMetadata(selectedItem).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
                </dl>
                {!selectedPoint && (
                  <p className="cosmic-atlas-coordinate-warning">
                    <Crosshair size={14} aria-hidden="true" />
                    This record cannot be positioned from the returned archive data because right ascension and declination are not both available.
                  </p>
                )}
                <button type="button" className="cosmic-atlas-explore-button" onClick={() => onExplore(selectedItem)} data-testid={`button-atlas-visualization-explore-${selectedItem.id}`}>
                  Explore object <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="cosmic-atlas-selected-empty">
                <Crosshair size={18} aria-hidden="true" />
                <strong>Select a plotted record</strong>
                <span>Choose a marker to inspect its normalized source fields.</span>
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
import { ArrowUpRight, Crosshair, Info } from 'lucide-react';
import type { AstronomyObject } from '@workspace/api-client-react';
import { formatCoordinatePair, formatDegrees, isValidSkyCoordinate } from '../coordinates';

type CosmicMapSelectionPanelProps = {
  record: AstronomyObject | null;
  onOpenObject?: (record: AstronomyObject) => void;
};

function formatDistance(record: AstronomyObject): string {
  if (record.distance?.value == null) return 'Not available';
  return `${record.distance.value} ${record.distance.unit ?? ''}`.trim();
}

export default function CosmicMapSelectionPanel({
  record,
  onOpenObject,
}: CosmicMapSelectionPanelProps) {
  return (
    <aside className="cosmic-map-panel" aria-labelledby="cosmic-map-selection-title" aria-live="polite">
      <div className="cosmic-map-panel-heading">
        <div>
          <p className="cosmic-map-panel-kicker">Instrument readout</p>
          <h2 id="cosmic-map-selection-title">Object <em>focus</em></h2>
        </div>
        <Info size={16} aria-hidden="true" />
      </div>
      {record ? (
        <div className="cosmic-map-selected-record">
          <span className="cosmic-map-selected-meta">{record.type || 'Object'} · {record.source}</span>
          <h3 data-testid={`text-cosmic-map-selected-${record.id}`}>{record.name}</h3>
          <dl className="cosmic-map-facts">
            <div className="cosmic-map-fact"><dt>Right ascension</dt><dd>{formatDegrees(record.coordinates?.rightAscension)}</dd></div>
            <div className="cosmic-map-fact"><dt>Declination</dt><dd>{formatDegrees(record.coordinates?.declination)}</dd></div>
            <div className="cosmic-map-fact"><dt>Distance</dt><dd>{formatDistance(record)}</dd></div>
            <div className="cosmic-map-fact"><dt>Catalog ID</dt><dd>{record.sourceId || 'Not available'}</dd></div>
          </dl>
          <p className="cosmic-map-record-note"><strong>Coordinate frame:</strong> {record.coordinates?.coordinateSystem || 'Not returned'} · {formatCoordinatePair(record)}</p>
          {!isValidSkyCoordinate(record) && (
            <p className="cosmic-map-record-note"><Crosshair size={13} aria-hidden="true" /> This source record has no valid RA/Dec pair for plotting.</p>
          )}
          {onOpenObject && (
            <div className="cosmic-map-selected-actions">
              <button type="button" className="cosmic-map-button" onClick={() => onOpenObject(record)} data-testid={`button-cosmic-map-open-${record.id}`}>
                Open Atlas record <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="cosmic-map-selected-empty">
          <Crosshair size={20} aria-hidden="true" />
          <strong>Select a plotted record</strong>
          <span>Choose a marker to inspect normalized source fields and coordinates.</span>
        </div>
      )}
    </aside>
  );
}
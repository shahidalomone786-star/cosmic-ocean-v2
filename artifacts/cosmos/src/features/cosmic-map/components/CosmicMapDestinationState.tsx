import { ArrowLeft, ArrowUpRight, Crosshair, Database, Orbit, Radio } from 'lucide-react';
import type { AstronomyObject } from '@workspace/api-client-react';
import { formatCoordinatePair, formatDegrees } from '../coordinates';

type CosmicMapDestinationStateProps = {
  record: AstronomyObject;
  onOpenObject?: (record: AstronomyObject) => void;
  onBack: () => void;
};

function formatDistance(record: AstronomyObject): string {
  if (record.distance?.value == null) return 'Not available';
  return `${record.distance.value} ${record.distance.unit ?? ''}`.trim();
}

function scientificIdentifier(record: AstronomyObject): string {
  const metadata = record.metadata ?? {};
  const candidateKeys = ['scientificIdentifier', 'scientific_id', 'identifier', 'catalogId'];
  for (const key of candidateKeys) {
    const value = metadata[key];
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return record.sourceId || 'Not available';
}

export default function CosmicMapDestinationState({
  record,
  onOpenObject,
  onBack,
}: CosmicMapDestinationStateProps) {
  return (
    <section className="cosmic-map-destination" aria-labelledby="cosmic-map-destination-title" data-testid="state-cosmic-map-destination">
      <div className="cosmic-map-destination-visual" aria-hidden="true">
        <div className="cosmic-map-destination-orbit cosmic-map-destination-orbit-one" />
        <div className="cosmic-map-destination-orbit cosmic-map-destination-orbit-two" />
        <div className="cosmic-map-destination-crosshair"><Crosshair size={24} strokeWidth={1} /></div>
        <span className="cosmic-map-destination-axis axis-top">+90°</span>
        <span className="cosmic-map-destination-axis axis-bottom">−90°</span>
        <span className="cosmic-map-destination-axis axis-left">0°</span>
        <span className="cosmic-map-destination-axis axis-right">360°</span>
        <span className="cosmic-map-destination-readout"><Radio size={12} /> DESTINATION LOCKED</span>
      </div>

      <div className="cosmic-map-destination-copy">
        <div className="cosmic-map-destination-kicker"><Orbit size={13} /> Cosmic navigation / object solution</div>
        <p className="cosmic-map-destination-label">You are here in the archive</p>
        <h2 id="cosmic-map-destination-title" data-testid={`text-cosmic-map-destination-name-${record.id}`}>{record.name}</h2>
        <p className="cosmic-map-destination-type">{record.type || 'Astronomical object'} · {record.category}</p>

        <dl className="cosmic-map-destination-facts">
          <div><dt>Distance</dt><dd>{formatDistance(record)}</dd></div>
          <div><dt>Coordinates</dt><dd>{formatCoordinatePair(record)}</dd></div>
          <div><dt>Right ascension</dt><dd>{formatDegrees(record.coordinates?.rightAscension)}</dd></div>
          <div><dt>Declination</dt><dd>{formatDegrees(record.coordinates?.declination)}</dd></div>
          <div><dt>Source</dt><dd>{record.source}</dd></div>
          <div><dt>Scientific identifier</dt><dd>{scientificIdentifier(record)}</dd></div>
        </dl>

        <div className="cosmic-map-destination-actions">
          {onOpenObject && (
            <button type="button" className="cosmic-map-button" onClick={() => onOpenObject(record)} data-testid={`button-cosmic-map-destination-atlas-${record.id}`}>
              OPEN IN COSMIC ATLAS <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="cosmic-map-button is-quiet" onClick={onBack} data-testid="button-cosmic-map-back">
            <ArrowLeft size={14} aria-hidden="true" /> BACK TO MAP
          </button>
        </div>
        <p className="cosmic-map-destination-source"><Database size={12} /> No position was inferred. This destination uses the returned catalog record.</p>
      </div>
    </section>
  );
}
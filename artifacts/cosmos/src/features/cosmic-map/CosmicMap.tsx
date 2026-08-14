import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Crosshair, Database, Orbit, RotateCw, Search, ShieldCheck } from 'lucide-react';
import type { AstronomyObject, AstronomySearchParams } from '@workspace/api-client-react';
import CosmicMapSelectionPanel from './components/CosmicMapSelectionPanel';
import CosmicMapSkyPlot from './components/CosmicMapSkyPlot';
import { useCosmicMapData } from './hooks/useCosmicMapData';
import { DEFAULT_COSMIC_MAP_QUERY } from './services/cosmicMapService';
import type { MapViewport } from './types';

type CosmicMapProps = {
  query?: string;
  mapFocus?: string;
  category?: AstronomySearchParams['category'];
  onOpenObject?: (record: AstronomyObject) => void;
};

function readUrlValue(name: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name)?.trim() ?? '';
}

export default function CosmicMap({
  query,
  mapFocus,
  category,
  onOpenObject,
}: CosmicMapProps) {
  const urlQuery = useMemo(() => readUrlValue('mapQuery') || readUrlValue('q'), []);
  const urlFocus = useMemo(() => readUrlValue('mapFocus'), []);
  const initialQuery = query?.trim() || urlQuery || DEFAULT_COSMIC_MAP_QUERY;
  const focusId = mapFocus?.trim() || urlFocus || undefined;
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(focusId ?? null);
  const [viewport, setViewport] = useState<MapViewport>({ zoom: 1, pan: { x: 0, y: 0 } });
  const mapData = useCosmicMapData({ query: submittedQuery, category, focusId, viewport });

  useEffect(() => {
    if (query?.trim()) {
      setSearchValue(query.trim());
      setSubmittedQuery(query.trim());
    }
  }, [query]);

  useEffect(() => {
    if (focusId && mapData.records.some(record => record.id === focusId)) {
      setSelectedObjectId(focusId);
      return;
    }
    if (selectedObjectId && !mapData.records.some(record => record.id === selectedObjectId)) {
      setSelectedObjectId(null);
    }
  }, [focusId, mapData.records, selectedObjectId]);

  const selectedRecord = useMemo(
    () => mapData.records.find(record => record.id === selectedObjectId) ?? null,
    [mapData.records, selectedObjectId],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchValue.trim();
     const normalizedQuery = nextQuery.length >= 2 ? nextQuery : DEFAULT_COSMIC_MAP_QUERY;
    setSearchValue(normalizedQuery);
    setSubmittedQuery(normalizedQuery);
    setSelectedObjectId(null);
  };

  const statusCopy = mapData.isLoading
    ? 'Reading archive coordinates'
    : mapData.isFetching
      ? 'Reading current viewport'
    : mapData.isError
      ? 'Archive response unavailable'
      : `${mapData.positionedRecords.length} positioned / ${mapData.cacheSize} cached`;

  return (
    <section className="cosmic-map" aria-labelledby="cosmic-map-title" data-testid="section-cosmic-map">
      <div className="cosmic-map-shell">
        <header className="cosmic-map-topbar">
          <div className="cosmic-map-wordmark"><Orbit size={14} strokeWidth={1.5} aria-hidden="true" /> Cosmic Ocean / Map</div>
          <span className="cosmic-map-index">Instrument / 02</span>
        </header>

        <div className="cosmic-map-hero">
          <div>
            <p className="cosmic-map-eyebrow">Precision sky instrument</p>
            <h1 id="cosmic-map-title">A measured window<br /><em>on the sky.</em></h1>
            <p className="cosmic-map-intro">
              View real normalized Cosmic Atlas records by their returned right ascension and declination.
              No fictional constellations. No implied physical scale. Just a quiet coordinate window into the archive.
            </p>
          </div>
          <aside className="cosmic-map-trust" aria-label="Data provenance">
            <div className="cosmic-map-trust-heading"><ShieldCheck size={15} aria-hidden="true" /> Source-grounded view</div>
            <p>Markers appear only when an Atlas record supplies a valid RA/Dec pair. Missing measurements stay missing.</p>
           <small>Bounded query · {mapData.sourceStatus.length ? `${mapData.sourceStatus.length} source statuses` : 'source status pending'}</small>
          </aside>
        </div>

        <form className="cosmic-map-querybar" onSubmit={handleSubmit} role="search">
          <label htmlFor="cosmic-map-query">
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <input
              id="cosmic-map-query"
              type="search"
              value={searchValue}
              onChange={event => setSearchValue(event.target.value)}
              placeholder="Search a catalog name, object, or type"
              autoComplete="off"
              data-testid="input-cosmic-map-query"
            />
          </label>
          <button type="submit" className="cosmic-map-button" data-testid="button-cosmic-map-query">
            Recalibrate <RotateCw size={14} aria-hidden="true" />
          </button>
        </form>

        <div className="cosmic-map-data-strip" role="status" data-testid="status-cosmic-map-data">
          <span className="cosmic-map-live"><i aria-hidden="true" /> {statusCopy}</span>
            <span>Query <strong>{submittedQuery || 'all coordinate-bearing records'}</strong></span>
           {mapData.truncated && <span>Provider window truncated at request limit</span>}
          {mapData.invalidCoordinateCount > 0 && <span>{mapData.invalidCoordinateCount} record{mapData.invalidCoordinateCount === 1 ? '' : 's'} withheld: invalid coordinates</span>}
        </div>

        <div className="cosmic-map-workspace">
          <section className="cosmic-map-plot-card" aria-labelledby="cosmic-map-plot-title">
            <div className="cosmic-map-plot-card-heading" hidden>
              <h2 id="cosmic-map-plot-title">Right ascension and declination plot</h2>
            </div>
            {(mapData.isLoading || (mapData.isFetching && mapData.positionedRecords.length === 0)) ? (
              <div className="cosmic-map-skeleton" aria-label="Loading coordinate projection" data-testid="loading-cosmic-map-plot" />
            ) : mapData.isError && mapData.positionedRecords.length === 0 ? (
              <div className="cosmic-map-state cosmic-map-error" role="alert">
                <Database size={21} aria-hidden="true" />
                <strong>Scientific data could not be read.</strong>
                <span>The bounded archive request did not complete. Try the query again.</span>
                <button type="button" className="cosmic-map-button is-quiet" onClick={() => void mapData.refetch()} data-testid="button-cosmic-map-retry">
                  Retry request <RotateCw size={13} aria-hidden="true" />
                </button>
              </div>
            ) : mapData.positionedRecords.length === 0 ? (
              <div className="cosmic-map-state" data-testid="empty-cosmic-map-plot">
                <CrosshairIcon />
                <strong>No valid positions returned.</strong>
                <span>This query returned no records with both right ascension and declination.</span>
              </div>
            ) : (
              <CosmicMapSkyPlot
                 records={mapData.records}
                selectedObjectId={selectedObjectId}
                onSelect={record => setSelectedObjectId(record.id)}
                 onViewportChange={setViewport}
                 isFetching={mapData.isFetching}
                 requestError={mapData.isError}
                 truncated={mapData.truncated}
              />
            )}
          </section>

          <div className="cosmic-map-sidebar">
            <CosmicMapSelectionPanel record={selectedRecord} onOpenObject={onOpenObject} />
            <section className="cosmic-map-panel" aria-labelledby="cosmic-map-method-title">
              <div className="cosmic-map-panel-heading">
                <div>
                  <p className="cosmic-map-panel-kicker">Method note</p>
                  <h2 id="cosmic-map-method-title">Read the <em>frame</em></h2>
                </div>
                <Database size={16} aria-hidden="true" />
              </div>
              <p className="cosmic-map-record-note">
                Right ascension runs from 0° to 360° along the horizontal axis. Declination runs from +90° to −90° vertically. This is a projection of catalog coordinates, not a distance model.
              </p>
               <p className="cosmic-map-footer-note"><ShieldCheck size={13} aria-hidden="true" /> Viewport requests are debounced; returned records remain in a bounded spatial cache.</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function CrosshairIcon() {
  return <span aria-hidden="true"><Crosshair size={21} /></span>;
}
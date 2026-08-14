import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Database,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  Orbit,
  RotateCw,
  ScanLine,
  Telescope,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getAstronomyObjectQueryKey, useAstronomyObject } from '@workspace/api-client-react';

type AstronomyObjectViewProps = {
  objectId: string;
  lm?: boolean;
};

function valueOrUnavailable(value: unknown): string {
  return value === null || value === undefined || value === '' ? 'Not available' : String(value);
}

function labelize(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, character => character.toUpperCase());
}

function formatCoordinate(value: number | null | undefined, suffix: string): string {
  return value === null || value === undefined ? 'Not available' : `${value}° ${suffix}`;
}

function metadataEntries(metadata: Record<string, unknown>) {
  return Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== '');
}

export default function AstronomyObjectView({ objectId, lm = false }: AstronomyObjectViewProps) {
  const [location] = useLocation();
  const query = useAstronomyObject(objectId, {
    query: {
      queryKey: getAstronomyObjectQueryKey(objectId),
      enabled: objectId.length > 0,
      staleTime: 10 * 60 * 1000,
      retry: 1,
    },
  });
  const item = query.data?.item;
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [rawOpen, setRawOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const returnTo = new URLSearchParams(location.split('?')[1] ?? '').get('returnTo');
  const backHref = returnTo && returnTo.startsWith('/') ? returnTo : '/atlas';

  const metadata = useMemo(() => metadataEntries(item?.metadata ?? {}), [item?.metadata]);
  const discoveryEntries = useMemo(
    () => metadata.filter(([key]) => /discover|found|year|date/i.test(key)),
    [metadata],
  );
  const physicalEntries = useMemo(
    () => metadata.filter(([key]) => !/discover|found|year|date/i.test(key)),
    [metadata],
  );

  useEffect(() => {
    if (activeImage !== null && (!item?.imageReferences.length || activeImage >= item.imageReferences.length)) {
      setActiveImage(null);
    }
  }, [activeImage, item?.imageReferences]);

  useEffect(() => {
    if (activeImage === null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveImage(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [activeImage]);

  const copyRawData = async () => {
    if (!item) return;
    await navigator.clipboard?.writeText(JSON.stringify(item, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const locateOnCosmicMap = () => {
    if (!item) return;
    const params = new URLSearchParams({ mapFocus: item.id, mapQuery: item.name });
    window.history.pushState({}, '', `/?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section className={`cosmic-atlas-surface is-standalone ${lm ? 'is-light' : ''} cosmic-atlas-object-surface`} aria-labelledby="atlas-object-title">
      <div className="cosmic-atlas-shell cosmic-atlas-object-shell">
        <header className="cosmic-atlas-topbar">
          <Link href={backHref} className="cosmic-atlas-back-link" data-testid="link-object-back">
            <ArrowLeft size={14} aria-hidden="true" /> Atlas index
          </Link>
          <div className="cosmic-atlas-wordmark"><Orbit size={14} aria-hidden="true" /> Cosmic Ocean / Atlas</div>
          <span className="cosmic-atlas-index">{item ? `Object / ${item.source}` : 'Object / loading'}</span>
        </header>

        {query.isLoading && (
          <div className="cosmic-atlas-object-loading" aria-label="Loading astronomical record">
            <div className="cosmic-atlas-object-loading-mark"><Orbit size={26} aria-hidden="true" /></div>
            <div className="cosmic-atlas-object-loading-lines"><span /><span /><span /><span /></div>
            <p>Reading source record</p>
          </div>
        )}
        {query.isError && !query.isLoading && (
          <div className="cosmic-atlas-state-panel cosmic-atlas-object-state-panel" role="alert">
            <strong>Scientific data temporarily unavailable.</strong>
            <span>This source record could not be loaded.</span>
            <button type="button" onClick={() => query.refetch()} data-testid="button-object-retry"><RotateCw size={13} aria-hidden="true" /> Retry</button>
          </div>
        )}
        {!query.isLoading && !query.isError && !item && (
          <div className="cosmic-atlas-state-panel cosmic-atlas-object-state-panel">
            <strong>No astronomical object found.</strong>
            <span>This stable source ID is not available in the archive.</span>
            <Link href="/atlas" className="cosmic-atlas-inline-link" data-testid="link-object-empty-back">Return to Atlas <ArrowLeft size={13} aria-hidden="true" /></Link>
          </div>
        )}

        {item && (
          <article className="cosmic-atlas-object-content">
            <div className="cosmic-atlas-object-hero">
              <div className="cosmic-atlas-object-hero-copy">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Overview / {item.source} / {item.sourceId}</p>
                <h1 id="atlas-object-title" data-testid="text-object-name">{item.name}</h1>
                <div className="cosmic-atlas-object-tagline">
                  <span>{item.type || 'Not available'}</span>
                  <span>{item.category}</span>
                </div>
                <p className="cosmic-atlas-object-description">{item.description || 'Not available'}</p>
              </div>
              <div className="cosmic-atlas-object-orb" aria-hidden="true">
                <span /><i /><b />
                <small>normalized record</small>
              </div>
            </div>

            <div className="cosmic-atlas-object-rail" aria-label="Record navigation">
              <span><ScanLine size={13} aria-hidden="true" /> Provider normalized</span>
              <span><Database size={13} aria-hidden="true" /> {item.source}</span>
              <span><Telescope size={13} aria-hidden="true" /> Stable source ID</span>
               {item.coordinates?.rightAscension != null && item.coordinates?.declination != null && (
                 <button type="button" className="cosmic-atlas-object-map-link" onClick={locateOnCosmicMap} data-testid="button-object-locate-map">
                   <MapPin size={13} aria-hidden="true" /> Locate on Cosmic Map
                 </button>
               )}
            </div>

            <section className="cosmic-atlas-object-section" aria-labelledby="object-identification-title">
              <div className="cosmic-atlas-section-number">01</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Identification</p>
                <h2 id="object-identification-title">How the archive <em>names it</em></h2>
                <div className="cosmic-atlas-object-grid">
                  <section><span>Canonical name</span><strong>{item.name}</strong></section>
                  <section><span>Object type</span><strong>{item.type || 'Not available'}</strong></section>
                  <section><span>Category</span><strong>{item.category}</strong></section>
                  <section><span>Source ID</span><strong>{item.sourceId}</strong></section>
                </div>
                <div className="cosmic-atlas-aliases">
                  <span>Aliases</span>
                  {item.aliases.length ? item.aliases.map(alias => <span key={alias}>{alias}</span>) : <strong>Not available</strong>}
                </div>
              </div>
            </section>

            {(item.coordinates || item.distance) && <section className="cosmic-atlas-object-section" aria-labelledby="object-location-title">
              <div className="cosmic-atlas-section-number">02</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Location</p>
                <h2 id="object-location-title">Pinned in the <em>sky</em></h2>
                <div className="cosmic-atlas-location-grid">
                  <div className="cosmic-atlas-coordinate-plate">
                    <MapPin size={17} aria-hidden="true" />
                    <div><span>Right ascension</span><strong>{formatCoordinate(item.coordinates?.rightAscension, 'RA')}</strong></div>
                    <div><span>Declination</span><strong>{formatCoordinate(item.coordinates?.declination, 'Dec')}</strong></div>
                    <small>{item.coordinates?.coordinateSystem || 'Coordinate system not available'} · epoch {valueOrUnavailable(item.coordinates?.epoch)}</small>
                  </div>
                  <div className="cosmic-atlas-distance-plate">
                    <span>Distance from Earth</span>
                    <strong>{valueOrUnavailable(item.distance?.value)}</strong>
                    <small>{item.distance?.unit || 'Unit not available'}{item.distance?.uncertainty != null ? ` · ±${item.distance.uncertainty}` : ''}</small>
                  </div>
                </div>
              </div>
            </section>}

            {physicalEntries.length > 0 && <section className="cosmic-atlas-object-section" aria-labelledby="object-physical-title">
              <div className="cosmic-atlas-section-number">03</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Physical properties</p>
                <h2 id="object-physical-title">Measurements, <em>as returned</em></h2>
                <dl className="cosmic-atlas-property-list">{physicalEntries.map(([key, value]) => <div key={key}><dt>{labelize(key)}</dt><dd>{valueOrUnavailable(value)}</dd></div>)}</dl>
              </div>
            </section>}

            {item.observationReferences.length > 0 && <section className="cosmic-atlas-object-section" aria-labelledby="object-observations-title">
              <div className="cosmic-atlas-section-number">04</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Observations</p>
                <h2 id="object-observations-title">Evidence in the <em>archive</em></h2>
                <div className="cosmic-atlas-reference-list">{item.observationReferences.map(reference => <a key={reference} href={reference} target="_blank" rel="noreferrer" data-testid={`link-object-observation-${reference}`}><span>Observation record</span><strong>{reference}</strong><ExternalLink size={13} aria-hidden="true" /></a>)}</div>
              </div>
            </section>}

            {discoveryEntries.length > 0 && <section className="cosmic-atlas-object-section" aria-labelledby="object-discovery-title">
              <div className="cosmic-atlas-section-number">05</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Discovery</p>
                <h2 id="object-discovery-title">The record’s <em>timeline</em></h2>
                <dl className="cosmic-atlas-property-list cosmic-atlas-discovery-list">{discoveryEntries.map(([key, value]) => <div key={key}><dt>{labelize(key)}</dt><dd>{valueOrUnavailable(value)}</dd></div>)}</dl>
              </div>
            </section>}

            <section className="cosmic-atlas-object-section" aria-labelledby="object-sources-title">
              <div className="cosmic-atlas-section-number">06</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Sources</p>
                <h2 id="object-sources-title">Trace it back to <em>origin</em></h2>
                <div className="cosmic-atlas-source-card">
                  <div><span>Normalized by</span><strong>{item.source}</strong></div>
                  <div><span>Provider identifier</span><strong>{item.sourceId}</strong></div>
                  {(query.data?.sourceStatus ?? []).map(status => <div key={status.source}><span>{status.source}</span><strong className={status.status === 'ready' ? 'is-ready' : 'is-unavailable'}>{status.status}</strong></div>)}
                </div>
              </div>
            </section>

            {item.imageReferences.length > 0 && <section className="cosmic-atlas-object-section cosmic-atlas-images-section" aria-labelledby="object-images-title">
              <div className="cosmic-atlas-section-number">07</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Images</p>
                <h2 id="object-images-title">A view from the <em>archive</em></h2>
                <div className="cosmic-atlas-image-grid">{item.imageReferences.map((reference, index) => <button type="button" key={reference} onClick={() => setActiveImage(index)} className="cosmic-atlas-image-card" data-testid={`button-object-image-${index}`} disabled={Boolean(imageErrors[reference])}>
                  {!loadedImages[reference] && !imageErrors[reference] && <span className="cosmic-atlas-image-status">Loading source image</span>}
                  {imageErrors[reference] ? <span className="cosmic-atlas-image-status is-error">Source image unavailable</span> : <img src={reference} alt={`${item.name} source image ${index + 1}`} loading="lazy" onLoad={() => setLoadedImages(current => ({ ...current, [reference]: true }))} onError={() => setImageErrors(current => ({ ...current, [reference]: true }))} />}
                  {!imageErrors[reference] && <span><ImageIcon size={13} aria-hidden="true" /> {item.source} image {index + 1} <Maximize2 size={13} aria-hidden="true" /></span>}
                </button>)}</div>
              </div>
            </section>}

            {item.relatedObjects.length > 0 && <section className="cosmic-atlas-object-section" aria-labelledby="object-related-title">
              <div className="cosmic-atlas-section-number">08</div>
              <div className="cosmic-atlas-section-body">
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Related objects</p>
                <h2 id="object-related-title">Same archive, <em>shared system</em></h2>
                <div className="cosmic-atlas-related-grid">{item.relatedObjects.map(related => (
                  <Link key={related.id} href={`/atlas/object/${encodeURIComponent(related.id)}?returnTo=${encodeURIComponent(backHref)}`} className="cosmic-atlas-related-card" data-testid={`link-related-object-${related.id}`}>
                    <span>{related.source} / {related.type || 'Not available'}</span>
                    <strong>{related.name}</strong>
                    <small>{related.distance?.value != null ? `${related.distance.value} ${related.distance.unit ?? ''}` : 'Distance not available'}</small>
                    <ExternalLink size={13} aria-hidden="true" />
                  </Link>
                ))}</div>
              </div>
            </section>}

            <section className="cosmic-atlas-raw-section" aria-labelledby="object-raw-title">
              <button type="button" className="cosmic-atlas-raw-toggle" onClick={() => setRawOpen(current => !current)} aria-expanded={rawOpen} data-testid="button-object-toggle-raw">
                <span><Database size={14} aria-hidden="true" /> Raw source data</span><ChevronDown size={15} aria-hidden="true" className={rawOpen ? 'is-open' : ''} />
              </button>
              {rawOpen && <div className="cosmic-atlas-raw-content"><div className="cosmic-atlas-raw-heading"><span id="object-raw-title">Normalized object payload</span><button type="button" onClick={copyRawData} data-testid="button-object-copy-raw">{copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copied ? 'Copied' : 'Copy JSON'}</button></div><pre>{JSON.stringify(item, null, 2)}</pre></div>}
            </section>
          </article>
        )}
        <p className="cosmic-atlas-route-hint">Stable route / provider preserved / browser history enabled</p>
      </div>

      {activeImage !== null && item?.imageReferences[activeImage] && (
        <div className="cosmic-atlas-image-viewer" role="dialog" aria-modal="true" aria-label="Source image viewer">
          <button type="button" className="cosmic-atlas-image-viewer-backdrop" onClick={() => setActiveImage(null)} aria-label="Close image viewer" data-testid="button-object-close-image" />
          <div className="cosmic-atlas-image-viewer-shell">
            <div className="cosmic-atlas-image-viewer-top"><span>Image {activeImage + 1} / {item.imageReferences.length}</span><button type="button" onClick={() => setActiveImage(null)} aria-label="Close image viewer" data-testid="button-object-close-image-top"><X size={18} aria-hidden="true" /></button></div>
            <div className="cosmic-atlas-image-viewer-stage"><img src={item.imageReferences[activeImage]} alt={`${item.name} source image ${activeImage + 1}`} /><a href={item.imageReferences[activeImage]} target="_blank" rel="noreferrer" data-testid="link-object-open-image-source">Open original <ExternalLink size={13} aria-hidden="true" /></a></div>
          </div>
        </div>
      )}
    </section>
  );
}
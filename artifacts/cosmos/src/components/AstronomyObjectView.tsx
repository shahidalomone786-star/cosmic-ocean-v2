import { ArrowLeft, ExternalLink, Orbit, RotateCw } from 'lucide-react';
import { Link } from 'wouter';
import { getAstronomyObjectQueryKey, useAstronomyObject } from '@workspace/api-client-react';

type AstronomyObjectViewProps = {
  objectId: string;
  lm?: boolean;
};

function valueOrUnavailable(value: unknown): string {
  return value === null || value === undefined || value === '' ? 'Not available' : String(value);
}

export default function AstronomyObjectView({ objectId, lm = false }: AstronomyObjectViewProps) {
  const query = useAstronomyObject(objectId, {
    query: {
      queryKey: getAstronomyObjectQueryKey(objectId),
      enabled: objectId.length > 0,
      staleTime: 10 * 60 * 1000,
      retry: 1,
    },
  });
  const item = query.data?.item;

  return (
    <section className={`cosmic-atlas-surface is-standalone ${lm ? 'is-light' : ''}`} aria-labelledby="atlas-object-title">
      <div className="cosmic-atlas-shell cosmic-atlas-object-shell">
        <header className="cosmic-atlas-topbar">
          <Link href="/atlas" className="cosmic-atlas-back-link"><ArrowLeft size={14} /> Atlas index</Link>
          <span className="cosmic-atlas-index">Object / {item?.source ?? objectId.split(':')[0] ?? 'archive'}</span>
        </header>

        {query.isLoading && (
          <div className="cosmic-atlas-object-state"><span className="cosmic-atlas-object-spinner" /> Loading scientific record…</div>
        )}
        {query.isError && !query.isLoading && (
          <div className="cosmic-atlas-state-panel" role="alert">
            <strong>Scientific data temporarily unavailable.</strong>
            <span>This source record could not be loaded.</span>
            <button type="button" onClick={() => query.refetch()}><RotateCw size={13} /> Retry</button>
          </div>
        )}
        {!query.isLoading && !query.isError && !item && (
          <div className="cosmic-atlas-state-panel"><strong>No astronomical objects found.</strong><span>This stable source ID is not available in the archive.</span></div>
        )}
        {item && (
          <article className="cosmic-atlas-object-content">
            <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> {item.source} / {item.sourceId}</p>
            <h1 id="atlas-object-title">{item.name}</h1>
            <p className="cosmic-atlas-object-type">{item.type || 'Not available'} · {item.category}</p>
            <p className="cosmic-atlas-object-description">{item.description || 'Not available'}</p>
            <div className="cosmic-atlas-object-grid">
              <section><span>Coordinates</span><strong>{item.coordinates ? `${valueOrUnavailable(item.coordinates.rightAscension)} RA · ${valueOrUnavailable(item.coordinates.declination)} Dec` : 'Not available'}</strong></section>
              <section><span>Distance</span><strong>{item.distance ? `${valueOrUnavailable(item.distance.value)} ${valueOrUnavailable(item.distance.unit)}` : 'Not available'}</strong></section>
              <section><span>Aliases</span><strong>{item.aliases.length ? item.aliases.join(', ') : 'Not available'}</strong></section>
              <section><span>Source ID</span><strong>{item.sourceId}</strong></section>
            </div>
            <section className="cosmic-atlas-metadata">
              <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Provider metadata</p>
              <dl>{Object.entries(item.metadata).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => (
                <div key={key}><dt>{key.replace(/[A-Z]/g, match => ` ${match}`).replace(/^./, match => match.toUpperCase())}</dt><dd>{valueOrUnavailable(value)}</dd></div>
              ))}</dl>
            </section>
            <div className="cosmic-atlas-object-links">
              {item.observationReferences.map(reference => <a key={reference} href={reference} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Source record</a>)}
              {item.imageReferences.map(reference => <a key={reference} href={reference} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Image reference</a>)}
            </div>
          </article>
        )}
        <p className="cosmic-atlas-route-hint">Stable route / provider preserved / browser history enabled</p>
      </div>
    </section>
  );
}
import { ArrowLeft, ArrowUpRight, Telescope } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getObservatory, observatories, type Observatory } from '../data/observatories';

type GreatObservatoriesProps = {
  lm: boolean;
};

function ObservatoryCard({ observatory, index, lm }: { observatory: Observatory; index: number; lm: boolean }) {
  return (
    <Link
      href={`/observatories/${observatory.id}`}
      className={`great-observatories-card ${lm ? 'is-light' : ''}`}
      data-testid={`card-observatory-${observatory.id}`}
      aria-label={`Explore ${observatory.name}`}
    >
      <div className="great-observatories-card-media">
        <img
          src={observatory.cover}
          alt={`${observatory.name} instrument`}
          className="great-observatories-card-image"
          data-testid={`img-observatory-cover-${observatory.id}`}
          loading={index < 4 ? 'eager' : 'lazy'}
        />
        <div className="great-observatories-card-shade" />
        <span className="great-observatories-card-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="great-observatories-card-open" aria-hidden="true">
          <ArrowUpRight size={15} strokeWidth={1.5} />
        </span>
        <div className="great-observatories-card-meta">
          <span className="great-observatories-card-category" data-testid={`text-observatory-category-${observatory.id}`}>
            {observatory.category}
          </span>
          <h3 data-testid={`text-observatory-name-${observatory.id}`}>{observatory.name}</h3>
        </div>
      </div>
      <div className="great-observatories-card-footer">
        <span>{observatory.shortName}</span>
        <span className="great-observatories-card-rule" />
        <span className="great-observatories-card-mark" aria-hidden="true">↗</span>
      </div>
    </Link>
  );
}

export function GreatObservatories({ lm }: GreatObservatoriesProps) {
  return (
    <section
      className={`great-observatories-surface ${lm ? 'is-light' : ''}`}
      aria-labelledby="great-observatories-title"
      data-testid="section-great-observatories"
    >
      <div className="great-observatories-grid-glow" aria-hidden="true" />
      <div className="great-observatories-inner">
        <header className="great-observatories-heading">
          <div>
            <p className="great-observatories-eyebrow">
              <span className="great-observatories-eyebrow-line" aria-hidden="true" />
              The Great Observatories · Part 01
            </p>
            <h2 id="great-observatories-title">
              <span>THE GREAT</span>
              <em>OBSERVATORIES</em>
            </h2>
          </div>
          <div className="great-observatories-intro">
            <div className="great-observatories-intro-rule" aria-hidden="true" />
            <p>Explore the eyes that reveal the universe.</p>
            <p className="great-observatories-supporting-copy">
              Discover the missions and observatories that have transformed our view of space across every wavelength.
            </p>
            <span className="great-observatories-count">19 instruments · 01—19</span>
          </div>
        </header>

        <div className="great-observatories-spectrum" aria-hidden="true">
          <span>Radio</span><i /><span>Infrared</span><i /><span>Visible</span><i /><span>UV</span><i /><span>X-ray</span><i /><span>Gamma</span>
        </div>

        <div className="great-observatories-card-grid">
          {observatories.map((observatory, index) => (
            <ObservatoryCard key={observatory.id} observatory={observatory} index={index} lm={lm} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ObservatoryExplorer({ id, lm }: { id: string; lm: boolean }) {
  const [, setLocation] = useLocation();
  const observatory = getObservatory(id);

  if (!observatory) {
    return (
      <main className={`great-observatory-explorer ${lm ? 'is-light' : ''}`}>
        <div className="great-observatory-explorer-empty">
          <p className="great-observatories-eyebrow">The Great Observatories</p>
          <h1>Instrument not found.</h1>
          <button type="button" className="great-observatory-back" onClick={() => setLocation('/')} data-testid="button-observatory-back">
            <ArrowLeft size={16} /> Return to Cosmic Ocean
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`great-observatory-explorer ${lm ? 'is-light' : ''}`} data-testid={`view-observatory-${observatory.id}`}>
      <div className="great-observatory-explorer-orbit" aria-hidden="true" />
      <div className="great-observatory-explorer-shell">
        <header className="great-observatory-explorer-topbar">
          <button
            type="button"
            className="great-observatory-back"
            onClick={() => setLocation('/')}
            data-testid="button-observatory-back"
          >
            <ArrowLeft size={16} strokeWidth={1.7} />
            <span>Back to collection</span>
          </button>
          <span className="great-observatory-wordmark"><Telescope size={16} strokeWidth={1.4} /> Cosmic Ocean / Observatories</span>
          <span className="great-observatory-top-index">{observatory.shortName} · {observatory.id.toUpperCase()}</span>
        </header>

        <div className="great-observatory-explorer-content">
          <div className="great-observatory-explorer-media">
            <img
              src={observatory.cover}
              alt={`${observatory.name} instrument`}
              data-testid={`img-observatory-explorer-${observatory.id}`}
            />
            <span className="great-observatory-explorer-media-label">Archive plate / {observatory.shortName}</span>
          </div>
          <article className="great-observatory-explorer-copy">
            <p className="great-observatory-eyebrow"><span className="great-observatories-eyebrow-line" aria-hidden="true" /> Observatory {observatory.id.toUpperCase()}</p>
            <p className="great-observatory-category" data-testid={`text-observatory-explorer-category-${observatory.id}`}>{observatory.category}</p>
            <h1 data-testid={`text-observatory-explorer-name-${observatory.id}`}>{observatory.name}</h1>
            <p className="great-observatory-description" data-testid={`text-observatory-explorer-description-${observatory.id}`}>
              {observatory.shortDescription}
            </p>
            <div className="great-observatory-explorer-divider" />
            <div className="great-observatory-explorer-note">
              <span>Across the spectrum</span>
              <strong>Part 01 / Instrument study</strong>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
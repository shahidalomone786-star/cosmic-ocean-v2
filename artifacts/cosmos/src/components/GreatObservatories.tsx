import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, ImageOff, LoaderCircle, Telescope, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getObservatory, observatories, type Observatory } from '../data/observatories';
import { fetchObservatoryArchive, type ObservatoryArchiveImage } from '../services/observatoryApi';

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

function formatArchiveDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function ArchiveSkeleton() {
  return (
    <div className="great-observatory-archive-grid" aria-label="Loading observatory archive" data-testid="observatory-archive-skeleton">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="great-observatory-archive-skeleton" key={index} aria-hidden="true">
          <div className="great-observatory-archive-skeleton-image" />
          <div className="great-observatory-archive-skeleton-line is-long" />
          <div className="great-observatory-archive-skeleton-line" />
        </div>
      ))}
    </div>
  );
}

function ArchiveFailure({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="great-observatory-archive-state" data-testid="observatory-archive-error">
      <ImageOff size={21} strokeWidth={1.4} aria-hidden="true" />
      <p>Observatory archive temporarily unavailable.</p>
      <button type="button" className="great-observatory-archive-retry" onClick={onRetry} data-testid="button-observatory-archive-retry">
        Retry
      </button>
    </div>
  );
}

function ArchiveEmpty() {
  return (
    <div className="great-observatory-archive-state" data-testid="observatory-archive-empty">
      <Telescope size={21} strokeWidth={1.4} aria-hidden="true" />
      <p>No archive plates were found for this observatory.</p>
      <span>Try again later for newly indexed mission material.</span>
    </div>
  );
}

function ArchiveLightbox({
  images,
  selectedIndex,
  onClose,
  onSelect,
}: {
  images: ObservatoryArchiveImage[];
  selectedIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const image = images[selectedIndex];
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setIsImageLoading(true);
    setImageError(false);
  }, [image?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && selectedIndex > 0) onSelect(selectedIndex - 1);
      if (event.key === 'ArrowRight' && selectedIndex < images.length - 1) onSelect(selectedIndex + 1);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose, onSelect, selectedIndex]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!image) return null;

  const date = formatArchiveDate(image.date);
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex < images.length - 1;

  return (
    <div className="great-observatory-lightbox" role="dialog" aria-modal="true" aria-label={`${image.title} archive image`} data-testid="observatory-lightbox">
      <button type="button" className="great-observatory-lightbox-backdrop" onClick={onClose} aria-label="Close image viewer" />
      <div className="great-observatory-lightbox-shell">
        <header className="great-observatory-lightbox-topbar">
          <span className="great-observatory-lightbox-count">
            Plate {String(selectedIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
          </span>
          <button type="button" className="great-observatory-lightbox-close" onClick={onClose} aria-label="Close image viewer" data-testid="button-observatory-lightbox-close">
            <X size={21} strokeWidth={1.4} />
          </button>
        </header>

        <div
          className="great-observatory-lightbox-stage"
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (startX === null || endX === undefined) return;
            const distance = endX - startX;
            if (Math.abs(distance) < 48) return;
            if (distance > 0 && canGoPrevious) onSelect(selectedIndex - 1);
            if (distance < 0 && canGoNext) onSelect(selectedIndex + 1);
          }}
        >
          <button
            type="button"
            className="great-observatory-lightbox-nav is-previous"
            onClick={() => onSelect(selectedIndex - 1)}
            disabled={!canGoPrevious}
            aria-label="Previous image"
            data-testid="button-observatory-lightbox-previous"
          >
            <ChevronLeft size={27} strokeWidth={1.2} />
          </button>
          <div className="great-observatory-lightbox-image-wrap">
            {isImageLoading && !imageError && (
              <div className="great-observatory-lightbox-loading" role="status">
                <LoaderCircle size={25} className="great-observatory-spinner" strokeWidth={1.2} />
                <span>Loading full-resolution plate</span>
              </div>
            )}
            {imageError ? (
              <div className="great-observatory-lightbox-image-error" role="alert">
                <ImageOff size={27} strokeWidth={1.2} />
                <span>Image unavailable</span>
              </div>
            ) : (
              <img
                key={image.id}
                src={image.imageUrl}
                alt={image.title}
                className={`great-observatory-lightbox-image ${isImageLoading ? 'is-loading' : ''}`}
                onLoad={() => setIsImageLoading(false)}
                onError={() => {
                  setIsImageLoading(false);
                  setImageError(true);
                }}
              />
            )}
          </div>
          <button
            type="button"
            className="great-observatory-lightbox-nav is-next"
            onClick={() => onSelect(selectedIndex + 1)}
            disabled={!canGoNext}
            aria-label="Next image"
            data-testid="button-observatory-lightbox-next"
          >
            <ChevronRight size={27} strokeWidth={1.2} />
          </button>
        </div>

        <footer className="great-observatory-lightbox-details">
          <div className="great-observatory-lightbox-heading">
            <p className="great-observatories-eyebrow"><span className="great-observatories-eyebrow-line" aria-hidden="true" /> Archive plate</p>
            <h2>{image.title}</h2>
          </div>
          <dl className="great-observatory-lightbox-meta">
            {date && <div><dt>Observation date</dt><dd>{date}</dd></div>}
            {image.mission && <div><dt>Mission</dt><dd>{image.mission}</dd></div>}
            {image.instrument && <div><dt>Instrument</dt><dd>{image.instrument}</dd></div>}
            {image.credit && <div><dt>Credit</dt><dd>{image.credit}</dd></div>}
          </dl>
          <a className="great-observatory-lightbox-source" href={image.sourceUrl} target="_blank" rel="noreferrer">
            Open NASA source <ExternalLink size={13} strokeWidth={1.5} />
          </a>
        </footer>
      </div>
    </div>
  );
}

function ObservatoryArchive({ observatory }: { observatory: Observatory }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['observatory-archive', observatory.id],
    queryFn: ({ pageParam, signal }) => fetchObservatoryArchive(observatory, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const images = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages.flatMap((page) => page.items) ?? []).filter((image) => {
      if (seen.has(image.id)) return false;
      seen.add(image.id);
      return true;
    });
  }, [data?.pages]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) {
        void fetchNextPage();
      }
    }, { rootMargin: '560px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const openImage = useCallback((index: number) => setSelectedIndex(index), []);
  const closeImage = useCallback(() => setSelectedIndex(null), []);

  return (
    <section className="great-observatory-archive" aria-labelledby={`archive-title-${observatory.id}`} data-testid="observatory-archive">
      <div className="great-observatory-archive-heading">
        <div>
          <p className="great-observatories-eyebrow"><span className="great-observatories-eyebrow-line" aria-hidden="true" /> Mission archive</p>
          <h2 id={`archive-title-${observatory.id}`}>Observed in <em>{observatory.shortName}</em></h2>
        </div>
        <p className="great-observatory-archive-intro">Selected plates from the public NASA image archive. Load more as you move through the collection.</p>
      </div>

      {isLoading ? (
        <ArchiveSkeleton />
      ) : error ? (
        <ArchiveFailure onRetry={() => void refetch()} />
      ) : images.length === 0 ? (
        <ArchiveEmpty />
      ) : (
        <>
          <div className="great-observatory-archive-grid">
            {images.map((image, index) => {
              const date = formatArchiveDate(image.date);
              return (
                <button
                  type="button"
                  className="great-observatory-archive-card"
                  key={image.id}
                  onClick={() => openImage(index)}
                  aria-label={`Open ${image.title}`}
                  data-testid={`button-observatory-archive-image-${image.id}`}
                >
                  <span className="great-observatory-archive-image-frame">
                    <img src={image.thumbnailUrl} alt="" loading="lazy" decoding="async" />
                    <span className="great-observatory-archive-card-shade" />
                    <span className="great-observatory-archive-card-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="great-observatory-archive-card-expand" aria-hidden="true"><ArrowUpRight size={15} strokeWidth={1.4} /></span>
                  </span>
                  <span className="great-observatory-archive-card-info">
                    <strong>{image.title}</strong>
                    <span>
                      {date && <span>{date}</span>}
                      {image.credit && <span className="great-observatory-archive-credit">{image.credit}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div ref={loadMoreRef} className="great-observatory-archive-load-sentinel" aria-hidden="true" />
          {isFetchingNextPage && (
            <div className="great-observatory-archive-loading-more" role="status">
              <LoaderCircle size={16} className="great-observatory-spinner" strokeWidth={1.3} /> Loading more plates
            </div>
          )}
          {hasNextPage && !isFetchingNextPage && (
            <button type="button" className="great-observatory-archive-load-more" onClick={() => void fetchNextPage()} data-testid="button-observatory-archive-load-more">
              Load more plates <ChevronRight size={15} strokeWidth={1.4} />
            </button>
          )}
          {!hasNextPage && <p className="great-observatory-archive-end">End of currently indexed archive</p>}
        </>
      )}

      {selectedIndex !== null && (
        <ArchiveLightbox
          images={images}
          selectedIndex={selectedIndex}
          onClose={closeImage}
          onSelect={setSelectedIndex}
        />
      )}
    </section>
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
        <ObservatoryArchive observatory={observatory} />
      </div>
    </main>
  );
}
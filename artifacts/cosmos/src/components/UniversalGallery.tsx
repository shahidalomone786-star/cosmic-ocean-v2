import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clipboard,
  Image as ImageIcon,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';
import {
  getGallerySearchQueryKey,
  useGallerySearch,
  type GalleryItem,
  type GalleryProviderStatus,
  type GallerySearchParams,
} from '@workspace/api-client-react';

type UniversalGalleryProps = {
  lm?: boolean;
};

const INITIAL_QUERY = 'nebula';
const PAGE_LIMIT = 24;

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}

function formatProviderName(provider: string): string {
  const labels: Record<string, string> = {
    artic: 'Art Institute of Chicago',
    'open-i': 'Open-i / NIH',
    'rcsb-pdb': 'RCSB Protein Data Bank',
    'usgs-landsat': 'USGS Landsat',
  };
  if (labels[provider]) return labels[provider];
  return provider.replace(/[-_]/g, ' ');
}

function GalleryImage({
  item,
  modal = false,
}: {
  item: GalleryItem;
  modal?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = modal ? item.imageUrl : item.thumbnailUrl;

  if (failed) {
    return (
      <div
        className={modal ? 'universal-gallery-modal-media' : 'universal-gallery-card-media'}
        data-testid={`${modal ? 'empty-image' : 'empty-thumbnail'}-${item.id}`}
        aria-label="Image unavailable"
      >
        <ImageIcon size={modal ? 28 : 20} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={item.title}
      loading={modal ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      data-testid={`${modal ? 'img-gallery-detail' : 'img-gallery-thumbnail'}-${item.id}`}
    />
  );
}

function ProviderStrip({ statuses }: { statuses: GalleryProviderStatus[] }) {
  if (statuses.length === 0) return null;

  return (
    <div className="universal-gallery-provider-strip" data-testid="status-gallery-providers">
      <span className="universal-gallery-provider-label universal-gallery-mono">
        Archive channels
      </span>
      {statuses.map((status) => (
        <span
          key={status.provider}
          className={`universal-gallery-provider-status universal-gallery-mono ${
            status.status === 'ready' ? 'is-ready' : 'is-unavailable'
          }`}
          title={status.message ?? undefined}
          data-testid={`status-gallery-provider-${status.provider}`}
        >
          <i aria-hidden="true" />
          {formatProviderName(status.provider)}
          <small>{status.status === 'ready' ? `${status.count} records` : 'unavailable'}</small>
        </span>
      ))}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="universal-gallery-skeleton-grid" data-testid="loading-gallery-skeleton">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="universal-gallery-skeleton" aria-hidden="true" />
      ))}
    </div>
  );
}

function MetadataValue({
  label,
  value,
  testId,
}: {
  label: string;
  value: string | number | null | undefined;
  testId: string;
}) {
  return (
    <div>
      <dt className="universal-gallery-mono">{label}</dt>
      <dd data-testid={testId}>{displayValue(value)}</dd>
    </div>
  );
}

function GalleryDetail({
  item,
  onClose,
}: {
  item: GalleryItem;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const copyAttribution = async () => {
    if (!item.attribution || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(item.attribution);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.div
      className="universal-gallery-modal-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="overlay-gallery-detail"
    >
      <motion.div
        className="universal-gallery-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="universal-gallery-detail-title"
        initial={{ opacity: 0, y: 16, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: .98 }}
        transition={{ duration: .24, ease: [0.16, 1, 0.3, 1] }}
        data-testid={`dialog-gallery-detail-${item.id}`}
      >
        <div className="universal-gallery-modal-media">
          <GalleryImage item={item} modal />
        </div>
        <div className="universal-gallery-modal-content">
          <button
            type="button"
            className="universal-gallery-modal-close"
            onClick={onClose}
            aria-label="Close image details"
            data-testid="button-close-gallery-detail"
          >
            <X size={16} aria-hidden="true" />
          </button>

          <p className="universal-gallery-modal-eyebrow universal-gallery-mono">
            {formatProviderName(item.source)} / {item.category}
          </p>
          <h3 id="universal-gallery-detail-title" data-testid={`text-gallery-title-${item.id}`}>
            {item.title}
          </h3>
          <p className="universal-gallery-modal-description" data-testid={`text-gallery-description-${item.id}`}>
            {displayValue(item.description)}
          </p>

          <div className="universal-gallery-modal-actions">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              data-testid={`link-gallery-source-${item.id}`}
            >
              Open source <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            {item.licenseUrl && (
              <a
                href={item.licenseUrl}
                target="_blank"
                rel="noreferrer"
                data-testid={`link-gallery-license-${item.id}`}
              >
                License <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={copyAttribution}
              disabled={!item.attribution}
              className={copied ? 'is-copied' : undefined}
              title={item.attribution ? 'Copy attribution text' : 'No attribution provided'}
              data-testid={`button-copy-attribution-${item.id}`}
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Clipboard size={13} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy attribution'}
            </button>
          </div>

          <dl className="universal-gallery-metadata" data-testid={`metadata-gallery-${item.id}`}>
            <MetadataValue label="Record ID" value={item.id} testId={`metadata-id-${item.id}`} />
            <MetadataValue label="Title" value={item.title} testId={`metadata-title-${item.id}`} />
            <MetadataValue label="Description" value={item.description} testId={`metadata-description-${item.id}`} />
            <MetadataValue label="Image URL" value={item.imageUrl} testId={`metadata-image-url-${item.id}`} />
            <MetadataValue label="Thumbnail URL" value={item.thumbnailUrl} testId={`metadata-thumbnail-url-${item.id}`} />
            <MetadataValue label="Source" value={item.source} testId={`metadata-source-${item.id}`} />
            <MetadataValue label="Source URL" value={item.sourceUrl} testId={`metadata-source-url-${item.id}`} />
            <MetadataValue label="Creator" value={item.creator} testId={`metadata-creator-${item.id}`} />
            <MetadataValue label="Date" value={item.date} testId={`metadata-date-${item.id}`} />
            <MetadataValue label="Category" value={item.category} testId={`metadata-category-${item.id}`} />
            <MetadataValue label="License" value={item.license} testId={`metadata-license-${item.id}`} />
            <MetadataValue label="License URL" value={item.licenseUrl} testId={`metadata-license-url-${item.id}`} />
            <MetadataValue label="Attribution" value={item.attribution} testId={`metadata-attribution-${item.id}`} />
            <MetadataValue label="Width" value={item.width} testId={`metadata-width-${item.id}`} />
            <MetadataValue label="Height" value={item.height} testId={`metadata-height-${item.id}`} />
            <div>
              <dt className="universal-gallery-mono">Tags</dt>
              <dd className="universal-gallery-tags" data-testid={`metadata-tags-${item.id}`}>
                {item.tags.length > 0
                  ? item.tags.map((tag) => (
                      <span className="universal-gallery-tag" key={tag}>
                        {tag}
                      </span>
                    ))
                  : displayValue(null)}
              </dd>
            </div>
          </dl>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UniversalGallery({ lm = false }: UniversalGalleryProps) {
  const [draftQuery, setDraftQuery] = useState(INITIAL_QUERY);
  const [committedQuery, setCommittedQuery] = useState(INITIAL_QUERY);
  const [category, setCategory] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const loadedQueryRef = useRef('');

  const params = useMemo<GallerySearchParams>(() => ({
    q: committedQuery,
    page,
    limit: PAGE_LIMIT,
    ...(category ? { category } : {}),
    ...(provider ? { providers: provider } : {}),
  }), [category, committedQuery, page, provider]);

  const galleryQuery = useGallerySearch(params, {
    query: {
      queryKey: getGallerySearchQueryKey(params),
      enabled: params.q.trim().length > 0,
    },
  });
  const querySignature = `${committedQuery}|${category}|${provider}`;
  const items = galleryItems;
  const statuses = galleryQuery.data?.providerStatus ?? [];

  const categories = useMemo(() => {
    const values = new Set(items.map((item) => item.category).filter(Boolean));
    if (category) values.add(category);
    return Array.from(values);
  }, [category, items]);

  const providers = useMemo(() => {
    const values = new Set(statuses.map((status) => status.provider));
    items.forEach((item) => values.add(item.source));
    if (provider) values.add(provider);
    return Array.from(values);
  }, [items, provider, statuses]);

  useEffect(() => {
    setPage(1);
    setGalleryItems([]);
    loadedQueryRef.current = '';
  }, [category, committedQuery, provider]);

  useEffect(() => {
    const incoming = galleryQuery.data?.items;
    if (!incoming) return;
    if (loadedQueryRef.current !== querySignature || page === 1) {
      loadedQueryRef.current = querySignature;
      setGalleryItems(incoming);
      return;
    }
    setGalleryItems((previous) => {
      const seen = new Set(previous.map((item) => item.id));
      return [...previous, ...incoming.filter((item) => !seen.has(item.id))];
    });
  }, [galleryQuery.data, page, querySignature]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = draftQuery.trim();
    if (nextQuery.length > 0) {
      setCommittedQuery(nextQuery);
      setCategory('');
      setProvider('');
    }
  };

  return (
    <section className={`universal-gallery ${lm ? 'is-light' : ''}`} aria-labelledby="universal-gallery-heading">
      <div className="universal-gallery-shell">
        <header className="universal-gallery-heading">
          <div>
            <p className="universal-gallery-eyebrow">Universal image archive</p>
            <h2 id="universal-gallery-heading">
              Windows into the <em>known.</em>
            </h2>
          </div>
          <p className="universal-gallery-intro">
            A live reading room for images gathered across galaxies, living systems, medicine, oceans, history, and art.
          </p>
        </header>

        <form className="universal-gallery-search" onSubmit={submitSearch} data-testid="form-gallery-search">
          <label>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Search the visual archives"
              aria-label="Search the visual archives"
              data-testid="input-gallery-search"
            />
          </label>
          <button
            type="submit"
            className="universal-gallery-button"
            disabled={!draftQuery.trim()}
            data-testid="button-gallery-search"
          >
            Search archive
          </button>
        </form>

        {(categories.length > 0 || providers.length > 0) && (
          <div className="universal-gallery-filters" aria-label="Gallery filters">
            <button
              type="button"
              className={`universal-gallery-filter ${!category ? 'is-active' : ''}`}
              onClick={() => setCategory('')}
              data-testid="button-gallery-category-all"
            >
              All fields
            </button>
            {categories.map((value) => (
              <button
                type="button"
                key={`category-${value}`}
                className={`universal-gallery-filter ${category === value ? 'is-active' : ''}`}
                onClick={() => setCategory(value)}
                data-testid={`button-gallery-category-${value}`}
              >
                {value}
              </button>
            ))}
            {providers.map((value) => (
              <button
                type="button"
                key={`provider-${value}`}
                className={`universal-gallery-filter ${provider === value ? 'is-active' : ''}`}
                onClick={() => setProvider(provider === value ? '' : value)}
                data-testid={`button-gallery-provider-${value}`}
              >
                {formatProviderName(value)}
              </button>
            ))}
          </div>
        )}

        <ProviderStrip statuses={statuses} />

        {galleryQuery.isFetching && !galleryQuery.isLoading && (
          <div className="universal-gallery-results-meta" role="status" data-testid="status-gallery-refreshing">
            <span>Reading the archive</span>
            <LoaderCircle size={12} aria-hidden="true" className="animate-spin" />
          </div>
        )}

        {galleryQuery.isLoading ? (
          <GallerySkeleton />
        ) : galleryQuery.isError ? (
          <div className="universal-gallery-state" role="alert" data-testid="state-gallery-error">
            <AlertTriangle size={22} aria-hidden="true" />
            <strong>The archive is momentarily out of reach.</strong>
            <p>{galleryQuery.error instanceof Error ? galleryQuery.error.message : 'The search could not be completed.'}</p>
            <button
              type="button"
              className="universal-gallery-button is-quiet"
              onClick={() => void galleryQuery.refetch()}
              data-testid="button-gallery-retry"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="universal-gallery-state" data-testid="state-gallery-empty">
            <Search size={22} aria-hidden="true" />
            <strong>No frames matched this reading.</strong>
            <p>Try a broader subject or remove one of the active archive filters.</p>
            {(category || provider) && (
              <button
                type="button"
                className="universal-gallery-button is-quiet"
                onClick={() => {
                  setCategory('');
                  setProvider('');
                }}
                data-testid="button-gallery-clear-filters"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="universal-gallery-results-meta" data-testid="text-gallery-results-count">
              <span><strong>{items.length}</strong> frames in this reading</span>
              <span className="universal-gallery-mono">Page {galleryQuery.data?.page ?? 1}{galleryQuery.data?.hasMore ? ' · More available' : ''}</span>
            </div>
            <div className="universal-gallery-masonry" data-testid="grid-gallery-results">
              {items.map((item, index) => (
                <motion.button
                  type="button"
                  key={item.id}
                  className="universal-gallery-card"
                  onClick={() => setSelectedItem(item)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: .3, delay: Math.min(index * .035, .3) }}
                  data-testid={`card-gallery-item-${item.id}`}
                >
                  <div className="universal-gallery-card-media">
                    <GalleryImage item={item} />
                    <div className="universal-gallery-card-shade" aria-hidden="true" />
                    <span className="universal-gallery-card-index universal-gallery-mono">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="universal-gallery-card-source universal-gallery-mono">
                      {formatProviderName(item.source)}
                    </span>
                    <div className="universal-gallery-card-copy">
                      <span className="universal-gallery-card-category universal-gallery-mono">{item.category}</span>
                      <h3>{item.title}</h3>
                    </div>
                  </div>
                  <div className="universal-gallery-card-footer">
                    <span>{item.creator ?? item.license}</span>
                    <span className="universal-gallery-card-rule" aria-hidden="true" />
                    <span className="universal-gallery-card-mark" aria-hidden="true">
                      <ArrowUpRight size={12} />
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
             {galleryQuery.data?.hasMore && (
               <div className="universal-gallery-load-more">
                 <button
                   type="button"
                   className="universal-gallery-button is-quiet"
                   onClick={() => setPage((current) => current + 1)}
                   disabled={galleryQuery.isFetching}
                   data-testid="button-gallery-load-more"
                 >
                   {galleryQuery.isFetching ? 'Reading next page' : 'Load more frames'}
                 </button>
               </div>
             )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <GalleryDetail item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
import { memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
  type GalleryItemLicenseClass,
  type GalleryProviderStatus,
  type GallerySearchCategory,
  type GallerySearchLicense,
  type GallerySearchMedia,
  type GallerySearchOrientation,
  type GallerySearchParams,
  type GallerySearchQuality,
} from '@workspace/api-client-react';

type UniversalGalleryProps = {
  lm?: boolean;
};

const INITIAL_QUERY = 'nebula';
const PAGE_LIMIT = 30;

const CATEGORY_FILTERS: Array<{ value: GallerySearchCategory | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'space', label: 'Space' },
  { value: 'nature', label: 'Nature' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'animals', label: 'Animals' },
  { value: 'plants', label: 'Plants' },
  { value: 'earth', label: 'Earth' },
  { value: 'science', label: 'Science' },
  { value: 'medical', label: 'Medical' },
  { value: 'history', label: 'History' },
  { value: 'art', label: 'Art' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'maps', label: 'Maps' },
  { value: 'culture', label: 'Culture' },
];

const MEDIA_FILTERS: Array<{ value: GallerySearchMedia | ''; label: string }> = [
  { value: '', label: 'All media' },
  { value: 'photos', label: 'Photos' },
  { value: 'illustrations', label: 'Illustrations' },
  { value: 'artwork', label: 'Artwork' },
  { value: 'scientific-imagery', label: 'Scientific imagery' },
  { value: 'maps', label: 'Maps' },
  { value: '3d-molecular', label: '3D / Molecular' },
];

const LICENSE_FILTERS: Array<{ value: GallerySearchLicense | ''; label: string }> = [
  { value: '', label: 'All licenses' },
  { value: 'public-domain', label: 'Public Domain / CC0' },
  { value: 'commercial', label: 'Commercial use' },
  { value: 'attribution', label: 'Attribution required' },
  { value: 'open-license', label: 'Open license' },
];

const QUALITY_FILTERS: Array<{ value: GallerySearchQuality | ''; label: string }> = [
  { value: '', label: 'Any quality' },
  { value: 'hd', label: 'HD' },
  { value: '2k', label: '2K+' },
  { value: '4k', label: '4K+' },
];

const ORIENTATION_FILTERS: Array<{ value: GallerySearchOrientation | ''; label: string }> = [
  { value: '', label: 'Any orientation' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
];

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not available';
  return String(value);
}

function isValidGalleryImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function licenseBadgeLabel(licenseClass: GalleryItemLicenseClass): string {
  const labels: Record<GalleryItemLicenseClass, string> = {
    PUBLIC_DOMAIN: 'PUBLIC DOMAIN',
    CC0: 'CC0',
    COMMERCIAL_USE: 'COMMERCIAL',
    ATTRIBUTION_REQUIRED: 'ATTRIBUTION',
    OPEN_LICENSE: 'OPEN LICENSE',
    UNKNOWN: 'VERIFY LICENSE',
  };
  return labels[licenseClass];
}

function formatProviderName(provider: string): string {
  const labels: Record<string, string> = {
    google: 'Google',
    artic: 'Art Institute of Chicago',
    'open-i': 'Open-i / NIH',
    'rcsb-pdb': 'RCSB Protein Data Bank',
    'usgs-landsat': 'USGS Landsat',
    cleveland: 'Cleveland Museum of Art',
    'internet-archive': 'Internet Archive',
    wellcome: 'Wellcome Collection',
    vam: 'Victoria and Albert Museum',
    pubchem: 'PubChem',
  };
  if (labels[provider]) return labels[provider];
  return provider.replace(/[-_]/g, ' ');
}

function galleryItemKeys(item: GalleryItem): string[] {
  const normalize = (value: string) => value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [
    `image:${normalize(item.imageUrl)}`,
    `thumbnail:${normalize(item.thumbnailUrl)}`,
    `record:${item.id.toLowerCase()}`,
    `${normalize(item.title)}|${normalize(item.creator ?? '')}`,
  ];
}

function galleryItemAspectRatio(item: GalleryItem): string | undefined {
  const width = Number(item.width);
  const height = Number(item.height);
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    ? `${width} / ${height}`
    : undefined;
}

const GalleryImage = memo(function GalleryImage({
  item,
  modal = false,
  priority = false,
}: {
  item: GalleryItem;
  modal?: boolean;
  priority?: boolean;
}) {
  const initialStage = modal
    ? (isValidGalleryImageUrl(item.imageUrl)
      ? 'primary'
      : isValidGalleryImageUrl(item.thumbnailUrl) ? 'alternate' : 'placeholder')
    : (isValidGalleryImageUrl(item.thumbnailUrl)
      ? 'alternate'
      : isValidGalleryImageUrl(item.imageUrl) ? 'primary' : 'placeholder');
  const [imageStage, setImageStage] = useState<'primary' | 'alternate' | 'placeholder'>(() => {
    return initialStage;
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageUrl = imageStage === 'primary'
    ? (isValidGalleryImageUrl(item.imageUrl) ? item.imageUrl : null)
    : imageStage === 'alternate'
      ? (isValidGalleryImageUrl(item.thumbnailUrl) ? item.thumbnailUrl : null)
      : null;

  if (!imageUrl) {
    return (
      <div
        className={`universal-gallery-image-placeholder ${modal ? 'is-modal' : ''}`}
        style={{ aspectRatio: galleryItemAspectRatio(item) }}
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
      className={`w-full h-auto object-contain ${imageLoaded ? 'is-loaded' : ''}`}
      style={{ aspectRatio: galleryItemAspectRatio(item) }}
      width={item.width ?? undefined}
      height={item.height ?? undefined}
      sizes={modal
        ? '(max-width: 760px) 100vw, 68vw'
        : '(max-width: 520px) 50vw, (max-width: 900px) 33vw, 25vw'}
      loading={modal || priority ? 'eager' : 'lazy'}
      fetchPriority={modal || priority ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setImageLoaded(true)}
      onError={() => {
        setImageLoaded(false);
        setImageStage((stage) => {
          if (
            stage === 'alternate' &&
            isValidGalleryImageUrl(item.imageUrl) &&
            item.imageUrl !== item.thumbnailUrl
          ) return 'primary';
          if (
            stage === 'primary' &&
            isValidGalleryImageUrl(item.thumbnailUrl) &&
            item.thumbnailUrl !== item.imageUrl
          ) return 'alternate';
          return 'placeholder';
        });
      }}
      data-testid={`${modal ? 'img-gallery-detail' : 'img-gallery-thumbnail'}-${item.id}`}
    />
  );
});

GalleryImage.displayName = 'GalleryImage';

const GalleryCard = memo(function GalleryCard({
  item,
  priority,
  onSelect,
}: {
  item: GalleryItem;
  priority: boolean;
  onSelect: (item: GalleryItem) => void;
}) {
  const handleSelect = useCallback(() => onSelect(item), [item, onSelect]);

  return (
    <button
      type="button"
      className="universal-gallery-card"
      aria-label={`View image details: ${item.title}`}
      onClick={handleSelect}
      data-testid={`card-gallery-item-${item.id}`}
    >
      <div
        className="universal-gallery-card-media"
        style={{ aspectRatio: galleryItemAspectRatio(item) }}
      >
        <GalleryImage item={item} priority={priority} />
      </div>
    </button>
  );
});

GalleryCard.displayName = 'GalleryCard';

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
            status.status === 'AVAILABLE' ? 'is-ready' : 'is-unavailable'
          }`}
          title={status.message ?? undefined}
          data-testid={`status-gallery-provider-${status.provider}`}
        >
          <i aria-hidden="true" />
          {formatProviderName(status.provider)}
          <small>
            {status.status === 'AVAILABLE'
              ? `${status.count} records`
              : status.status === 'NO_RESULTS'
                ? 'no results'
                : status.status.toLowerCase().replace('_', ' ')}
          </small>
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
          <GalleryImage key={item.id} item={item} modal priority />
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
          <div className="universal-gallery-license-summary">
            <span className={`universal-gallery-license-badge is-${item.licenseClass.toLowerCase()}`}>
              {licenseBadgeLabel(item.licenseClass)}
            </span>
            {item.licenseClass === 'ATTRIBUTION_REQUIRED' && (
              <strong className="universal-gallery-attribution-required">Attribution required</strong>
            )}
          </div>
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
              OPEN ORIGINAL <ArrowUpRight size={13} aria-hidden="true" />
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

function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export default function UniversalGallery({ lm = false }: UniversalGalleryProps) {
  const [draftQuery, setDraftQuery] = useState(INITIAL_QUERY);
  const [committedQuery, setCommittedQuery] = useState(INITIAL_QUERY);
  const [category, setCategory] = useState<GallerySearchCategory | ''>('');
  const [provider, setProvider] = useState('');
  const [media, setMedia] = useState<GallerySearchMedia | ''>('');
  const [license, setLicense] = useState<GallerySearchLicense | ''>('');
  const [quality, setQuality] = useState<GallerySearchQuality | ''>('');
  const [orientation, setOrientation] = useState<GallerySearchOrientation | ''>('');
  const [page, setPage] = useState(1);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const loadedQueryRef = useRef('');
  const loadedItemKeysRef = useRef<Set<string>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreLockRef = useRef(false);

  const params = useMemo<GallerySearchParams>(() => ({
    q: committedQuery,
    page,
    limit: PAGE_LIMIT,
    ...(category ? { category } : {}),
    ...(media ? { media } : {}),
    ...(license ? { license } : {}),
    ...(quality ? { quality } : {}),
    ...(orientation ? { orientation } : {}),
    ...(provider ? { providers: provider } : {}),
  }), [category, committedQuery, license, media, orientation, page, provider, quality]);

  const galleryQuery = useGallerySearch(params, {
    query: {
      queryKey: getGallerySearchQueryKey(params),
      enabled: params.q.trim().length > 0,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  });
  const querySignature = `${committedQuery}|${category}|${provider}|${media}|${license}|${quality}|${orientation}`;
  const items = galleryItems;
  const statuses = galleryQuery.data?.providerStatus ?? [];
  const hasMore = galleryQuery.data?.hasMore ?? (page > 1 && !galleryQuery.isError);
  const isLoadingMore = page > 1 && galleryQuery.isFetching;

  const providers = useMemo(() => {
    const values = new Set(statuses.map((status) => status.provider));
    items.forEach((item) => values.add(item.id.split(':', 1)[0]));
    if (provider) values.add(provider);
    return Array.from(values);
  }, [items, provider, statuses]);

  useEffect(() => {
    setPage(1);
    setGalleryItems([]);
    loadedQueryRef.current = '';
    loadedItemKeysRef.current.clear();
    loadMoreLockRef.current = false;
  }, [category, committedQuery, license, media, orientation, provider, quality]);

  useEffect(() => {
    const incoming = galleryQuery.data?.items;
    if (!incoming || galleryQuery.data?.page !== page) return;
    if (loadedQueryRef.current !== querySignature || page === 1) {
      loadedQueryRef.current = querySignature;
      const initialItems: GalleryItem[] = [];
      loadedItemKeysRef.current.clear();
      incoming.forEach((item) => {
        const keys = galleryItemKeys(item);
        if (keys.some((key) => loadedItemKeysRef.current.has(key))) return;
        keys.forEach((key) => loadedItemKeysRef.current.add(key));
        initialItems.push(item);
      });
      setGalleryItems(initialItems);
      return;
    }
    const nextItems: GalleryItem[] = [];
    incoming.forEach((item) => {
      const keys = galleryItemKeys(item);
      if (keys.some((key) => loadedItemKeysRef.current.has(key))) return;
      keys.forEach((key) => loadedItemKeysRef.current.add(key));
      nextItems.push(item);
    });
    if (nextItems.length > 0) {
      setGalleryItems((previous) => [...previous, ...nextItems]);
    }
  }, [galleryQuery.data, page, querySignature]);

  const loadNextPage = useCallback(() => {
    if (!hasMore || galleryQuery.isFetching || loadMoreLockRef.current) return;
    loadMoreLockRef.current = true;
    setPage((current) => current + 1);
  }, [galleryQuery.isFetching, hasMore]);

  useEffect(() => {
    if (!hasMore) {
      loadMoreLockRef.current = false;
      return;
    }
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const scrollRoot = findScrollableAncestor(sentinel);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadNextPage();
      },
      { root: scrollRoot, rootMargin: '900px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadNextPage]);

  useEffect(() => {
    if (galleryQuery.isError || galleryQuery.data?.page === page) {
      loadMoreLockRef.current = false;
    }
  }, [galleryQuery.data?.page, galleryQuery.isError, page]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = draftQuery.trim();
    if (nextQuery.length > 0) {
      setCommittedQuery(nextQuery);
      setCategory('');
      setProvider('');
      setMedia('');
      setLicense('');
      setQuality('');
      setOrientation('');
    }
  };

  const clearFilters = () => {
    setCategory('');
    setProvider('');
    setMedia('');
    setLicense('');
    setQuality('');
    setOrientation('');
  };

  const activeFilterCount = [category, provider, media, license, quality, orientation].filter(Boolean).length;
  const readySources = statuses.filter((status) => status.status === 'AVAILABLE' && status.count > 0).length;
  const handleSelectItem = useCallback((item: GalleryItem) => {
    setSelectedItem(item);
  }, []);

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

        {((providers.length > 0 || galleryQuery.data) || activeFilterCount > 0) && (
          <div className="universal-gallery-filters" aria-label="Gallery filters">
            <label className="universal-gallery-filter-select">
              <span className="universal-gallery-mono">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as GallerySearchCategory | '')} data-testid="select-gallery-category">
                {CATEGORY_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="universal-gallery-filter-select">
              <span className="universal-gallery-mono">Media</span>
              <select value={media} onChange={(event) => setMedia(event.target.value as GallerySearchMedia | '')} data-testid="select-gallery-media">
                {MEDIA_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="universal-gallery-filter-select">
              <span className="universal-gallery-mono">License</span>
              <select value={license} onChange={(event) => setLicense(event.target.value as GallerySearchLicense | '')} data-testid="select-gallery-license">
                {LICENSE_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="universal-gallery-filter-select">
              <span className="universal-gallery-mono">Quality</span>
              <select value={quality} onChange={(event) => setQuality(event.target.value as GallerySearchQuality | '')} data-testid="select-gallery-quality">
                {QUALITY_FILTERS.map((option) => <option key={option.value || 'any'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="universal-gallery-filter-select">
              <span className="universal-gallery-mono">View</span>
              <select value={orientation} onChange={(event) => setOrientation(event.target.value as GallerySearchOrientation | '')} data-testid="select-gallery-orientation">
                {ORIENTATION_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
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
            <span>{isLoadingMore ? 'Loading more archive frames…' : `Searching across ${statuses.length || 'selected'} sources…`}</span>
            <LoaderCircle size={12} aria-hidden="true" className="animate-spin" />
          </div>
        )}

        {galleryQuery.isLoading && items.length === 0 ? (
          <GallerySkeleton />
        ) : galleryQuery.isError && items.length === 0 ? (
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
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="universal-gallery-button is-quiet"
                onClick={() => {
                  clearFilters();
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
              <span><strong>{items.length}</strong> images found · <strong>{readySources}</strong> sources</span>
              <span className="universal-gallery-mono">Page {galleryQuery.data?.page ?? 1}{galleryQuery.data?.hasMore ? ' · More available' : ''}</span>
            </div>
            <div className="universal-gallery-masonry" data-testid="grid-gallery-results">
              {items.map((item, index) => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  priority={index < 6}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="universal-gallery-load-more"
                aria-live="polite"
                data-testid="sentinel-gallery-load-more"
              >
                {isLoadingMore && (
                  <span className="universal-gallery-load-more-status">
                    <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />
                    Reading the next archive page
                  </span>
                )}
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
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
  SlidersHorizontal,
  Sparkles,
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
import AgeGateModal, { isAdultQuery } from './AgeGateModal';
import { toast } from '../hooks/use-toast';

type UniversalGalleryProps = {
  lm?: boolean;
};

type GalleryBatch = {
  page: number;
  items: GalleryItem[];
};

type GalleryDisplayMode = 'masonry' | 'grid' | 'editorial' | 'compact' | 'immersive';

type GallerySuggestion = {
  label: string;
  query: string;
  terms: string[];
};

const INITIAL_QUERY = 'nebula';
const PAGE_LIMIT = 30;

const GALLERY_SUGGESTIONS: GallerySuggestion[] = [
  { label: 'Black holes', query: 'black holes', terms: ['black', 'hole', 'space'] },
  { label: 'Black hole simulations', query: 'black hole simulations', terms: ['black', 'simulation'] },
  { label: 'Black hole NASA', query: 'black hole NASA', terms: ['black', 'nasa'] },
  { label: 'Black hole astronomy', query: 'black hole astronomy', terms: ['black', 'astronomy'] },
  { label: 'Cats', query: 'cats', terms: ['cat', 'animal', 'wildlife'] },
  { label: 'Wildlife', query: 'wildlife', terms: ['wildlife', 'animal'] },
  { label: 'Domestic animals', query: 'domestic animals', terms: ['cat', 'animal', 'domestic'] },
  { label: 'Cat anatomy', query: 'cat anatomy', terms: ['cat', 'anatomy', 'medical'] },
  { label: 'Nebulae', query: 'nebulae', terms: ['nebula', 'space'] },
  { label: 'Galaxies', query: 'galaxies', terms: ['galaxy', 'space'] },
  { label: 'Ocean life', query: 'ocean life', terms: ['ocean', 'life', 'nature'] },
  { label: 'Ancient art', query: 'ancient art', terms: ['ancient', 'art', 'history'] },
  { label: 'Human anatomy', query: 'human anatomy', terms: ['human', 'anatomy', 'medical'] },
];

const DEFAULT_GALLERY_SUGGESTIONS = ['nebula', 'black holes', 'galaxies', 'ancient art', 'wildlife', 'human anatomy'];

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
    eporner: 'Eporner',
    danbooru: 'Danbooru',
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
  const displayAspectRatio = modal ? undefined : galleryItemAspectRatio(item);

  if (!imageUrl) {
    return (
      <div
        className={`universal-gallery-image-placeholder ${modal ? 'is-modal' : ''}`}
        style={displayAspectRatio ? { aspectRatio: displayAspectRatio } : undefined}
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
      style={displayAspectRatio ? { aspectRatio: displayAspectRatio } : undefined}
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
  const activeSources = statuses.filter((status) => status.status === 'AVAILABLE').length;
  const archiveCount = statuses.reduce((total, status) => (
    status.status === 'AVAILABLE' ? total + Math.max(0, Number(status.count) || 0) : total
  ), 0);

  return (
    <div className="universal-gallery-provider-strip" data-testid="status-gallery-providers">
      <div className="universal-gallery-provider-heading">
        <span className="universal-gallery-provider-label universal-gallery-mono">
          Archive sources
        </span>
        <span className="universal-gallery-provider-summary universal-gallery-mono">
          {activeSources} active · {archiveCount > 0 ? `${archiveCount}+ archives` : 'archive status'}
        </span>
      </div>
      {statuses.map((status) => (
        <span
          key={status.provider}
          className={`universal-gallery-provider-status universal-gallery-mono ${
            status.status === 'AVAILABLE' ? 'is-ready is-active' : 'is-unavailable'
          }`}
          aria-label={`${formatProviderName(status.provider)}: ${
            status.status === 'AVAILABLE' ? 'active' : 'unavailable'
          }`}
          title={status.message ?? undefined}
          data-testid={`status-gallery-provider-${status.provider}`}
        >
          <i aria-hidden="true" />
          <span>{formatProviderName(status.provider)}</span>
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
    return () => {
      document.removeEventListener('keydown', onKeyDown);
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
        className="universal-gallery-modal universal-gallery-modal-enter"
        role="dialog"
        aria-modal="true"
        aria-labelledby="universal-gallery-detail-title"
        exit={{ opacity: 0, y: 16, scale: .98 }}
        data-testid={`dialog-gallery-detail-${item.id}`}
      >
        <div className="universal-gallery-modal-header">
          <p className="universal-gallery-modal-eyebrow universal-gallery-mono">
            {formatProviderName(item.source)} / {item.category}
          </p>
          <button
            type="button"
            className="universal-gallery-modal-close"
            onClick={onClose}
            aria-label="Close image details"
            data-testid="button-close-gallery-detail"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="universal-gallery-modal-media">
          <GalleryImage key={item.id} item={item} modal priority />
        </div>
        <div className="universal-gallery-modal-content">
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
  let firstScrollableAncestor: HTMLElement | null = null;
  let parent = element.parentElement;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (
      overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
    ) {
      firstScrollableAncestor ??= parent;
      if (parent.scrollHeight > parent.clientHeight) return parent;
    }
    parent = parent.parentElement;
  }
  return firstScrollableAncestor;
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
  const [galleryBatches, setGalleryBatches] = useState<GalleryBatch[]>([]);
  const [loadedHasMore, setLoadedHasMore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [ageGateQuery, setAgeGateQuery] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<GalleryDisplayMode>('masonry');
  const [displayPanelOpen, setDisplayPanelOpen] = useState(false);
  const [aestheticMode, setAestheticMode] = useState(false);
  const loadedQueryRef = useRef('');
  const loadedItemKeysRef = useRef<Set<string>>(new Set());
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const searchChamberRef = useRef<HTMLDivElement>(null);
  const pendingSuggestionRef = useRef<string | null>(null);
  const loadMoreLockRef = useRef(false);
  const pageFetchRef = useRef(false);

  const contextualSuggestions = useMemo(() => {
    const normalizedQuery = draftQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return DEFAULT_GALLERY_SUGGESTIONS.map((query) => ({
        label: query.replace(/\b\w/g, (character) => character.toUpperCase()),
        query,
        terms: [query],
      }));
    }
    if (normalizedQuery.length < 2) return [];
    return GALLERY_SUGGESTIONS.filter((suggestion) => (
      suggestion.label.toLowerCase().includes(normalizedQuery)
      || suggestion.query.toLowerCase().includes(normalizedQuery)
      || suggestion.terms.some((term) => term.includes(normalizedQuery) || normalizedQuery.includes(term))
    )).slice(0, 6);
  }, [draftQuery]);

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
  const hasMore = loadedHasMore;
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
    setGalleryBatches([]);
    setLoadedHasMore(false);
    loadedQueryRef.current = '';
    loadedItemKeysRef.current.clear();
    loadedPagesRef.current.clear();
    loadMoreLockRef.current = false;
    pageFetchRef.current = false;
  }, [category, committedQuery, license, media, orientation, provider, quality]);

  const loadNextPage = useCallback(() => {
    if (
      !hasMore
      || galleryQuery.isFetching
      || loadMoreLockRef.current
      || pageFetchRef.current
    ) return;
    loadMoreLockRef.current = true;
    pageFetchRef.current = true;
    setPage((current) => current + 1);
  }, [galleryQuery.isFetching, hasMore]);

  useEffect(() => {
    const response = galleryQuery.data;
    const incoming = response?.items;
    if (!response || !incoming || response.page !== page) return;
    if (loadedPagesRef.current.has(page)) return;
    loadedPagesRef.current.add(page);
    setLoadedHasMore(response.hasMore);

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
      setGalleryBatches([{ page, items: initialItems }]);
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
      setGalleryBatches((previous) => [...previous, { page, items: nextItems }]);
    }
    pageFetchRef.current = false;
    loadMoreLockRef.current = false;
  }, [galleryQuery.data, page, querySignature]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;
    const scrollRoot = sentinel.closest<HTMLElement>('.portal-gallery-overlay')
      ?? findScrollableAncestor(sentinel);
    let frame = 0;
    const requestIfNearBottom = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const sentinelRect = sentinel.getBoundingClientRect();
        const rootBottom = scrollRoot?.getBoundingClientRect().bottom ?? window.innerHeight;
        if (sentinelRect.top <= rootBottom + 900 && sentinelRect.bottom >= 0) loadNextPage();
      });
    };
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) loadNextPage(); },
      { root: scrollRoot, rootMargin: '0px 0px 900px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    const scrollTarget: Window | HTMLElement = scrollRoot ?? window;
    scrollTarget.addEventListener('scroll', requestIfNearBottom, { passive: true });
    window.addEventListener('resize', requestIfNearBottom, { passive: true });
    requestIfNearBottom();
    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', requestIfNearBottom);
      window.removeEventListener('resize', requestIfNearBottom);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [hasMore, loadNextPage]);

  useEffect(() => {
    if (galleryQuery.isError || galleryQuery.data?.page === page) {
      pageFetchRef.current = false;
      loadMoreLockRef.current = false;
    }
  }, [galleryQuery.data?.page, galleryQuery.isError, page]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const dismissSuggestions = (event: PointerEvent) => {
      if (!searchChamberRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('pointerdown', dismissSuggestions);
    return () => document.removeEventListener('pointerdown', dismissSuggestions);
  }, [suggestionsOpen]);

  const commitSearch = useCallback((nextQuery: string) => {
    setDraftQuery(nextQuery);
    setCommittedQuery(nextQuery);
    setCategory('');
    setProvider('');
    setMedia('');
    setLicense('');
    setQuality('');
    setOrientation('');
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuggestionsOpen(false);
    const nextQuery = (pendingSuggestionRef.current ?? draftQuery).trim();
    pendingSuggestionRef.current = null;
    if (nextQuery.length === 0) return;
    const ageVerified = typeof window !== 'undefined'
      && window.sessionStorage.getItem('cosmic_age_verified') === 'true';
    if (isAdultQuery(nextQuery) && !ageVerified) {
      setAgeGateQuery(nextQuery);
      return;
    }
    commitSearch(nextQuery);
  };

  const submitSuggestion = useCallback((suggestion: string) => {
    pendingSuggestionRef.current = suggestion;
    setDraftQuery(suggestion);
    setSuggestionsOpen(false);
    window.requestAnimationFrame(() => searchFormRef.current?.requestSubmit());
  }, []);

  const confirmAgeGate = useCallback(() => {
    if (!ageGateQuery) return;
    window.sessionStorage.setItem('cosmic_age_verified', 'true');
    const queuedQuery = ageGateQuery;
    setAgeGateQuery(null);
    commitSearch(queuedQuery);
  }, [ageGateQuery, commitSearch]);

  const cancelAgeGate = useCallback(() => {
    setAgeGateQuery(null);
    setDraftQuery('');
    setCommittedQuery('');
    toast({ title: 'Exhibit search cancelled.' });
  }, []);

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
    <>
      <section className={`universal-gallery ${lm ? 'is-light' : ''} ${aestheticMode ? 'is-aesthetic' : ''}`} aria-labelledby="universal-gallery-heading">
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

        <div ref={searchChamberRef} className="universal-gallery-search-chamber" data-testid="panel-gallery-search-chamber">
        <form
          ref={searchFormRef}
          className="universal-gallery-search"
          onSubmit={submitSearch}
          aria-busy={galleryQuery.isFetching}
          data-testid="form-gallery-search"
        >
          <label>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              placeholder="Explore the visual universe…"
              aria-label="Explore the visual universe"
              data-testid="input-gallery-search"
            />
          </label>
          <button
            type="submit"
            className="universal-gallery-button"
            disabled={!draftQuery.trim()}
            data-testid="button-gallery-search"
          >
            <span>{galleryQuery.isFetching ? (isLoadingMore ? 'Loading page' : 'Searching') : 'Search'}</span>
            {galleryQuery.isFetching
              ? <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
              : <ArrowUpRight size={14} aria-hidden="true" />}
          </button>
        </form>

        <div className="universal-gallery-search-readout" aria-live="polite" data-testid="status-gallery-query">
          <span className={`universal-gallery-query-state ${galleryQuery.isFetching ? 'is-searching' : ''}`}>
            <i aria-hidden="true" />
            {galleryQuery.isFetching
              ? (isLoadingMore ? 'Reading the next archive page' : 'Reading distributed archive')
              : draftQuery.trim() !== committedQuery.trim()
                ? 'Query staged — press search to read'
                : `Index open: ${committedQuery}`}
          </span>
          <span className="universal-gallery-search-readout-code universal-gallery-mono">
            {galleryQuery.isFetching ? 'LIVE / QUERY' : `QRY / ${String(committedQuery.length).padStart(2, '0')}`}
          </span>
        </div>

        {suggestionsOpen && contextualSuggestions.length > 0 && (
          <div className="universal-gallery-suggestions is-contextual" aria-label="Suggested searches" data-testid="list-gallery-suggestions">
            <span className="universal-gallery-suggestions-label universal-gallery-mono">Suggested vectors</span>
            {contextualSuggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion.query}
                className={`universal-gallery-suggestion ${draftQuery.toLowerCase() === suggestion.query ? 'is-current' : ''}`}
                onClick={() => submitSuggestion(suggestion.query)}
                data-testid={`chip-gallery-suggestion-${suggestion.query.toLowerCase().replace(/ /g, '-')}`}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}
        <p className="universal-gallery-search-support" data-testid="text-gallery-search-support">
          Search across art · science · nature · history · space
        </p>
        </div>

        <div className="universal-gallery-presentation-bar" aria-label="Gallery presentation controls">
          <button
            type="button"
            className={`universal-gallery-presentation-toggle ${aestheticMode ? 'is-active' : ''}`}
            aria-pressed={aestheticMode}
            onClick={() => setAestheticMode((active) => !active)}
            data-testid="button-gallery-aesthetic-mode"
          >
            <Sparkles size={13} aria-hidden="true" />
            <span>Aesthetic mode</span>
          </button>
          <button
            type="button"
            className={`universal-gallery-presentation-toggle ${displayPanelOpen ? 'is-active' : ''}`}
            aria-expanded={displayPanelOpen}
            aria-controls="universal-gallery-display-panel"
            onClick={() => setDisplayPanelOpen((open) => !open)}
            data-testid="button-gallery-display-mode"
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            <span>Display mode</span>
            <span className="universal-gallery-presentation-value">{displayMode}</span>
          </button>
          {displayPanelOpen && (
            <div id="universal-gallery-display-panel" className="universal-gallery-display-panel" role="group" aria-label="Display mode options">
              {(['masonry', 'grid', 'editorial', 'compact', 'immersive'] as GalleryDisplayMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={`universal-gallery-display-option ${displayMode === mode ? 'is-active' : ''}`}
                  aria-pressed={displayMode === mode}
                  onClick={() => {
                    setDisplayMode(mode);
                    setDisplayPanelOpen(false);
                  }}
                  data-testid={`button-gallery-display-${mode}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="universal-gallery-filter-deck" aria-label="Gallery filters" data-testid="deck-gallery-filters">
          <div className="universal-gallery-filter-deck-heading">
            <span className="universal-gallery-filter-deck-title universal-gallery-mono">Filters</span>
            <span className="universal-gallery-filter-deck-note">
              {activeFilterCount > 0 ? `${activeFilterCount} active` : 'Refine the reading'}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="universal-gallery-clear-filters"
                onClick={clearFilters}
                data-testid="button-gallery-clear-filters-deck"
              >
                Clear
              </button>
            )}
          </div>
          <div className="universal-gallery-filters" aria-label="Gallery filters">
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
              <span className="universal-gallery-mono">Orientation</span>
              <select value={orientation} onChange={(event) => setOrientation(event.target.value as GallerySearchOrientation | '')} data-testid="select-gallery-orientation">
                {ORIENTATION_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <span className="universal-gallery-filter-group-label universal-gallery-mono">Source</span>
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
            <label className="universal-gallery-filter-select">
              <span className="universal-gallery-mono">Media</span>
              <select value={media} onChange={(event) => setMedia(event.target.value as GallerySearchMedia | '')} data-testid="select-gallery-media">
                {MEDIA_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="universal-gallery-filter-select">
              <span className="universal-gallery-mono">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as GallerySearchCategory | '')} data-testid="select-gallery-category">
                {CATEGORY_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </div>

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
            <div className={`universal-gallery-results-grid is-${displayMode}`} data-testid="grid-gallery-results">
              {galleryBatches.map((batch, batchIndex) => (
                <div className={`universal-gallery-masonry is-${displayMode}`} key={`${querySignature}-page-${batch.page}`}>
                  {batch.items.map((item, itemIndex) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      priority={batchIndex === 0 && itemIndex < 6}
                      onSelect={handleSelectItem}
                    />
                  ))}
                </div>
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
      {ageGateQuery !== null && (
        <AgeGateModal onConfirm={confirmAgeGate} onCancel={cancelAgeGate} />
      )}
    </>
  );
}
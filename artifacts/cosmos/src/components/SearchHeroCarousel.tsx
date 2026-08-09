import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, Maximize2, Share2, X } from 'lucide-react';

export interface SearchImage {
  id: string;
  title: string;
  imageUrl: string;
  proxyUrl: string;
  sourceUrl: string;
  source: string;
  alt: string;
  width: number;
  height: number;
}

interface SearchHeroCarouselProps {
  query: string;
  lm?: boolean;
  onShareToSingularity?: (image: SearchImage) => void;
}

function ImageSkeleton({ lm = false }: { lm?: boolean }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${lm ? 'bg-slate-100' : 'bg-[#0b0b18]'}`}>
      <motion.div
        className="absolute inset-y-0 -left-1/2 w-1/2"
        style={{
          background: lm
            ? 'linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(167,139,250,0.09), transparent)',
        }}
        animate={{ x: ['0%', '300%'] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`h-9 w-9 rounded-full border ${lm ? 'border-slate-300' : 'border-white/[0.10]'}`} />
      </div>
    </div>
  );
}

function SearchHeroCarousel({
  query,
  lm = false,
  onShareToSingularity,
}: SearchHeroCarouselProps) {
  const [images, setImages] = useState<SearchImage[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<SearchImage | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);
  const [firstImageFailed, setFirstImageFailed] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const queryRef = useRef('');

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setImages([]);
      setStatus('idle');
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      setImages([]);
      setActiveIndex(0);
      setFirstImageLoaded(false);
      setFirstImageFailed(false);
      queryRef.current = term;
      try {
        const response = await fetch(`/api/image-search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Image search returned ${response.status}`);
        const payload = await response.json() as { images?: SearchImage[] };
        if (controller.signal.aborted || queryRef.current !== term) return;
        const nextImages = (payload.images ?? []).slice(0, 15);
        setImages(nextImages);
        setStatus(nextImages.length > 0 ? 'ready' : 'error');
      } catch {
        if (!controller.signal.aborted || timedOut) {
          setImages([]);
          setStatus('error');
        }
      } finally {
        window.clearTimeout(timeoutTimer);
      }
    }, 120);
    const timeoutTimer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 4_500);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timeoutTimer);
      controller.abort();
    };
  }, [query]);

  const goTo = useCallback((nextIndex: number) => {
    if (!images.length) return;
    setActiveIndex((nextIndex + images.length) % images.length);
    setFirstImageLoaded(false);
    setFirstImageFailed(false);
  }, [images.length]);

  useEffect(() => {
    if (images.length < 2 || isPaused || lightboxImage) return;
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % images.length);
      setFirstImageLoaded(false);
      setFirstImageFailed(false);
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [images.length, isPaused, lightboxImage]);

  useEffect(() => {
    if (!lightboxImage) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxImage(null);
      if (event.key === 'ArrowLeft') goTo(activeIndex - 1);
      if (event.key === 'ArrowRight') goTo(activeIndex + 1);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, goTo, lightboxImage]);

  const activeImage = images[activeIndex];
  if (status === 'idle' || status === 'loading' || status === 'error' || !activeImage) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`relative mb-5 w-full overflow-hidden rounded-[22px] border ${
          lm
            ? 'border-slate-200 bg-white shadow-[0_10px_34px_rgba(15,23,42,0.08)]'
            : 'border-white/[0.11] bg-[#0b0b18]/85 shadow-[0_14px_42px_rgba(0,0,0,0.52),0_0_34px_rgba(109,72,202,0.07)]'
        }`}
        aria-label={`Loading image results for ${query || 'your search'}`}
        aria-busy={status === 'idle' || status === 'loading'}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {status === 'error' ? (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${lm ? 'bg-slate-100 text-slate-500' : 'bg-[#0b0b18] text-white/45'}`}>
              <span className="text-[10px] uppercase tracking-[0.22em]">Visual index unavailable</span>
              <span className="text-[9px] tracking-wide opacity-70">Try another search to explore images</span>
            </div>
          ) : <ImageSkeleton lm={lm} />}
        </div>
      </motion.section>
    );
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    didDragRef.current = false;
    setIsPaused(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (start && Math.abs(event.clientX - start.x) > 8) didDragRef.current = true;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (start) {
      const deltaX = event.clientX - start.x;
      if (Math.abs(deltaX) > 42) goTo(activeIndex + (deltaX < 0 ? 1 : -1));
    }
    dragStartRef.current = null;
    setIsPaused(false);
  };

  const openLightbox = () => {
    if (!didDragRef.current) setLightboxImage(activeImage);
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`mb-5 overflow-hidden rounded-[22px] border ${
          lm
            ? 'border-slate-200 bg-white shadow-[0_10px_34px_rgba(15,23,42,0.08)]'
            : 'border-white/[0.11] bg-[#0b0b18]/85 shadow-[0_14px_42px_rgba(0,0,0,0.52),0_0_34px_rgba(109,72,202,0.07)]'
        }`}
        aria-label={`Image results for ${query}`}
      >
        <div
          className="group relative aspect-[16/9] touch-pan-y select-none overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={openLightbox}
          role="button"
          tabIndex={0}
          aria-label={`Open image: ${activeImage.title}`}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openLightbox();
            }
          }}
        >
          {!firstImageLoaded && !firstImageFailed && <ImageSkeleton lm={lm} />}
          {firstImageFailed ? (
            <div className={`absolute inset-0 flex items-center justify-center ${lm ? 'bg-slate-100 text-slate-500' : 'bg-[#0b0b18] text-white/45'}`}>
              <span className="text-[10px] uppercase tracking-[0.22em]">Image unavailable</span>
            </div>
          ) : (
            <motion.img
              key={activeImage.id}
              src={activeImage.proxyUrl || activeImage.imageUrl}
              alt={activeImage.alt}
              loading={activeIndex === 0 ? 'eager' : 'lazy'}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: firstImageLoaded ? 1 : 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onLoad={() => setFirstImageLoaded(true)}
              onError={() => setFirstImageFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span className="rounded-full border border-white/[0.16] bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur-md">
              Visual index
            </span>
            <span className="rounded-full border border-white/[0.12] bg-black/30 px-2 py-1 text-[8px] tabular-nums tracking-[0.14em] text-white/60 backdrop-blur-md">
              {activeIndex + 1} / {images.length}
            </span>
          </div>
          <div className="absolute right-3 top-3 rounded-full border border-white/[0.16] bg-black/35 p-2 text-white/75 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
            <Maximize2 size={13} strokeWidth={1.8} />
          </div>
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-[12px] font-medium leading-snug text-white/92">{activeImage.title}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/45">{activeImage.source}</p>
            </div>
            {images.length > 1 && (
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button type="button" onClick={event => { event.stopPropagation(); goTo(activeIndex - 1); }} aria-label="Previous image" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.16] bg-black/35 text-white/70 backdrop-blur-md transition-colors hover:bg-black/55 hover:text-white">
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={event => { event.stopPropagation(); goTo(activeIndex + 1); }} aria-label="Next image" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.16] bg-black/35 text-white/70 backdrop-blur-md transition-colors hover:bg-black/55 hover:text-white">
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${lm ? 'text-slate-500' : 'text-white/38'}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400/70" />
            <span className="truncate text-[9px] uppercase tracking-[0.18em]">Swipe or drag to explore</span>
          </div>
          <button
            type="button"
            onClick={() => onShareToSingularity?.(activeImage)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] transition-colors ${
              lm
                ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200 hover:text-violet-700'
                : 'border-white/[0.10] bg-white/[0.045] text-white/58 hover:border-violet-300/30 hover:bg-violet-300/[0.08] hover:text-violet-200'
            }`}
          >
            <Share2 size={11} strokeWidth={1.8} />
            Share to Singularity
          </button>
        </div>
      </motion.section>

      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-[#020207]/80 p-4 backdrop-blur-2xl sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.title}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/[0.14] bg-[#090912]/95 shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
              onClick={event => event.stopPropagation()}
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <LightboxImage image={lightboxImage} onClose={() => setLightboxImage(null)} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-white/90">{lightboxImage.title}</p>
                  <a href={lightboxImage.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-white/40 hover:text-white/70">
                    View source <ExternalLink size={10} />
                  </a>
                </div>
                <button type="button" onClick={() => onShareToSingularity?.(lightboxImage)} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-violet-300/25 bg-violet-300/[0.12] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-violet-100 transition-colors hover:bg-violet-300/[0.20]">
                  <Share2 size={12} />
                  <span className="hidden xs:inline">Share to Singularity</span>
                  <span className="xs:hidden">Share</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function LightboxImage({ image, onClose }: { image: SearchImage; onClose: () => void }) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  return (
    <div
      className="relative flex h-full min-h-[48dvh] max-h-[78dvh] items-center justify-center bg-black/25"
      onPointerDown={event => {
        startRef.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={event => {
        if (startRef.current) setOffsetY(Math.max(0, event.clientY - startRef.current.y));
      }}
      onPointerUp={event => {
        if (startRef.current && event.clientY - startRef.current.y > 100) onClose();
        startRef.current = null;
        setOffsetY(0);
      }}
      onPointerCancel={() => { startRef.current = null; setOffsetY(0); }}
    >
      <img
        src={image.proxyUrl || image.imageUrl}
        alt={image.alt}
        className="max-h-[78dvh] w-full select-none object-contain"
        style={{ transform: `translate3d(0, ${offsetY}px, 0) scale(${1 - Math.min(offsetY / 1300, 0.12)})`, transition: startRef.current ? 'none' : 'transform 180ms ease-out' }}
        draggable={false}
      />
      <button type="button" onClick={onClose} aria-label="Close image" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.16] bg-black/45 text-white/80 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}

export default SearchHeroCarousel;
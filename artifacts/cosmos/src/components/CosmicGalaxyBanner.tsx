import { useEffect, useRef, useState } from 'react';

const GALAXY_VIDEO = '/media/cosmic-ocean-galaxy-loop.mp4';
const GALAXY_POSTER = '/media/cosmic-ocean-galaxy-loop-poster.jpg';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function CosmicGalaxyBanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [isPlaying, setIsPlaying] = useState(false);
  const setVideoRef = (video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      video.volume = 0;
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reducedMotion) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    const startPlayback = () => {
      video.defaultMuted = true;
      video.muted = true;
      video.volume = 0;
      void video.play().catch(() => {
        // The poster remains visible when autoplay is unavailable.
        setIsPlaying(false);
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback();
      return;
    }

    video.addEventListener('canplay', startPlayback, { once: true });
    return () => video.removeEventListener('canplay', startPlayback);
  }, [reducedMotion]);

  return (
    <div
      className="relative isolate mb-7 w-full overflow-hidden rounded-[1.35rem] bg-[#060914] shadow-[0_18px_60px_rgba(3,8,26,0.34)] ring-1 ring-white/[0.06]"
      aria-hidden="true"
    >
      <div
        className="relative aspect-video w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${GALAXY_POSTER})` }}
      >
        <video
          ref={setVideoRef}
          className={`absolute inset-0 h-full w-full scale-[1.2] object-cover object-center transition-opacity duration-700 ${
            isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
          src={GALAXY_VIDEO}
          poster={GALAXY_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          onPlaying={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,24,0.06)_0%,transparent_48%,rgba(4,8,24,0.28)_100%)]" />
      </div>
    </div>
  );
}
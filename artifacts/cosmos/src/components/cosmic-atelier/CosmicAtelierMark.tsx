import { memo } from 'react';

interface CosmicAtelierMarkProps {
  size?: number;
  className?: string;
  muted?: boolean;
}

/**
 * A bespoke Atelier mark: a suspended gallery arch crossed by a single orbital
 * thread. It intentionally avoids the visual language of a commerce icon.
 */
const CosmicAtelierMark = memo(({ size = 88, className = '', muted = false }: CosmicAtelierMarkProps) => {
  const ink = muted ? 'rgba(215, 224, 239, .62)' : '#c9d9ff';
  const accent = muted ? 'rgba(175, 137, 255, .62)' : '#b892ff';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="atelier-arch" x1="20" y1="18" x2="83" y2="83" gradientUnits="userSpaceOnUse">
          <stop stopColor={ink} stopOpacity=".98" />
          <stop offset=".52" stopColor={accent} />
          <stop offset="1" stopColor="#78d8d1" stopOpacity=".78" />
        </linearGradient>
        <filter id="atelier-soft-light" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="50" cy="50" r="38" stroke="rgba(197, 211, 236, .12)" strokeWidth="1" strokeDasharray="1 6" />
      <path d="M20 79.5h60" stroke="rgba(197, 211, 236, .24)" strokeWidth="1" />
      <path
        d="M28 79V47.5C28 35.6 37.8 26 50 26s22 9.6 22 21.5V79"
        stroke="url(#atelier-arch)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#atelier-soft-light)"
      />
      <path d="M36 79V49c0-7.7 6.3-14 14-14s14 6.3 14 14v30" stroke="rgba(201, 217, 255, .22)" strokeWidth="1" />
      <path
        d="M17 58.5C32 46 48 41 64.5 43.5 78 45.5 86 53 84 63c-2.1 10.6-18.3 16-33 14.8-16.7-1.4-31-9-34-19.3Z"
        stroke="url(#atelier-arch)"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity=".82"
      />
      <circle cx="78.5" cy="54.2" r="2.6" fill="#b892ff" filter="url(#atelier-soft-light)" />
      <circle cx="78.5" cy="54.2" r="1.1" fill="#f5f0ff" />
      <path d="M44 47h12M44 52h12M44 57h12" stroke="rgba(201, 217, 255, .35)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
});

CosmicAtelierMark.displayName = 'CosmicAtelierMark';

export default CosmicAtelierMark;
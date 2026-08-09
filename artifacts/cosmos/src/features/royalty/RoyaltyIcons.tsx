import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function IconFrame({
  size = 28,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

export function RoyaltyCrown({ size = 24, ...props }: IconProps) {
  return (
    <IconFrame size={size} {...props}>
      <path
        d="M8 17.5 14.2 23l9.8-13 9.8 13 6.2-5.5-2.3 19.2H10.3L8 17.5Z"
        fill="currentColor"
        fillOpacity=".14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M11 30.5h26M12.2 36.7h23.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8.2" cy="16.7" r="2.2" fill="currentColor" />
      <circle cx="24" cy="9" r="2.2" fill="currentColor" />
      <circle cx="39.8" cy="16.7" r="2.2" fill="currentColor" />
    </IconFrame>
  );
}

export function PlanetaryCoinIcon({ size = 44, ...props }: IconProps) {
  return (
    <IconFrame size={size} {...props}>
      <circle cx="24" cy="24" r="13.5" fill="currentColor" fillOpacity=".13" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M14.5 19.2c3.1-2.7 5.2-1.2 7.4-2.2 2.8-1.2 3.8-4.2 7-3.4 2.9.7 2.9 3.2 5.2 4.1M13.1 27c2.7-.8 4.2.3 5.3 2.1 1.2 2 3.1 2.4 5 1.5 2.4-1.1 3.2.4 4.1 2.6M29.7 25c2.2-1.5 4.3-1.2 5.9.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="24" cy="24" rx="20" ry="7.8" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.2" transform="rotate(-18 24 24)" />
    </IconFrame>
  );
}

export function StarTokenIcon({ size = 44, ...props }: IconProps) {
  return (
    <IconFrame size={size} {...props}>
      <circle cx="24" cy="24" r="14" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="m24 10.5 3.05 9.1 8.9 3.1-8.9 3.15L24 35l-3.05-9.15-8.9-3.15 8.9-3.1L24 10.5Z"
        fill="currentColor"
        fillOpacity=".22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m24 16.6 1.55 5.85 5.65.25-5.65 1.1L24 29.5l-1.55-5.7-5.65-1.1 5.65-.25L24 16.6Z" fill="currentColor" />
      <path d="M10 13.5 7.8 11.3M38 13.5l2.2-2.2M10 34.5l-2.2 2.2M38 34.5l2.2 2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".65" />
    </IconFrame>
  );
}

export function UniversalCoinIcon({ size = 44, ...props }: IconProps) {
  return (
    <IconFrame size={size} {...props}>
      <circle cx="24" cy="24" r="12.2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="24" cy="24" rx="20.5" ry="8" stroke="currentColor" strokeWidth="1.1" opacity=".75" transform="rotate(34 24 24)" />
      <ellipse cx="24" cy="24" rx="20.5" ry="8" stroke="currentColor" strokeWidth="1.1" opacity=".45" transform="rotate(-34 24 24)" />
      <path d="m24 14.6 2.6 6.8 6.8 2.6-6.8 2.6-2.6 6.8-2.6-6.8-6.8-2.6 6.8-2.6 2.6-6.8Z" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2.1" fill="currentColor" />
    </IconFrame>
  );
}

export function RoyaltyCurrencyIcon({
  currency,
  size = 44,
  ...props
}: IconProps & { currency: 'planetary_coins' | 'star_tokens' | 'universal_coins' }) {
  if (currency === 'planetary_coins') return <PlanetaryCoinIcon size={size} {...props} />;
  if (currency === 'star_tokens') return <StarTokenIcon size={size} {...props} />;
  return <UniversalCoinIcon size={size} {...props} />;
}
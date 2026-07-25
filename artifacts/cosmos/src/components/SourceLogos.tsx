/**
 * SourceLogos — premium dark glassmorphism logo fallbacks for each data source.
 *
 * Each logo is a self-contained SVG or styled component. The outer container
 * `SourceLogo` wraps in the characteristic background + centred logo.
 * A `compact` prop scales everything down for the narrow ResearchRowCard strip.
 */

// ─── arXiv ────────────────────────────────────────────────────────────────────
function ArxivLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  return (
    <div className="flex items-baseline select-none" style={{ gap: big ? '1px' : '0.5px' }}>
      <span style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: big ? 26 : 14,
        fontWeight: 400,
        color: 'rgba(52,211,153,0.52)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>ar</span>
      <span style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: big ? 34 : 18,
        fontWeight: 700,
        color: 'rgba(52,211,153,0.68)',
        letterSpacing: '-0.01em',
        lineHeight: 1,
        margin: `0 ${big ? 1 : 0}px`,
      }}>X</span>
      <span style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: big ? 26 : 14,
        fontWeight: 400,
        color: 'rgba(52,211,153,0.52)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>iv</span>
    </div>
  );
}

// ─── Wikipedia ────────────────────────────────────────────────────────────────
// Classic double-V "W" in an elegant serif weight — deliberately large so
// the bottom serifs hint at the traditional Wikimedia letterform.
function WikipediaLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 4 : 2 }}>
      <span style={{
        fontFamily: 'Georgia, "Linux Libertine", "Times New Roman", serif',
        fontSize: big ? 58 : 30,
        fontWeight: 700,
        color: 'rgba(251,191,36,0.48)',
        lineHeight: 0.85,
        letterSpacing: '-0.06em',
        display: 'block',
      }}>W</span>
      {big && (
        <span style={{
          fontFamily: 'Georgia, serif',
          fontSize: 8,
          fontWeight: 400,
          color: 'rgba(251,191,36,0.28)',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          marginTop: 2,
        }}>Wikipedia</span>
      )}
    </div>
  );
}

// ─── Semantic Scholar ─────────────────────────────────────────────────────────
// Stylised "S" with a subtle magnifier arc SVG beneath it — references their
// "discovering knowledge" brand concept.
function SemanticScholarLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  const fs = big ? 52 : 28;
  const svgSize = big ? 64 : 36;
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 3 : 1 }}>
      {/* "S" lettermark */}
      <span style={{
        fontFamily: 'Georgia, serif',
        fontSize: fs,
        fontWeight: 700,
        color: 'rgba(45,212,191,0.52)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>S</span>
      {/* Magnifier arc — signals "scholarly search" */}
      <svg width={svgSize} height={big ? 10 : 6} viewBox={`0 0 64 10`} fill="none" aria-hidden="true">
        <path
          d={`M6 9 Q32 -2 58 9`}
          stroke="rgba(45,212,191,0.28)"
          strokeWidth={big ? 1.5 : 1}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {big && (
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 7.5,
          fontWeight: 500,
          color: 'rgba(45,212,191,0.28)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginTop: 1,
        }}>Semantic Scholar</span>
      )}
    </div>
  );
}

// ─── OpenAlex ─────────────────────────────────────────────────────────────────
// Diamond-framed "OA" monogram — OpenAlex uses a diamond/lens motif.
function OpenAlexLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  const d = big ? 72 : 38;
  const fs = big ? 22 : 12;
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 4 : 2 }}>
      <svg width={d} height={d} viewBox="0 0 72 72" fill="none" aria-hidden="true">
        {/* Diamond outline */}
        <path
          d="M36 4 L68 36 L36 68 L4 36 Z"
          stroke="rgba(167,139,250,0.38)"
          strokeWidth="1.5"
          fill="rgba(167,139,250,0.06)"
        />
        {/* "OA" text centred */}
        <text
          x="36" y="38"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Georgia, serif"
          fontSize={fs}
          fontWeight="700"
          fill="rgba(167,139,250,0.60)"
          letterSpacing="-0.5"
        >OA</text>
      </svg>
      {big && (
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 7.5,
          fontWeight: 500,
          color: 'rgba(167,139,250,0.28)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>OpenAlex</span>
      )}
    </div>
  );
}

// ─── INSPIRE-HEP ──────────────────────────────────────────────────────────────
// Particle-track arc radiating from a central point — physics detector aesthetic.
function InspireHepLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  const d = big ? 68 : 36;
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 5 : 2 }}>
      <svg width={d} height={d} viewBox="0 0 68 68" fill="none" aria-hidden="true">
        {/* Central vertex */}
        <circle cx="34" cy="34" r={big ? 3.5 : 2.5} fill="rgba(251,146,60,0.65)" />
        {/* Particle tracks radiating outward — evocative of HEP detector hits */}
        {[0, 38, 75, 115, 155, 205, 255, 305].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const r1 = big ? 7 : 5;
          const r2 = big ? 28 + (i % 3) * 4 : 15 + (i % 3) * 2;
          const x1 = 34 + r1 * Math.cos(rad);
          const y1 = 34 + r1 * Math.sin(rad);
          const x2 = 34 + r2 * Math.cos(rad);
          const y2 = 34 + r2 * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={`rgba(251,146,60,${0.22 + (i % 3) * 0.06})`}
              strokeWidth={big ? 1.2 : 0.8}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {big && (
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 7.5,
          fontWeight: 600,
          color: 'rgba(251,146,60,0.30)',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
        }}>INSPIRE-HEP</span>
      )}
    </div>
  );
}

// ─── CORE ─────────────────────────────────────────────────────────────────────
// Clean rectangular "CORE" wordmark — the aggregator brand is bold, institutional.
function CoreLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 5 : 2 }}>
      <span style={{
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontSize: big ? 38 : 18,
        fontWeight: 900,
        color: 'rgba(34,211,238,0.50)',
        letterSpacing: big ? '0.14em' : '0.10em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}>CORE</span>
      {big && (
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 7,
          fontWeight: 400,
          color: 'rgba(34,211,238,0.24)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>Research Aggregator</span>
      )}
    </div>
  );
}

// ─── Books / Library ──────────────────────────────────────────────────────────
// Minimalist SVG open book with a single elegant stroke-line spine.
function BookLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  const d = big ? 64 : 34;
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 5 : 2 }}>
      <svg width={d} height={d * 0.75} viewBox="0 0 64 48" fill="none" aria-hidden="true">
        {/* Left page */}
        <path
          d="M32 40 C32 40 10 36 6 8 L32 8 Z"
          stroke="rgba(244,114,182,0.44)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          fill="rgba(244,114,182,0.05)"
        />
        {/* Right page */}
        <path
          d="M32 40 C32 40 54 36 58 8 L32 8 Z"
          stroke="rgba(244,114,182,0.44)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          fill="rgba(244,114,182,0.05)"
        />
        {/* Spine */}
        <line x1="32" y1="8" x2="32" y2="42" stroke="rgba(244,114,182,0.55)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Text lines on left page */}
        {big && [15, 20, 25].map(y => (
          <line key={y} x1="13" y1={y} x2="28" y2={y - 1} stroke="rgba(244,114,182,0.16)" strokeWidth="1" strokeLinecap="round" />
        ))}
        {/* Text lines on right page */}
        {big && [15, 20, 25].map(y => (
          <line key={y} x1="36" y1={y - 1} x2="51" y2={y} stroke="rgba(244,114,182,0.16)" strokeWidth="1" strokeLinecap="round" />
        ))}
      </svg>
      {big && (
        <span style={{
          fontFamily: 'Georgia, serif',
          fontSize: 8,
          fontWeight: 400,
          color: 'rgba(244,114,182,0.28)',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
        }}>Library</span>
      )}
    </div>
  );
}

// ─── NASA ─────────────────────────────────────────────────────────────────────
// "NASA" meatball-inspired: elliptical orbit around the letters.
function NasaLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 5 : 2 }}>
      <div className="relative flex items-center justify-center" style={{ width: big ? 80 : 42, height: big ? 50 : 26 }}>
        {/* Elliptical orbit stripe behind the wordmark */}
        <svg
          className="absolute inset-0"
          width={big ? 80 : 42}
          height={big ? 50 : 26}
          viewBox="0 0 80 50"
          fill="none"
          aria-hidden="true"
        >
          <ellipse
            cx="40" cy="25" rx="37" ry="16"
            stroke="rgba(56,189,248,0.28)"
            strokeWidth="1.4"
            fill="none"
            transform="rotate(-12 40 25)"
          />
        </svg>
        {/* NASA wordmark */}
        <span style={{
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontSize: big ? 22 : 12,
          fontWeight: 900,
          color: 'rgba(56,189,248,0.55)',
          letterSpacing: big ? '0.10em' : '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>NASA</span>
      </div>
    </div>
  );
}

// ─── ESA ──────────────────────────────────────────────────────────────────────
// "ESA" wordmark with subtle star-field dots.
function EsaLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  const stars = big
    ? [{ x: 12, y: 18 }, { x: 68, y: 12 }, { x: 55, y: 38 }, { x: 20, y: 42 }, { x: 40, y: 8 }]
    : [];
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 5 : 2 }}>
      <div className="relative flex items-center justify-center" style={{ width: big ? 80 : 44, height: big ? 50 : 28 }}>
        {big && (
          <svg className="absolute inset-0" width="80" height="50" viewBox="0 0 80 50" fill="none" aria-hidden="true">
            {stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={0.9 + (i % 2) * 0.4} fill={`rgba(96,165,250,${0.18 + (i % 3) * 0.08})`} />
            ))}
          </svg>
        )}
        <span style={{
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontSize: big ? 28 : 15,
          fontWeight: 900,
          color: 'rgba(96,165,250,0.55)',
          letterSpacing: big ? '0.22em' : '0.14em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>ESA</span>
      </div>
      {big && (
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 7,
          fontWeight: 400,
          color: 'rgba(96,165,250,0.24)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>European Space Agency</span>
      )}
    </div>
  );
}

// ─── CERN ─────────────────────────────────────────────────────────────────────
// Atom rings — evokes CERN's accelerator aesthetic.
function CernLogo({ size }: { size: 'full' | 'compact' }) {
  const big = size === 'full';
  const d = big ? 64 : 34;
  return (
    <div className="flex flex-col items-center select-none" style={{ gap: big ? 5 : 2 }}>
      <svg width={d} height={d} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        {/* Nucleus */}
        <circle cx="32" cy="32" r={big ? 4 : 3} fill="rgba(192,132,252,0.55)" />
        {/* Orbit 1 */}
        <ellipse cx="32" cy="32" rx="28" ry="10" stroke="rgba(192,132,252,0.30)" strokeWidth="1.2" fill="none" />
        {/* Orbit 2 — rotated 60° */}
        <ellipse cx="32" cy="32" rx="28" ry="10" stroke="rgba(192,132,252,0.22)" strokeWidth="1.2" fill="none" transform="rotate(60 32 32)" />
        {/* Orbit 3 — rotated 120° */}
        <ellipse cx="32" cy="32" rx="28" ry="10" stroke="rgba(192,132,252,0.22)" strokeWidth="1.2" fill="none" transform="rotate(120 32 32)" />
      </svg>
      {big && (
        <span style={{
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontSize: 9,
          fontWeight: 700,
          color: 'rgba(192,132,252,0.30)',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
        }}>CERN</span>
      )}
    </div>
  );
}

// ─── Source logo config ───────────────────────────────────────────────────────
interface LogoCfg {
  bg: string;
  radial: string;
  Logo: React.FC<{ size: 'full' | 'compact' }>;
}

const SOURCE_LOGO_MAP: Record<string, LogoCfg> = {
  arxiv:           { bg: '#030f06', radial: 'rgba(52,211,153,0.07)',   Logo: ArxivLogo },
  wiki:            { bg: '#120c00', radial: 'rgba(251,191,36,0.07)',   Logo: WikipediaLogo },
  wikipedia:       { bg: '#120c00', radial: 'rgba(251,191,36,0.07)',   Logo: WikipediaLogo },
  semanticscholar: { bg: '#001512', radial: 'rgba(45,212,191,0.07)',   Logo: SemanticScholarLogo },
  openalex:        { bg: '#0a0018', radial: 'rgba(167,139,250,0.07)',  Logo: OpenAlexLogo },
  inspirehep:      { bg: '#120600', radial: 'rgba(251,146,60,0.07)',   Logo: InspireHepLogo },
  book:            { bg: '#120009', radial: 'rgba(244,114,182,0.07)',  Logo: BookLogo },
  nasa:            { bg: '#000b14', radial: 'rgba(56,189,248,0.07)',   Logo: NasaLogo },
  esa:             { bg: '#00060f', radial: 'rgba(96,165,250,0.07)',   Logo: EsaLogo },
  cern:            { bg: '#07000f', radial: 'rgba(192,132,252,0.07)',  Logo: CernLogo },
  core:            { bg: '#000c10', radial: 'rgba(34,211,238,0.07)',   Logo: CoreLogo },
};

const DEFAULT_LOGO_CFG: LogoCfg = {
  bg: '#08080f',
  radial: 'rgba(99,102,241,0.05)',
  Logo: () => (
    <span style={{
      fontFamily: 'Georgia, serif',
      fontSize: 32,
      color: 'rgba(148,163,184,0.40)',
      lineHeight: 1,
    }}>◈</span>
  ),
};

function getLogoCfg(source: string): LogoCfg {
  return SOURCE_LOGO_MAP[source.toLowerCase()] ?? DEFAULT_LOGO_CFG;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full-size source logo — fills `absolute inset-0` of a card image area.
 * Centres the logo on a characteristic dark glassmorphism background.
 */
export function SourceLogo({ source, lm }: { source: string; lm?: boolean }) {
  if (lm) {
    // Light-mode: neutral light glass, desaturated
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,rgba(0,0,0,0.03) 0%,transparent 100%)' }} />
        <div style={{ opacity: 0.5 }}>
          <SourceLogoInner source={source} size="full" />
        </div>
      </div>
    );
  }

  const { bg, radial, Logo } = getLogoCfg(source);
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: bg }}>
      {/* Radial glow centred on logo */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${radial} 0%, transparent 100%)` }}
      />
      {/* Fine grid texture at near-zero opacity */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative flex items-center justify-center">
        <Logo size="full" />
      </div>
    </div>
  );
}

/**
 * Compact strip — fills a narrow `w-16 / w-20` thumbnail column.
 * The background is the same characteristic dark tone; logo is scaled down.
 */
export function SourceLogoStrip({ source, lm }: { source: string; lm?: boolean }) {
  if (lm) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div style={{ opacity: 0.45 }}>
          <SourceLogoInner source={source} size="compact" />
        </div>
      </div>
    );
  }

  const { bg, radial, Logo } = getLogoCfg(source);
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: bg }}>
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${radial} 0%, transparent 100%)` }}
      />
      <div className="relative flex items-center justify-center">
        <Logo size="compact" />
      </div>
    </div>
  );
}

/** Internal helper — just renders the logo component without any container. */
function SourceLogoInner({ source, size }: { source: string; size: 'full' | 'compact' }) {
  const { Logo } = getLogoCfg(source);
  return <Logo size={size} />;
}

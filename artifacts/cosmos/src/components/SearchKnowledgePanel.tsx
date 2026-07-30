import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Film, BookOpen, FileText, Globe, Satellite, Library,
  Sparkles, Tags, Search, TrendingUp, Clock, Star,
  Rocket, ChevronRight, ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import type { SearchSections, SectionItem } from './NasaSearch';

// ─── Shared mini section header ───────────────────────────────────────────────
function MiniSectionHeader({ icon: Icon, label, sub, count, lm }: {
  icon: LucideIcon; label: string; sub?: string; count?: number; lm?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4 px-0.5">
      <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${lm ? 'bg-gray-100 border border-gray-200' : 'bg-white/[0.07] border border-white/[0.10]'}`}>
        <Icon size={11} strokeWidth={2} className={lm ? 'text-gray-500' : 'text-white/60'} />
      </div>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className={`text-[12px] font-semibold tracking-wide flex-shrink-0 ${lm ? 'text-gray-800' : 'text-white/85'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{label}</span>
        {sub && <span className={`text-[9.5px] uppercase tracking-[0.18em] truncate ${lm ? 'text-gray-400' : 'text-white/28'}`}>{sub}</span>}
      </div>
      {count !== undefined && (
        <span className={`flex-shrink-0 text-[9px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full border ${lm ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/[0.06] border-white/[0.09] text-white/35'}`}>{count}</span>
      )}
      <div className="flex-1 h-px min-w-0" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} />
    </div>
  );
}

// ─── Compact research row ─────────────────────────────────────────────────────
function CompactResearchRow({ item, idx, lm }: { item: SectionItem; idx: number; lm?: boolean }) {
  return (
    <motion.a
      href={item.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex items-start gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
        lm
          ? 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
          : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.045] backdrop-blur-sm'
      }`}
    >
      {/* Index bubble */}
      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold tabular-nums mt-0.5 ${lm ? 'bg-gray-100 text-gray-500' : 'bg-white/[0.07] text-white/38'}`}>
        {idx + 1}
      </span>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium leading-snug line-clamp-2 mb-1 ${lm ? 'text-gray-900' : 'text-white/85'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {item.date && (
            <span className={`text-[9px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/25'}`}>
              {item.date.length === 4 ? item.date : item.date.slice(0, 7)}
            </span>
          )}
          {item.authors && item.authors.length > 0 && (
            <span className={`text-[9px] truncate max-w-[130px] ${lm ? 'text-gray-400' : 'text-white/25'}`}>
              {item.authors[0]}{item.authors.length > 1 ? ' et al.' : ''}
            </span>
          )}
          {item.citationCount !== undefined && item.citationCount > 0 && (
            <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full border ${lm ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-white/[0.04] border-white/[0.08] text-white/30'}`}>
              {item.citationCount.toLocaleString()} citations
            </span>
          )}
        </div>
      </div>
      <ExternalLink size={10} strokeWidth={2} className={`flex-shrink-0 mt-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${lm ? 'text-gray-400' : 'text-white/35'}`} />
    </motion.a>
  );
}

// ─── Compact NASA row ──────────────────────────────────────────────────────────
function CompactNasaRow({ item, idx, lm }: { item: SectionItem; idx: number; lm?: boolean }) {
  return (
    <motion.a
      href={item.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
        lm
          ? 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
          : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.045] backdrop-blur-sm'
      }`}
    >
      {/* Thumbnail */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden border ${lm ? 'border-gray-200 bg-sky-50' : 'border-white/[0.08] bg-sky-950/40'}`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Rocket size={14} strokeWidth={1.5} className={lm ? 'text-sky-400' : 'text-sky-400/60'} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium leading-snug line-clamp-1 ${lm ? 'text-gray-900' : 'text-white/85'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}>
          {item.title}
        </p>
        {item.date && (
          <span className={`text-[9px] tabular-nums mt-0.5 ${lm ? 'text-gray-400' : 'text-white/28'}`}>
            {item.date.slice(0, 10)}
          </span>
        )}
      </div>
      <ChevronRight size={12} strokeWidth={2} className={`flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5 ${lm ? 'text-gray-300 group-hover:text-gray-500' : 'text-white/20 group-hover:text-white/45'}`} />
    </motion.a>
  );
}

// ─── 1. Knowledge Coverage Panel ──────────────────────────────────────────────
export interface KnowledgeCoverageProps {
  sections: SearchSections;
  lm?: boolean;
}

interface CovItem {
  icon: LucideIcon;
  label: string;
  count: number;
  accent: string;
  accentLight: string;
  bgDark: string;
  bgLight: string;
  borderDark: string;
  borderLight: string;
  tooltip: string;
}

export function KnowledgeCoverage({ sections, lm }: KnowledgeCoverageProps) {
  const items: CovItem[] = useMemo(() => [
    {
      icon: Film,
      label: 'Videos',
      count: sections.videos?.length ?? 0,
      accent: '#f87171',
      accentLight: '#dc2626',
      bgDark: 'rgba(239,68,68,0.08)',
      bgLight: 'rgb(254,242,242)',
      borderDark: 'rgba(239,68,68,0.16)',
      borderLight: 'rgb(254,202,202)',
      tooltip: 'YouTube science videos from curated channels',
    },
    {
      icon: BookOpen,
      label: 'Wikipedia',
      count: sections.wikipedia?.length ?? 0,
      accent: '#fbbf24',
      accentLight: '#d97706',
      bgDark: 'rgba(251,191,36,0.07)',
      bgLight: 'rgb(255,251,235)',
      borderDark: 'rgba(251,191,36,0.14)',
      borderLight: 'rgb(253,230,138)',
      tooltip: 'Wikipedia: Community-built free encyclopedia',
    },
    {
      icon: FileText,
      label: 'Research',
      count: sections.research?.length ?? 0,
      accent: '#34d399',
      accentLight: '#059669',
      bgDark: 'rgba(52,211,153,0.07)',
      bgLight: 'rgb(236,253,245)',
      borderDark: 'rgba(52,211,153,0.14)',
      borderLight: 'rgb(167,243,208)',
      tooltip: 'arXiv · OpenAlex · Semantic Scholar · INSPIRE-HEP',
    },
    {
      icon: Globe,
      label: 'NASA',
      count: sections.nasa?.length ?? 0,
      accent: '#38bdf8',
      accentLight: '#0284c7',
      bgDark: 'rgba(56,189,248,0.07)',
      bgLight: 'rgb(240,249,255)',
      borderDark: 'rgba(56,189,248,0.14)',
      borderLight: 'rgb(186,230,253)',
      tooltip: 'NASA: Official space imagery and mission data',
    },
    {
      icon: Satellite,
      label: 'ESA',
      count: sections.esa?.length ?? 0,
      accent: '#818cf8',
      accentLight: '#4f46e5',
      bgDark: 'rgba(129,140,248,0.07)',
      bgLight: 'rgb(238,242,255)',
      borderDark: 'rgba(129,140,248,0.14)',
      borderLight: 'rgb(199,210,254)',
      tooltip: 'ESA Hubble: European Space Agency telescope imagery',
    },
    {
      icon: Library,
      label: 'Books',
      count: sections.books?.length ?? 0,
      accent: '#f472b6',
      accentLight: '#db2777',
      bgDark: 'rgba(244,114,182,0.07)',
      bgLight: 'rgb(253,242,248)',
      borderDark: 'rgba(244,114,182,0.14)',
      borderLight: 'rgb(251,207,232)',
      tooltip: 'OpenAlex: Academic books and peer-reviewed works',
    },
    {
      icon: Sparkles,
      label: 'AI Summary',
      count: sections.aiSummary?.text ? 1 : 0,
      accent: '#a78bfa',
      accentLight: '#7c3aed',
      bgDark: 'rgba(167,139,250,0.08)',
      bgLight: 'rgb(245,243,255)',
      borderDark: 'rgba(167,139,250,0.16)',
      borderLight: 'rgb(221,214,254)',
      tooltip: 'Groq AI: Synthesized overview from all sources',
    },
    {
      icon: Tags,
      label: 'Topics',
      count: sections.relatedTopics?.length ?? 0,
      accent: '#94a3b8',
      accentLight: '#475569',
      bgDark: 'rgba(148,163,184,0.07)',
      bgLight: 'rgb(248,250,252)',
      borderDark: 'rgba(148,163,184,0.12)',
      borderLight: 'rgb(226,232,240)',
      tooltip: 'Related topics extracted from research metadata',
    },
  ], [sections]);

  // Bug #2 fix: hide zero-count badges entirely — showing "0" reads as broken
  const visibleItems = useMemo(() => items.filter(item => item.count > 0), [items]);

  if (visibleItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3 px-0.5">
        <span className={`text-[9.5px] uppercase tracking-[0.24em] font-semibold ${lm ? 'text-gray-400' : 'text-white/30'}`}>
          Knowledge Coverage
        </span>
        <div className="flex-1 h-px" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} />
      </div>

      {/* Pill grid — horizontal scroll on mobile, only non-zero sources */}
      <div className="flex gap-2 flex-wrap">
        {visibleItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-default"
              style={{
                background: lm ? item.bgLight : item.bgDark,
                borderColor: lm ? item.borderLight : item.borderDark,
              }}
            >
              <Icon size={10} strokeWidth={2} style={{ color: lm ? item.accentLight : item.accent, flexShrink: 0 }} />
              <span className={`text-[10px] font-medium ${lm ? 'text-gray-600' : 'text-white/60'}`}>{item.label}</span>
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: lm ? item.accentLight : item.accent }}
              >
                {item.count}
              </span>

              {/* Tooltip */}
              <div
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50
                  opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap"
                role="tooltip"
              >
                <div className={`text-[10.5px] leading-snug px-2.5 py-1.5 rounded-lg border shadow-xl ${
                  lm
                    ? 'bg-white border-gray-200/80 text-gray-700 shadow-black/[0.10]'
                    : 'bg-[#0e0e1f] border-white/[0.13] text-white/80 shadow-black/70'
                }`}>
                  {item.tooltip}
                </div>
                {/* Arrow */}
                <div className="flex justify-center">
                  <div className={`w-2 h-1 overflow-hidden`}>
                    <div className={`w-2 h-2 rotate-45 -translate-y-1 border-r border-b ${
                      lm ? 'bg-white border-gray-200/80' : 'bg-[#0e0e1f] border-white/[0.13]'
                    }`} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── 2. Related Topics (inline, below AI Summary) ────────────────────────────
export function InlineRelatedTopics({ topics, onSearch, lm }: {
  topics: string[]; onSearch?: (t: string) => void; lm?: boolean;
}) {
  if (!topics || topics.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <MiniSectionHeader icon={Tags} label="Related Topics" count={topics.length} lm={lm} />
      <div className="flex flex-wrap gap-2">
        {topics.map((t, i) => (
          <motion.button
            key={t}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            onClick={() => onSearch?.(t)}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
              lm
                ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'bg-white/[0.04] border-white/[0.09] text-white/50 hover:border-white/[0.22] hover:text-white/80 hover:bg-white/[0.08]'
            }`}
          >
            <Tags size={9} strokeWidth={2} />
            {t}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── 3. Suggested Searches ────────────────────────────────────────────────────
// Bug #4: use current year dynamically (or year-agnostic phrasing)
// Bug #5: never concat a topic with itself; use natural follow-up phrasing
const CURRENT_YEAR = new Date().getFullYear();

// Natural, human-sounding follow-up phrasing templates
const TOPIC_TEMPLATES: ReadonlyArray<(t: string) => string> = [
  t => `How does ${t} work`,
  t => `${t} explained simply`,
  t => `Latest ${t} discoveries`,
  t => `${t} breakthroughs ${CURRENT_YEAR}`,
  t => `${t} for beginners`,
  t => `${t} vs quantum mechanics`,
  t => `The future of ${t}`,
  t => `${t} real-world applications`,
];

const QUERY_TEMPLATES: ReadonlyArray<(q: string) => string> = [
  q => `Latest ${q} discoveries`,
  q => `${q} research ${CURRENT_YEAR}`,
  q => `How does ${q} work`,
  q => `${q} explained simply`,
  q => `${q} future breakthroughs`,
  q => `${q} for beginners`,
  q => `${q} open questions`,
];

export function SuggestedSearches({ query, relatedTopics, onSearch, lm }: {
  query: string; relatedTopics: string[]; onSearch?: (q: string) => void; lm?: boolean;
}) {
  const suggestions = useMemo(() => {
    const q = query.trim();
    const qLower = q.toLowerCase();

    // Bug #5 fix: only use topics that are NOT the same as (or a substring of) the query
    const distinctTopics = relatedTopics.filter(t => {
      const tLower = t.toLowerCase();
      return tLower !== qLower && !tLower.includes(qLower) && !qLower.includes(tLower);
    }).slice(0, 4);

    const candidates: string[] = [];

    // Generate phrased suggestions from distinct related topics
    distinctTopics.forEach((t, i) => {
      const template = TOPIC_TEMPLATES[i % TOPIC_TEMPLATES.length];
      candidates.push(template(t));
    });

    // Generate phrased suggestions from the query itself (year-agnostic)
    if (q) {
      QUERY_TEMPLATES.slice(0, 3).forEach(fn => candidates.push(fn(q)));
    }

    // Dedupe case-insensitively, skip anything that exactly equals the current query
    const seen = new Set<string>([qLower]);
    const result: string[] = [];
    for (const s of candidates) {
      const norm = s.trim();
      const normLower = norm.toLowerCase();
      if (norm && !seen.has(normLower)) {
        seen.add(normLower);
        result.push(norm);
        if (result.length >= 7) break;
      }
    }
    return result;
  }, [query, relatedTopics]);

  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <MiniSectionHeader icon={Search} label="Suggested Searches" lm={lm} />
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            onClick={() => onSearch?.(s)}
            className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all duration-200 ${
              lm
                ? 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-[0_2px_10px_rgba(0,0,0,0.07)] text-gray-700 hover:text-gray-900'
                : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.13] hover:bg-white/[0.04] text-white/55 hover:text-white/80'
            }`}
          >
            <Search size={10} strokeWidth={2} className={`flex-shrink-0 transition-colors duration-200 ${lm ? 'text-gray-300 group-hover:text-gray-500' : 'text-white/20 group-hover:text-white/45'}`} />
            <span className="text-[12px] font-medium flex-1 text-left leading-snug">{s}</span>
            <ChevronRight size={11} strokeWidth={2} className={`flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5 ${lm ? 'text-gray-300 group-hover:text-gray-500' : 'text-white/18 group-hover:text-white/40'}`} />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── 4. Latest Research ───────────────────────────────────────────────────────
export function LatestResearch({ research, lm }: { research: SectionItem[]; lm?: boolean }) {
  const latest = useMemo(() =>
    [...research]
      .filter(r => r.date && r.date.length >= 4)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, 4),
    [research]
  );

  if (latest.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <MiniSectionHeader icon={Clock} label="Latest Research" sub="most recent" count={latest.length} lm={lm} />
      <div className="flex flex-col gap-2">
        {latest.map((item, i) => (
          <CompactResearchRow key={item.id} item={item} idx={i} lm={lm} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── 5. Trending Research (genuinely different from Popular Papers) ────────────
// Bug #3 fix: show papers published in the last 12 months only, sorted by citations.
// This makes it distinct from PopularPapers (which shows all-time highest citations).
export function TrendingResearch({ research, lm }: { research: SectionItem[]; lm?: boolean }) {
  const trending = useMemo(() => {
    // Compute the 12-month cutoff (YYYY or YYYY-MM prefix comparison)
    const now = new Date();
    const cutoffYear = now.getFullYear() - 1;
    // "Recent" = published year >= cutoffYear, i.e. last ~12 months
    const cutoffPrefix = String(cutoffYear);

    return [...research]
      .filter(r => {
        if ((r.citationCount ?? 0) <= 0) return false;
        if (!r.date) return false;
        // Compare the first 4 chars (year) to the cutoff year
        return r.date.slice(0, 4) >= cutoffPrefix;
      })
      .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0))
      .slice(0, 4);
  }, [research]);

  // If no recent papers found, skip this section entirely — PopularPapers covers all-time
  if (trending.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <MiniSectionHeader
        icon={TrendingUp}
        label="Recent Highlights"
        sub={`last 12 months · by citations`}
        count={trending.length}
        lm={lm}
      />
      <div className="flex flex-col gap-2">
        {trending.map((item, i) => (
          <CompactResearchRow key={item.id} item={item} idx={i} lm={lm} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── 6. Featured NASA Articles ────────────────────────────────────────────────
export function FeaturedNASA({ nasa, lm }: { nasa: SectionItem[]; lm?: boolean }) {
  const featured = useMemo(() => nasa.slice(0, 4), [nasa]);

  if (featured.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <MiniSectionHeader icon={Globe} label="Featured NASA" sub="Image Library" count={featured.length} lm={lm} />
      <div className="flex flex-col gap-2">
        {featured.map((item, i) => (
          <CompactNasaRow key={item.id} item={item} idx={i} lm={lm} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── 7. Popular Papers (all-time most cited) ──────────────────────────────────
// Bug #3 fix: this section keeps its all-time ranking. TrendingResearch is now
// time-filtered so the two sections show genuinely different results.
export function PopularPapers({ research, books, lm }: {
  research: SectionItem[]; books: SectionItem[]; lm?: boolean;
}) {
  const popular = useMemo(() =>
    [...research, ...books]
      .filter(r => (r.citationCount ?? 0) > 0)
      .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0))
      .slice(0, 3),
    [research, books]
  );

  if (popular.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <MiniSectionHeader icon={Star} label="Most Cited" sub="all-time" count={popular.length} lm={lm} />
      <div className="flex flex-col gap-2">
        {popular.map((item, i) => (
          <motion.a
            key={item.id}
            href={item.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={`group flex items-start gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${
              lm
                ? 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.045] backdrop-blur-sm'
            }`}
          >
            {/* Rank badge */}
            <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5 ${
              i === 0
                ? lm ? 'bg-amber-100 text-amber-600' : 'bg-amber-400/15 text-amber-300'
                : i === 1
                  ? lm ? 'bg-gray-100 text-gray-500' : 'bg-white/[0.06] text-white/35'
                  : lm ? 'bg-orange-50 text-orange-500' : 'bg-orange-400/10 text-orange-300/70'
            }`}>
              <Star size={9} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-medium leading-snug line-clamp-2 mb-1 ${lm ? 'text-gray-900' : 'text-white/85'}`}
                style={{ fontFamily: 'var(--app-font-heading)' }}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {item.authors && item.authors.length > 0 && (
                  <span className={`text-[9px] ${lm ? 'text-gray-400' : 'text-white/25'}`}>
                    {item.authors[0]}{item.authors.length > 1 ? ' et al.' : ''}
                  </span>
                )}
                <span className={`text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  i === 0
                    ? lm ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-amber-400/12 border-amber-400/20 text-amber-300'
                    : lm ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-white/[0.04] border-white/[0.08] text-white/30'
                }`}>
                  {(item.citationCount ?? 0).toLocaleString()} citations
                </span>
              </div>
            </div>
            <ExternalLink size={10} strokeWidth={2} className={`flex-shrink-0 mt-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${lm ? 'text-gray-400' : 'text-white/35'}`} />
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
}

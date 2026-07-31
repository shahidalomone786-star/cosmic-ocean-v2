/**
 * DiscoveryPanel — four science-discovery sections rendered below the
 * knowledge-panels block, all-mode only, zero external graph libraries.
 *
 * 1. People Also Explored  — topic chips  (useDiscovery → /api/discovery/topics)
 * 2. Key Researchers        — author cards (useDiscovery → /api/discovery/authors)
 * 3. Knowledge Connections  — concept flow (useDiscovery → /api/discovery/connections)
 * 4. Related Discoveries    — derived from existing sections.research + sections.nasa
 *
 * Design rules (preserved):
 *  - Dark cosmic glassmorphism in dark mode, clean white cards in light mode
 *  - transform/opacity-only animations (framer-motion honours prefers-reduced-motion)
 *  - React.memo on every sub-section; useMemo for derived data
 *  - ARIA labels, keyboard support, visible focus rings
 */

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Compass, Users, Waypoints, FlaskConical,
  ExternalLink, ChevronRight, type LucideIcon,
} from 'lucide-react';
import type { SearchSections, SectionItem } from './NasaSearch';
import { useDiscovery, type DiscoveryTopic, type DiscoveryAuthor, type DiscoveryConnection } from '../hooks/useDiscovery';

// ─── Shared tiny header (mirrors MiniSectionHeader in SearchKnowledgePanel) ───

function PanelHeader({
  icon: Icon, label, sub, count, lm,
}: {
  icon: LucideIcon; label: string; sub?: string; count?: number; lm?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4 px-0.5" role="heading" aria-level={3}>
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
          lm
            ? 'bg-gray-100 border border-gray-200'
            : 'bg-white/[0.07] border border-white/[0.10]'
        }`}
      >
        <Icon size={11} strokeWidth={2} className={lm ? 'text-gray-500' : 'text-white/60'} aria-hidden="true" />
      </div>
      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className={`text-[12px] font-semibold tracking-wide flex-shrink-0 ${lm ? 'text-gray-800' : 'text-white/85'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}
        >
          {label}
        </span>
        {sub && (
          <span className={`text-[9.5px] uppercase tracking-[0.18em] truncate ${lm ? 'text-gray-400' : 'text-white/28'}`}>
            {sub}
          </span>
        )}
      </div>
      {count !== undefined && (
        <span
          className={`flex-shrink-0 text-[9px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full border ${
            lm
              ? 'bg-gray-100 border-gray-200 text-gray-500'
              : 'bg-white/[0.06] border-white/[0.09] text-white/35'
          }`}
          aria-label={`${count} items`}
        >
          {count}
        </span>
      )}
      <div
        className="flex-1 h-px min-w-0"
        style={{
          background: lm
            ? 'linear-gradient(90deg,#e5e7eb,transparent)'
            : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// ─── 1. People Also Explored ──────────────────────────────────────────────────

interface PeopleAlsoExploredProps {
  topics: DiscoveryTopic[];
  onSearch?: (q: string) => void;
  lm?: boolean;
}

const PeopleAlsoExplored = memo(function PeopleAlsoExplored({
  topics, onSearch, lm,
}: PeopleAlsoExploredProps) {
  if (topics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="mb-7"
      aria-label="People Also Explored"
    >
      <PanelHeader
        icon={Compass}
        label="People Also Explored"
        sub="OpenAlex · Wikipedia"
        count={topics.length}
        lm={lm}
      />
      <div className="flex flex-wrap gap-2" role="list">
        {topics.map((t, i) => (
          <motion.button
            key={t.label}
            role="listitem"
            type="button"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: i * 0.025, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onSearch?.(t.query)}
            aria-label={`Explore ${t.label}`}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-1 ${
              lm
                ? 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:shadow-[0_2px_8px_rgba(139,92,246,0.12)] focus-visible:ring-offset-white'
                : 'bg-white/[0.04] border-white/[0.09] text-white/52 hover:border-violet-400/40 hover:text-violet-300 hover:bg-violet-500/[0.07] focus-visible:ring-offset-transparent'
            }`}
          >
            <Compass size={9} strokeWidth={2} aria-hidden="true" />
            {t.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

// ─── 2. Key Researchers ───────────────────────────────────────────────────────

interface KeyResearchersProps {
  authors: DiscoveryAuthor[];
  lm?: boolean;
}

const KeyResearchers = memo(function KeyResearchers({
  authors, lm,
}: KeyResearchersProps) {
  if (authors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="mb-7"
      aria-label="Key Researchers"
    >
      <PanelHeader
        icon={Users}
        label="Key Researchers"
        sub="OpenAlex · Semantic Scholar · INSPIRE-HEP"
        count={authors.length}
        lm={lm}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="list">
        {authors.map((a, i) => (
          <AuthorCard key={`${a.name}-${a.source}`} author={a} idx={i} lm={lm} />
        ))}
      </div>
    </motion.div>
  );
});

const AuthorCard = memo(function AuthorCard({
  author, idx, lm,
}: {
  author: DiscoveryAuthor; idx: number; lm?: boolean;
}) {
  const sourceLabel: Record<string, string> = {
    openalex:        'OpenAlex',
    semanticscholar: 'Semantic Scholar',
    inspirehep:      'INSPIRE-HEP',
  };
  const srcDisplay = sourceLabel[author.source] ?? author.source;

  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex items-start gap-3 px-3.5 py-3 rounded-2xl border transition-all duration-200 ${
        lm
          ? 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)]'
          : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04] backdrop-blur-sm'
      }`}
    >
      {/* Avatar initials */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold select-none ${
          lm
            ? 'bg-violet-50 text-violet-600 border border-violet-100'
            : 'bg-violet-500/[0.12] text-violet-300 border border-violet-400/[0.18]'
        }`}
        aria-hidden="true"
      >
        {author.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[12px] font-semibold leading-snug truncate mb-0.5 ${lm ? 'text-gray-900' : 'text-white/85'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}
        >
          {author.name}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] uppercase tracking-[0.14em] ${lm ? 'text-gray-400' : 'text-white/25'}`}>
            {srcDisplay}
          </span>
          {author.paperCount !== undefined && author.paperCount > 0 && (
            <span className={`text-[9px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/28'}`}>
              {author.paperCount.toLocaleString()} papers
            </span>
          )}
          {author.citationCount !== undefined && author.citationCount > 0 && (
            <span
              className={`text-[8.5px] px-1.5 py-0.5 rounded-full border tabular-nums ${
                lm
                  ? 'bg-gray-50 border-gray-200 text-gray-500'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/30'
              }`}
            >
              {author.citationCount.toLocaleString()} cit.
            </span>
          )}
          {author.hIndex !== undefined && (
            <span className={`text-[8.5px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/25'}`}>
              h={author.hIndex}
            </span>
          )}
        </div>
      </div>

      {/* Profile link */}
      {author.profileUrl && (
        <a
          href={author.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${author.name}'s profile`}
          onClick={e => e.stopPropagation()}
          className={`flex-shrink-0 flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-lg border transition-all duration-200 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
            lm
              ? 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
              : 'border-white/[0.08] text-white/25 hover:border-white/[0.2] hover:text-white/55'
          }`}
        >
          <ExternalLink size={8} strokeWidth={2} aria-hidden="true" />
        </a>
      )}
    </motion.div>
  );
});

// ─── 3. Knowledge Connections ─────────────────────────────────────────────────

interface KnowledgeConnectionsProps {
  connections: DiscoveryConnection[];
  lm?: boolean;
}

/** Group connections by concept; take the concept with the most edges first */
function groupConnections(
  connections: DiscoveryConnection[],
): Map<string, DiscoveryConnection[]> {
  const map = new Map<string, DiscoveryConnection[]>();
  for (const c of connections) {
    const key = c.concept;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  // Sort by number of connections descending
  return new Map(
    [...map.entries()].sort((a, b) => b[1].length - a[1].length),
  );
}

const RELATION_LABEL: Record<string, string> = {
  broader:  'broader field',
  narrower: 'sub-field of',
  related:  'related to',
  field:    'field of',
};

const KnowledgeConnections = memo(function KnowledgeConnections({
  connections, lm,
}: KnowledgeConnectionsProps) {
  const grouped = useMemo(() => groupConnections(connections), [connections]);

  if (grouped.size === 0) return null;

  // Show at most 3 concept hubs to keep the section compact
  const hubs = [...grouped.entries()].slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="mb-7"
      aria-label="Knowledge Connections"
    >
      <PanelHeader
        icon={Waypoints}
        label="Knowledge Connections"
        sub="OpenAlex · Wikipedia"
        count={connections.length}
        lm={lm}
      />

      <div className="flex flex-col gap-4" role="list">
        {hubs.map(([concept, edges], hi) => (
          <motion.div
            key={concept}
            role="listitem"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: hi * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Hub concept pill */}
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className={`inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-full border ${
                  lm
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-indigo-500/[0.10] border-indigo-400/[0.22] text-indigo-300'
                }`}
                style={{ fontFamily: 'var(--app-font-heading)' }}
              >
                {concept}
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background: lm
                    ? 'linear-gradient(90deg,#c7d2fe,transparent)'
                    : 'linear-gradient(90deg,rgba(129,140,248,0.18),transparent)',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Edge pills — grouped by relation type */}
            {(['broader', 'related', 'narrower'] as const).map(relType => {
              const typeEdges = edges.filter(e => e.relationType === relType).slice(0, 5);
              if (typeEdges.length === 0) return null;
              return (
                <div key={relType} className="flex items-start gap-2 mb-2 pl-2">
                  {/* Relation type label */}
                  <span
                    className={`flex-shrink-0 text-[8.5px] uppercase tracking-[0.14em] mt-1.5 w-16 text-right ${
                      lm ? 'text-gray-400' : 'text-white/25'
                    }`}
                    aria-label={RELATION_LABEL[relType] ?? relType}
                  >
                    {relType}
                  </span>
                  {/* Connector */}
                  <div className={`flex-shrink-0 w-px self-stretch mt-1 ${lm ? 'bg-gray-200' : 'bg-white/[0.08]'}`} aria-hidden="true" />
                  {/* Concept pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {typeEdges.map(e => (
                      <span
                        key={e.relatedTo}
                        className={`inline-flex items-center text-[10px] font-medium px-2.5 py-1 rounded-full border ${
                          lm
                            ? 'bg-white border-gray-200 text-gray-600'
                            : 'bg-white/[0.035] border-white/[0.08] text-white/50'
                        }`}
                      >
                        {e.relatedTo}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

// ─── 4. Related Discoveries ───────────────────────────────────────────────────

// Keywords that signal a discovery, mission, observation, experiment, or theory
const DISCOVERY_RX = /\b(discov|mission|observ|experiment|theor|probe|telescope|launch|detect|breakthrough|first\s|survey|measur|record)\b/i;

function scoreDiscovery(item: SectionItem): number {
  const text = `${item.title} ${item.description ?? ''}`;
  let score = 0;
  if (DISCOVERY_RX.test(item.title)) score += 3;
  if (DISCOVERY_RX.test(text)) score += 1;
  if (item.citationCount && item.citationCount > 50) score += 1;
  if (item.date) score += 0.5;
  return score;
}

const SOURCE_BADGE: Record<string, string> = {
  arxiv:           'arXiv',
  openalex:        'OpenAlex',
  semanticscholar: 'Semantic Scholar',
  inspirehep:      'INSPIRE-HEP',
  nasa:            'NASA',
  esa:             'ESA',
};

interface RelatedDiscoveriesProps {
  research: SectionItem[];
  nasa: SectionItem[];
  lm?: boolean;
}

const RelatedDiscoveries = memo(function RelatedDiscoveries({
  research, nasa, lm,
}: RelatedDiscoveriesProps) {
  const discoveries = useMemo(() => {
    const pool = [...research, ...nasa];
    return pool
      .map(item => ({ item, score: scoreDiscovery(item) }))
      .filter(({ score }) => score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ item }) => item);
  }, [research, nasa]);

  if (discoveries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.13, ease: [0.16, 1, 0.3, 1] }}
      className="mb-7"
      aria-label="Related Discoveries"
    >
      <PanelHeader
        icon={FlaskConical}
        label="Related Discoveries"
        sub="Missions · Theories · Experiments"
        count={discoveries.length}
        lm={lm}
      />
      <div className="flex flex-col gap-2" role="list">
        {discoveries.map((item, i) => (
          <DiscoveryRow key={item.id} item={item} idx={i} lm={lm} />
        ))}
      </div>
    </motion.div>
  );
});

const DiscoveryRow = memo(function DiscoveryRow({
  item, idx, lm,
}: {
  item: SectionItem; idx: number; lm?: boolean;
}) {
  const srcLabel = SOURCE_BADGE[item.source] ?? item.source;

  return (
    <motion.a
      href={item.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      role="listitem"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
      aria-label={`${item.title} — from ${srcLabel}`}
      className={`group flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
        lm
          ? 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)]'
          : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04] backdrop-blur-sm'
      }`}
    >
      {/* Flask icon bubble */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
          lm
            ? 'bg-emerald-50 border border-emerald-100'
            : 'bg-emerald-500/[0.08] border border-emerald-400/[0.15]'
        }`}
        aria-hidden="true"
      >
        <FlaskConical size={11} strokeWidth={2} className={lm ? 'text-emerald-600' : 'text-emerald-400/70'} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[11.5px] font-medium leading-snug line-clamp-1 mb-0.5 ${lm ? 'text-gray-900' : 'text-white/83'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}
        >
          {item.title}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={`text-[8.5px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full border ${
              lm
                ? 'bg-gray-50 border-gray-200 text-gray-500'
                : 'bg-white/[0.04] border-white/[0.08] text-white/30'
            }`}
          >
            {srcLabel}
          </span>
          {item.date && (
            <span className={`text-[9px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/25'}`}>
              {item.date.slice(0, 7)}
            </span>
          )}
        </div>
      </div>

      <ChevronRight
        size={11}
        strokeWidth={2}
        aria-hidden="true"
        className={`flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5 ${lm ? 'text-gray-300 group-hover:text-gray-500' : 'text-white/18 group-hover:text-white/40'}`}
      />
    </motion.a>
  );
});

// ─── Root export ──────────────────────────────────────────────────────────────

interface DiscoveryPanelProps {
  query: string;
  sections: SearchSections;
  onSearch?: (q: string) => void;
  lm?: boolean;
}

const DiscoveryPanel = memo(function DiscoveryPanel({
  query, sections, onSearch, lm,
}: DiscoveryPanelProps) {
  const { topics, authors, connections } = useDiscovery(query);

  const hasAnyContent =
    topics.length > 0 ||
    authors.length > 0 ||
    connections.length > 0 ||
    sections.research.length > 0 ||
    sections.nasa.length > 0;

  if (!hasAnyContent) return null;

  return (
    <section aria-label="Discovery panel">
      {/* Subtle divider */}
      <div
        className={`w-full h-px mb-7 ${lm ? 'bg-gray-100' : 'bg-white/[0.05]'}`}
        aria-hidden="true"
      />

      <PeopleAlsoExplored topics={topics} onSearch={onSearch} lm={lm} />
      <KeyResearchers authors={authors} lm={lm} />
      <KnowledgeConnections connections={connections} lm={lm} />
      <RelatedDiscoveries research={sections.research} nasa={sections.nasa} lm={lm} />
    </section>
  );
});

export default DiscoveryPanel;

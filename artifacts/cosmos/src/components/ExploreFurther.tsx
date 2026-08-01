/**
 * ExploreFurther — context-aware research action buttons
 *
 * Classifies the current query domain (biology / physics+space / chemistry / general)
 * and surfaces 6 relevant exploration prompts that reuse the existing search flow.
 * Each button builds a modified query string and calls onSearch — no separate chat UI.
 *
 * Performance: all work is memoised; component renders at most once per query change.
 */

import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Clock,
  Award,
  Wrench,
  HelpCircle,
  Newspaper,
  Microscope,
  type LucideIcon,
} from 'lucide-react';

// ─── Domain detection ─────────────────────────────────────────────────────────

type Domain = 'biology' | 'physics_space' | 'chemistry' | 'general';

const BIOLOGY_KEYWORDS = [
  'cell', 'dna', 'rna', 'protein', 'gene', 'chromosome', 'organism',
  'bacteria', 'virus', 'evolution', 'anatomy', 'biology', 'microbiology',
  'ecology', 'photosynthesis', 'mitosis', 'meiosis', 'enzyme', 'metabolism',
  'neuron', 'brain', 'immune', 'vaccine', 'antibiotic', 'cancer', 'tumor',
  'genome', 'species', 'mammal', 'tissue', 'organ', 'ecosystem', 'biodiversity',
  'mutation', 'genetics', 'hormone', 'antibody', 'crispr', 'stem cell',
  'allele', 'ribosome', 'mitochondria', 'chloroplast', 'microbiome',
];

const PHYSICS_SPACE_KEYWORDS = [
  'quantum', 'relativity', 'particle', 'physics', 'electron', 'proton',
  'neutron', 'quark', 'boson', 'higgs', 'photon', 'gravity', 'spacetime',
  'dark matter', 'dark energy', 'string theory', 'nuclear', 'fission', 'fusion',
  'radioactive', 'superconductor', 'laser', 'optics', 'black hole', 'galaxy',
  'star', 'nebula', 'supernova', 'cosmos', 'universe', 'nasa', 'esa', 'spacex',
  'mars', 'moon', 'planet', 'asteroid', 'comet', 'telescope', 'hubble',
  'james webb', 'orbit', 'satellite', 'rocket', 'astronaut', 'cosmology',
  'big bang', 'pulsar', 'quasar', 'exoplanet', 'solar', 'milky way',
  'neutron star', 'cosmic', 'interstellar', 'wormhole', 'antimatter',
];

const CHEMISTRY_KEYWORDS = [
  'molecule', 'atom', 'element', 'compound', 'reaction', 'chemistry',
  'periodic', 'bond', 'acid', 'base', 'oxidation', 'polymer', 'organic',
  'inorganic', 'catalyst', 'synthesis', 'biochemistry', 'nanotechnology',
  'carbon', 'oxygen', 'nitrogen', 'hydrogen', 'isotope', 'valence',
];

function detectDomain(query: string): Domain {
  const q = query.toLowerCase();
  const words = new Set(q.split(/\W+/));
  const matches = (terms: string[]) =>
    terms.some(t => (t.includes(' ') ? q.includes(t) : words.has(t)));
  if (matches(BIOLOGY_KEYWORDS))     return 'biology';
  if (matches(PHYSICS_SPACE_KEYWORDS)) return 'physics_space';
  if (matches(CHEMISTRY_KEYWORDS))   return 'chemistry';
  return 'general';
}

// ─── Action definitions ───────────────────────────────────────────────────────

interface ActionDef {
  label: string;
  icon: LucideIcon;
  build: (q: string) => string;
}

const BIOLOGY_ACTIONS: ActionDef[] = [
  { label: 'Explain Simply',        icon: Lightbulb,  build: q => `explain ${q} simply for beginners` },
  { label: 'Evolutionary History',  icon: Clock,      build: q => `${q} evolutionary history and origin` },
  { label: 'Major Discoveries',     icon: Award,      build: q => `major discoveries in ${q} research` },
  { label: 'Medical Applications',  icon: Microscope, build: q => `${q} medical applications and treatments` },
  { label: 'Open Problems',         icon: HelpCircle, build: q => `unsolved problems in ${q} biology` },
  { label: 'Latest Research',       icon: Newspaper,  build: q => `latest ${q} research breakthroughs` },
];

const PHYSICS_SPACE_ACTIONS: ActionDef[] = [
  { label: 'Explain Simply',        icon: Lightbulb,  build: q => `explain ${q} simply` },
  { label: 'Historical Timeline',   icon: Clock,      build: q => `${q} historical timeline and milestones` },
  { label: 'Major Discoveries',     icon: Award,      build: q => `major discoveries ${q}` },
  { label: 'Applications',          icon: Wrench,     build: q => `${q} real world applications technology` },
  { label: 'Open Problems',         icon: HelpCircle, build: q => `unsolved problems ${q} physics` },
  { label: 'Latest Research',       icon: Newspaper,  build: q => `latest ${q} research breakthroughs` },
];

const CHEMISTRY_ACTIONS: ActionDef[] = [
  { label: 'Explain Simply',        icon: Lightbulb,  build: q => `explain ${q} simply` },
  { label: 'Discovery History',     icon: Clock,      build: q => `${q} discovery history and development` },
  { label: 'Major Breakthroughs',   icon: Award,      build: q => `major breakthroughs ${q} chemistry` },
  { label: 'Industrial Uses',       icon: Wrench,     build: q => `${q} industrial applications and uses` },
  { label: 'Open Problems',         icon: HelpCircle, build: q => `unsolved problems ${q} chemistry` },
  { label: 'Latest Research',       icon: Newspaper,  build: q => `latest ${q} research 2024` },
];

const GENERAL_ACTIONS: ActionDef[] = [
  { label: 'Explain Simply',        icon: Lightbulb,  build: q => `explain ${q} simply for beginners` },
  { label: 'Historical Overview',   icon: Clock,      build: q => `${q} history and background` },
  { label: 'Major Discoveries',     icon: Award,      build: q => `major discoveries and milestones ${q}` },
  { label: 'Applications',          icon: Wrench,     build: q => `${q} real world applications` },
  { label: 'Unsolved Questions',    icon: HelpCircle, build: q => `unsolved questions and mysteries ${q}` },
  { label: 'Latest Research',       icon: Newspaper,  build: q => `latest ${q} research and news` },
];

function getActions(domain: Domain): ActionDef[] {
  switch (domain) {
    case 'biology':       return BIOLOGY_ACTIONS;
    case 'physics_space': return PHYSICS_SPACE_ACTIONS;
    case 'chemistry':     return CHEMISTRY_ACTIONS;
    default:              return GENERAL_ACTIONS;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  query: string;
  onSearch: (q: string) => void;
  lm?: boolean;
}

const ExploreFurther = memo(function ExploreFurther({ query, onSearch, lm }: Props) {
  const domain  = useMemo(() => detectDomain(query), [query]);
  const actions = useMemo(() => getActions(domain), [domain]);

  const handleAction = useCallback((action: ActionDef) => {
    const newQuery = action.build(query.trim());
    onSearch(newQuery);
  }, [query, onSearch]);

  if (!query.trim()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      {/* Section label + divider */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`text-[9.5px] uppercase tracking-[0.22em] font-semibold flex-shrink-0 ${
          lm ? 'text-gray-400' : 'text-white/30'
        }`}>
          Explore Further
        </span>
        <div className={`flex-1 h-px ${lm ? 'bg-gray-100' : 'bg-white/[0.05]'}`} />
      </div>

      {/* Action chips */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleAction(action)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
                lm
                  ? 'bg-white border-gray-200 text-gray-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 shadow-sm'
                  : 'bg-white/[0.04] border-white/[0.09] text-white/50 hover:bg-white/[0.09] hover:border-white/[0.18] hover:text-white/85'
              }`}
            >
              <Icon size={11} strokeWidth={2} aria-hidden="true" />
              {action.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
});

export default ExploreFurther;

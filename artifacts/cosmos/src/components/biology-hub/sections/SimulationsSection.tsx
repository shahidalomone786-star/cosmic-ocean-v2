import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Maximize2, ExternalLink, FlaskConical, Dna, Leaf, Atom, Droplets, Zap } from 'lucide-react';

// ─── Simulations Section ──────────────────────────────────────────────────────
// PhET HTML5 interactive biology & chemistry simulations (free, no key needed).

interface SimulationsSectionProps {
  lm: boolean;
}

type SimCategory = 'all' | 'molecular' | 'evolution' | 'cell' | 'chemistry';

interface Simulation {
  id: string;
  name: string;
  description: string;
  category: SimCategory;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  url: string;
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  iconColor: string;
  tags: string[];
}

const PHET_SIMULATIONS: Simulation[] = [
  {
    id: 'natural-selection',
    name: 'Natural Selection',
    description: 'Explore how natural selection changes the beak size of a population of finches. Watch evolution in real time.',
    category: 'evolution',
    difficulty: 'Beginner',
    url: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html',
    icon: Leaf,
    iconColor: 'text-yellow-400',
    tags: ['Evolution', 'Genetics', 'Population'],
  },
  {
    id: 'gene-expression',
    name: 'Gene Expression Essentials',
    description: 'Explore how genes are expressed through transcription and translation. Visualize protein synthesis at the molecular level.',
    category: 'molecular',
    difficulty: 'Intermediate',
    url: 'https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_en.html',
    icon: Dna,
    iconColor: 'text-lime-400',
    tags: ['DNA', 'Transcription', 'Translation'],
  },
  {
    id: 'membrane-channels',
    name: 'Membrane Channels',
    description: 'Explore how molecules pass through protein channels in cell membranes. Investigate selective permeability.',
    category: 'cell',
    difficulty: 'Beginner',
    url: 'https://phet.colorado.edu/sims/html/membrane-channels/latest/membrane-channels_en.html',
    icon: Droplets,
    iconColor: 'text-teal-400',
    tags: ['Cell Membrane', 'Transport', 'Osmosis'],
  },
  {
    id: 'diffusion',
    name: 'Diffusion',
    description: 'Explore diffusion and how concentration, temperature, mass, and radius affect diffusion rate across membranes.',
    category: 'cell',
    difficulty: 'Beginner',
    url: 'https://phet.colorado.edu/sims/html/diffusion/latest/diffusion_en.html',
    icon: FlaskConical,
    iconColor: 'text-sky-400',
    tags: ['Diffusion', 'Osmosis', 'Cell Biology'],
  },
  {
    id: 'molecules-and-light',
    name: 'Molecules and Light',
    description: 'Explore how light interacts with molecules. Understand photosynthesis, greenhouse effects, and molecular bonds.',
    category: 'molecular',
    difficulty: 'Intermediate',
    url: 'https://phet.colorado.edu/sims/html/molecules-and-light/latest/molecules-and-light_en.html',
    icon: Atom,
    iconColor: 'text-violet-400',
    tags: ['Photosynthesis', 'Biochemistry', 'Light'],
  },
  {
    id: 'acid-base-solutions',
    name: 'Acid-Base Solutions',
    description: 'Explore how acids and bases work. Test solutions, measure pH, and understand buffer systems in biology.',
    category: 'chemistry',
    difficulty: 'Intermediate',
    url: 'https://phet.colorado.edu/sims/html/acid-base-solutions/latest/acid-base-solutions_en.html',
    icon: FlaskConical,
    iconColor: 'text-orange-400',
    tags: ['pH', 'Biochemistry', 'Acids & Bases'],
  },
  {
    id: 'concentration',
    name: 'Concentration',
    description: 'Explore what it means to have a solution and how concentration, solution volume, and solute amount interact.',
    category: 'chemistry',
    difficulty: 'Beginner',
    url: 'https://phet.colorado.edu/sims/html/concentration/latest/concentration_en.html',
    icon: Droplets,
    iconColor: 'text-blue-400',
    tags: ['Solutions', 'Chemistry', 'Concentration'],
  },
  {
    id: 'reactions-and-rates',
    name: 'Reactions & Rates',
    description: 'Explore reaction rates, activation energy, and collision theory relevant to enzyme kinetics in biology.',
    category: 'chemistry',
    difficulty: 'Advanced',
    url: 'https://phet.colorado.edu/sims/html/reactions-and-rates/latest/reactions-and-rates_en.html',
    icon: Zap,
    iconColor: 'text-amber-400',
    tags: ['Enzymes', 'Kinetics', 'Biochemistry'],
  },
];

const CATEGORY_LABELS: Record<SimCategory, string> = {
  all: 'All',
  molecular: 'Molecular',
  evolution: 'Evolution',
  cell: 'Cell Biology',
  chemistry: 'Chemistry',
};

const glassCard = (lm: boolean) => ({
  background: lm ? 'rgba(240,253,244,0.9)' : 'rgba(3,14,9,0.8)',
  border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.12)',
  backdropFilter: 'blur(18px)',
});

// ── Fullscreen Simulation Viewer ──────────────────────────────────────────────
function SimViewer({
  sim, lm, onClose,
}: { sim: Simulation | null; lm: boolean; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!sim) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sim, onClose]);

  return (
    <AnimatePresence>
      {sim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex flex-col"
          style={{
            background: lm ? 'rgba(236,253,245,0.97)' : 'rgba(1,8,5,0.97)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              borderBottom: '1px solid rgba(52,211,153,0.15)',
              background: lm ? 'rgba(240,253,244,0.8)' : 'rgba(2,10,6,0.8)',
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}
            >
              <Play size={13} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}>
                {sim.name}
              </p>
              <p className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.3)' }}>
                PhET Interactive Simulations
              </p>
            </div>
            <a
              href={sim.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all flex-shrink-0"
              style={{
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.2)',
                color: lm ? '#065f46' : '#34d399',
              }}
            >
              <ExternalLink size={11} />
              Open full
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <X size={14} className="text-rose-400" />
            </button>
          </div>

          {/* iframe */}
          <div className="flex-1 relative">
            <iframe
              ref={iframeRef}
              src={sim.url}
              title={sim.name}
              className="w-full h-full border-0"
              allow="fullscreen"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Simulation Card ───────────────────────────────────────────────────────────
function SimCard({
  sim, lm, delay, onLaunch,
}: { sim: Simulation; lm: boolean; delay: number; onLaunch: (s: Simulation) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const diffColor = sim.difficulty === 'Beginner'
    ? { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)', text: '#34d399' }
    : sim.difficulty === 'Intermediate'
      ? { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' }
      : { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', text: '#a78bfa' };

  return (
    <div ref={cardRef}>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, scale: 1.012 }}
            className="rounded-2xl p-4 cursor-pointer group"
            style={{
              ...glassCard(lm),
              boxShadow: lm ? '0 2px 16px rgba(52,211,153,0.06)' : '0 2px 16px rgba(0,0,0,0.28)',
            }}
            onClick={() => onLaunch(sim)}
          >
            {/* Icon + title */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                }}
              >
                <sim.icon size={18} strokeWidth={1.6} className={sim.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold truncate mb-0.5"
                  style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}
                >
                  {sim.name}
                </p>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    background: diffColor.bg,
                    border: `1px solid ${diffColor.border}`,
                    color: diffColor.text,
                  }}
                >
                  {sim.difficulty}
                </span>
              </div>
            </div>

            {/* Description */}
            <p
              className="text-[11px] leading-relaxed mb-3 line-clamp-2"
              style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.38)' }}
            >
              {sim.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {sim.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-2 py-0.5 rounded-full"
                  style={{
                    background: lm ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.07)',
                    border: '1px solid rgba(52,211,153,0.15)',
                    color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(52,211,153,0.55)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Launch button */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group-hover:opacity-100 opacity-80"
              style={{
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.25)',
              }}
            >
              <Play size={12} className="text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400">Launch Simulation</span>
              <Maximize2 size={11} className="text-emerald-400 ml-auto opacity-60" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!visible && (
        <div className="h-40 rounded-2xl animate-pulse" style={glassCard(lm)} />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SimulationsSection({ lm }: SimulationsSectionProps) {
  const [category, setCategory] = useState<SimCategory>('all');
  const [activeSim, setActiveSim] = useState<Simulation | null>(null);

  const categories = Object.entries(CATEGORY_LABELS) as [SimCategory, string][];
  const filtered = category === 'all'
    ? PHET_SIMULATIONS
    : PHET_SIMULATIONS.filter((s) => s.category === category);

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline gap-3 mb-3">
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#064e3b' : 'rgba(255,255,255,0.92)' }}
        >
          Interactive Simulations
        </h2>
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.35)' }}
        >
          PhET • Free
        </span>
      </div>

      {/* Intro banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-4 mb-4"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(240,253,244,0.98), rgba(240,253,254,0.98))'
            : 'linear-gradient(135deg, rgba(2,14,8,0.96), rgba(2,10,16,0.96))',
          border: lm ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(52,211,153,0.15)',
        }}
      >
        <div
          className="absolute -top-4 -right-4 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)', filter: 'blur(12px)' }}
        />
        <p className="text-[11px] font-medium mb-0.5" style={{ color: lm ? '#065f46' : '#34d399' }}>
          PhET Interactive Simulations
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.38)' }}>
          Research-based, peer-reviewed simulations from the University of Colorado Boulder.
          Click any simulation to launch it in fullscreen.
        </p>
      </motion.div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {categories.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200"
            style={{
              background: category === id
                ? lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)'
                : lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.05)',
              border: category === id
                ? '1px solid rgba(52,211,153,0.35)'
                : '1px solid rgba(52,211,153,0.12)',
              color: category === id
                ? lm ? '#065f46' : '#34d399'
                : lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.35)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((sim, i) => (
          <SimCard
            key={sim.id}
            sim={sim}
            lm={lm}
            delay={Math.min(i * 0.05, 0.3)}
            onLaunch={setActiveSim}
          />
        ))}
      </div>

      {/* Fullscreen viewer */}
      <SimViewer sim={activeSim} lm={lm} onClose={() => setActiveSim(null)} />
    </div>
  );
}

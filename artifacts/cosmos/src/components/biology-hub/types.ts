// ─── Biology Hub — Shared Types ───────────────────────────────────────────────

export type BioSectionId =
  | '3d-anatomy'
  | 'microscope'
  | 'organs'
  | 'body-systems'
  | 'skeleton'
  | 'muscles'
  | 'brain'
  | 'cells'
  | 'dna'
  | 'genetics'
  | 'microbiology'
  | 'viruses'
  | 'evolution'
  | 'biochemistry'
  | 'feel-nature'
  | 'research'
  | 'videos'
  | 'simulations';

export interface BioNavItem {
  id: BioSectionId;
  label: string;
  iconName: string;
  color: string;
  glow: string;
  description: string;
  badge?: string;
}

export const BIO_NAV_ITEMS: BioNavItem[] = [
  {
    id: '3d-anatomy',
    label: '3D Anatomy',
    iconName: 'Layers3',
    color: 'text-emerald-400',
    glow: 'rgba(52,211,153,0.3)',
    description: 'Interactive 3D human body explorer',
    badge: 'Interactive',
  },
  {
    id: 'microscope',
    label: 'Microscope',
    iconName: 'ScanLine',
    color: 'text-teal-300',
    glow: 'rgba(94,234,212,0.3)',
    description: 'Virtual microscope with 8 specimen slides',
    badge: 'New',
  },
  {
    id: 'organs',
    label: 'Organs',
    iconName: 'Heart',
    color: 'text-rose-400',
    glow: 'rgba(251,113,133,0.3)',
    description: 'Heart, lungs, kidneys and more',
  },
  {
    id: 'body-systems',
    label: 'Body Systems',
    iconName: 'Network',
    color: 'text-sky-400',
    glow: 'rgba(56,189,248,0.3)',
    description: 'Circulatory, nervous, digestive',
  },
  {
    id: 'skeleton',
    label: 'Skeleton',
    iconName: 'Bone',
    color: 'text-slate-300',
    glow: 'rgba(203,213,225,0.3)',
    description: '206 bones of the human body',
  },
  {
    id: 'muscles',
    label: 'Muscles',
    iconName: 'Zap',
    color: 'text-amber-400',
    glow: 'rgba(251,191,36,0.3)',
    description: 'Skeletal, cardiac, smooth muscle',
  },
  {
    id: 'brain',
    label: 'Brain',
    iconName: 'Brain',
    color: 'text-violet-400',
    glow: 'rgba(167,139,250,0.3)',
    description: 'Neuroscience & cognition',
    badge: 'Popular',
  },
  {
    id: 'cells',
    label: 'Cells',
    iconName: 'Microscope',
    color: 'text-teal-400',
    glow: 'rgba(45,212,191,0.3)',
    description: 'Cell structure and organelles',
  },
  {
    id: 'dna',
    label: 'DNA',
    iconName: 'Dna',
    color: 'text-lime-400',
    glow: 'rgba(163,230,53,0.3)',
    description: 'Genetics, genomics, base pairs',
    badge: 'New',
  },
  {
    id: 'genetics',
    label: 'Genetics',
    iconName: 'GitBranch',
    color: 'text-cyan-400',
    glow: 'rgba(34,211,238,0.3)',
    description: 'Heredity and gene expression',
  },
  {
    id: 'microbiology',
    label: 'Microbiology',
    iconName: 'FlaskConical',
    color: 'text-green-400',
    glow: 'rgba(74,222,128,0.3)',
    description: 'Bacteria, fungi, microorganisms',
  },
  {
    id: 'viruses',
    label: 'Viruses',
    iconName: 'Atom',
    color: 'text-orange-400',
    glow: 'rgba(251,146,60,0.3)',
    description: 'Viral structure and replication',
  },
  {
    id: 'evolution',
    label: 'Evolution',
    iconName: 'TreePine',
    color: 'text-yellow-400',
    glow: 'rgba(250,204,21,0.3)',
    description: 'Natural selection & adaptation',
  },
  {
    id: 'biochemistry',
    label: 'Biochemistry',
    iconName: 'FlaskConical',
    color: 'text-indigo-400',
    glow: 'rgba(129,140,248,0.3)',
    description: 'Proteins, enzymes, metabolism',
  },
  {
    id: 'feel-nature',
    label: 'Feel Nature',
    iconName: 'Leaf',
    color: 'text-amber-400',
    glow: 'rgba(245,158,11,0.3)',
    description: 'Evolutionary discovery gallery',
    badge: 'New',
  },
  {
    id: 'research',
    label: 'Research',
    iconName: 'BookOpen',
    color: 'text-slate-400',
    glow: 'rgba(148,163,184,0.3)',
    description: 'Latest papers and discoveries',
  },
  {
    id: 'videos',
    label: 'Videos',
    iconName: 'Play',
    color: 'text-pink-400',
    glow: 'rgba(244,114,182,0.3)',
    description: 'Educational biology videos',
  },
  {
    id: 'simulations',
    label: 'Simulations',
    iconName: 'Gauge',
    color: 'text-purple-400',
    glow: 'rgba(192,132,252,0.3)',
    description: 'Interactive biology simulations',
  },
];

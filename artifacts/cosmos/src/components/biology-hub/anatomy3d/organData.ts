// ─── Biology Hub — Interactive 3D Anatomy Data ────────────────────────────────
// All anatomy data is established medical reference knowledge.
// No external APIs are used.

export type OrganId = 'heart' | 'brain' | 'lungs' | 'skeleton' | 'kidney' | 'liver' | 'dna';

export interface ModelProps {
  autoRotate: boolean;
  showLabels: boolean;
  wireframe: boolean;
  crossSection: boolean;
  exploded: boolean;
}

export interface OrganFact {
  label: string;
  value: string;
}

export interface OrganData {
  id: OrganId;
  name: string;
  subtitle: string;
  /** Tailwind-compatible hex for UI */
  color: string;
  accentRgb: string;    // "r,g,b" for rgba()
  emissiveHex: string;
  icon: string;         // emoji
  description: string;
  facts: OrganFact[];
  supportsExplode: boolean;
  /** Default camera Z distance */
  cameraZ: number;
}

export const ORGAN_DATA: Record<OrganId, OrganData> = {
  heart: {
    id: 'heart',
    name: 'Human Heart',
    subtitle: 'Cardiac Anatomy',
    color: '#e74c3c',
    accentRgb: '231,76,60',
    emissiveHex: '#5a0a0a',
    icon: '🫀',
    description:
      'A muscular organ weighing 250–350 g that pumps ~5 L of blood per minute through two circuits: pulmonary (to the lungs) and systemic (to the body). It beats ~100,000 times per day.',
    facts: [
      { label: 'Weight',       value: '250–350 g'   },
      { label: 'Beats / day',  value: '~100,000'     },
      { label: 'Chambers',     value: '4'            },
      { label: 'Output',       value: '~5 L/min'     },
      { label: 'Valves',       value: '4 (mitral, tricuspid, aortic, pulmonic)' },
    ],
    supportsExplode: true,
    cameraZ: 4.5,
  },
  brain: {
    id: 'brain',
    name: 'Human Brain',
    subtitle: 'Neural Architecture',
    color: '#e8a87c',
    accentRgb: '232,168,124',
    emissiveHex: '#5a2a10',
    icon: '🧠',
    description:
      'The most complex known structure in the universe — 86 billion neurons forming ~100 trillion synaptic connections, consuming 20% of the body\'s energy while accounting for only 2% of body weight.',
    facts: [
      { label: 'Weight',       value: '~1.4 kg'        },
      { label: 'Neurons',      value: '86 billion'      },
      { label: 'Synapses',     value: '~100 trillion'   },
      { label: 'Energy use',   value: '20% of body total' },
      { label: 'Lobes',        value: '4 (frontal, parietal, temporal, occipital)' },
    ],
    supportsExplode: true,
    cameraZ: 5,
  },
  lungs: {
    id: 'lungs',
    name: 'Human Lungs',
    subtitle: 'Respiratory System',
    color: '#f4a9a8',
    accentRgb: '244,169,168',
    emissiveHex: '#5a1515',
    icon: '🫁',
    description:
      'The primary gas-exchange organs, with ~480 million alveoli providing ~70 m² of surface area — roughly the size of a tennis court — allowing oxygen and CO₂ to cross a membrane only 0.5 µm thick.',
    facts: [
      { label: 'Total capacity', value: '~6 L'           },
      { label: 'Surface area',   value: '~70 m²'          },
      { label: 'Alveoli',        value: '~480 million'    },
      { label: 'Breaths / day',  value: '~20,000'         },
      { label: 'Lobes',          value: '5 (3 right, 2 left)' },
    ],
    supportsExplode: true,
    cameraZ: 5.5,
  },
  skeleton: {
    id: 'skeleton',
    name: 'Human Skeleton',
    subtitle: 'Skeletal System',
    color: '#f0e8d0',
    accentRgb: '240,232,208',
    emissiveHex: '#3a3020',
    icon: '💀',
    description:
      'The 206-bone framework that provides structural support, protects vital organs, enables movement via lever mechanics, manufactures blood cells in bone marrow, and stores 99% of the body\'s calcium.',
    facts: [
      { label: 'Bones (adult)', value: '206'              },
      { label: 'Longest bone',  value: 'Femur (~48 cm)'   },
      { label: 'Smallest bone', value: 'Stapes (~3 mm)'   },
      { label: 'Joints',        value: '360+'             },
      { label: 'Marrow output', value: '2.4 M RBCs/sec'   },
    ],
    supportsExplode: false,
    cameraZ: 9,
  },
  kidney: {
    id: 'kidney',
    name: 'Human Kidney',
    subtitle: 'Urinary System',
    color: '#c0392b',
    accentRgb: '192,57,43',
    emissiveHex: '#3a0808',
    icon: '🫘',
    description:
      'Bean-shaped paired organs, each containing ~1 million nephrons, that filter 200 L of blood daily, regulate blood pressure via the renin–angiotensin system, and maintain electrolyte homeostasis.',
    facts: [
      { label: 'Weight each',   value: '125–175 g'      },
      { label: 'Nephrons',      value: '~1 million each' },
      { label: 'Blood filtered',value: '200 L / day'     },
      { label: 'Urine output',  value: '~1.5 L / day'   },
      { label: 'Hormones',      value: 'Renin, EPO, calcitriol' },
    ],
    supportsExplode: false,
    cameraZ: 4,
  },
  liver: {
    id: 'liver',
    name: 'Human Liver',
    subtitle: 'Hepatic System',
    color: '#a0522d',
    accentRgb: '160,82,45',
    emissiveHex: '#2a1000',
    icon: '🫀',
    description:
      'The largest internal organ (~1.5 kg), performing over 500 functions including detoxification of metabolic waste, synthesis of plasma proteins and clotting factors, bile production, and glycogen storage.',
    facts: [
      { label: 'Weight',       value: '~1.5 kg'              },
      { label: 'Functions',    value: '500+'                  },
      { label: 'Blood flow',   value: '~1.5 L / min'         },
      { label: 'Bile output',  value: '700–1,000 mL / day'   },
      { label: 'Regeneration', value: 'Can regrow to full size from 25%' },
    ],
    supportsExplode: false,
    cameraZ: 5,
  },
  dna: {
    id: 'dna',
    name: 'DNA Double Helix',
    subtitle: 'Molecular Biology',
    color: '#34d399',
    accentRgb: '52,211,153',
    emissiveHex: '#064e3b',
    icon: '🧬',
    description:
      'The molecule encoding life — a right-handed double helix where two antiparallel strands of nucleotides are held together by complementary base pairing (A–T, G–C) and stabilised by base-stacking interactions.',
    facts: [
      { label: 'Base pairs',   value: '3.2 billion (human haploid)' },
      { label: 'Genes',        value: '~20,000–25,000'              },
      { label: 'Length (uncoiled)', value: '~2 m per cell'          },
      { label: 'Diameter',     value: '~2 nm'                       },
      { label: 'Chromosomes',  value: '23 pairs (human diploid)'    },
    ],
    supportsExplode: false,
    cameraZ: 6,
  },
};

export const ORGAN_LIST: OrganId[] = ['heart', 'brain', 'lungs', 'skeleton', 'kidney', 'liver', 'dna'];

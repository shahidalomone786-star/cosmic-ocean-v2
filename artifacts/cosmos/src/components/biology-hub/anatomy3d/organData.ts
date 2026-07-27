// ─── Biology Hub — Interactive 3D Anatomy Data ────────────────────────────────
// Core 5 organs shown in Phase 3. No emoji — Lucide icons only.

export type OrganId = 'heart' | 'brain' | 'lungs' | 'skeleton' | 'dna';

export interface OrganFact {
  label: string;
  value: string;
}

/** A single Sketchfab model variant selectable in the Premium Variant Switcher. */
export interface OrganModel {
  /** 32-char hex Sketchfab model ID (no dashes). */
  id:   string;
  /** Display name shown in the variant switcher pill. */
  name: string;
}

export interface OrganData {
  id:             OrganId;
  name:           string;
  subtitle:       string;
  /** Hex color used for UI accents */
  color:          string;
  accentRgb:      string;   // "r,g,b" for rgba()
  /** Lucide icon component name */
  lucideIconName: string;
  description:    string;
  facts:          OrganFact[];
  /**
   * One or more Sketchfab model variants. Index 0 is the default.
   * Empty array → show polished "Model Unavailable" card.
   * The viewer automatically times out after 10 s and falls back gracefully.
   */
  models:          OrganModel[];
  /** Credit line shown in viewer footer */
  sketchfabCredit?: string;
}

export const ORGAN_DATA: Record<OrganId, OrganData> = {
  heart: {
    id:             'heart',
    name:           'Human Heart',
    subtitle:       'Cardiac Anatomy',
    color:          '#e74c3c',
    accentRgb:      '231,76,60',
    lucideIconName: 'Heart',
    description:
      'A muscular organ weighing 250–350 g that pumps ~5 L of blood per minute through two circuits: pulmonary (to the lungs) and systemic (to the body). It beats ~100,000 times per day.',
    facts: [
      { label: 'Weight',      value: '250–350 g' },
      { label: 'Beats / day', value: '~100,000'  },
      { label: 'Chambers',    value: '4'          },
      { label: 'Output',      value: '~5 L/min'   },
      { label: 'Valves',      value: '4 (mitral, tricuspid, aortic, pulmonic)' },
    ],
    models: [
      { id: '80d8881f839f47a8907dfafe7589e41b', name: 'Animated Heart'   },
      { id: '3f8072336ce94d18b3d0d055a1ece089', name: 'Realistic Static'  },
    ],
    sketchfabCredit: 'Sketchfab · CC Attribution',
  },

  brain: {
    id:             'brain',
    name:           'Human Brain',
    subtitle:       'Neural Architecture',
    color:          '#e8a87c',
    accentRgb:      '232,168,124',
    lucideIconName: 'Brain',
    description:
      'The most complex known structure — 86 billion neurons forming ~100 trillion synaptic connections, consuming 20 % of the body\'s energy while accounting for only 2 % of its mass.',
    facts: [
      { label: 'Weight',     value: '~1.4 kg'            },
      { label: 'Neurons',    value: '86 billion'          },
      { label: 'Synapses',   value: '~100 trillion'       },
      { label: 'Energy use', value: '20 % of body total'  },
      { label: 'Lobes',      value: '4 (frontal, parietal, temporal, occipital)' },
    ],
    models: [
      { id: '1d7d557c8a5c4fe888c2d43752ff4a7f', name: 'Premium Brain'  },
      { id: 'e073c2590bc24daaa7323f4daa5b7784', name: 'Human Brain'    },
      { id: '36870e0970f044a8957b0af3a180a7eb', name: 'Anatomy View'   },
      { id: 'c51b432b0b5046c1b4268061b9214feb', name: 'Standard View'  },
    ],
    sketchfabCredit: 'Sketchfab · CC Attribution',
  },

  lungs: {
    id:             'lungs',
    name:           'Human Lungs',
    subtitle:       'Respiratory System',
    color:          '#f4a9a8',
    accentRgb:      '244,169,168',
    lucideIconName: 'Wind',
    description:
      'Primary gas-exchange organs with ~480 million alveoli providing ~70 m² of surface area — roughly the size of a tennis court — allowing O₂ and CO₂ to cross a membrane only 0.5 µm thick.',
    facts: [
      { label: 'Total capacity', value: '~6 L'        },
      { label: 'Surface area',   value: '~70 m²'       },
      { label: 'Alveoli',        value: '~480 million' },
      { label: 'Breaths / day',  value: '~20,000'      },
      { label: 'Lobes',          value: '5 (3 right, 2 left)' },
    ],
    models: [
      { id: '133fdce799ef46c3b6a2d5ecc446e9d6', name: 'PBR Lungs'          },
      { id: '066a1eafdcf54865b4c6b8688dac5834', name: 'Respiratory System' },
    ],
    sketchfabCredit: 'Sketchfab · CC Attribution',
  },

  skeleton: {
    id:             'skeleton',
    name:           'Human Skeleton',
    subtitle:       'Skeletal System',
    color:          '#b8a98a',
    accentRgb:      '184,169,138',
    lucideIconName: 'Bone',
    description:
      'The 206-bone framework providing structural support, organ protection, lever-based movement, blood-cell manufacturing in marrow, and storage of 99 % of the body\'s calcium.',
    facts: [
      { label: 'Bones (adult)', value: '206'                },
      { label: 'Longest bone',  value: 'Femur (~48 cm)'     },
      { label: 'Smallest bone', value: 'Stapes (~3 mm)'     },
      { label: 'Joints',        value: '360+'               },
      { label: 'Marrow output', value: '2.4 M red cells/s'  },
    ],
    models: [
      { id: '657a31ed9704423c8c4e752fb2506a74', name: 'High-Res Skeleton' },
      { id: 'cd6f68c60baf43d089de2b0cbc148dfc', name: 'With Organs'       },
    ],
    sketchfabCredit: 'Sketchfab · CC Attribution',
  },

  dna: {
    id:             'dna',
    name:           'DNA Double Helix',
    subtitle:       'Molecular Biology',
    color:          '#34d399',
    accentRgb:      '52,211,153',
    lucideIconName: 'Dna',
    description:
      'The molecule encoding life — a right-handed double helix where two antiparallel nucleotide strands are held by complementary base pairing (A–T, G–C) and stabilised by base-stacking interactions.',
    facts: [
      { label: 'Base pairs',        value: '3.2 billion (haploid)' },
      { label: 'Genes',             value: '~20,000–25,000'        },
      { label: 'Length (uncoiled)', value: '~2 m per cell'         },
      { label: 'Diameter',          value: '~2 nm'                 },
      { label: 'Chromosomes',       value: '23 pairs (diploid)'    },
    ],
    models: [
      { id: '51f5ab2ffc364f60be00289eb6909535', name: 'Stylized DNA' },
    ],
    sketchfabCredit: 'Sketchfab · CC Attribution',
  },
};

export const ORGAN_LIST: OrganId[] = ['heart', 'brain', 'lungs', 'skeleton', 'dna'];

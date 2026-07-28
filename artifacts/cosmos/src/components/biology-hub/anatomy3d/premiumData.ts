// ─── Biology Hub — Premium 3D Model Catalog ──────────────────────────────────

export interface PremiumModel {
  id:   string;
  name: string;
}

export interface PremiumCategory {
  title:  string;
  models: PremiumModel[];
}

export const premiumCategories: PremiumCategory[] = [
  {
    title: 'Head & Facial Anatomy',
    models: [
      { id: 'c19e033758f24fef87aa29eeff3191a0', name: 'Skull, Muscles & Nerves'   },
      { id: '6a1c50cc1b6246ccb008625b0b4efd88', name: 'Facial Anatomy Layers'      },
      { id: 'b018e3f215c14be6ab5c52e5371c3ba5', name: 'Head Musculature'           },
    ],
  },
  {
    title: 'Full Body & Musculature',
    models: [
      { id: 'c904a5a65ae145a0bc535645c7e693af', name: 'Complete Human Anatomy'     },
      { id: 'a4c420a96a3d4932893237f63edf1ac4', name: 'Female Muscles'             },
      { id: '2a541b268b3b415faae68e3f0390f3b4', name: 'Art Human Male'             },
      { id: 'ba9d24ebb7c64d0dbbae2cffeeca6020', name: 'Female (No Visceral)'       },
      { id: '5f28b52cab3e439490727e0aede55a6b', name: 'Female Skeleton'            },
    ],
  },
  {
    title: 'Reproductive Biology',
    models: [
      { id: 'b77f14ee1cf743ffbac365b045598c48', name: 'Male System'                },
      { id: 'd66a297de2fd4400a6833417e7185fcf', name: 'Male Reproductive Organs'   },
      { id: 'b6821261ed5e4c59979bf9a2362e6b58', name: 'Adult Male System'          },
      { id: '445e5d3977d848419253a4058137555f', name: 'Female System'              },
      { id: 'caaf00da1ff1457aaebe88cb4680d50f', name: 'Uterus Cross-Section'       },
      { id: 'd3494a1490de40f9ab3108585b1b379c', name: 'Human Reproductive System'  },
    ],
  },
  {
    title: 'Digestive System',
    models: [
      { id: '2752fd086f584bb38323130db2133078', name: 'Small & Large Intestine'    },
    ],
  },
  {
    title: 'Cellular World',
    models: [
      { id: 'f258c65762e5435c9d58c1aa136b557a', name: 'Eukaryotic Plant Cell'       },
      { id: '74f714127a8c4211bb1a2cac7195fb1a', name: 'Eukaryotic Cell Cross-Section' },
    ],
  },
  {
    title: 'Human Evolution',
    models: [
      { id: '087f11bba4e44645885071b64d5db51b', name: 'Evolution of Hominins'      },
    ],
  },
];

/** Total model count across all categories */
export const PREMIUM_MODEL_COUNT = premiumCategories.reduce(
  (sum, cat) => sum + cat.models.length,
  0,
);

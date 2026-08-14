export type AstronomyCategoryId =
  | 'universe'
  | 'galaxies'
  | 'stars'
  | 'exoplanets'
  | 'solar-system'
  | 'moons'
  | 'nebulae'
  | 'black-holes'
  | 'star-clusters'
  | 'deep-sky-objects'
  | 'missions'
  | 'spacecraft'
  | 'supernovae'
  | 'nearby-objects';

export type AstronomySourceId =
  | 'nasa'
  | 'nasa-exoplanet-archive'
  | 'esa'
  | 'gaia'
  | 'mast'
  | 'simbad'
  | 'sdss'
  | 'other';

export interface AstronomicalCoordinates {
  rightAscension?: number;
  declination?: number;
  coordinateSystem?: string;
  epoch?: string;
}

export interface AstronomicalDistance {
  value: number;
  unit: string;
  uncertainty?: number;
}

export interface AstronomicalObject {
  id: string;
  name: string;
  type: string;
  category: AstronomyCategoryId;
  aliases: string[];
  description?: string;
  coordinates?: AstronomicalCoordinates;
  distance?: AstronomicalDistance;
  source: AstronomySourceId;
  sourceId: string;
  metadata: Record<string, unknown>;
  imageReferences: string[];
  observationReferences: string[];
}

export interface AstronomyCategory {
  id: AstronomyCategoryId;
  label: string;
  slug: string;
  route: string;
  status: 'planned' | 'connecting';
}

export const ASTRONOMY_CATEGORIES: readonly AstronomyCategory[] = [
  { id: 'universe', label: 'Universe', slug: 'universe', route: '/atlas', status: 'connecting' },
  { id: 'galaxies', label: 'Galaxies', slug: 'galaxies', route: '/atlas/galaxies', status: 'connecting' },
  { id: 'stars', label: 'Stars', slug: 'stars', route: '/atlas/stars', status: 'connecting' },
  { id: 'exoplanets', label: 'Exoplanets', slug: 'exoplanets', route: '/atlas/exoplanets', status: 'connecting' },
  { id: 'solar-system', label: 'Solar System', slug: 'solar-system', route: '/atlas/solar-system', status: 'connecting' },
  { id: 'moons', label: 'Moons', slug: 'moons', route: '/atlas/moons', status: 'connecting' },
  { id: 'nebulae', label: 'Nebulae', slug: 'nebulae', route: '/atlas/nebulae', status: 'connecting' },
  { id: 'black-holes', label: 'Black Holes', slug: 'black-holes', route: '/atlas/black-holes', status: 'connecting' },
  { id: 'star-clusters', label: 'Star Clusters', slug: 'star-clusters', route: '/atlas/star-clusters', status: 'connecting' },
  { id: 'deep-sky-objects', label: 'Deep-Sky Objects', slug: 'deep-sky-objects', route: '/atlas/deep-sky-objects', status: 'connecting' },
  { id: 'missions', label: 'Space Missions', slug: 'missions', route: '/atlas/missions', status: 'connecting' },
  { id: 'spacecraft', label: 'Spacecraft', slug: 'spacecraft', route: '/atlas/spacecraft', status: 'connecting' },
  { id: 'supernovae', label: 'Supernovae', slug: 'supernovae', route: '/atlas/supernovae', status: 'connecting' },
  { id: 'nearby-objects', label: 'Nearby Objects', slug: 'nearby-objects', route: '/atlas/nearby-objects', status: 'connecting' },
];

export function getAstronomyCategory(slug?: string): AstronomyCategory {
  return ASTRONOMY_CATEGORIES.find(category => category.slug === slug) ?? ASTRONOMY_CATEGORIES[0];
}
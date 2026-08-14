import type {
  AstronomicalObject,
  AstronomyCategoryId,
  AstronomySourceId,
} from '../data/astronomy';

export interface AstronomySearchRequest {
  query?: string;
  category?: AstronomyCategoryId;
  cursor?: string;
  pageSize?: number;
}

export interface AstronomyPage<T> {
  items: T[];
  nextCursor?: string;
  totalEstimate?: number;
}

export interface AstronomyDataProvider {
  readonly id: AstronomySourceId;
  readonly label: string;
  search(request: AstronomySearchRequest): Promise<AstronomyPage<AstronomicalObject>>;
  getById(sourceId: string): Promise<AstronomicalObject | undefined>;
}

export interface AstronomyProviderDescriptor {
  id: AstronomySourceId;
  label: string;
  status: 'planned' | 'available';
  scope: string;
}

export const ASTRONOMY_PROVIDER_DESCRIPTORS: readonly AstronomyProviderDescriptor[] = [
  { id: 'nasa', label: 'NASA Image and Video Library', status: 'available', scope: 'Official mission and spacecraft media records' },
  { id: 'nasa-exoplanet-archive', label: 'NASA Exoplanet Archive', status: 'available', scope: 'Confirmed exoplanet records and host stars' },
  { id: 'esa', label: 'ESA', status: 'planned', scope: 'European mission and object archives' },
  { id: 'gaia', label: 'Gaia', status: 'planned', scope: 'Astrometry and stellar measurements' },
  { id: 'mast', label: 'MAST', status: 'planned', scope: 'Space telescope observations' },
  { id: 'simbad', label: 'SIMBAD', status: 'available', scope: 'Cross-identified astronomical objects' },
  { id: 'sdss', label: 'SDSS', status: 'planned', scope: 'Spectroscopic and imaging surveys' },
  { id: 'other', label: 'Other authoritative archives', status: 'planned', scope: 'Future provider adapters' },
];

export function createPlannedAstronomyProvider(
  descriptor: AstronomyProviderDescriptor,
): AstronomyDataProvider {
  return {
    id: descriptor.id,
    label: descriptor.label,
    async search(): Promise<AstronomyPage<AstronomicalObject>> {
      return { items: [] };
    },
    async getById(): Promise<AstronomicalObject | undefined> {
      return undefined;
    },
  };
}

export const astronomyProviders: readonly AstronomyDataProvider[] =
  ASTRONOMY_PROVIDER_DESCRIPTORS.map(createPlannedAstronomyProvider);

export const unavailableAstronomyProvider: AstronomyDataProvider = {
  id: 'other',
  label: 'Atlas provider layer',
  async search(): Promise<AstronomyPage<AstronomicalObject>> {
    return { items: [] };
  },
  async getById(): Promise<AstronomicalObject | undefined> {
    return undefined;
  },
};
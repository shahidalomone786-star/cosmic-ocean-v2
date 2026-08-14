export type GalleryProviderId =
  | "openverse"
  | "nasa"
  | "met"
  | "artic"
  | "smithsonian"
  | "inaturalist"
  | "loc"
  | "open-i"
  | "rcsb-pdb"
  | "usgs-landsat"
  | "europeana"
  | "rijksmuseum"
  | "gbif"
  | "unsplash"
  | "wikimedia";

export type GallerySearchContext = {
  query: string;
  page: number;
  limit: number;
  category?: string;
  media?: string;
  license?: string;
  quality?: string;
  orientation?: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  source: string;
  sourceUrl: string;
  creator: string | null;
  date: string | null;
  category: string;
  tags: string[];
  license: string;
  licenseUrl: string | null;
  attribution: string | null;
  width: number | null;
  height: number | null;
};

export type GalleryProviderStatus = {
  provider: string;
  status: "ready" | "unavailable";
  count: number;
  message: string | null;
};

export type GalleryProvider = {
  id: GalleryProviderId;
  label: string;
  search: (context: GallerySearchContext) => Promise<GalleryItem[]>;
};
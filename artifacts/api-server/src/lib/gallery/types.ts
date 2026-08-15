export type GalleryProviderId =
  | "openverse"
  | "google"
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
  | "wikimedia"
  | "cleveland"
  | "internet-archive"
  | "wellcome"
  | "vam"
  | "pubchem"
  | "harvard-art-museums"
  | "dpla"
  | "national-archives"
  | "nypl"
  | "flickr"
  | "pexels"
  | "pixabay"
  | "biodiversity-heritage-library"
  | "plantnet"
  | "digitalnz"
  | "trove"
  | "tate"
  | "getty"
  | "british-library"
  | "bfi"
  | "geograph"
  | "esa"
  | "jpl"
  | "noaa"
  | "usgs-eros"
  | "planetary-data-system"
  | "nlm-digital-collections"
  | "cdc-public-health-image-library"
  | "medlineplus"
  | "bioimages"
  | "idigbio"
  | "morphosource"
  | "fishbase"
  | "dryad"
  | "figshare"
  | "zenodo"
  | "arxiv"
  | "crossref"
  | "openalex"
  | "google-arts-culture"
  | "researchgate"
  | "world-digital-library"
  | "digital-public-library"
  | "national-science-foundation"
  | "nasa-earthdata"
  | "noaa-photo-library"
  | "us-national-archives";

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

export type GalleryLicenseClass =
  | "PUBLIC_DOMAIN"
  | "CC0"
  | "COMMERCIAL_USE"
  | "ATTRIBUTION_REQUIRED"
  | "OPEN_LICENSE"
  | "UNKNOWN";

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
  licenseClass: GalleryLicenseClass;
  attribution: string | null;
  width: number | null;
  height: number | null;
};

export type GalleryProviderStatus = {
  provider: string;
  status: GalleryProviderStatusCode;
  count: number;
  message: string | null;
};

export type GalleryProviderStatusCode =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "ERROR"
  | "NO_RESULTS";

export type GalleryImage = {
  imageUrl: string;
  thumbnailUrl: string;
};

export type GalleryProvider = {
  id: GalleryProviderId;
  label: string;
  search: (context: GallerySearchContext) => Promise<GalleryItem[]>;
  availability?: GalleryProviderStatusCode;
  getNextPage?: (context: GallerySearchContext, results: GalleryItem[]) => number | null;
};

export type GalleryProviderAdapter = GalleryProvider & {
  normalize: (result: GalleryItem) => GalleryItem | null;
  extractImage: (result: GalleryItem) => GalleryImage | null;
  getNextPage: (context: GallerySearchContext, results: GalleryItem[]) => number | null;
};
import artic from "./artic";
import europeana from "./europeana";
import gbif from "./gbif";
import inaturalist from "./inaturalist";
import loc from "./loc";
import met from "./met";
import nasa from "./nasa";
import openI from "./open-i";
import openverse from "./openverse";
import rijksmuseum from "./rijksmuseum";
import rcsbPdb from "./rcsb-pdb";
import smithsonian from "./smithsonian";
import unsplash from "./unsplash";
import usgsLandsat from "./usgs-landsat";
import wikimedia from "./wikimedia";
import type { GalleryProvider, GalleryProviderId } from "../types";

export const galleryProviders: GalleryProvider[] = [
  openverse,
  nasa,
  met,
  artic,
  smithsonian,
  inaturalist,
  loc,
  openI,
  rcsbPdb,
  usgsLandsat,
  europeana,
  rijksmuseum,
  gbif,
  unsplash,
  wikimedia,
];

export const galleryProviderById = new Map<GalleryProviderId, GalleryProvider>(
  galleryProviders.map((provider) => [provider.id, provider]),
);
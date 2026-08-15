import artic from "./artic";
import europeana from "./europeana";
import gbif from "./gbif";
import inaturalist from "./inaturalist";
import loc from "./loc";
import met from "./met";
import nasa from "./nasa";
import openI from "./open-i";
import openverse from "./openverse";
import google from "./google";
import bing from "./bing";
import rijksmuseum from "./rijksmuseum";
import rcsbPdb from "./rcsb-pdb";
import smithsonian from "./smithsonian";
import unsplash from "./unsplash";
import usgsLandsat from "./usgs-landsat";
import wikimedia from "./wikimedia";
import type { GalleryProvider, GalleryProviderAdapter, GalleryProviderId } from "../types";
import { completeGalleryProvider } from "../shared";

import cleveland from "./cleveland";
import internetArchive from "./internet-archive";
import wellcome from "./wellcome";
import vam from "./vam";
import pubchem from "./pubchem";
import harvardArtMuseums from "./harvard-art-museums";
import dpla from "./dpla";
import nationalArchives from "./national-archives";
import nypl from "./nypl";
import flickr from "./flickr";
import danbooru from "./danbooru";
import reddit from "./reddit";
import pexels from "./pexels";
import pixabay from "./pixabay";
import biodiversityHeritageLibrary from "./biodiversity-heritage-library";
import plantnet from "./plantnet";
import digitalnz from "./digitalnz";
import trove from "./trove";
import tate from "./tate";
import getty from "./getty";
import britishLibrary from "./british-library";
import bfi from "./bfi";
import geograph from "./geograph";
import esa from "./esa";
import jpl from "./jpl";
import noaa from "./noaa";
import usgsEros from "./usgs-eros";
import planetaryDataSystem from "./planetary-data-system";
import nlmDigitalCollections from "./nlm-digital-collections";
import cdcPublicHealthImageLibrary from "./cdc-public-health-image-library";
import medlineplus from "./medlineplus";
import bioimages from "./bioimages";
import idigbio from "./idigbio";
import morphosource from "./morphosource";
import fishbase from "./fishbase";
import dryad from "./dryad";
import figshare from "./figshare";
import zenodo from "./zenodo";
import arxiv from "./arxiv";
import crossref from "./crossref";
import openalex from "./openalex";
import googleArtsCulture from "./google-arts-culture";
import researchgate from "./researchgate";
import worldDigitalLibrary from "./world-digital-library";
import digitalPublicLibrary from "./digital-public-library";
import nationalScienceFoundation from "./national-science-foundation";
import nasaEarthdata from "./nasa-earthdata";
import noaaPhotoLibrary from "./noaa-photo-library";
import usNationalArchives from "./us-national-archives";

const providerDefinitions: GalleryProvider[] = [
  openverse,
  bing,
  google,
  danbooru,
  reddit,
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
  cleveland,
  internetArchive,
  wellcome,
  vam,
  pubchem,
  harvardArtMuseums,
  dpla,
  nationalArchives,
  nypl,
  flickr,
  pexels,
  pixabay,
  biodiversityHeritageLibrary,
  plantnet,
  digitalnz,
  trove,
  tate,
  getty,
  britishLibrary,
  bfi,
  geograph,
  esa,
  jpl,
  noaa,
  usgsEros,
  planetaryDataSystem,
  nlmDigitalCollections,
  cdcPublicHealthImageLibrary,
  medlineplus,
  bioimages,
  idigbio,
  morphosource,
  fishbase,
  dryad,
  figshare,
  zenodo,
  arxiv,
  crossref,
  openalex,
  googleArtsCulture,
  researchgate,
  worldDigitalLibrary,
  digitalPublicLibrary,
  nationalScienceFoundation,
  nasaEarthdata,
  noaaPhotoLibrary,
  usNationalArchives,
];

export const galleryProviders: GalleryProviderAdapter[] = providerDefinitions.map(completeGalleryProvider);

export const galleryProviderById = new Map<GalleryProviderId, GalleryProviderAdapter>(
  galleryProviders.map((provider) => [provider.id, provider]),
);
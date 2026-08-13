import jwstCover from '@assets/aaf57f6b0139bca6ea5d9d1c306b477e_(1)_1786639194416.jpg';
import hubbleCover from '@assets/3f723be9f5bc1c6e42d1f65f4ac191b0_1786639194442.jpg';
import chandraCover from '@assets/1d8ebab0f3b4840b631b33aac8249f5e_1786639194458.jpg';
import spitzerCover from '@assets/1fbd5ee0dc08a7f863ecf8ca2be8c6ff_1786639194474.jpg';
import keplerCover from '@assets/da063b38feb507ffde81fc74d2b1b263_1786639194504.jpg';
import tessCover from '@assets/eb4d2c7bf3f7051ea2edf11adf41ffe5_1786639194522.jpg';
import gaiaCover from '@assets/33fe58db2f63122a35c9b89d5052d56c_1786639194543.jpg';
import euclidCover from '@assets/d0879614488e896d93b9266eb2449aa8_1786639194565.jpg';
import wiseCover from '@assets/cc76f7352e8c05dd2aab0bfbee216cca_1786639194595.jpg';
import fermiCover from '@assets/94425c302613d022718e7d3faed9c64e_1786639194632.jpg';
import swiftCover from '@assets/7f47b70fcfc3320d7b0550ab6cfac2e3_1786639194681.jpg';
import xmmNewtonCover from '@assets/825c22a74a355a4893ccae21dfddb077_1786639194719.jpg';
import herschelCover from '@assets/bb5d0866f27457b49cecbdcf21f501bc_1786639194764.jpg';
import planckCover from '@assets/07fdf3fbe91a3148221f6e7f210c14e3_1786639194814.jpg';
import sohoCover from '@assets/e526317717b7e8d468c2ca677a825759_1786639194859.jpg';
import sdoCover from '@assets/19050ae2797c4ef514cd0a2c532dc7c9_1786639194902.jpg';
import hinodeCover from '@assets/fa37dddedd21a0b2e7b8475a05a5888a_1786639194948.jpg';
import irasCover from '@assets/77ebf2b4b82be110d63b73dca977908f_1786639195001.jpg';
import cobeCover from '@assets/077cddc9490fde56a05a0d7b01f363cc_1786639195052.jpg';

export type Observatory = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  cover: string;
  shortDescription: string;
  apiSearchTerms: string[];
};

export const observatories: Observatory[] = [
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    shortName: 'JWST',
    category: 'Infrared',
    cover: jwstCover,
    shortDescription: 'A cold-eyed successor revealing the first galaxies, hidden stars, and worlds still forming.',
    apiSearchTerms: ['James Webb Space Telescope', 'JWST', 'infrared astronomy'],
  },
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    shortName: 'Hubble',
    category: 'Visible / UV',
    cover: hubbleCover,
    shortDescription: 'The orbiting observatory that turned deep time into images the whole world could read.',
    apiSearchTerms: ['Hubble Space Telescope', 'HST', 'NASA Hubble'],
  },
  {
    id: 'chandra',
    name: 'Chandra X-ray Observatory',
    shortName: 'Chandra',
    category: 'X-ray',
    cover: chandraCover,
    shortDescription: 'A precision X-ray eye tracing black holes, supernova remnants, and the heat of cosmic collisions.',
    apiSearchTerms: ['Chandra X-ray Observatory', 'Chandra X-ray', 'NASA Chandra'],
  },
  {
    id: 'spitzer',
    name: 'Spitzer Space Telescope',
    shortName: 'Spitzer',
    category: 'Infrared',
    cover: spitzerCover,
    shortDescription: 'An infrared pioneer that looked through cosmic dust to map the quiet architecture of star birth.',
    apiSearchTerms: ['Spitzer Space Telescope', 'Spitzer infrared', 'NASA Spitzer'],
  },
  {
    id: 'kepler',
    name: 'Kepler Space Telescope',
    shortName: 'Kepler',
    category: 'Exoplanet survey',
    cover: keplerCover,
    shortDescription: 'A patient photometer that found thousands of worlds by measuring the nearly invisible dip of a transit.',
    apiSearchTerms: ['Kepler Space Telescope', 'Kepler exoplanet mission', 'exoplanet transit'],
  },
  {
    id: 'tess',
    name: 'Transiting Exoplanet Survey Satellite',
    shortName: 'TESS',
    category: 'Exoplanet survey',
    cover: tessCover,
    shortDescription: 'A wide-field surveyor scanning the brightest nearby stars for planets that invite closer study.',
    apiSearchTerms: ['TESS', 'Transiting Exoplanet Survey Satellite', 'NASA exoplanets'],
  },
  {
    id: 'gaia',
    name: 'Gaia Space Observatory',
    shortName: 'Gaia',
    category: 'Astrometry',
    cover: gaiaCover,
    shortDescription: 'A stellar cartographer measuring positions, distances, and motion to give the Milky Way its shape.',
    apiSearchTerms: ['Gaia mission', 'ESA Gaia', 'stellar astrometry'],
  },
  {
    id: 'euclid',
    name: 'Euclid Space Telescope',
    shortName: 'Euclid',
    category: 'Cosmology',
    cover: euclidCover,
    shortDescription: 'A wide survey of dark matter and dark energy, reading the geometry of the invisible universe.',
    apiSearchTerms: ['Euclid space telescope', 'ESA Euclid', 'dark energy survey'],
  },
  {
    id: 'wise',
    name: 'Wide-field Infrared Survey Explorer',
    shortName: 'WISE',
    category: 'Infrared survey',
    cover: wiseCover,
    shortDescription: 'A full-sky infrared census that found cool stars, distant galaxies, and the faintest celestial embers.',
    apiSearchTerms: ['WISE space telescope', 'Wide-field Infrared Survey Explorer', 'infrared sky survey'],
  },
  {
    id: 'fermi',
    name: 'Fermi Gamma-ray Space Telescope',
    shortName: 'Fermi',
    category: 'Gamma ray',
    cover: fermiCover,
    shortDescription: 'A high-energy sentinel catching the universe at its most violent, brilliant, and brief.',
    apiSearchTerms: ['Fermi Gamma-ray Space Telescope', 'Fermi LAT', 'gamma ray astronomy'],
  },
  {
    id: 'swift',
    name: 'Swift Observatory',
    shortName: 'Swift',
    category: 'Transient astronomy',
    cover: swiftCover,
    shortDescription: 'A fast-response observatory built to turn sudden gamma-ray bursts into precise cosmic addresses.',
    apiSearchTerms: ['Neil Gehrels Swift Observatory', 'Swift satellite', 'gamma ray burst'],
  },
  {
    id: 'xmm-newton',
    name: 'XMM-Newton',
    shortName: 'XMM',
    category: 'X-ray',
    cover: xmmNewtonCover,
    shortDescription: 'A European X-ray observatory resolving the hot, dynamic environments around compact objects.',
    apiSearchTerms: ['XMM-Newton', 'ESA XMM Newton', 'X-ray observatory'],
  },
  {
    id: 'herschel',
    name: 'Herschel Space Observatory',
    shortName: 'Herschel',
    category: 'Far infrared',
    cover: herschelCover,
    shortDescription: 'A far-infrared window onto cold dust, molecular clouds, and the earliest stages of stellar life.',
    apiSearchTerms: ['Herschel Space Observatory', 'ESA Herschel', 'far infrared astronomy'],
  },
  {
    id: 'planck',
    name: 'Planck Space Observatory',
    shortName: 'Planck',
    category: 'Microwave',
    cover: planckCover,
    shortDescription: 'A deep-sky survey reading the oldest light in existence: the afterglow of the Big Bang.',
    apiSearchTerms: ['Planck space observatory', 'ESA Planck', 'cosmic microwave background'],
  },
  {
    id: 'soho',
    name: 'Solar and Heliospheric Observatory',
    shortName: 'SOHO',
    category: 'Solar',
    cover: sohoCover,
    shortDescription: 'A long-running solar watch that follows our star from its core to the edge of the heliosphere.',
    apiSearchTerms: ['SOHO solar observatory', 'Solar and Heliospheric Observatory', 'solar corona'],
  },
  {
    id: 'sdo',
    name: 'Solar Dynamics Observatory',
    shortName: 'SDO',
    category: 'Solar',
    cover: sdoCover,
    shortDescription: 'A continuous, high-definition record of the magnetic activity that shapes space weather.',
    apiSearchTerms: ['Solar Dynamics Observatory', 'NASA SDO', 'solar activity'],
  },
  {
    id: 'hinode',
    name: 'Hinode',
    shortName: 'Hinode',
    category: 'Solar',
    cover: hinodeCover,
    shortDescription: 'A Japanese-led observatory studying how magnetic fields heat the corona and launch solar storms.',
    apiSearchTerms: ['Hinode solar observatory', 'Solar-B', 'solar magnetic field'],
  },
  {
    id: 'iras',
    name: 'Infrared Astronomical Satellite',
    shortName: 'IRAS',
    category: 'Infrared survey',
    cover: irasCover,
    shortDescription: 'The first space telescope to survey the infrared sky, uncovering dusty galaxies and new stellar nurseries.',
    apiSearchTerms: ['IRAS satellite', 'Infrared Astronomical Satellite', 'infrared sky survey'],
  },
  {
    id: 'cobe',
    name: 'Cosmic Background Explorer',
    shortName: 'COBE',
    category: 'Microwave',
    cover: cobeCover,
    shortDescription: 'A landmark mission that measured the universe’s primordial glow and its first small-scale structure.',
    apiSearchTerms: ['COBE satellite', 'Cosmic Background Explorer', 'cosmic microwave background'],
  },
];

export function getObservatory(id: string): Observatory | undefined {
  return observatories.find(observatory => observatory.id === id);
}
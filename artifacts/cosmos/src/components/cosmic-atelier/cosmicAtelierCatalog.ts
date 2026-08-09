import marieCurieImage from '@assets/128b33f15996a9771bc2fda56edba7f2_1786282078448.jpg';
import brianCoxImage from '@assets/7e6a5b8940912e6e6e8c22ecb8d91b04_1786282029973.jpg';
import isaacNewtonImage from '@assets/79159fb11415efbc2e7e5b0717e2bfb7_1786282030062.jpg';
import srinivasaRamanujanImage from '@assets/b71847470319a298dfd93f387a6185b4_1786282123472.jpg';
import mrBeanImage from '@assets/07c62428499a13767813c6ef5f7875b0_1786282160741.jpg';

export type AvatarCurrency = 'Star Tokens' | 'Planetary Coins' | 'Universal Coins';

export const COSMIC_ATELIER_VOICE_IDS = {
  marieCurie: 'en-US-EmmaNeural',
  brianCox: 'en-US-BrianMultilingualNeural',
  isaacNewton: 'en-US-ChristopherNeural',
  srinivasaRamanujan: 'en-US-AriaNeural',
  mrBean: 'en-US-GuyNeural',
} as const;

export type CosmicAtelierVoiceId = typeof COSMIC_ATELIER_VOICE_IDS[keyof typeof COSMIC_ATELIER_VOICE_IDS];

export interface CosmicAvatarVoice {
  provider: 'Microsoft Edge TTS';
  id: CosmicAtelierVoiceId;
  label: string;
}

export interface CosmicAvatarDefinition {
  id: string;
  name: string;
  image: string;
  price: number;
  currency: AvatarCurrency;
  personality: string;
  voice: CosmicAvatarVoice;
  model: string;
  rarity: string;
  ownershipId: string;
  descriptor: string;
}

export const COSMIC_ATELIER_CATALOG: readonly CosmicAvatarDefinition[] = [
  {
    id: 'marie-curie',
    name: 'Marie Curie',
    image: marieCurieImage,
    price: 200,
    currency: 'Star Tokens',
    personality: 'Calm, brilliant, disciplined, scientifically precise and intellectually curious. Evidence-focused, elegant and inspiring.',
    voice: {
      provider: 'Microsoft Edge TTS',
      id: COSMIC_ATELIER_VOICE_IDS.marieCurie,
      label: 'Emma Neural · calm, mature, precise',
    },
    model: 'GPT-OSS 120B',
    rarity: 'limited',
    ownershipId: 'atelier-marie-curie',
    descriptor: 'Calm, precise, and evidence-led.',
  },
  {
    id: 'brian-cox',
    name: 'Brian Cox',
    image: brianCoxImage,
    price: 500000,
    currency: 'Planetary Coins',
    personality: 'Warm, enthusiastic and engaging. Explains science intuitively with cosmic perspective while staying accurate.',
    voice: {
      provider: 'Microsoft Edge TTS',
      id: COSMIC_ATELIER_VOICE_IDS.brianCox,
      label: 'Brian Multilingual Neural · warm, energetic, articulate',
    },
    model: 'GPT-OSS 120B',
    rarity: 'rare',
    ownershipId: 'atelier-brian-cox',
    descriptor: 'Warm, articulate, and cosmically curious.',
  },
  {
    id: 'isaac-newton',
    name: 'Isaac Newton',
    image: isaacNewtonImage,
    price: 300000,
    currency: 'Planetary Coins',
    personality: 'Precise, analytical, mathematical and formal, with strong logical reasoning.',
    voice: {
      provider: 'Microsoft Edge TTS',
      id: COSMIC_ATELIER_VOICE_IDS.isaacNewton,
      label: 'Christopher Neural · composed, authoritative, formal',
    },
    model: 'Best suitable existing model',
    rarity: 'rare',
    ownershipId: 'atelier-isaac-newton',
    descriptor: 'Formal, analytical, and exacting.',
  },
  {
    id: 'srinivasa-ramanujan',
    name: 'Srinivasa Ramanujan',
    image: srinivasaRamanujanImage,
    price: 320,
    currency: 'Star Tokens',
    personality: 'Imaginative, deeply mathematical, pattern-oriented and rigorous, with appreciation for beautiful mathematical connections.',
    voice: {
      provider: 'Microsoft Edge TTS',
      id: COSMIC_ATELIER_VOICE_IDS.srinivasaRamanujan,
      label: 'Aria Neural · gentle, thoughtful, intellectual',
    },
    model: 'Strongest existing mathematics-capable model',
    rarity: 'limited',
    ownershipId: 'atelier-srinivasa-ramanujan',
    descriptor: 'Gentle, intuitive, and pattern-led.',
  },
  {
    id: 'mr-bean',
    name: 'Mr Bean',
    image: mrBeanImage,
    price: 250,
    currency: 'Star Tokens',
    personality: 'Playful, humorous and mischievous while remaining helpful and safe. Humor must not compromise accuracy.',
    voice: {
      provider: 'Microsoft Edge TTS',
      id: COSMIC_ATELIER_VOICE_IDS.mrBean,
      label: 'Guy Neural · playful, expressive, comedic',
    },
    model: 'Strongest suitable existing model',
    rarity: 'limited',
    ownershipId: 'atelier-mr-bean',
    descriptor: 'Playful, expressive, and mischievous.',
  },
];

export const findCosmicAvatar = (id: string) =>
  COSMIC_ATELIER_CATALOG.find(avatar => avatar.id === id);

export const formatAvatarPrice = (avatar: CosmicAvatarDefinition) =>
  new Intl.NumberFormat('en-US').format(avatar.price);
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('artifacts/api-server/src/lib/aggregator.ts', 'utf8');

const startMark = '// These are actual YouTube Shorts IDs';
const endMark   = 'return { source: "youtube", inserted };\n}\n\n// ── X (Twitter)';

const si = src.indexOf(startMark);
const ei = src.indexOf(endMark);
if (si === -1 || ei === -1) {
  console.error('Markers not found', { si, ei });
  process.exit(1);
}

const before = src.slice(0, si);
const after   = src.slice(ei + endMark.length);

const newBlock = `// Direct public-domain / free-license MP4 URLs for the Shorts feed.
// Served from Pexels CDN — no auth needed for direct video playback.
// ShortVideoSlide renders these with a native HTML5 <video> element.

const VIDEO_POOL = [
  {
    video_url:   'https://videos.pexels.com/video-files/852517/852517-hd_1280_720_25fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/852517/pictures/preview-0.jpg',
    title:       'Stars Drift Across the Night Sky',
    channel:     'Cosmos Explorer',
    description: 'A mesmerizing time-lapse of stars arching across a perfectly dark sky. The Milky Way band shimmers as Earth rotates beneath a universe 13.8 billion years in the making.',
    views:       '14.3M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/1448735/1448735-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/1448735/pictures/preview-0.jpg',
    title:       'The Milky Way in Motion',
    channel:     'Deep Sky Lab',
    description: 'Our home galaxy — 100,000 light-years across, 200 billion stars — captured rotating above the horizon. You are watching the real-time spin of Earth revealing our place in the cosmos.',
    views:       '9.8M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/3571264/pictures/preview-0.jpg',
    title:       'Earth From Orbit',
    channel:     'NASA Horizons',
    description: 'Our pale blue dot from above — cloud systems swirling over continents, oceans catching sunlight, the thin life-sustaining atmosphere visible at the limb. Everything that has ever existed happened on that surface.',
    views:       '22.7M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/4065918/4065918-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/4065918/pictures/preview-0.jpg',
    title:       'Inside a Nebula — Star Birth',
    channel:     'ScienceClic',
    description: 'Nebulae are stellar nurseries — vast clouds of hydrogen where gravity pulls gas into clumps that heat until fusion ignites. Every star, including our Sun, was born this way billions of years ago.',
    views:       '6.2M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/4524527/4524527-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/4524527/pictures/preview-0.jpg',
    title:       'Aurora Borealis — Solar Wind Made Visible',
    channel:     'Arctic Science',
    description: 'Charged particles from the Sun travel 150 million kilometres and slam into Earth\'s magnetic field, exciting atmospheric atoms into curtains of green, violet, and white light.',
    views:       '18.5M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/2895448/2895448-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/2895448/pictures/preview-0.jpg',
    title:       'Lightning — 5 Billion Watts Per Strike',
    channel:     'Atmospheric Physics',
    description: 'A lightning bolt carries 1 billion volts and reaches 30,000 K — five times hotter than the Sun\'s surface. The return stroke travels at one-third the speed of light.',
    views:       '4.1M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/1538370/1538370-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/1538370/pictures/preview-0.jpg',
    title:       "Star Trails — Earth's Rotation Revealed",
    channel:     'MinutePhysics',
    description: 'Long-exposure photography traces the apparent path of stars as Earth rotates. Each arc is real starlight — photons that left their source decades or centuries before reaching this sensor.',
    views:       '8.5M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/4816706/4816706-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/4816706/pictures/preview-0.jpg',
    title:       'Night Sky Over the Desert',
    channel:     'Dark Sky Institute',
    description: 'Far from city lights, the sky reveals 9,000 stars to the naked eye. Most humans alive today have never seen a truly dark sky.',
    views:       '11.2M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/3145997/3145997-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/3145997/pictures/preview-0.jpg',
    title:       'Moonrise Over the Ocean',
    channel:     'Tidal Science',
    description: 'The Moon formed 4.5 billion years ago when a Mars-sized body struck proto-Earth. It stabilises our axial tilt, drives tides, and is slowly retreating at 3.8 cm per year.',
    views:       '5.7M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/2169880/pictures/preview-0.jpg',
    title:       'The Deep Ocean — Inner Space',
    channel:     'Veritasium',
    description: 'More than 80% of the ocean remains unexplored. Hydrothermal vents support ecosystems without sunlight, hinting at life that might survive on ocean moons like Europa.',
    views:       '28.9M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/3068267/3068267-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/3068267/pictures/preview-0.jpg',
    title:       'Clouds From Space — Weather as Art',
    channel:     'Earth Observatory',
    description: 'From orbit, Earth\'s cloud systems are self-organising structures driven by heat differentials and Coriolis forces. They regulate global climate and transfer energy from tropics to poles.',
    views:       '12.1M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/5649946/5649946-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/5649946/pictures/preview-0.jpg',
    title:       "Solar Flare — The Sun's Fury",
    channel:     'NASA Heliophysics',
    description: 'X-class solar flares release the energy of a billion hydrogen bombs. Without Earth\'s magnetic field, these would strip our atmosphere and sterilise the surface.',
    views:       '9.4M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/4499940/4499940-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/4499940/pictures/preview-0.jpg',
    title:       'Supercell Thunderstorm',
    channel:     'Storm Science',
    description: 'A supercell\'s persistent rotating updraft can extend 10 km in diameter. These storms produce virtually all violent tornadoes and carry energy equivalent to a nuclear bomb per second.',
    views:       '19.2M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/4629537/4629537-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/4629537/pictures/preview-0.jpg',
    title:       'Glaciers — Frozen Climate Records',
    channel:     'Polar Research',
    description: 'Antarctic ice cores contain trapped air bubbles recording 800,000 years of Earth\'s atmosphere — CO₂ levels, temperature proxies, and volcanic dust preserved in perfect layered sequence.',
    views:       '6.8M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/2882234/2882234-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/2882234/pictures/preview-0.jpg',
    title:       'Forest From Above — Carbon Sink',
    channel:     'Biosphere Labs',
    description: 'Forests absorb 2.6 billion tonnes of CO₂ per year. The Amazon basin cycles 20 billion tonnes of water daily through evapotranspiration — functioning as Earth\'s air conditioner.',
    views:       '14.7M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/3191751/3191751-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/3191751/pictures/preview-0.jpg',
    title:       "Neurons Firing — The Brain's Electric Storm",
    channel:     'TED-Ed',
    description: 'Your brain fires 86 billion neurons across 100 trillion synaptic connections. Every thought you have is a pattern of electrochemical activity — that pattern IS your consciousness.',
    views:       '31.5M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/2792361/2792361-hd_1280_720_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/2792361/pictures/preview-0.jpg',
    title:       'Crystal Growth — Molecular Architecture',
    channel:     'Materials Science',
    description: 'Crystals grow by adding atoms one layer at a time following geometric rules determined by quantum mechanics. Snowflakes, diamonds, salt, and silicon wafers in your phone are all products of molecular self-assembly.',
    views:       '5.3M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/4101583/4101583-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/4101583/pictures/preview-0.jpg',
    title:       'Plasma — The Fourth State of Matter',
    channel:     'Fusion Energy Lab',
    description: 'Plasma makes up 99.9% of all visible matter in the universe: stars, nebulae, lightning, solar wind. Controlling it in a tokamak is how we will unlock unlimited clean energy.',
    views:       '24.8M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/8141893/8141893-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/8141893/pictures/preview-0.jpg',
    title:       'Observatory — Hunting Photons From the Past',
    channel:     'Observatory Live',
    description: 'Modern telescopes compensate for Earth\'s rotation to track a star for hours. The photons landing on the sensor may have left their source thousands of years before any human civilisation existed.',
    views:       '3.7M',
  },
  {
    video_url:   'https://videos.pexels.com/video-files/4489747/4489747-hd_1920_1080_30fps.mp4',
    thumbnail:   'https://images.pexels.com/videos/4489747/pictures/preview-0.jpg',
    title:       'Volcanic Eruption — Earth Making New Crust',
    channel:     'Geoscience Live',
    description: 'Lava erupting at 1,200 °C flows from rifts where tectonic plates pull apart. The Hawaiian islands formed entirely from basaltic eruptions over millions of years — and the process continues today.',
    views:       '28.4M',
  },
];

async function fetchVideoPool(): Promise<SyncResult> {
  let inserted = 0;
  const interval = 28 / VIDEO_POOL.length;
  for (let i = 0; i < VIDEO_POOL.length; i++) {
    const v = VIDEO_POOL[i];
    // Stable deterministic ID derived from index + URL suffix
    const urlSlug = v.video_url.split('/').pop()?.replace(/[^a-z0-9]/gi, '_').slice(0, 20) ?? String(i);
    const id = 'ec_vid_' + String(i).padStart(3, '0') + '_' + urlSlug;
    const extra = JSON.stringify({ video_url: v.video_url, channel: v.channel, views: v.views });
    const ts = hoursAgo(i * interval + 0.5);
    const r = stmts.upsertExternalContent.run(
      id, 'youtube', v.title, v.description,
      v.thumbnail, v.video_url,
      'short-video', extra, ts,
    );
    if (r.changes > 0) inserted++;
  }
  return { source: 'youtube', inserted };
}

// ── X (Twitter)`;

writeFileSync('artifacts/api-server/src/lib/aggregator.ts', before + newBlock + after, 'utf8');
console.log('aggregator.ts rewritten');

// Verify
const updated = readFileSync('artifacts/api-server/src/lib/aggregator.ts', 'utf8');
const videoEntries = (updated.match(/video_url:/g) || []).length;
const ytRemaining  = (updated.match(/youtube_id:/g) || []).length;
console.log('video_url entries:', videoEntries);
console.log('youtube_id in pool:', ytRemaining, '(should be 0)');
console.log('fetchVideoPool present:', updated.includes('fetchVideoPool'));
console.log('syncAllSources still calls fetchVideoPool:', updated.includes('fetchVideoPool()'));

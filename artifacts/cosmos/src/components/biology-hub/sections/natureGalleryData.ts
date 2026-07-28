// ─── Biology Hub — Feel Nature Discovery Gallery ─────────────────────────────

export interface NatureCard {
  id:          number;
  image:       string;
  title:       string;
  subtitle:    string;
  description: string;
  evolution:   string;
}

export const natureGalleryData: NatureCard[] = [
  {
    id: 1,
    image: '/nature-gallery/1000012166_2.jpg',
    title: 'The Architecture of Expression',
    subtitle: 'Facial Musculature',
    description:
      'Unlike most animals, human facial muscles attach directly to the skin rather than just bones. This intricate web of over 40 muscles allows for micro-expressions.',
    evolution:
      'Why did this evolve? Survival for early hominids depended entirely on social cooperation. The ability to silently communicate fear, anger, or joy across a tribe without making a sound was a massive evolutionary advantage.',
  },
  {
    id: 2,
    image: '/nature-gallery/1000012167_2.jpg',
    title: "The Jaw's Engineering",
    subtitle: 'Exploded Skull & Nerves',
    description:
      'A mechanical marvel. Notice the thick masseter muscles for chewing and the complex Trigeminal nerve network that registers every sensation on your face.',
    evolution:
      'As our ancestors discovered fire and started cooking meat, we no longer needed massive, heavy jaws to tear raw flesh. This evolutionary shift allowed our brain cases to expand, trading bite force for brainpower.',
  },
  {
    id: 3,
    image: '/nature-gallery/1000012168_2.jpg',
    title: 'The Great Migration',
    subtitle: 'March of Progress',
    description:
      'From aquatic life forms braving the shallow muddy shores, to quadrupedal apes, and finally bipedal humans. Every bone in your body is a modified version of a fish\'s skeleton.',
    evolution:
      'Bipedalism (walking on two legs) was a game-changer. It was slower, but it freed our hands. Hands that could now carry tools, weapons, and offspring, leading to the cognitive explosion that conquered the planet.',
  },
  {
    id: 4,
    image: '/nature-gallery/1000012169_2.jpg',
    title: 'The Apex Crown',
    subtitle: 'Panthera leo',
    description:
      'The African Lion is built for pure, explosive power. Forward-facing eyes give absolute binocular vision for depth perception to calculate the perfect strike.',
    evolution:
      'The iconic dark mane is an evolutionary billboard. It protects the neck during fights, but more importantly, a darker, thicker mane signals high testosterone and genetic fitness to females, while intimidating rival males.',
  },
  {
    id: 5,
    image: '/nature-gallery/1000012170_2.jpg',
    title: 'The Engineered Companion',
    subtitle: 'Canis familiaris',
    description:
      'Look at that smirk. Dogs are the only species that actively seek out human eye contact to read our emotions and communicate.',
    evolution:
      'This is Artificial Selection. We took apex predator wolves and, over 30,000 years, bred them. Dogs actually evolved a specific muscle (levator anguli oculi medialis) just to raise their inner eyebrows — hijacking human nurturing instincts perfectly.',
  },
  {
    id: 6,
    image: '/nature-gallery/1000012171_2.jpg',
    title: 'The Human Engine',
    subtitle: 'Anatomical Layers',
    description:
      'A perfect deconstruction of the machine. The skin acts as the radiator, the muscles as the engine, the skeleton as the chassis, and the nervous system as the motherboard.',
    evolution:
      'Physical evolution heavily prioritized burst speed for hunting and territory defense. The dense vascular network allows for rapid heat dissipation during persistence hunting — chasing prey until it collapses from exhaustion.',
  },
  {
    id: 7,
    image: '/nature-gallery/1000012174_2.jpg',
    title: "The Brain's Window",
    subtitle: 'Ocular Anatomy',
    description:
      'The human eye is essentially exposed brain tissue. Light hits the cornea, passes through the lens, and is projected upside down onto the retina.',
    evolution:
      'Why do we only see "visible light" and not infrared or ultraviolet? Because the very first eyes evolved in the ocean! Water absorbs UV and infrared light, so early aquatic life only evolved to see the wavelengths that could pierce through water.',
  },
  {
    id: 8,
    image: '/nature-gallery/1000012175_2.png',
    title: 'The Eternal Pump',
    subtitle: 'Cardiovascular View',
    description:
      'Beating roughly 100,000 times a day without rest. The thick muscular walls of the left ventricle must generate enough pressure to shoot blood to the very tips of your toes.',
    evolution:
      'The four-chambered heart was a massive evolutionary leap. By completely separating oxygen-rich blood from oxygen-poor blood, it gave mammals the immense stamina and warm-blooded metabolism needed to survive the ice ages.',
  },
];

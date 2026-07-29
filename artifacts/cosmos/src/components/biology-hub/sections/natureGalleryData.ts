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
  {
    id: 9,
    image: '/nature-gallery/1000012186.jpg',
    title: 'The Blueprint of Man',
    subtitle: 'Systemic Deconstruction',
    description:
      'From the integumentary system down to the nervous and circulatory networks, a human is a composite of overlapping biological engines working in absolute synchronization.',
    evolution:
      'This layered architecture allowed early hominids to adapt to extreme environments. Skin protects, bones support, muscles move, and nerves command — a masterpiece of natural engineering.',
  },
  {
    id: 10,
    image: '/nature-gallery/1000012187.jpg',
    title: 'The Duality of Form',
    subtitle: 'Superficial & Deep Anatomy',
    description:
      'Beneath the seamless protective layer of skin lies a violently complex network of striated muscle and high-speed vascular highways.',
    evolution:
      'Human skin evolved to be highly elastic and sweat-gland rich. This gave us the unique ability to thermoregulate during persistence hunting, chasing prey under the scorching sun until it collapsed.',
  },
  {
    id: 11,
    image: '/nature-gallery/1000012188.jpg',
    title: 'The Biomechanical Core',
    subtitle: 'Kinetic Architecture',
    description:
      'Viewed from above, the broad shoulders and narrow hips of the human body are specifically optimized for balance, rotation, and bipedal locomotion.',
    evolution:
      'The ability to rotate the torso independently from the hips allowed early humans to store and release massive kinetic energy, making us the most lethal and accurate throwers in the animal kingdom.',
  },
  {
    id: 12,
    image: '/nature-gallery/1000012189.jpg',
    title: "The Alchemist's Engine",
    subtitle: 'Visceral Anatomy',
    description:
      'A masterclass in spatial packaging. The liver processes toxins, the lungs exchange gases, and the intestines extract energy, all tightly packed within the ribcage and pelvis.',
    evolution:
      'The human gut actually shrank as we learned to control fire and cook food. Less energy spent on digesting raw plants meant more energy could be redirected to power our massive, demanding brains.',
  },
  {
    id: 13,
    image: '/nature-gallery/1000012190.jpg',
    title: 'The Symphony of Systems',
    subtitle: 'Neuro-Vascular Network',
    description:
      'Every millimeter of the human body is wired. Miles of blood vessels and nerve fibers ensure instant communication and nutrient delivery to billions of individual cells.',
    evolution:
      'The incredibly high density of nerve endings in our extremities, particularly the hands and lips, drove the evolution of fine motor skills, tool making, and complex speech.',
  },
  {
    id: 14,
    image: '/nature-gallery/1000012191.jpg',
    title: 'The Primordial Soup',
    subtitle: 'Origins of Life',
    description:
      'The vast, restless ocean. Billions of years ago, in hydrothermal vents deep beneath these waves, the very first single-celled organisms sparked into existence.',
    evolution:
      'We still carry the ocean within us. The salinity of human blood, sweat, and tears is remarkably similar to the ancient oceans where our earliest microscopic ancestors first evolved.',
  },
  {
    id: 15,
    image: '/nature-gallery/1000012192.jpg',
    title: 'The Solar Harvesters',
    subtitle: 'Photosynthetic Life',
    description:
      'Plants are the silent architects of our atmosphere. Through photosynthesis, they capture solar radiation and convert it into the chemical energy that sustains almost all life.',
    evolution:
      "Without the 'Great Oxidation Event' caused by ancient cyanobacteria and later complex plants, the oxygen-heavy atmosphere required to support large, warm-blooded mammals like humans would simply not exist.",
  },
  {
    id: 16,
    image: '/nature-gallery/1000012193.jpg',
    title: 'The Conscious Observer',
    subtitle: 'Human Cognition',
    description:
      'A biological machine capable of standing on a mountain and contemplating its own existence. Through us, the universe has developed a way to experience itself.',
    evolution:
      'Our ancestors climbed mountains not just for survival, but driven by an innate curiosity. The evolution of the prefrontal cortex gave us imagination, philosophy, and the relentless drive to explore the unknown.',
  },
  {
    id: 17,
    image: '/nature-gallery/1000012197.jpg',
    title: 'The Cradle of Biodiversity',
    subtitle: 'Coral Reef Ecosystems',
    description:
      'Reefs cover less than 1% of the ocean floor but support over 25% of all marine life. They are bustling underwater megacities driven by sunlight and symbiotic relationships.',
    evolution:
      'Life on Earth originated in the oceans. The complex visual patterns and vibrant colors of reef fish evolved for species recognition, camouflage, and mating displays in the crystal-clear, sunlit shallows.',
  },
  {
    id: 18,
    image: '/nature-gallery/1000012198.jpg',
    title: 'The Living Canvas',
    subtitle: 'Selective Adaptation',
    description:
      'The striking blue and white patterns of this aquatic specimen showcase how genetic mutations can rapidly alter the physical appearance of a species.',
    evolution:
      'While natural selection favors camouflage for survival, human-driven artificial selection (like breeding Koi) isolates specific genetic anomalies for aesthetic beauty, bypassing the harsh rules of the wild.',
  },
  {
    id: 19,
    image: '/nature-gallery/1000012199.jpg',
    title: 'The Metabolic Engine',
    subtitle: 'Gastrointestinal Tract',
    description:
      'An incredibly efficient chemical processing plant. From the liver (the body\'s primary detoxifier) down through meters of coiled intestines, every inch is designed for nutrient extraction.',
    evolution:
      'The human digestive tract is surprisingly short compared to other primates. Cooking our food pre-digested it externally, allowing us to evolve smaller stomachs and redirect that saved energy to power our rapidly expanding brains.',
  },
  {
    id: 20,
    image: '/nature-gallery/1000012200.jpg',
    title: 'The Armored Core',
    subtitle: 'Thoracic & Abdominal Cavity',
    description:
      'Observe how the most vital organs — the heart and lungs — are heavily shielded by the ribcage, while the digestive organs sit in the flexible abdominal cavity to allow for expansion.',
    evolution:
      'This structural divide is evolutionary genius. The rigid ribcage protects against lethal chest trauma, while the unprotected abdomen allows humans to bend, twist, and consume large amounts of food or carry growing fetuses.',
  },
  {
    id: 21,
    image: '/nature-gallery/1000012201.jpg',
    title: 'Biomechanics of Bipedalism',
    subtitle: 'Female Lateral Anatomy',
    description:
      'A lateral view reveals the distinct curvature of the spine and the precise positioning of the internal organs relative to the pelvic girdle.',
    evolution:
      'To walk upright on two legs, the human spine had to evolve an S-curve to act as a shock absorber. The female pelvis adapted to be wider to balance the extreme biomechanical demands of bipedal walking with the ability to birth large-brained infants.',
  },
  {
    id: 22,
    image: '/nature-gallery/1000012202.jpg',
    title: 'The Crimson River',
    subtitle: 'Vascular Architecture',
    description:
      'If you removed everything except the blood vessels, you would still perfectly see the shape of the human body. It is a closed-loop system spanning over 60,000 miles.',
    evolution:
      'Angiogenesis (the growth of new blood vessels) evolved to ensure no cell in a complex multicellular organism is ever more than a hair\'s width away from a nutrient supply. It is the ultimate biological delivery network.',
  },
  {
    id: 23,
    image: '/nature-gallery/1000012203.jpg',
    title: 'The Chemical Breakdown',
    subtitle: 'Oral Cavity & Glands',
    description:
      'Digestion doesn\'t start in the stomach; it starts here. The submandibular and parotid glands pump out saliva rich in amylase enzymes the second you smell food.',
    evolution:
      'Teeth are actually an evolutionary modification of ancient fish scales. The specialized shapes (incisors for cutting, molars for grinding) allowed mammals to extract maximum calories from a wide variety of food sources.',
  },
  {
    id: 24,
    image: '/nature-gallery/1000012204.jpg',
    title: 'The Floral Explosion',
    subtitle: 'Angiosperm Dominance',
    description:
      'For billions of years, the Earth was mostly green and brown. Flowers are a relatively recent, massive biological revolution that transformed the planet.',
    evolution:
      'Flowers (Angiosperms) hacked the animal kingdom. Instead of relying on wind to scatter pollen, they evolved bright colors and sweet nectar to trick insects and birds into doing their reproductive labor, conquering the globe in record time.',
  },
  {
    id: 25,
    image: '/nature-gallery/1000012205.jpg',
    title: 'The Universal Solvent',
    subtitle: 'Geological vs Biological Time',
    description:
      'Water carves through solid rock over millions of years, creating deep, glowing subterranean ecosystems untouched by the outside world.',
    evolution:
      'Water is the absolute prerequisite for life. Its unique chemical ability to dissolve more substances than any other liquid makes it the perfect medium for the complex chemical reactions required to build DNA and sustain cellular life.',
  },
  {
    id: 26,
    image: '/nature-gallery/1000012207.jpg',
    title: 'The Sacred Coil',
    subtitle: 'Chromatin & Histones',
    description:
      'Over 2 meters of DNA is packed inside a single microscopic cell nucleus by wrapping tightly around protein spools called histones.',
    evolution:
      'Epigenetic controls evolved to turn genes on and off without altering the core code, allowing a single set of DNA instructions to build both a beating heart cell and a thinking neuron.',
  },
  {
    id: 27,
    image: '/nature-gallery/1000012208.jpg',
    title: 'The Great Tapestry',
    subtitle: 'Phylogenetic Tree of Life',
    description:
      'Every living organism on Earth—from ancient bacteria to giant redwoods and blue whales—stems from a single common aquatic ancestor.',
    evolution:
      'LUCA (Last Universal Common Ancestor) emerged over 3.5 billion years ago. The universal genetic code shared by all living things is absolute proof of our common origin.',
  },
  {
    id: 28,
    image: '/nature-gallery/1000012209.jpg',
    title: 'The Classical Dissection',
    subtitle: 'Vintage Anatomical Illustration',
    description:
      'Historical paper cut-out anatomy models allowed early medical scholars to study human inner structure layer-by-layer before modern imaging existed.',
    evolution:
      'Human curiosity and systematic anatomical study sparked medical breakthroughs that doubled the average human lifespan in less than two centuries.',
  },
  {
    id: 29,
    image: '/nature-gallery/1000012210.jpg',
    title: 'The Command Center',
    subtitle: 'Cranial Sagittal View',
    description:
      'A cross-section of human cognition: cerebrum for high thought, cerebellum for motor control, and brainstem governing involuntary survival functions.',
    evolution:
      'The massive enlargement of our cerebral cortex forced human infants to be born far less physically independent than other primates, forging deep parental care and strong social tribes.',
  },
  {
    id: 30,
    image: '/nature-gallery/1000012211.jpg',
    title: 'The Ghost in the Machine',
    subtitle: 'Isolated Human Nervous System',
    description:
      'Stripped of skin, muscle, and bone, this is what actually feels, thinks, and perceives reality—a tree of electrical wiring weighing under 2 kg.',
    evolution:
      'Nerve impulses transmit signals at speeds up to 120 meters per second using rapid sodium-potassium ion exchanges across cell membranes—an evolutionary high-speed fiber-optic network.',
  },
  {
    id: 31,
    image: '/nature-gallery/1000012212.jpg',
    title: 'Microscopic Powerhouses',
    subtitle: 'Photosynthetic Microalgae',
    description:
      'Spherical green cells packed with chlorophyll, swimming in water and turning solar radiation and carbon dioxide into oxygen.',
    evolution:
      'Endosymbiosis: Billions of years ago, an ancient single cell engulfed a photosynthetic bacterium instead of digesting it, giving birth to the ancestors of all plant life.',
  },
  {
    id: 32,
    image: '/nature-gallery/1000012213.jpg',
    title: 'Architectural Resilience',
    subtitle: 'Female Internal Systems',
    description:
      'A comprehensive view showing how the respiratory, cardiovascular, and digestive tracts interact in harmony within the female frame.',
    evolution:
      'The internal placement of reproductive organs within the protective ring of the bony pelvis provides maximum shielding against physical impact, ensuring species survival.',
  },
  {
    id: 33,
    image: '/nature-gallery/1000012214.jpg',
    title: 'The Visual Highway',
    subtitle: 'Optic Chiasm & Neural Pathway',
    description:
      'Optic nerves from both eyes cross at the Optic Chiasm, sending left and right field visuals to opposite brain hemispheres to compute 3D depth perception.',
    evolution:
      'Binocular overlapping vision evolved in tree-dwelling primates to accurately judge leap distances between branches, later adapting for precision tool manipulation.',
  },
  {
    id: 34,
    image: '/nature-gallery/1000012215.jpg',
    title: 'The Great Conduit',
    subtitle: 'Abdominal Aorta & Renal System',
    description:
      'The massive aortic arch branching down into the kidneys and abdominal organs under intense hydraulic pressure.',
    evolution:
      'The high-pressure mammalian vascular system requires thick, elastic arterial walls that stretch and recoil, maintaining continuous blood flow even between heartbeats.',
  },
  {
    id: 35,
    image: '/nature-gallery/1000012216.jpg',
    title: 'The Pelvic Foundation',
    subtitle: 'Deep Perineal Architecture',
    description:
      'A deep anatomical breakdown of the pelvic floor and lower spine muscles in a deep squat position, illustrating how gravity and muscle tension stabilize the human core.',
    evolution:
      'Deep squatting was the natural resting and birthing posture for early hominids for millions of years before chairs were invented. This posture naturally aligns the colon and strengthens pelvic floor ligaments.',
  },
  {
    id: 36,
    image: '/nature-gallery/1000012217.jpg',
    title: 'The Genesis of Form',
    subtitle: 'Embryonic Development',
    description:
      'A week-by-week progression from a single fertilized cell to a fully formed human fetus, echoing millions of years of evolutionary history in just 40 weeks.',
    evolution:
      'Ontogeny recapitulates phylogeny: early human embryos transiently develop pharyngeal arches (gill-like slits) and a tailbone, reflecting our deep ancestral aquatic ties.',
  },
  {
    id: 37,
    image: '/nature-gallery/1000012218.jpg',
    title: 'The Neuro-Vascular Web',
    subtitle: 'Cervical & Facial Plexus',
    description:
      'A classical scientific tracing mapping the intricate superficial nerve network and vascular supply feeding the brain, scalp, and upper chest.',
    evolution:
      'The high metabolic demands of the expanding human brain required over 20% of total oxygenated cardiac output, delivered rapidly through the carotid and vertebral artery networks.',
  },
  {
    id: 38,
    image: '/nature-gallery/1000012219.jpg',
    title: 'The Reproductive Crucible',
    subtitle: 'Pelvic Viscera Sagittal View',
    description:
      'Detailed sagittal cross-sections illustrating the urinary bladder, rectum, and reproductive organs protected within the bony pelvic bowl.',
    evolution:
      'Internal fertilization and internal gestation evolved in terrestrial mammals to shield delicate embryos from dehydration and land predators.',
  },
  {
    id: 39,
    image: '/nature-gallery/1000012220.jpg',
    title: 'The Pillar of Balance',
    subtitle: 'Cervical Musculature',
    description:
      'Thick muscle bands like the sternocleidomastoid and trapezius supporting the heavy human skull over a slender spinal column.',
    evolution:
      'As ancestors shifted to bipedalism, the skull\'s balance point moved directly over the spine, requiring specialized neck muscles to balance the head effortlessly.',
  },
  {
    id: 40,
    image: '/nature-gallery/1000012221.jpg',
    title: 'Internal Equilibrium',
    subtitle: 'Visceral Organs Assembly',
    description:
      'An intact front view of the liver, lungs, stomach, and intestines enclosed within the abdominal cavity and skeletal cage.',
    evolution:
      'The human liver is uniquely capable of regenerating lost tissue. This evolved as a survival mechanism against plant toxins consumed by foraging ancestors.',
  },
  {
    id: 41,
    image: '/nature-gallery/1000012222.jpg',
    title: 'The Sculpted Forearm',
    subtitle: 'Upper Limb Myology',
    description:
      '18th-century engraving detailing the complex flexor and extensor muscle bellies that govern finger dexterity and grip precision.',
    evolution:
      'Opposable thumbs paired with specialized forearm tendon control freed upper limbs from walking duties, enabling early humans to craft fine stone tools.',
  },
  {
    id: 42,
    image: '/nature-gallery/1000012223.jpg',
    title: 'The Filtration System',
    subtitle: 'Renaissance Urogenital Plates',
    description:
      'Historical Renaissance engraving depicting the kidneys, renal arteries, and lower abdominal blood vessels.',
    evolution:
      'Human kidneys contain roughly 1 million filtering nephrons each, constantly regulating blood pressure and fluid balance—an essential adaptation for terrestrial life.',
  },
  {
    id: 43,
    image: '/nature-gallery/1000012224.jpg',
    title: 'The Alpine Sanctuary',
    subtitle: 'Montane Ecosystem',
    description:
      'Horses grazing peacefully in a misty mountain valley surrounded by conifer forests and pristine glacier-fed streams.',
    evolution:
      'Conifer trees evolved needle-like leaves coated in thick wax to prevent water loss during freezing alpine winters, creating enduring biomes for terrestrial herbivores.',
  },
  {
    id: 44,
    image: '/nature-gallery/1000012225.jpg',
    title: 'The Fibonacci Spiral',
    subtitle: 'Botanical Geometry',
    description:
      'Dewdrops clinging to an unfurling fern spiral, revealing the natural mathematical symmetry embedded in plant growth.',
    evolution:
      'Spiral growth patterns follow the Golden Ratio (Fibonacci sequence). This allows developing plant shoots and leaves to pack tightly without shading each other from sunlight.',
  },
];

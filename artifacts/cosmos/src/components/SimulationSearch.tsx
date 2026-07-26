import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, X, FlaskConical, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type SimSource = 'PhET' | 'GeoGebra' | 'Concord' | 'GoLab' | 'ComPADRE';

interface SimEntry {
  id: string;
  title: string;
  description: string;
  subject: string;
  source: SimSource;
  iframeUrl: string;
  tags: string[];
}

// ─── Curated Simulation Database ─────────────────────────────────────────────
const SIM_DATABASE: SimEntry[] = [
  // ── PhET ──────────────────────────────────────────────────────────────────
  { id: 'phet-wave-string',      source: 'PhET', title: 'Wave on a String',          subject: 'Waves',          description: 'Explore wave properties — frequency, amplitude, tension.',        tags: ['waves','oscillation','transverse'],     iframeUrl: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_en.html' },
  { id: 'phet-pendulum',         source: 'PhET', title: 'Pendulum Lab',               subject: 'Motion',         description: 'Adjustable pendulum with period and energy readouts.',            tags: ['pendulum','gravity','period','motion'], iframeUrl: 'https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html' },
  { id: 'phet-projectile',       source: 'PhET', title: 'Projectile Motion',          subject: 'Kinematics',     description: 'Launch angle, speed, and air resistance controls.',               tags: ['projectile','kinematics','velocity'],   iframeUrl: 'https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html' },
  { id: 'phet-forces-motion',    source: 'PhET', title: 'Forces and Motion: Basics', subject: 'Forces',         description: "Newton's laws through push-and-pull interactions.",               tags: ['forces','newton','friction','motion'],  iframeUrl: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html' },
  { id: 'phet-gravity-orbits',   source: 'PhET', title: 'Gravity and Orbits',         subject: 'Gravity',        description: 'Orbit simulations with adjustable masses and distances.',         tags: ['gravity','orbits','space','planet'],    iframeUrl: 'https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_en.html' },
  { id: 'phet-solar-system',     source: 'PhET', title: 'My Solar System',            subject: 'Gravity',        description: 'Build your own solar system with up to 4 bodies.',               tags: ['solar system','gravity','orbit'],       iframeUrl: 'https://phet.colorado.edu/sims/html/my-solar-system/latest/my-solar-system_en.html' },
  { id: 'phet-charges-fields',   source: 'PhET', title: 'Charges and Fields',         subject: 'Electricity',    description: 'Place charges and visualise electric field lines and potential.', tags: ['electricity','charges','field'],        iframeUrl: 'https://phet.colorado.edu/sims/html/charges-and-fields/latest/charges-and-fields_en.html' },
  { id: 'phet-faraday',          source: 'PhET', title: "Faraday's Law",              subject: 'Magnetism',      description: 'Electromagnetic induction with a moving bar magnet.',            tags: ['magnetism','induction','faraday'],      iframeUrl: 'https://phet.colorado.edu/sims/html/faradays-law/latest/faradays-law_en.html' },
  { id: 'phet-ohms-law',         source: 'PhET', title: "Ohm's Law",                  subject: 'Electricity',    description: 'Explore voltage, current, and resistance relationships.',          tags: ['electricity','resistance','circuit'],   iframeUrl: 'https://phet.colorado.edu/sims/html/ohms-law/latest/ohms-law_en.html' },
  { id: 'phet-circuit-dc',       source: 'PhET', title: 'Circuit Construction Kit',   subject: 'Electricity',    description: 'Build and test DC circuits with real components.',                tags: ['circuit','dc','electricity','battery'], iframeUrl: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html' },
  { id: 'phet-bending-light',    source: 'PhET', title: 'Bending Light',              subject: 'Optics',         description: 'Explore refraction, reflection and Snell\'s law.',                tags: ['optics','refraction','light','snell'],  iframeUrl: 'https://phet.colorado.edu/sims/html/bending-light/latest/bending-light_en.html' },
  { id: 'phet-wave-interference', source: 'PhET', title: 'Wave Interference',         subject: 'Waves',          description: 'Constructive and destructive interference in water, sound, light.',tags: ['interference','waves','diffraction'],   iframeUrl: 'https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html' },
  { id: 'phet-density',          source: 'PhET', title: 'Density',                    subject: 'Matter',         description: 'Measure mass and volume to explore density relationships.',        tags: ['density','matter','mass','volume'],     iframeUrl: 'https://phet.colorado.edu/sims/html/density/latest/density_en.html' },
  { id: 'phet-buoyancy',         source: 'PhET', title: 'Buoyancy',                   subject: 'Fluids',         description: 'Archimedes principle with floating and sinking objects.',         tags: ['buoyancy','fluids','archimedes'],       iframeUrl: 'https://phet.colorado.edu/sims/html/buoyancy/latest/buoyancy_en.html' },
  { id: 'phet-collision',        source: 'PhET', title: 'Collision Lab',               subject: 'Motion',         description: 'Elastic and inelastic collisions with momentum graphs.',          tags: ['collision','momentum','elastic'],       iframeUrl: 'https://phet.colorado.edu/sims/html/collision-lab/latest/collision-lab_en.html' },
  { id: 'phet-energy-forms',     source: 'PhET', title: 'Energy Forms and Changes',   subject: 'Energy',         description: 'Conversion between kinetic, potential and thermal energy.',        tags: ['energy','thermodynamics','conversion'], iframeUrl: 'https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html' },
  { id: 'phet-states-matter',    source: 'PhET', title: 'States of Matter',           subject: 'Thermodynamics', description: 'Solid, liquid, gas phase transitions at the atomic scale.',       tags: ['matter','phases','thermodynamics'],     iframeUrl: 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html' },
  { id: 'phet-gas-properties',   source: 'PhET', title: 'Gas Properties',             subject: 'Thermodynamics', description: 'Kinetic theory — pressure, volume and temperature.',             tags: ['gas','pressure','thermodynamics'],      iframeUrl: 'https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_en.html' },
  { id: 'phet-build-atom',       source: 'PhET', title: 'Build an Atom',              subject: 'Atomic',         description: 'Protons, neutrons, and electrons forming stable atoms.',          tags: ['atom','nuclear','proton','electron'],   iframeUrl: 'https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_en.html' },
  { id: 'phet-natural-selection', source: 'PhET', title: 'Natural Selection',         subject: 'Biology',        description: 'Simulate evolution through environmental pressure and mutation.',  tags: ['evolution','biology','genetics'],       iframeUrl: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html' },
  { id: 'phet-greenhouse',       source: 'PhET', title: 'Greenhouse Effect',          subject: 'Earth Science',  description: 'Model greenhouse gas concentration and global temperature.',       tags: ['climate','greenhouse','earth'],         iframeUrl: 'https://phet.colorado.edu/sims/html/greenhouse-effect/latest/greenhouse-effect_en.html' },
  { id: 'phet-skate-park',       source: 'PhET', title: 'Energy Skate Park',          subject: 'Energy',         description: 'Conservation of energy on a custom skate track.',                 tags: ['energy','kinetic','potential'],         iframeUrl: 'https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_en.html' },
  { id: 'phet-blackbody',        source: 'PhET', title: 'Blackbody Spectrum',         subject: 'Thermodynamics', description: 'Thermal radiation curve versus temperature — Planck\'s law.',     tags: ['blackbody','radiation','spectrum'],     iframeUrl: 'https://phet.colorado.edu/sims/html/blackbody-spectrum/latest/blackbody-spectrum_all.html' },
  { id: 'phet-rutherford',       source: 'PhET', title: 'Rutherford Scattering',      subject: 'Nuclear',        description: 'Alpha particles deflected by a gold nucleus — nuclear model.',    tags: ['nuclear','rutherford','atom'],          iframeUrl: 'https://phet.colorado.edu/sims/html/rutherford-scattering/latest/rutherford-scattering_all.html' },
  { id: 'phet-hydrogen',         source: 'PhET', title: 'Models of the Hydrogen Atom', subject: 'Quantum',       description: 'From Bohr orbits to quantum mechanical atomic models.',           tags: ['quantum','hydrogen','bohr','atom'],     iframeUrl: 'https://phet.colorado.edu/sims/html/models-of-the-hydrogen-atom/latest/models-of-the-hydrogen-atom_all.html' },
  { id: 'phet-acid-base',        source: 'PhET', title: 'Acid-Base Solutions',        subject: 'Chemistry',      description: 'pH, conductivity, and molecule concentrations in solution.',      tags: ['chemistry','acid','base','pH'],         iframeUrl: 'https://phet.colorado.edu/sims/html/acid-base-solutions/latest/acid-base-solutions_all.html' },
  { id: 'phet-molecule-shapes',  source: 'PhET', title: 'Molecule Shapes',            subject: 'Chemistry',      description: 'VSEPR theory and 3D molecular geometry.',                        tags: ['chemistry','molecules','vsepr'],        iframeUrl: 'https://phet.colorado.edu/sims/html/molecule-shapes/latest/molecule-shapes_all.html' },
  { id: 'phet-gene-expression',  source: 'PhET', title: 'Gene Expression Essentials', subject: 'Biology',       description: 'Transcription and translation of DNA into proteins.',             tags: ['biology','genetics','dna','protein'],   iframeUrl: 'https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_all.html' },
  { id: 'phet-neuron',           source: 'PhET', title: 'Neuron',                     subject: 'Biology',        description: 'Action potential propagation along a neuron membrane.',           tags: ['biology','neuron','action potential'],  iframeUrl: 'https://phet.colorado.edu/sims/html/neuron/latest/neuron_en.html' },
  { id: 'phet-vector-addition',  source: 'PhET', title: 'Vector Addition',            subject: 'Math/Physics',   description: 'Graphical and component vector addition and subtraction.',        tags: ['vectors','math','physics','addition'],  iframeUrl: 'https://phet.colorado.edu/sims/html/vector-addition/latest/vector-addition_en.html' },
  { id: 'phet-fourier',          source: 'PhET', title: 'Fourier: Making Waves',      subject: 'Math/Physics',   description: 'Build complex waveforms from sine and cosine harmonics.',         tags: ['fourier','waves','math','harmonics'],   iframeUrl: 'https://phet.colorado.edu/sims/html/fourier-making-waves/latest/fourier-making-waves_en.html' },
  { id: 'phet-balancing-act',    source: 'PhET', title: 'Balancing Act',              subject: 'Forces',         description: 'Torque and lever balance with adjustable masses.',                tags: ['torque','lever','balance','forces'],    iframeUrl: 'https://phet.colorado.edu/sims/html/balancing-act/latest/balancing-act_en.html' },
  { id: 'phet-hookes-law',       source: 'PhET', title: "Hooke's Law",                subject: 'Elasticity',     description: 'Spring deformation versus applied force.',                       tags: ['spring','elasticity','force'],          iframeUrl: 'https://phet.colorado.edu/sims/html/hookes-law/latest/hookes-law_all.html' },
  { id: 'phet-under-pressure',   source: 'PhET', title: 'Under Pressure',             subject: 'Fluids',         description: 'Fluid pressure at depth in different liquids.',                  tags: ['pressure','fluids','depth'],            iframeUrl: 'https://phet.colorado.edu/sims/html/under-pressure/latest/under-pressure_all.html' },
  { id: 'phet-molarity',         source: 'PhET', title: 'Molarity',                   subject: 'Chemistry',      description: 'Moles per litre and solution concentration.',                    tags: ['chemistry','concentration','moles'],    iframeUrl: 'https://phet.colorado.edu/sims/html/molarity/latest/molarity_all.html' },
  { id: 'phet-ph-scale',         source: 'PhET', title: 'pH Scale',                   subject: 'Chemistry',      description: 'Logarithmic hydrogen ion concentration and acidity.',            tags: ['chemistry','pH','acid','base'],         iframeUrl: 'https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale_all.html' },
  { id: 'phet-isotopes',         source: 'PhET', title: 'Isotopes and Atomic Mass',   subject: 'Nuclear',        description: 'Proton/neutron counts and isotope abundance percentages.',        tags: ['nuclear','isotopes','atomic mass'],     iframeUrl: 'https://phet.colorado.edu/sims/html/isotopes-and-atomic-mass/latest/isotopes-and-atomic-mass_all.html' },
  { id: 'phet-masses-springs',   source: 'PhET', title: 'Masses and Springs',         subject: 'Vibration',      description: 'Hanging masses on springs with real-time motion graphs.',         tags: ['spring','vibration','oscillation'],     iframeUrl: 'https://phet.colorado.edu/sims/html/masses-and-springs/latest/masses-and-springs_all.html' },
  { id: 'phet-circuit-ac',       source: 'PhET', title: 'Circuit Construction Kit AC', subject: 'Electricity',  description: 'Build and analyse alternating current circuits.',                 tags: ['circuit','ac','electricity'],           iframeUrl: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-ac/latest/circuit-construction-kit-ac_all.html' },
  { id: 'phet-faraday-lab',      source: 'PhET', title: "Faraday's Electromagnetic Lab", subject: 'Magnetism',  description: 'Electromagnetic induction with bar magnet and coil.',            tags: ['magnetism','induction','coil'],         iframeUrl: 'https://phet.colorado.edu/sims/html/faradays-electromagnetic-lab/latest/faradays-electromagnetic-lab_all.html' },
  { id: 'phet-capacitor',        source: 'PhET', title: 'Capacitor Lab: Basics',      subject: 'Electricity',    description: 'Charge, voltage, and electric field in a parallel-plate capacitor.',tags: ['capacitor','electricity','field'],     iframeUrl: 'https://phet.colorado.edu/sims/html/capacitor-lab-basics/latest/capacitor-lab-basics_en.html' },

  // ── GeoGebra ──────────────────────────────────────────────────────────────
  { id: 'ggb-function-grapher',   source: 'GeoGebra', title: 'Function Grapher',              subject: 'Math',       description: 'Plot any mathematical function with dynamic parameter sliders.',   tags: ['graphing','functions','math'],          iframeUrl: 'https://www.geogebra.org/calculator' },
  { id: 'ggb-unit-circle',        source: 'GeoGebra', title: 'Unit Circle',                   subject: 'Trigonometry', description: 'Interactive unit circle — sine, cosine, and tangent relationships.', tags: ['trigonometry','unit circle','sine'],    iframeUrl: 'https://www.geogebra.org/m/XUv5mXTm' },
  { id: 'ggb-pythagoras',         source: 'GeoGebra', title: 'Pythagorean Theorem',           subject: 'Geometry',   description: 'Visual proof of a² + b² = c² with interactive triangles.',         tags: ['geometry','pythagorean','theorem'],     iframeUrl: 'https://www.geogebra.org/m/npSZYBqN' },
  { id: 'ggb-derivative',         source: 'GeoGebra', title: 'Derivative Explorer',           subject: 'Calculus',   description: 'Visualise the derivative as the slope of a tangent line.',          tags: ['calculus','derivative','tangent'],      iframeUrl: 'https://www.geogebra.org/m/MYTjqkW7' },
  { id: 'ggb-integral',           source: 'GeoGebra', title: 'Riemann Sum & Integration',     subject: 'Calculus',   description: 'Riemann sum approximations and definite integral visualisation.',    tags: ['calculus','integral','riemann'],        iframeUrl: 'https://www.geogebra.org/m/TJ6pyGBP' },
  { id: 'ggb-3d-grapher',         source: 'GeoGebra', title: '3D Grapher',                    subject: 'Math',       description: 'Plot 3D surfaces, curves, and vectors interactively.',             tags: ['3d','graphing','vectors','surfaces'],   iframeUrl: 'https://www.geogebra.org/3d' },
  { id: 'ggb-parabola',           source: 'GeoGebra', title: 'Parabola Explorer',             subject: 'Algebra',    description: 'Explore vertex form, intercepts and focus of a parabola.',          tags: ['algebra','parabola','quadratic'],       iframeUrl: 'https://www.geogebra.org/m/Rd6RZNFN' },
  { id: 'ggb-linear-transform',   source: 'GeoGebra', title: 'Linear Transformations',        subject: 'Algebra',    description: 'Matrix multiplication as geometric transformation of vectors.',       tags: ['linear algebra','matrix','vectors'],    iframeUrl: 'https://www.geogebra.org/m/GqHDuB5B' },
  { id: 'ggb-complex-numbers',    source: 'GeoGebra', title: 'Complex Number Explorer',       subject: 'Math',       description: 'Plot complex numbers and operations on the Argand plane.',          tags: ['complex numbers','argand','math'],      iframeUrl: 'https://www.geogebra.org/m/ZYAhkUNH' },
  { id: 'ggb-probability',        source: 'GeoGebra', title: 'Probability Distributions',     subject: 'Statistics', description: 'Normal, binomial, and Poisson distributions interactively.',        tags: ['statistics','probability','normal'],    iframeUrl: 'https://www.geogebra.org/m/T2TbGUBC' },
  { id: 'ggb-central-limit',      source: 'GeoGebra', title: 'Central Limit Theorem',         subject: 'Statistics', description: 'Simulate sample means to observe the central limit theorem.',       tags: ['statistics','sampling','CLT'],          iframeUrl: 'https://www.geogebra.org/m/DQZV3HQW' },
  { id: 'ggb-vectors-2d',         source: 'GeoGebra', title: 'Vector Operations 2D',          subject: 'Math/Physics', description: 'Add, subtract, and scale 2D vectors with visual feedback.',        tags: ['vectors','2d','math','physics'],        iframeUrl: 'https://www.geogebra.org/m/dtfRJWCt' },
  { id: 'ggb-eulers-formula',     source: 'GeoGebra', title: "Euler's Formula",               subject: 'Math',       description: "Animate e^(ix) = cos(x) + i·sin(x) on the complex plane.",         tags: ['euler','complex','math','formula'],     iframeUrl: 'https://www.geogebra.org/m/YNYkFHcx' },
  { id: 'ggb-conics',             source: 'GeoGebra', title: 'Conic Sections',                subject: 'Geometry',   description: 'Circle, ellipse, parabola and hyperbola from cone slices.',         tags: ['conics','geometry','ellipse'],          iframeUrl: 'https://www.geogebra.org/m/Bdxttfxv' },
  { id: 'ggb-projectile',         source: 'GeoGebra', title: 'Projectile Motion',             subject: 'Physics',    description: 'Adjustable launch angle and speed with real-time trajectory.',       tags: ['projectile','physics','trajectory'],    iframeUrl: 'https://www.geogebra.org/m/Q24mDVWG' },
  { id: 'ggb-wave-interference',  source: 'GeoGebra', title: 'Wave Superposition',            subject: 'Physics',    description: 'Sum of two sinusoidal waves — beats and interference patterns.',     tags: ['waves','interference','superposition'], iframeUrl: 'https://www.geogebra.org/m/GuW8pNFJ' },
  { id: 'ggb-pendulum',           source: 'GeoGebra', title: 'Pendulum Simulation',           subject: 'Physics',    description: 'Simple pendulum with energy bar charts and angle plot.',            tags: ['pendulum','physics','oscillation'],     iframeUrl: 'https://www.geogebra.org/m/UkxBbvzr' },
  { id: 'ggb-taylor-series',      source: 'GeoGebra', title: 'Taylor Series',                 subject: 'Calculus',   description: 'Polynomial approximations converging to transcendental functions.',  tags: ['taylor','calculus','series','approximation'], iframeUrl: 'https://www.geogebra.org/m/VqhJQqPW' },
  { id: 'ggb-sliders-circle',     source: 'GeoGebra', title: 'Circle and Pi Explorer',        subject: 'Geometry',   description: 'Interactive exploration of circumference, diameter and π.',          tags: ['circle','pi','geometry','circumference'], iframeUrl: 'https://www.geogebra.org/m/bnbJ88Ym' },
  { id: 'ggb-number-line',        source: 'GeoGebra', title: 'Fractions on a Number Line',   subject: 'Arithmetic', description: 'Place, compare, and add fractions on a dynamic number line.',       tags: ['fractions','arithmetic','number line'], iframeUrl: 'https://www.geogebra.org/m/tYDmqadw' },

  // ── Concord Consortium ────────────────────────────────────────────────────
  { id: 'cc-energy2d',            source: 'Concord', title: 'Energy2D Heat Transfer',        subject: 'Thermodynamics', description: '2D simulation of heat conduction, convection and radiation.',     tags: ['heat','conduction','thermodynamics'],   iframeUrl: 'https://concord.org/stem-resources/energy2d-interactive-heat-transfer-simulations/' },
  { id: 'cc-molecular-workbench', source: 'Concord', title: 'DNA Replication',               subject: 'Biology',    description: 'Step-by-step DNA replication with polymerase and helicase.',        tags: ['dna','biology','replication'],          iframeUrl: 'https://models-resources.concord.org/jsmol/dna-replication/index.html' },
  { id: 'cc-conduction',          source: 'Concord', title: 'Thermal Conduction',            subject: 'Thermodynamics', description: 'Molecular-level simulation of heat transfer through solids.',     tags: ['conduction','heat','thermodynamics'],   iframeUrl: 'https://models-resources.concord.org/energy2d/visual/conduction.html' },
  { id: 'cc-phases',              source: 'Concord', title: 'Phase Change',                  subject: 'Chemistry',  description: 'Molecular motion during melting, boiling, and condensation.',       tags: ['phases','chemistry','molecules'],       iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/phase-change/2-what-is-temperature.json' },
  { id: 'cc-diffusion',           source: 'Concord', title: 'Diffusion',                     subject: 'Chemistry',  description: 'Molecular diffusion across a membrane — concentration gradient.',    tags: ['diffusion','chemistry','osmosis'],      iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/diffusion/3-osmosis.json' },
  { id: 'cc-protein-folding',     source: 'Concord', title: 'Protein Folding',               subject: 'Biology',    description: 'Model protein structure and the effect of temperature on shape.',    tags: ['protein','biology','folding'],          iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/protein-folding/1-protein-structure.json' },
  { id: 'cc-atomic-interactions', source: 'Concord', title: 'Atomic Interactions',           subject: 'Chemistry',  description: 'Lennard-Jones potential and inter-atomic forces visualised.',        tags: ['atoms','chemistry','lennard-jones'],    iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/intermolecular-attractions/3-comparing-LJ.json' },
  { id: 'cc-nuclear-fission',     source: 'Concord', title: 'Nuclear Fission Chain Reaction', subject: 'Nuclear',   description: 'Chain reaction simulation — critical mass and neutron cascade.',     tags: ['nuclear','fission','chain reaction'],   iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/nuclear-physics/3-nuclear-reactor.json' },
  { id: 'cc-climate',             source: 'Concord', title: 'Climate Change',                subject: 'Earth Science', description: 'Model CO₂ levels, albedo, and global average temperature.',      tags: ['climate','earth','greenhouse'],         iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/climate-change/1-introduction-to-climate-change.json' },
  { id: 'cc-evolution',           source: 'Concord', title: 'Populations and Evolution',     subject: 'Biology',    description: 'Hardy-Weinberg equilibrium and natural selection over generations.', tags: ['evolution','biology','genetics'],       iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/evolved/1-malePercentage.json' },
  { id: 'cc-photosynthesis',      source: 'Concord', title: 'Photosynthesis & Respiration',  subject: 'Biology',    description: 'Light reactions, Calvin cycle, and cellular energy flow.',            tags: ['biology','photosynthesis','energy'],    iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/photosynthesis/1-introduction.json' },
  { id: 'cc-pendulum',            source: 'Concord', title: 'Pendulum Energy',               subject: 'Physics',    description: 'Pendulum with real-time energy bar charts — PE and KE conversion.',  tags: ['pendulum','energy','physics'],          iframeUrl: 'https://models-resources.concord.org/lab/embeddable.html#interactives/sam/pendulum/2-energy.json' },

  // ── Go-Lab ────────────────────────────────────────────────────────────────
  { id: 'gl-ohms-law',            source: 'GoLab', title: "Ohm's Law Virtual Lab",          subject: 'Electricity', description: 'Measure current, voltage, and resistance in a virtual circuit.',    tags: ['electricity','ohm','circuit','lab'],    iframeUrl: 'https://www.golabz.eu/lab/ohms-law-lab' },
  { id: 'gl-pendulum',            source: 'GoLab', title: 'Pendulum Virtual Lab',           subject: 'Physics',    description: 'Interactive pendulum lab with period vs. length investigations.',    tags: ['pendulum','physics','lab','period'],    iframeUrl: 'https://www.golabz.eu/lab/pendulum-lab-phet' },
  { id: 'gl-springs',             source: 'GoLab', title: 'Springs and Masses Lab',         subject: 'Mechanics',  description: 'Hooke\'s law investigation with adjustable springs and weights.',    tags: ['springs','hooke','mechanics','lab'],    iframeUrl: 'https://www.golabz.eu/lab/masses-springs-phet' },
  { id: 'gl-projectile',          source: 'GoLab', title: 'Projectile Motion Lab',          subject: 'Kinematics', description: 'Launch angle and speed experiments with data collection.',           tags: ['projectile','kinematics','lab'],        iframeUrl: 'https://www.golabz.eu/lab/projectile-motion-lab-phet' },
  { id: 'gl-capacitor',           source: 'GoLab', title: 'Capacitor Virtual Lab',          subject: 'Electricity', description: 'Explore charge, voltage and capacitance in parallel-plate caps.',   tags: ['capacitor','electricity','lab'],        iframeUrl: 'https://www.golabz.eu/lab/capacitor-lab-phet' },
  { id: 'gl-wave',                source: 'GoLab', title: 'Wave Properties Lab',            subject: 'Waves',      description: 'Frequency, wavelength and speed measurements on a string wave.',    tags: ['waves','frequency','wavelength','lab'], iframeUrl: 'https://www.golabz.eu/lab/wave-on-a-string-phet' },
  { id: 'gl-atomic',              source: 'GoLab', title: 'Atomic Structure Lab',           subject: 'Atomic',     description: 'Build atoms and explore stability in an interactive nucleus model.', tags: ['atom','nuclear','atomic','lab'],        iframeUrl: 'https://www.golabz.eu/lab/build-an-atom-phet' },
  { id: 'gl-genetics',            source: 'GoLab', title: 'Genetics and Heredity Lab',      subject: 'Biology',    description: 'Mendelian inheritance and Punnett square simulations.',              tags: ['genetics','biology','heredity','lab'],  iframeUrl: 'https://www.golabz.eu/lab/natural-selection-phet' },
  { id: 'gl-ecosystems',          source: 'GoLab', title: 'Ecosystem Dynamics',             subject: 'Biology',    description: 'Predator-prey dynamics and population balance models.',              tags: ['biology','ecosystem','population'],     iframeUrl: 'https://www.golabz.eu/lab/ecosystem' },
  { id: 'gl-dc-circuit',          source: 'GoLab', title: 'DC Circuit Builder',             subject: 'Electricity', description: 'Drag-and-drop circuit builder with real-time measurement.',         tags: ['circuit','dc','electricity','builder'], iframeUrl: 'https://www.golabz.eu/lab/circuit-construction-kit-phet' },

  // ── ComPADRE ──────────────────────────────────────────────────────────────
  { id: 'cp-ejs-pendulum',        source: 'ComPADRE', title: 'EJS Pendulum Simulation',       subject: 'Physics',   description: 'Easy JavaScript pendulum with phase space and energy plots.',       tags: ['pendulum','physics','ejs','phase'],     iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=7393' },
  { id: 'cp-tracker',             source: 'ComPADRE', title: 'Tracker Video Analysis',        subject: 'Physics',   description: 'Track object motion in video — velocity, acceleration, forces.',    tags: ['tracker','video','kinematics','forces'],iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=11578' },
  { id: 'cp-oscillations',        source: 'ComPADRE', title: 'Oscillations and Waves',        subject: 'Waves',     description: 'Coupled oscillators, normal modes, and standing waves.',            tags: ['oscillation','waves','normal modes'],   iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=8395' },
  { id: 'cp-rigid-body',          source: 'ComPADRE', title: 'Rigid Body Dynamics',           subject: 'Mechanics', description: 'Torque, moment of inertia, and rigid body rotation.',                tags: ['rigid body','rotation','torque'],       iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=9706' },
  { id: 'cp-em-field',            source: 'ComPADRE', title: 'Electric Field Visualiser',     subject: 'Electricity', description: 'Superposition of electric fields from multiple point charges.',    tags: ['electricity','field','superposition'],  iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=7338' },
  { id: 'cp-doppler',             source: 'ComPADRE', title: 'Doppler Effect',                subject: 'Waves',     description: 'Moving source — wavefront compression and frequency shift.',        tags: ['doppler','waves','frequency','sound'],  iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=11499' },
  { id: 'cp-quantum-tunneling',   source: 'ComPADRE', title: 'Quantum Tunneling',             subject: 'Quantum',   description: 'Particle wave-function tunneling through a potential barrier.',      tags: ['quantum','tunneling','wavefunction'],   iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=4346' },
  { id: 'cp-gravity-field',       source: 'ComPADRE', title: 'Gravitational Field Model',     subject: 'Gravity',   description: 'Vector field lines and equipotential surfaces around masses.',       tags: ['gravity','field','potential'],          iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=7399' },
  { id: 'cp-lorentz',             source: 'ComPADRE', title: 'Lorentz Force Simulation',      subject: 'Magnetism', description: 'Charged particle motion in uniform electric and magnetic fields.',   tags: ['magnetism','lorentz','force','charge'], iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=8384' },
  { id: 'cp-hydrogen-spectrum',   source: 'ComPADRE', title: 'Hydrogen Spectral Lines',       subject: 'Quantum',   description: 'Bohr model and emission spectrum of atomic hydrogen.',              tags: ['quantum','hydrogen','spectrum','bohr'], iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=8399' },
  { id: 'cp-relativity',          source: 'ComPADRE', title: 'Special Relativity Explorer',   subject: 'Relativity', description: 'Length contraction and time dilation at relativistic speeds.',      tags: ['relativity','spacetime','lorentz'],     iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=9711' },
  { id: 'cp-chaos',               source: 'ComPADRE', title: 'Chaos and Bifurcation',         subject: 'Chaos',     description: 'Logistic map bifurcation diagram and onset of chaos.',                tags: ['chaos','bifurcation','nonlinear'],      iframeUrl: 'https://www.compadre.org/osp/items/detail.cfm?ID=11455' },
];

// ─── Source Configuration ─────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<SimSource, { label: string; color: string; darkBg: string; lightBg: string; darkText: string; lightText: string; dot: string }> = {
  PhET:      { label: 'PhET',     color: '#7c3aed', darkBg: 'bg-violet-500/15',  lightBg: 'bg-violet-50',  darkText: 'text-violet-300', lightText: 'text-violet-700', dot: 'bg-violet-400' },
  GeoGebra:  { label: 'GeoGebra', color: '#0ea5e9', darkBg: 'bg-sky-500/15',     lightBg: 'bg-sky-50',     darkText: 'text-sky-300',    lightText: 'text-sky-700',    dot: 'bg-sky-400' },
  Concord:   { label: 'Concord',  color: '#10b981', darkBg: 'bg-emerald-500/15', lightBg: 'bg-emerald-50', darkText: 'text-emerald-300',lightText: 'text-emerald-700',dot: 'bg-emerald-400' },
  GoLab:     { label: 'Go-Lab',   color: '#f59e0b', darkBg: 'bg-amber-500/15',   lightBg: 'bg-amber-50',   darkText: 'text-amber-300',  lightText: 'text-amber-700',  dot: 'bg-amber-400' },
  ComPADRE:  { label: 'ComPADRE', color: '#f97316', darkBg: 'bg-orange-500/15',  lightBg: 'bg-orange-50',  darkText: 'text-orange-300', lightText: 'text-orange-700', dot: 'bg-orange-400' },
};

// ─── Result Cache ─────────────────────────────────────────────────────────────
const resultCache = new Map<string, SimEntry[]>();

function searchSims(query: string, sources: SimSource[]): SimEntry[] {
  const cacheKey = `${query.toLowerCase()}|${sources.join(',')}`;
  if (resultCache.has(cacheKey)) return resultCache.get(cacheKey)!;

  const pool = sources.length > 0
    ? SIM_DATABASE.filter(s => sources.includes(s.source))
    : SIM_DATABASE;

  const q = query.toLowerCase().trim();
  let results: SimEntry[];

  if (!q) {
    results = pool.slice(0, 30);
  } else {
    const scored = pool.map(sim => {
      let score = 0;
      const title = sim.title.toLowerCase();
      const desc  = sim.description.toLowerCase();
      const subj  = sim.subject.toLowerCase();
      const tags  = sim.tags.join(' ').toLowerCase();

      if (title === q)                      score += 100;
      else if (title.startsWith(q))         score += 80;
      else if (title.includes(q))           score += 60;
      if (subj.includes(q))                 score += 40;
      if (tags.includes(q))                 score += 30;
      if (desc.includes(q))                 score += 20;

      // multi-word: partial word bonus
      const words = q.split(/\s+/).filter(Boolean);
      for (const w of words) {
        if (title.includes(w)) score += 10;
        if (tags.includes(w))  score += 5;
        if (desc.includes(w))  score += 3;
      }

      return { sim, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    results = scored.map(x => x.sim);
  }

  resultCache.set(cacheKey, results);
  return results;
}

// ─── Source Chip ──────────────────────────────────────────────────────────────
const SourceChip = memo(({ source, active, onClick, lm }: {
  source: SimSource;
  active: boolean;
  onClick: () => void;
  lm?: boolean;
}) => {
  const cfg = SOURCE_CONFIG[source];
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium tracking-wide
        transition-all duration-200 flex-shrink-0
        ${active
          ? lm
            ? `${cfg.lightBg} ${cfg.lightText} border-current shadow-sm`
            : `${cfg.darkBg}  ${cfg.darkText}  border-current`
          : lm
            ? 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300'
            : 'bg-white/[0.04] text-white/40 border-white/[0.06] hover:border-white/[0.14] hover:text-white/60'
        }
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? cfg.dot : lm ? 'bg-slate-300' : 'bg-white/20'}`} />
      {cfg.label}
    </motion.button>
  );
});

// ─── Source Badge ─────────────────────────────────────────────────────────────
const SimSourceBadge = memo(({ source, lm }: { source: SimSource; lm?: boolean }) => {
  const cfg = SOURCE_CONFIG[source];
  return (
    <span className={`
      inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-medium tracking-[0.1em] flex-shrink-0
      ${lm ? `${cfg.lightBg} ${cfg.lightText} border-current` : `${cfg.darkBg} ${cfg.darkText} border-current/40`}
    `}>
      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
});

// ─── Result Row ───────────────────────────────────────────────────────────────
const SimResultRow = memo(({ sim, index, onPlay, lm }: {
  sim: SimEntry;
  index: number;
  onPlay: (sim: SimEntry) => void;
  lm?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03, duration: 0.25, ease: 'easeOut' }}
    className={`
      group flex items-center gap-3 px-3 py-2.5 rounded-xl
      transition-all duration-200 cursor-default
      ${lm
        ? 'hover:bg-slate-100 border border-transparent hover:border-slate-200'
        : 'hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(139,92,246,0.06)] border border-transparent hover:border-white/[0.06]'
      }
    `}
  >
    {/* Icon accent */}
    <div className={`
      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
      ${lm ? 'bg-slate-100 group-hover:bg-white border border-slate-200' : 'bg-white/[0.04] group-hover:bg-white/[0.07] border border-white/[0.06]'}
    `}>
      <FlaskConical size={13} strokeWidth={1.6} className={lm ? 'text-slate-500' : 'text-white/40'} />
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
        <span className={`text-[12px] font-medium leading-tight ${lm ? 'text-slate-900' : 'text-white/90'}`}>
          {sim.title}
        </span>
        <SimSourceBadge source={sim.source} lm={lm} />
        <span className={`text-[9px] uppercase tracking-[0.12em] ${lm ? 'text-slate-400' : 'text-white/25'}`}>
          {sim.subject}
        </span>
      </div>
      {sim.description && (
        <p className={`text-[11px] leading-relaxed truncate ${lm ? 'text-slate-500' : 'text-white/35'}`}>
          {sim.description}
        </p>
      )}
    </div>

    {/* Play button */}
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => onPlay(sim)}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-semibold
        tracking-wide flex-shrink-0 transition-all duration-200
        ${lm
          ? 'bg-violet-600 text-white border-violet-500 hover:bg-violet-700 shadow-sm'
          : 'bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30 hover:text-violet-200'
        }
      `}
    >
      <Play size={9} strokeWidth={2.5} fill="currentColor" />
      Play
    </motion.button>
  </motion.div>
));

// ─── Simulation Play Modal ────────────────────────────────────────────────────
function SimSearchModal({ sim, onClose, lm }: { sim: SimEntry; onClose: () => void; lm?: boolean }) {
  const cfg = SOURCE_CONFIG[sim.source];

  // Escape key support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="sim-search-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[500] flex flex-col"
        style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
      >
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={`
            relative z-10 m-3 sm:m-6 flex-1 flex flex-col rounded-2xl overflow-hidden
            ${lm ? 'bg-white border border-slate-200 shadow-2xl' : 'bg-[rgba(12,12,22,0.95)] border border-white/[0.10] shadow-[0_32px_80px_rgba(0,0,0,0.8)]'}
          `}
        >
          {/* Header */}
          <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${lm ? 'border-slate-100 bg-white' : 'border-white/[0.07] bg-[rgba(12,12,22,0.9)]'}`}>
            <div className={`flex items-center gap-2 flex-1 min-w-0`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${lm ? cfg.lightBg + ' border border-slate-200' : cfg.darkBg + ' border border-white/[0.08]'}`}>
                <FlaskConical size={12} strokeWidth={1.7} className={lm ? cfg.lightText : cfg.darkText} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[13px] font-semibold tracking-wide truncate ${lm ? 'text-slate-900' : 'text-white/90'}`}>
                    {sim.title}
                  </span>
                  <SimSourceBadge source={sim.source} lm={lm} />
                </div>
                <p className={`text-[10px] truncate mt-0.5 ${lm ? 'text-slate-400' : 'text-white/30'}`}>
                  {sim.subject}
                </p>
              </div>
            </div>

            {/* Close */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium flex-shrink-0
                transition-all duration-200
                ${lm
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-white/[0.07] text-white/60 border-white/[0.10] hover:bg-white/[0.13] hover:text-white'
                }
              `}
            >
              <X size={11} strokeWidth={2} />
              <span className="hidden sm:inline">Close</span>
            </motion.button>
          </div>

          {/* Iframe */}
          <div className="flex-1 relative">
            <iframe
              src={sim.iframeUrl}
              title={sim.title}
              allowFullScreen
              allow="fullscreen; accelerometer; camera; microphone"
              className="absolute inset-0 w-full h-full border-0"
              style={{ touchAction: 'manipulation' }}
              loading="lazy"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface SimulationSearchProps {
  lm?: boolean;
}

const ALL_SOURCES: SimSource[] = ['PhET', 'GeoGebra', 'Concord', 'GoLab', 'ComPADRE'];

export default function SimulationSearch({ lm }: SimulationSearchProps) {
  const [query,           setQuery]           = useState('');
  const [debouncedQuery,  setDebouncedQuery]  = useState('');
  const [activeSources,   setActiveSources]   = useState<SimSource[]>([]);
  const [results,         setResults]         = useState<SimEntry[]>([]);
  const [isSearching,     setIsSearching]     = useState(false);
  const [focusedSearch,   setFocusedSearch]   = useState(false);
  const [playingSim,      setPlayingSim]      = useState<SimEntry | null>(null);
  const [hasSearched,     setHasSearched]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length === 0 && !hasSearched) {
      setDebouncedQuery('');
      setResults([]);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 260);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, hasSearched]);

  // Run search
  useEffect(() => {
    if (!hasSearched) return;
    setIsSearching(true);
    // Micro-task to allow React to render the loading state first
    const tid = setTimeout(() => {
      const hits = searchSims(debouncedQuery, activeSources);
      setResults(hits);
      setIsSearching(false);
    }, 10);
    return () => clearTimeout(tid);
  }, [debouncedQuery, activeSources, hasSearched]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!hasSearched) setHasSearched(true);
  };

  const handleFocus = () => {
    setFocusedSearch(true);
    if (!hasSearched) {
      setHasSearched(true);
      setIsSearching(true);
      setTimeout(() => {
        const hits = searchSims('', activeSources);
        setResults(hits);
        setIsSearching(false);
      }, 10);
    }
  };

  const toggleSource = useCallback((src: SimSource) => {
    setActiveSources(prev => {
      const next = prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src];
      return next;
    });
    if (!hasSearched) {
      setHasSearched(true);
      setIsSearching(true);
    }
  }, [hasSearched]);

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setHasSearched(false);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  const showResults = hasSearched;

  return (
    <>
      {/* Modal portal */}
      {playingSim && (
        <SimSearchModal
          sim={playingSim}
          onClose={() => setPlayingSim(null)}
          lm={lm}
        />
      )}

      <div className="mb-6">
        {/* Section label */}
        <div className="flex items-baseline gap-3 mb-3">
          <h2
            className={`text-[15px] font-medium tracking-wide flex items-center gap-1.5 ${lm ? 'text-slate-900' : 'text-white'}`}
            style={{ fontFamily: 'var(--app-font-heading)' }}
          >
            <Search size={14} strokeWidth={1.7} className="flex-shrink-0" />
            Simulation Search
          </h2>
          <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>
            Find & Launch Interactive Experiments
          </span>
          <span className={`ml-auto text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            lm ? 'bg-sky-100 text-sky-600 border border-sky-200' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
          }`}>
            {SIM_DATABASE.length} sims
          </span>
        </div>

        {/* Search bar + chips container */}
        <div className={`
          rounded-2xl border overflow-hidden
          transition-all duration-300
          ${lm
            ? focusedSearch
              ? 'border-violet-300 shadow-[0_0_0_3px_rgba(124,58,237,0.08)] bg-white'
              : 'border-slate-200 bg-white shadow-sm hover:border-slate-300'
            : focusedSearch
              ? 'border-violet-500/30 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_8px_32px_rgba(0,0,0,0.4)] bg-white/[0.06] backdrop-blur-xl'
              : 'border-white/[0.08] bg-white/[0.04] backdrop-blur-xl hover:border-white/[0.14]'
          }
        `}>
          {/* Input row */}
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <Search
              size={14}
              strokeWidth={1.8}
              className={`flex-shrink-0 transition-colors duration-200 ${
                focusedSearch
                  ? lm ? 'text-violet-500' : 'text-violet-400'
                  : lm ? 'text-slate-400' : 'text-white/30'
              }`}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={handleQueryChange}
              onFocus={handleFocus}
              onBlur={() => setFocusedSearch(false)}
              placeholder="Search simulations — pendulum, DNA, Fourier, circuit…"
              className={`
                flex-1 bg-transparent border-none outline-none text-[12px] tracking-wide
                placeholder:transition-colors
                ${lm
                  ? 'text-slate-900 placeholder:text-slate-400'
                  : 'text-white/90 placeholder:text-white/25'
                }
              `}
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  key="clear"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={clearSearch}
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${lm ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.08]'}`}
                >
                  <X size={10} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Source chips */}
          <div className={`px-3.5 pb-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide`}>
            <span className={`text-[9px] uppercase tracking-[0.14em] mr-1 flex-shrink-0 ${lm ? 'text-slate-400' : 'text-white/25'}`}>Filter</span>
            {ALL_SOURCES.map(src => (
              <SourceChip
                key={src}
                source={src}
                active={activeSources.includes(src)}
                onClick={() => toggleSource(src)}
                lm={lm}
              />
            ))}
            {activeSources.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setActiveSources([])}
                className={`flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full border ml-1 transition-colors ${lm ? 'text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600' : 'text-white/25 border-white/[0.06] hover:border-white/[0.12] hover:text-white/40'}`}
              >
                clear
              </motion.button>
            )}
          </div>

          {/* Results panel */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                key="results"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className={`border-t ${lm ? 'border-slate-100' : 'border-white/[0.06]'}`}>
                  {/* Results list */}
                  <div
                    className="overflow-y-auto overscroll-contain px-1.5 py-1.5"
                    style={{ maxHeight: '320px' }}
                  >
                    {isSearching ? (
                      <div className="flex items-center justify-center py-8 gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className={`w-4 h-4 border-2 rounded-full ${lm ? 'border-slate-200 border-t-violet-500' : 'border-white/10 border-t-violet-400'}`}
                        />
                        <span className={`text-[11px] ${lm ? 'text-slate-400' : 'text-white/30'}`}>Searching…</span>
                      </div>
                    ) : results.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <FlaskConical size={20} strokeWidth={1.3} className={lm ? 'text-slate-300' : 'text-white/15'} />
                        <span className={`text-[11px] ${lm ? 'text-slate-400' : 'text-white/30'}`}>
                          {query ? `No simulations found for "${query}"` : 'No simulations found for this filter'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {results.slice(0, 40).map((sim, idx) => (
                          <SimResultRow
                            key={sim.id}
                            sim={sim}
                            index={idx}
                            onPlay={setPlayingSim}
                            lm={lm}
                          />
                        ))}
                        {results.length > 40 && (
                          <div className={`flex items-center justify-center gap-1 py-2 text-[10px] ${lm ? 'text-slate-400' : 'text-white/25'}`}>
                            <ChevronRight size={10} />
                            {results.length - 40} more — refine your search
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer stat */}
                  {!isSearching && results.length > 0 && (
                    <div className={`px-4 py-2 border-t flex items-center justify-between ${lm ? 'border-slate-100' : 'border-white/[0.05]'}`}>
                      <span className={`text-[9px] uppercase tracking-[0.14em] ${lm ? 'text-slate-400' : 'text-white/20'}`}>
                        {results.length} result{results.length !== 1 ? 's' : ''} · click Play to launch
                      </span>
                      <div className="flex gap-1">
                        {[...new Set(results.slice(0, 10).map(r => r.source))].map(src => (
                          <span key={src} className={`w-1.5 h-1.5 rounded-full ${SOURCE_CONFIG[src].dot}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, X, FlaskConical, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type SimSource = 'PhET' | 'GoLab' | 'ComPADRE';

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

  // ── Math & Statistics (formerly GeoGebra — replaced with PhET + Falstad) ──
  // GeoGebra blocks iframes with X-Frame-Options; all 19 entries replaced with
  // guaranteed-embeddable PhET HTML5 sims and Falstad open-source applets.
  { id: 'phet-trig-tour',         source: 'PhET', title: 'Trig Tour',                    subject: 'Trigonometry', description: 'Unit circle — sine, cosine, tangent animated as you spin the angle.',   tags: ['trigonometry','sine','cosine','unit circle'],    iframeUrl: 'https://phet.colorado.edu/sims/html/trig-tour/latest/trig-tour_en.html' },
  { id: 'phet-graphing-lines',    source: 'PhET', title: 'Graphing Lines',               subject: 'Algebra',      description: 'Slope-intercept, point-slope, and standard forms with live graphing.',  tags: ['algebra','linear','slope','graphing'],           iframeUrl: 'https://phet.colorado.edu/sims/html/graphing-lines/latest/graphing-lines_en.html' },
  { id: 'phet-graphing-quads',    source: 'PhET', title: 'Graphing Quadratics',          subject: 'Algebra',      description: 'Parabola explorer — vertex, intercepts, and leading coefficient.',       tags: ['algebra','parabola','quadratic','vertex'],       iframeUrl: 'https://phet.colorado.edu/sims/html/graphing-quadratics/latest/graphing-quadratics_en.html' },
  { id: 'phet-calculus-grapher',  source: 'PhET', title: 'Calculus Grapher',             subject: 'Calculus',     description: 'Sketch f(x) and instantly see f′(x) and ∫f(x)dx plotted below.',         tags: ['calculus','derivative','integral','tangent'],    iframeUrl: 'https://phet.colorado.edu/sims/html/calculus-grapher/latest/calculus-grapher_en.html' },
  { id: 'phet-plinko',            source: 'PhET', title: 'Plinko Probability',           subject: 'Statistics',   description: 'Drop balls through a peg board to build binomial distributions.',        tags: ['statistics','probability','binomial','normal'],  iframeUrl: 'https://phet.colorado.edu/sims/html/plinko-probability/latest/plinko-probability_en.html' },
  { id: 'phet-least-squares',     source: 'PhET', title: 'Least Squares Regression',    subject: 'Statistics',   description: 'Plot data points and minimise squared residuals to fit a line.',         tags: ['statistics','regression','linear fit','data'],  iframeUrl: 'https://phet.colorado.edu/sims/html/least-squares-regression/latest/least-squares-regression_en.html' },
  { id: 'phet-area-builder',      source: 'PhET', title: 'Area Builder',                 subject: 'Geometry',     description: 'Build shapes on a grid to explore area and perimeter relationships.',    tags: ['geometry','area','perimeter','grid'],            iframeUrl: 'https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_en.html' },
  { id: 'phet-area-model-algebra',source: 'PhET', title: 'Area Model Algebra',           subject: 'Algebra',      description: 'Visualise polynomial multiplication via rectangle area models.',         tags: ['algebra','multiplication','polynomial','area'],  iframeUrl: 'https://phet.colorado.edu/sims/html/area-model-algebra/latest/area-model-algebra_en.html' },
  { id: 'phet-vec-equations',     source: 'PhET', title: 'Vector Addition: Equations',  subject: 'Math/Physics',  description: 'Build vector equations and balance them on a component diagram.',       tags: ['vectors','equations','math','components'],      iframeUrl: 'https://phet.colorado.edu/sims/html/vector-addition-equations/latest/vector-addition-equations_en.html' },
  { id: 'phet-proportion',        source: 'PhET', title: 'Proportion Playground',        subject: 'Statistics',   description: 'Explore ratio and proportion through necklaces, paint, and more.',       tags: ['ratio','proportion','statistics','math'],        iframeUrl: 'https://phet.colorado.edu/sims/html/proportion-playground/latest/proportion-playground_en.html' },
  { id: 'phet-number-line-int',   source: 'PhET', title: 'Number Line: Integers',        subject: 'Math',         description: 'Place and compare integers, fractions, and decimals on a number line.', tags: ['integers','number line','arithmetic','math'],    iframeUrl: 'https://phet.colorado.edu/sims/html/number-line-integers/latest/number-line-integers_en.html' },
  { id: 'phet-number-line-ops',   source: 'PhET', title: 'Number Line: Operations',      subject: 'Math',         description: 'Model addition and subtraction of signed numbers on a number line.',    tags: ['addition','subtraction','number line','math'],   iframeUrl: 'https://phet.colorado.edu/sims/html/number-line-operations/latest/number-line-operations_en.html' },
  { id: 'phet-fractions-intro',   source: 'PhET', title: 'Fractions: Intro',             subject: 'Arithmetic',   description: 'Build and compare fractions visually with circles and number lines.',   tags: ['fractions','arithmetic','numerator','math'],     iframeUrl: 'https://phet.colorado.edu/sims/html/fractions-intro/latest/fractions-intro_en.html' },
  { id: 'gl-fourier-synth',       source: 'GoLab', title: 'Fourier Series Synthesizer',  subject: 'Math/Physics',  description: 'Add harmonics interactively to build complex periodic waveforms.',      tags: ['fourier','harmonics','series','synthesis'],      iframeUrl: 'https://www.falstad.com/fourier/' },
  { id: 'gl-complex-viz',         source: 'GoLab', title: 'Complex Function Visualizer', subject: 'Math',          description: 'Domain-colour mapping of complex functions — poles, zeros, and branch cuts.', tags: ['complex','argand','math','visualizer'],     iframeUrl: 'https://www.falstad.com/complex/' },
  { id: 'gl-vector-field',        source: 'GoLab', title: '2D Vector Field Plotter',     subject: 'Math/Physics',  description: 'Enter F(x,y) components and see the resulting 2D vector field arrows.', tags: ['vectors','field','math','gradient'],             iframeUrl: 'https://www.falstad.com/vector/' },
  { id: 'gl-wave-box',            source: 'GoLab', title: 'Wave in a Box',               subject: 'Waves',         description: 'Quantum particle-in-a-box — standing wave states and superpositions.',  tags: ['quantum','wave','box','eigenstate'],             iframeUrl: 'https://www.falstad.com/wave/' },
  { id: 'gl-moveable-pendulum',   source: 'GoLab', title: 'Moveable Pendulum',           subject: 'Mechanics',     description: 'Pendulum with a draggable pivot — observe period change with length.',   tags: ['pendulum','period','mechanics','pivot'],         iframeUrl: 'https://www.myphysicslab.com/pendulum/moveable-pendulum-en.html' },
  { id: 'gl-spring-damper',       source: 'GoLab', title: 'Spring–Damper System',        subject: 'Mechanics',     description: 'Mass on a damped spring — overdamped, underdamped, and critical cases.',  tags: ['spring','damping','oscillation','mechanics'],    iframeUrl: 'https://www.myphysicslab.com/springs/spring-and-damper-en.html' },

  // ── Life & Earth Science (formerly Concord — replaced with PhET) ──────────
  // Concord embeddable.html paths returned AWS S3 404 errors. All 12 entries
  // replaced with verified PhET HTML5 sims covering equivalent science topics.
  { id: 'phet-diffusion',         source: 'PhET', title: 'Diffusion',                    subject: 'Chemistry',      description: 'Particles diffuse across a membrane until concentration equalises.',   tags: ['diffusion','concentration','osmosis','chemistry'],  iframeUrl: 'https://phet.colorado.edu/sims/html/diffusion/latest/diffusion_en.html' },
  { id: 'phet-states-basics',     source: 'PhET', title: 'States of Matter: Basics',     subject: 'Thermodynamics', description: 'Heat and cool atoms to watch solid, liquid and gas phase transitions.',  tags: ['states','phases','thermodynamics','matter'],        iframeUrl: 'https://phet.colorado.edu/sims/html/states-of-matter-basics/latest/states-of-matter-basics_en.html' },
  { id: 'phet-atomic-inter',      source: 'PhET', title: 'Atomic Interactions',          subject: 'Chemistry',      description: 'Lennard-Jones potential — attraction and repulsion between atom pairs.',  tags: ['atoms','potential','lennard-jones','chemistry'],    iframeUrl: 'https://phet.colorado.edu/sims/html/atomic-interactions/latest/atomic-interactions_en.html' },
  { id: 'phet-nuclear-fission',   source: 'PhET', title: 'Nuclear Fission',              subject: 'Nuclear',        description: 'Fire neutrons at uranium-235 and trigger a chain reaction.',             tags: ['nuclear','fission','chain reaction','neutron'],     iframeUrl: 'https://phet.colorado.edu/sims/html/nuclear-fission/latest/nuclear-fission_en.html' },
  { id: 'phet-molecules-light',   source: 'PhET', title: 'Molecules and Light',          subject: 'Chemistry',      description: 'Shine IR, visible, and UV light on molecules and observe absorption.',   tags: ['molecules','light','absorption','chemistry'],       iframeUrl: 'https://phet.colorado.edu/sims/html/molecules-and-light/latest/molecules-and-light_en.html' },
  { id: 'phet-skate-basics',      source: 'PhET', title: 'Energy Skate Park: Basics',    subject: 'Energy',         description: 'Conservation of energy on ramps — kinetic, potential, and thermal.',   tags: ['energy','kinetic','potential','skate'],             iframeUrl: 'https://phet.colorado.edu/sims/html/energy-skate-park-basics/latest/energy-skate-park-basics_en.html' },
  { id: 'phet-ph-basics',         source: 'PhET', title: 'pH Scale: Basics',             subject: 'Chemistry',      description: 'Test household solutions and observe where they sit on the pH scale.',  tags: ['pH','acid','base','chemistry'],                    iframeUrl: 'https://phet.colorado.edu/sims/html/ph-scale-basics/latest/ph-scale-basics_en.html' },
  { id: 'phet-beers-law',         source: 'PhET', title: "Beer's Law Lab",               subject: 'Chemistry',      description: 'Concentration and path-length effects on light absorbance.',            tags: ['beer','absorbance','concentration','lab'],          iframeUrl: 'https://phet.colorado.edu/sims/html/beers-law-lab/latest/beers-law-lab_en.html' },
  { id: 'phet-sugar-salt',        source: 'PhET', title: 'Sugar and Salt Solutions',     subject: 'Chemistry',      description: 'Dissolve sugar or salt and observe ionic vs. molecular behaviour.',      tags: ['solutions','ionic','chemistry','dissolve'],         iframeUrl: 'https://phet.colorado.edu/sims/html/sugar-and-salt-solutions/latest/sugar-and-salt-solutions_en.html' },
  { id: 'phet-balloons-static',   source: 'PhET', title: 'Balloons and Static Electricity', subject: 'Electricity', description: 'Rub a balloon on a sweater and stick it to a wall — charge transfer.',  tags: ['static','electricity','charge','balloon'],          iframeUrl: 'https://phet.colorado.edu/sims/html/balloons-and-static-electricity/latest/balloons-and-static-electricity_en.html' },
  { id: 'phet-reactants',         source: 'PhET', title: 'Reactants, Products & Leftovers', subject: 'Chemistry',  description: 'Stoichiometry sandbox — limiting reagents and excess reactants.',        tags: ['chemistry','stoichiometry','reaction','moles'],     iframeUrl: 'https://phet.colorado.edu/sims/html/reactants-products-and-leftovers/latest/reactants-products-and-leftovers_en.html' },
  { id: 'phet-color-vision',      source: 'PhET', title: 'Color Vision',                 subject: 'Optics',         description: 'Mix red, green, and blue light — see how cones perceive colour.',       tags: ['optics','color','light','rgb'],                     iframeUrl: 'https://phet.colorado.edu/sims/html/color-vision/latest/color-vision_en.html' },

  // ── Go-Lab ────────────────────────────────────────────────────────────────
  // golabz.eu/lab/* are landing pages. Replaced every entry with a direct
  // fullscreen HTML5 embed from Falstad, MyPhysicsLab, PhET, or Academo.
  { id: 'gl-ohms-law',   source: 'GoLab', title: "Ohm's Law — Circuit Simulator",  subject: 'Electricity', description: 'Live circuit simulator: adjust voltage and resistance to measure current.',        tags: ['electricity','ohm','circuit','falstad'], iframeUrl: 'https://www.falstad.com/circuit/circuitjs.html' },
  { id: 'gl-pendulum',   source: 'GoLab', title: 'Pendulum Lab',                   subject: 'Physics',    description: 'Adjustable pendulum showing period, energy, and phase-space trajectory.',          tags: ['pendulum','physics','period','energy'],  iframeUrl: 'https://www.myphysicslab.com/pendulum/pendulum-en.html' },
  { id: 'gl-springs',    source: 'GoLab', title: 'Spring Oscillator',              subject: 'Mechanics',  description: 'Mass on a spring with damping, frequency and energy controls.',                    tags: ['spring','hooke','oscillation','wave'],   iframeUrl: 'https://www.myphysicslab.com/springs/single-spring-en.html' },
  { id: 'gl-projectile', source: 'GoLab', title: 'Projectile Data Lab',            subject: 'Kinematics', description: 'Launch projectiles and collect precise range, height, and time data.',             tags: ['projectile','kinematics','data','lab'],  iframeUrl: 'https://phet.colorado.edu/sims/html/projectile-data-lab/latest/projectile-data-lab_en.html' },
  { id: 'gl-capacitor',  source: 'GoLab', title: 'Capacitor Lab: Basics',          subject: 'Electricity', description: 'Build a capacitor, adjust plates, and measure charge, voltage and field.',        tags: ['capacitor','electricity','field','lab'], iframeUrl: 'https://phet.colorado.edu/sims/html/capacitor-lab-basics/latest/capacitor-lab-basics_en.html' },
  { id: 'gl-wave',       source: 'GoLab', title: 'Ripple Tank',                   subject: 'Waves',      description: 'Interactive ripple tank — single and dual source interference patterns.',          tags: ['waves','ripple','interference','tank'],  iframeUrl: 'https://www.falstad.com/ripple/' },
  { id: 'gl-atomic',     source: 'GoLab', title: 'Build a Nucleus',               subject: 'Nuclear',    description: 'Add protons and neutrons to explore nuclear stability and decay modes.',            tags: ['nucleus','nuclear','proton','neutron'],  iframeUrl: 'https://phet.colorado.edu/sims/html/build-a-nucleus/latest/build-a-nucleus_en.html' },
  { id: 'gl-genetics',   source: 'GoLab', title: 'Membrane Channels',             subject: 'Biology',    description: 'Control ion channels in a neuron membrane and observe signal propagation.',          tags: ['biology','membrane','neuron','ion'],     iframeUrl: 'https://phet.colorado.edu/sims/html/membrane-channels/latest/membrane-channels_en.html' },
  { id: 'gl-ecosystems', source: 'GoLab', title: 'Fluid Pressure and Flow',       subject: 'Fluids',     description: 'Interactive fluid dynamics — pressure, velocity and Bernoulli\'s principle.',        tags: ['fluids','pressure','flow','bernoulli'],  iframeUrl: 'https://phet.colorado.edu/sims/html/fluid-pressure-and-flow/latest/fluid-pressure-and-flow_en.html' },
  { id: 'gl-dc-circuit', source: 'GoLab', title: 'Double Spring Coupled System',  subject: 'Mechanics',  description: 'Coupled springs showing normal modes and energy transfer between oscillators.',       tags: ['spring','coupled','oscillation','modes'],iframeUrl: 'https://www.myphysicslab.com/springs/double-spring-en.html' },

  // ── ComPADRE ──────────────────────────────────────────────────────────────
  // compadre.org/osp/items/detail.cfm URLs are all landing pages — OSP sims
  // require Java or a download. Every entry replaced with a direct HTML5 embed
  // from MyPhysicsLab, Falstad, PhET, or Academo that covers the same topic.
  { id: 'cp-ejs-pendulum',      source: 'ComPADRE', title: 'Double Pendulum (Chaotic)',     subject: 'Physics',    description: 'Two-link pendulum showing sensitive dependence on initial conditions.',    tags: ['pendulum','chaos','phase','nonlinear'],  iframeUrl: 'https://www.myphysicslab.com/pendulum/double-pendulum-en.html' },
  { id: 'cp-tracker',           source: 'ComPADRE', title: "Kepler's Laws",                 subject: 'Astronomy',  description: 'Visualise orbital paths and test all three of Kepler\'s laws.',            tags: ['kepler','orbit','astronomy','laws'],     iframeUrl: 'https://phet.colorado.edu/sims/html/keplers-laws/latest/keplers-laws_en.html' },
  { id: 'cp-oscillations',      source: 'ComPADRE', title: 'Normal Modes',                  subject: 'Waves',      description: 'Coupled oscillators — tunable normal modes and standing-wave patterns.',   tags: ['oscillation','waves','normal modes'],    iframeUrl: 'https://phet.colorado.edu/sims/html/normal-modes/latest/normal-modes_en.html' },
  { id: 'cp-rigid-body',        source: 'ComPADRE', title: 'Rigid Body Stack',              subject: 'Mechanics',  description: 'Multi-body stacking with realistic friction and rigid-body collisions.',    tags: ['rigid body','friction','collision'],     iframeUrl: 'https://www.myphysicslab.com/engine2D/rigid-body-en.html' },
  { id: 'cp-em-field',          source: 'ComPADRE', title: 'Electromagnetic Wave',          subject: 'Electromagnetism', description: 'Interactive 3D EM wave — E and B fields, polarisation, propagation.',  tags: ['electromagnetism','wave','field','em'],  iframeUrl: 'https://www.falstad.com/emwave/' },
  { id: 'cp-doppler',           source: 'ComPADRE', title: 'Doppler Effect',                subject: 'Waves',      description: 'Animated wavefronts compress and expand as the source moves.',             tags: ['doppler','sound','frequency','waves'],   iframeUrl: 'https://academo.org/demos/doppler-effect/' },
  { id: 'cp-quantum-tunneling', source: 'ComPADRE', title: 'Photoelectric Effect',          subject: 'Quantum',    description: 'Shine light on a metal — observe photon energy, threshold and ejected e⁻.', tags: ['quantum','photoelectric','photon'],      iframeUrl: 'https://phet.colorado.edu/sims/html/photoelectric-effect/latest/photoelectric-effect_en.html' },
  { id: 'cp-gravity-field',     source: 'ComPADRE', title: 'Gravity Force Lab: Basics',    subject: 'Gravity',    description: 'Adjust two masses and separation to observe gravitational force.',            tags: ['gravity','force','newton','mass'],       iframeUrl: 'https://phet.colorado.edu/sims/html/gravity-force-lab-basics/latest/gravity-force-lab-basics_en.html' },
  { id: 'cp-lorentz',           source: 'ComPADRE', title: 'Chaotic Pendulum',              subject: 'Chaos',      description: 'Driven damped pendulum exhibiting chaotic, unpredictable motion.',          tags: ['chaos','pendulum','nonlinear','driven'], iframeUrl: 'https://www.myphysicslab.com/pendulum/chaotic-pendulum-en.html' },
  { id: 'cp-hydrogen-spectrum', source: 'ComPADRE', title: 'Neon Lights & Discharge Lamps', subject: 'Quantum',   description: 'Excite gas atoms with electrons and observe discrete emission spectra.',      tags: ['quantum','spectrum','emission','neon'],  iframeUrl: 'https://phet.colorado.edu/sims/html/neon-lights-and-other-discharge-lamps/latest/neon-lights-and-other-discharge-lamps_en.html' },
  { id: 'cp-relativity',        source: 'ComPADRE', title: 'Billiard Ball Collisions',      subject: 'Mechanics',  description: 'Elastic 2D collisions — momentum, energy, and angle conservation.',           tags: ['collision','billiards','momentum','2d'], iframeUrl: 'https://www.myphysicslab.com/engine2D/billiards-en.html' },
  { id: 'cp-chaos',             source: 'ComPADRE', title: "Newton's Cradle",               subject: 'Mechanics',  description: 'Momentum transfer through suspended steel balls — impulse and bounce.',       tags: ['momentum','newton','cradle','elastic'],  iframeUrl: 'https://www.myphysicslab.com/engine2D/newtons-cradle-en.html' },
];

// ─── PhET Live API ────────────────────────────────────────────────────────────
const PHET_API_URL =
  'https://phet.colorado.edu/services/metadata/1.2/simulations?format=json&type=html';

// Maps title+description keywords → a human-readable subject label.
const SUBJECT_MAP: Array<[RegExp, string]> = [
  [/calculus|derivative|integral|fourier|algebra|quadratic|linear.*equat|proportion|fraction|number.*line|area.*model|trig(?:onometry)?|sine|cosine|statistic|probability|regression|arithmetic|geometry|number.*sense/i, 'Mathematics'],
  [/acid|base|\bph\b|solution|concentrat|molarity|molec|reaction|stoichiometry|bond|periodic|element|compound|chemical|polarity|intermolecular|sugar|salt|dissolv|beer.*law|absorption/i, 'Chemistry'],
  [/\bdna\b|gene|protein|\bcell\b|evolution|natural.selection|neuron|membrane|photosyn|respirat|organism|ecosystem|heredit/i, 'Biology'],
  [/\bwave\b|sound|frequency|amplitude|interference|diffraction|resonan|ripple|doppler|wave.*string|string.*wave|normal.mode/i, 'Waves'],
  [/electric|circuit|current|voltage|ohm|capacitor|resistor|static.*electric|charge|magnet|induction|faraday|lorentz|electromagnet/i, 'Electricity & Magnetism'],
  [/gravity|orbit|planet|solar.system|kepler|gravitation|\bspace\b/i, 'Astronomy'],
  [/heat|thermal|temperature|conduction|convection|thermo|gas.*law|states.*matter|phase.*change|entropy|blackbody|kinetic.*theory/i, 'Thermodynamics'],
  [/quantum|nuclear|\bproton\b|\bneutron\b|isotope|rutherford|bohr|wavefunction|tunneling|fission|radioactiv|discharge.*lamp/i, 'Atomic & Quantum'],
  [/light|optic|lens|refract|reflect|color|vision|spectrum|laser|polariz|bending.*light/i, 'Optics'],
  [/earth|climate|greenhouse|atmospher|weather|plate.*tectonic/i, 'Earth Science'],
  [/fluid|buoyan|archimed|viscosity|pressure.*depth|under.*pressure/i, 'Fluids'],
];

const STOP = new Set([
  'and','or','the','of','a','an','in','on','to','with','for','at','by',
  'from','how','what','use','can','do','be','is','are','its','it','my',
]);

function inferSubject(title: string, desc: string): string {
  const text = `${title} ${desc}`;
  for (const [re, subject] of SUBJECT_MAP) if (re.test(text)) return subject;
  return 'Physics';
}

function inferTags(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
    .slice(0, 6);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePhetApi(data: any): SimEntry[] {
  return (data.projects as any[]).flatMap((proj: any): SimEntry[] => {
    const sim = proj.simulations?.[0];
    if (!sim) return [];
    const en = (sim.localizedSimulations as any[])?.find((l: any) => l.locale === 'en');
    if (!en?.runUrl || !en?.title) return [];
    const description: string =
      typeof sim.description?.en === 'string'
        ? (sim.description.en as string).slice(0, 200)
        : '';
    const slug: string = (proj.name as string).replace('html/', '');
    return [{
      id: `phet-${slug}`,
      source: 'PhET',
      title: en.title as string,
      description,
      subject: inferSubject(en.title as string, description),
      tags: inferTags(en.title as string),
      iframeUrl: en.runUrl as string,
    }];
  });
}

// ─── Source Configuration ─────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<SimSource, { label: string; color: string; darkBg: string; lightBg: string; darkText: string; lightText: string; dot: string }> = {
  PhET:      { label: 'PhET',       color: '#7c3aed', darkBg: 'bg-violet-500/15', lightBg: 'bg-violet-50',  darkText: 'text-violet-300', lightText: 'text-violet-700', dot: 'bg-violet-400' },
  GoLab:     { label: 'Falstad / MPhysLab', color: '#f59e0b', darkBg: 'bg-amber-500/15', lightBg: 'bg-amber-50', darkText: 'text-amber-300', lightText: 'text-amber-700', dot: 'bg-amber-400' },
  ComPADRE:  { label: 'PhET / MPhysLab',   color: '#f97316', darkBg: 'bg-orange-500/15', lightBg: 'bg-orange-50', darkText: 'text-orange-300', lightText: 'text-orange-700', dot: 'bg-orange-400' },
};

// ─── Result Cache ─────────────────────────────────────────────────────────────
// Keyed by query|sources. Cleared whenever the live DB is swapped in.
const resultCache = new Map<string, SimEntry[]>();

function searchSims(query: string, sources: SimSource[], db: SimEntry[]): SimEntry[] {
  const cacheKey = `${query.toLowerCase()}|${sources.join(',')}`;
  if (resultCache.has(cacheKey)) return resultCache.get(cacheKey)!;

  const pool = sources.length > 0
    ? db.filter(s => sources.includes(s.source))
    : db;

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

const ALL_SOURCES: SimSource[] = ['PhET', 'GoLab', 'ComPADRE'];

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

  // ── Live database ─────────────────────────────────────────────────────────
  // Starts with curated fallback (instant), then silently enriched from API.
  const [simDb,     setSimDb]     = useState<SimEntry[]>(SIM_DATABASE);
  const [apiStatus, setApiStatus] = useState<'loading' | 'done' | 'error'>('loading');

  // Fetch live PhET catalogue on mount.
  // phet.colorado.edu returns access-control-allow-origin: * so no proxy needed.
  useEffect(() => {
    let cancelled = false;
    fetch(PHET_API_URL)
      .then(r => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const phetSims = parsePhetApi(data);
        // Curated Falstad / MyPhysicsLab entries are kept alongside live PhET data.
        const curated = SIM_DATABASE.filter(s => s.source !== 'PhET');
        resultCache.clear(); // invalidate stale cache before state update
        setSimDb([...phetSims, ...curated]);
        setApiStatus('done');
      })
      .catch(() => { if (!cancelled) setApiStatus('error'); });
    return () => { cancelled = true; };
  }, []);

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

  // Run search — re-runs when live DB is swapped in so results expand silently
  useEffect(() => {
    if (!hasSearched) return;
    setIsSearching(true);
    // Micro-task to allow React to render the loading state first
    const tid = setTimeout(() => {
      const hits = searchSims(debouncedQuery, activeSources, simDb);
      setResults(hits);
      setIsSearching(false);
    }, 10);
    return () => clearTimeout(tid);
  }, [debouncedQuery, activeSources, hasSearched, simDb]);

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
        const hits = searchSims('', activeSources, simDb);
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
          <span className={`ml-auto text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
            lm ? 'bg-sky-100 text-sky-600 border border-sky-200' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
          }`}>
            {apiStatus === 'loading' && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0"
              />
            )}
            {simDb.length} sims
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

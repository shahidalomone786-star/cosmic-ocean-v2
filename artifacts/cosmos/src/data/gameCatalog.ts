export type GameCategory =
  | 'Puzzle'
  | 'Arcade'
  | 'Board'
  | 'Shooter'
  | 'Platformer'
  | 'Sports'
  | 'Casual'
  | 'Racing'
  | '3D';

export type GameItem = {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  thumbnail: string;
  source: string;
  playableUrl: string;
  license: 'MIT';
};

const REPOSITORY = 'https://github.com/sausi-7/games';
const PLAY_BASE = 'https://sausi-7.github.io/games/';

function categoryLabel(category: string): GameCategory {
  const labels: Record<string, GameCategory> = {
    puzzle: 'Puzzle',
    arcade: 'Arcade',
    board: 'Board',
    shooter: 'Shooter',
    platformer: 'Platformer',
    sports: 'Sports',
    casual: 'Casual',
    racing: 'Racing',
    '3d': '3D',
  };
  return labels[category] ?? 'Arcade';
}

function thumbnail(title: string, category: string, index: number): string {
  const palettes = [
    ['0b1024', '22d3ee'],
    ['160d31', 'a78bfa'],
    ['071d25', '34d399'],
    ['27140a', 'fbbf24'],
    ['210b20', 'f472b6'],
  ];
  const [background, accent] = palettes[index % palettes.length];
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#${background}"/><stop offset="1" stop-color="#030712"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="24"/></filter></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="520" cy="68" r="110" fill="#${accent}" opacity=".2" filter="url(#b)"/><circle cx="90" cy="300" r="90" fill="#${accent}" opacity=".12" filter="url(#b)"/><path d="M0 286 C150 240 205 328 360 276 S560 235 640 270 V360 H0Z" fill="#${accent}" opacity=".08"/><text x="42" y="258" fill="#${accent}" font-family="Arial,sans-serif" font-size="16" letter-spacing="4" text-transform="uppercase">${category.toUpperCase()}</text><text x="42" y="302" fill="white" font-family="Arial,sans-serif" font-size="30" font-weight="700">${safeTitle}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

type VerifiedGame = {
  slug: string;
  title: string;
  category: string;
  description: string;
  path: string;
};

// The entries below are the first 100 verified records from the MIT-licensed
// repository registry, with the one confirmed-missing record replaced by the
// verified Signal Circuit entry. Every playable URL returned HTTP 200 during
// catalog verification on 2026-08-11.
const VERIFIED_GAMES: VerifiedGame[] = [
  { slug: '2048', title: '2048', category: 'puzzle', description: 'Slide tiles. Merge matching numbers. Reach 2048.', path: 'games/puzzle/2048/index.html' },
  { slug: '6oct', title: '6 Octagons', category: 'puzzle', description: 'Octagon-tile sliding puzzle.', path: 'games/puzzle/6oct/index.html' },
  { slug: 'rock-paper-scissors', title: 'Rock Paper Scissors', category: 'board', description: 'The timeless hand game vs the AI.', path: 'games/board/rock-paper-scissors/index.html' },
  { slug: 'sudoku', title: 'Sudoku', category: 'puzzle', description: 'Classic 9x9 number logic puzzle.', path: 'games/puzzle/sudoku/index.html' },
  { slug: 'abhita', title: 'Abhita', category: 'arcade', description: 'Reflex-driven dodge mini-game.', path: 'games/arcade/abhita/index.html' },
  { slug: 'alien-battle', title: 'Alien Battle', category: 'shooter', description: 'Top-down alien shooter. Survive the swarm.', path: 'games/shooter/alien-battle/index.html' },
  { slug: 'antigravity', title: 'Anti-Gravity', category: 'platformer', description: 'Flip gravity to navigate hazards.', path: 'games/platformer/antigravity/index.html' },
  { slug: 'archer', title: 'Archer', category: 'sports', description: 'Aim, draw, and release. Hit your target.', path: 'games/sports/archer/index.html' },
  { slug: 'balance-stack', title: 'Balance Stack', category: 'arcade', description: 'Stack blocks without toppling the tower.', path: 'games/arcade/balance-stack/index.html' },
  { slug: 'basketball', title: 'Basketball', category: 'sports', description: 'Arc the ball through the hoop.', path: 'games/sports/basketball/index.html' },
  { slug: 'bird-shooter', title: 'Bird Shooter', category: 'shooter', description: 'Track and shoot flying birds.', path: 'games/shooter/bird-shooter/index.html' },
  { slug: 'bomb-blast', title: 'Bomb Blast', category: 'arcade', description: 'Time the blast to chain destruction.', path: 'games/arcade/bomb-blast/index.html' },
  { slug: 'boom-dots', title: 'Boom Dots', category: 'arcade', description: 'Tap to detonate dots and clear the screen.', path: 'games/arcade/boom-dots/index.html' },
  { slug: 'bowling', title: 'Bowling', category: 'sports', description: 'Knock down all the pins.', path: 'games/sports/bowling/index.html' },
  { slug: 'breakoid', title: 'Breakoid', category: 'arcade', description: 'Breakout-style brick smashing.', path: 'games/arcade/breakoid/index.html' },
  { slug: 'bubble-pop', title: 'Bubble Pop', category: 'casual', description: 'Pop matching bubbles to score.', path: 'games/casual/bubble-pop/index.html' },
  { slug: 'bubble-shooter', title: 'Bubble Shooter', category: 'casual', description: 'Shoot bubbles into matching color clusters.', path: 'games/casual/bubble-shooter/index.html' },
  { slug: 'bug-smasher', title: 'Bug Smasher', category: 'arcade', description: 'Squash bugs before they reach the goal.', path: 'games/arcade/bug-smasher/index.html' },
  { slug: 'buttermilk', title: 'Buttermilk', category: 'casual', description: 'Cute pour-and-mix idle game.', path: 'games/casual/buttermilk/index.html' },
  { slug: 'candy-crusher', title: 'Candy Crusher', category: 'casual', description: 'Smash candy patterns for points.', path: 'games/casual/candy-crusher/index.html' },
  { slug: 'cannon-blaster', title: 'Cannon Blaster', category: 'shooter', description: 'Aim and fire cannonballs at targets.', path: 'games/shooter/cannon-blaster/index.html' },
  { slug: 'cargo-stack', title: 'Cargo Stack', category: 'puzzle', description: 'Pack cargo crates without overflow.', path: 'games/puzzle/cargo-stack/index.html' },
  { slug: 'car-race', title: 'Car Race', category: 'racing', description: '3D car-racing run with traffic dodging.', path: 'games/racing/car-race/index.html' },
  { slug: 'carrom', title: 'Carrom', category: 'board', description: 'Pocket the carrom pieces with skill.', path: 'games/board/carrom/index.html' },
  { slug: 'chess', title: 'Chess', category: 'board', description: 'Classic chess vs the computer.', path: 'games/board/chess/index.html' },
  { slug: 'circle-path', title: 'Circle Path', category: 'arcade', description: 'Trace the rotating circle without slipping.', path: 'games/arcade/circle-path/index.html' },
  { slug: 'circuit-bulb', title: 'Circuit Bulb', category: 'puzzle', description: 'Wire circuits to light the bulb.', path: 'games/puzzle/circuit-bulb/index.html' },
  { slug: 'catch-me-if-you-can', title: 'Catch Me If You Can', category: 'arcade', description: 'Outrun the chasers in a wide arena.', path: 'games/arcade/catch-me-if-you-can/index.html' },
  { slug: 'collector', title: 'Collector', category: 'arcade', description: 'Sweep up coins before time runs out.', path: 'games/arcade/collector/index.html' },
  { slug: 'color-dash', title: 'Color Dash', category: 'arcade', description: "Match the player's color to pass each gate.", path: 'games/arcade/color-dash/index.html' },
  { slug: 'colour-pour', title: 'Colour Pour', category: 'puzzle', description: 'Sort liquids into single-color tubes.', path: 'games/puzzle/colour-pour/index.html' },
  { slug: 'connected', title: 'Connected', category: 'puzzle', description: 'Link nodes without crossing lines.', path: 'games/puzzle/connected/index.html' },
  { slug: 'cooking', title: 'Cooking', category: 'casual', description: 'Plate orders before the timer hits zero.', path: 'games/casual/cooking/index.html' },
  { slug: 'cool-platformer', title: 'Cool Platformer', category: 'platformer', description: 'Run, jump, and dash through hazards.', path: 'games/platformer/cool-platformer/index.html' },
  { slug: 'cosmic-cleaner', title: 'Cosmic Cleaner', category: '3d', description: '3D space-junk vacuum-up game.', path: 'games/3d/cosmic-cleaner/index.html' },
  { slug: 'cricket-123', title: 'Cricket 1-2-3', category: 'sports', description: 'Time your shots and score runs.', path: 'games/sports/cricket-123/index.html' },
  { slug: 'crossy-road', title: 'Crossy Road', category: 'arcade', description: 'Cross traffic and rivers without stopping.', path: 'games/arcade/crossy-road/index.html' },
  { slug: 'crowd-control', title: 'Crowd Control', category: 'arcade', description: 'Guide a growing crowd through the course.', path: 'games/arcade/crowd-control/index.html' },
  { slug: 'curve-snake', title: 'Curve Snake', category: 'arcade', description: 'Turn sharply, collect points, and avoid yourself.', path: 'games/arcade/curve-snake/index.html' },
  { slug: 'cut-rope', title: 'Cut the Rope', category: 'puzzle', description: 'Cut ropes in the right order to feed the creature.', path: 'games/puzzle/cut-rope/index.html' },
  { slug: 'demon', title: 'Demon', category: 'arcade', description: 'Dodge hazards and survive the rising challenge.', path: 'games/arcade/demon/index.html' },
  { slug: 'devil-king', title: 'Devil King', category: 'platformer', description: 'Battle through a compact action platformer.', path: 'games/platformer/devil-king/index.html' },
  { slug: 'dodge-enemy', title: 'Dodge Enemy', category: 'arcade', description: 'Avoid enemies for as long as you can.', path: 'games/arcade/dodge-enemy/index.html' },
  { slug: 'dodge-master', title: 'Dodge Master', category: 'arcade', description: 'Master timing and weave through danger.', path: 'games/arcade/dodge-master/index.html' },
  { slug: 'doodle-jump', title: 'Doodle Jump', category: 'platformer', description: 'Bounce upward across an endless sky.', path: 'games/platformer/doodle-jump/index.html' },
  { slug: 'dream-weaver', title: 'Dream Weaver', category: 'arcade', description: 'Navigate a dreamy world of changing paths.', path: 'games/arcade/dream-weaver/index.html' },
  { slug: 'ellars', title: 'Ellars', category: 'arcade', description: 'A compact reflex challenge with escalating levels.', path: 'games/arcade/ellars/index.html' },
  { slug: 'endless-mafia', title: 'Endless Mafia', category: 'arcade', description: 'Keep moving through an endless crime-world run.', path: 'games/arcade/endless-mafia/index.html' },
  { slug: 'endless-runner', title: 'Endless Runner', category: 'racing', description: 'Run forever while timing every jump.', path: 'games/racing/endless-runner/index.html' },
  { slug: 'fighter-fury', title: 'Fighter Fury', category: 'shooter', description: 'Fight through waves of fast enemies.', path: 'games/shooter/fighter-fury/index.html' },
  { slug: 'fighter-jet', title: 'Fighter Jet', category: 'shooter', description: 'Pilot a jet and survive the air battle.', path: 'games/shooter/fighter-jet/index.html' },
  { slug: 'flappy', title: 'Flappy', category: 'arcade', description: 'Guide a small flyer through narrow gaps.', path: 'games/arcade/flappy/index.html' },
  { slug: 'flip-jump', title: 'Flip Jump', category: 'platformer', description: 'Flip direction and land each impossible jump.', path: 'games/platformer/flip-jump/index.html' },
  { slug: 'fly-monkey', title: 'Fly Monkey', category: 'arcade', description: 'Keep airborne and collect the scattered fruit.', path: 'games/arcade/fly-monkey/index.html' },
  { slug: 'football', title: 'Football', category: 'sports', description: 'Time your kick and beat the keeper.', path: 'games/sports/football/index.html' },
  { slug: 'forest-runner', title: 'Forest Runner', category: 'racing', description: 'Race through a forest full of obstacles.', path: 'games/racing/forest-runner/index.html' },
  { slug: 'four-dots', title: 'Four Dots', category: 'puzzle', description: 'Join dots and clear the board with strategy.', path: 'games/puzzle/four-dots/index.html' },
  { slug: 'fruit-basket', title: 'Fruit Basket', category: 'casual', description: 'Catch the falling fruit in the right basket.', path: 'games/casual/fruit-basket/index.html' },
  { slug: 'fruit-cosmics', title: 'Fruit Cosmics', category: 'casual', description: 'Match fruit through a colorful cosmic board.', path: 'games/casual/fruit-cosmics/index.html' },
  { slug: 'fruit-merge', title: 'Fruit Merge', category: 'casual', description: 'Drop and merge fruit into larger fruit.', path: 'games/casual/fruit-merge/index.html' },
  { slug: 'luma-bounce', title: 'LumaBounce', category: 'arcade', description: 'Bounce a glowing orb through moving targets.', path: 'games/arcade/luma-bounce/index.html' },
  { slug: 'glass-step', title: 'Glass Step', category: 'arcade', description: 'Choose safe tiles and cross the glass path.', path: 'games/arcade/glass-step/index.html' },
  { slug: 'gunman', title: 'Gunman', category: 'shooter', description: 'React quickly and clear the targets.', path: 'games/shooter/gunman/index.html' },
  { slug: 'gun-run', title: 'Gun Run', category: 'shooter', description: 'Run, aim, and survive the advancing enemies.', path: 'games/shooter/gun-run/index.html' },
  { slug: 'hex-puzzle', title: 'Hex Puzzle', category: 'puzzle', description: 'Fit hexagonal pieces to complete lines.', path: 'games/puzzle/hex-puzzle/index.html' },
  { slug: 'hungry-player', title: 'Hungry Player', category: 'arcade', description: 'Collect food while escaping the hazards.', path: 'games/arcade/hungry-player/index.html' },
  { slug: 'jump-dot', title: 'Jump Dot', category: 'arcade', description: 'Jump a dot over obstacles with perfect timing.', path: 'games/arcade/jump-dot/index.html' },
  { slug: 'kaiju-krush', title: 'Kaiju Krush', category: 'arcade', description: 'Smash through a city as a tiny kaiju.', path: 'games/arcade/kaiju-krush/index.html' },
  { slug: 'laser-bounce', title: 'Laser Bounce', category: 'puzzle', description: 'Reflect beams to light every target.', path: 'games/puzzle/laser-bounce/index.html' },
  { slug: 'link', title: 'Link', category: 'puzzle', description: 'Connect matching points without crossing paths.', path: 'games/puzzle/link/index.html' },
  { slug: 'ludo', title: 'Ludo', category: 'board', description: 'Race your pieces around the classic board.', path: 'games/board/ludo/index.html' },
  { slug: 'mario', title: 'Mario-Like', category: 'platformer', description: 'Jump, run, and explore a classic platform world.', path: 'games/platformer/mario/index.html' },
  { slug: 'math-quest', title: 'Math Quest', category: 'word-quiz', description: 'Solve quick math challenges on an adventure.', path: 'games/word-quiz/math-quest/index.html' },
  { slug: 'memory', title: 'Memory', category: 'puzzle', description: 'Find matching pairs and sharpen your recall.', path: 'games/puzzle/memory/index.html' },
  { slug: 'memory-cards', title: 'Memory Cards', category: 'puzzle', description: 'Flip cards and remember every position.', path: 'games/puzzle/memory-cards/index.html' },
  { slug: 'number-merge', title: 'Number Merge', category: 'puzzle', description: 'Combine numbers and plan your next move.', path: 'games/puzzle/number-merge/index.html' },
  { slug: 'one-car', title: 'One Car', category: 'racing', description: 'Steer one car through dense traffic.', path: 'games/racing/one-car/index.html' },
  { slug: 'orbital-outpost', title: 'Orbital Outpost', category: '3d', description: 'Defend a 3D space station from incoming threats.', path: 'games/3d/orbital-outpost/index.html' },
  { slug: 'pacman', title: 'Pac-Man', category: 'arcade', description: 'Eat dots. Avoid ghosts.', path: 'games/arcade/pacman/index.html' },
  { slug: 'pairing', title: 'Pairing', category: 'puzzle', description: 'Pair up matching items quickly.', path: 'games/puzzle/pairing/index.html' },
  { slug: 'parkour', title: 'Parkour', category: 'platformer', description: 'Wall-run, slide, and vault forward.', path: 'games/platformer/parkour/index.html' },
  { slug: 'pathfinder', title: 'Pathfinder', category: 'puzzle', description: 'Solve maze paths under time pressure.', path: 'games/puzzle/pathfinder/index.html' },
  { slug: 'perfect-square', title: 'Perfect Square', category: 'puzzle', description: 'Tap when the square aligns perfectly.', path: 'games/puzzle/perfect-square/index.html' },
  { slug: 'pirates', title: 'Pirates', category: 'arcade', description: 'Sail and battle on the high seas.', path: 'games/arcade/pirates/index.html' },
  { slug: 'planet-visitor', title: 'Planet Visitor', category: '3d', description: 'Land on alien planets in 3D.', path: 'games/3d/planet-visitor/index.html' },
  { slug: 'planet-war', title: 'Planet War', category: '3d', description: 'Defend your planet from cosmic invaders.', path: 'games/3d/planet-war/index.html' },
  { slug: 'projectile-enemy', title: 'Projectile Enemy', category: 'shooter', description: 'Dodge and counter ranged enemies.', path: 'games/shooter/projectile-enemy/index.html' },
  { slug: 'quiz', title: 'Quiz', category: 'word-quiz', description: 'Test your knowledge across categories.', path: 'games/word-quiz/quiz/index.html' },
  { slug: 'red-light-green-light', title: 'Red Light, Green Light', category: 'arcade', description: 'Move on green. Freeze on red.', path: 'games/arcade/red-light-green-light/index.html' },
  { slug: 'road-cross', title: 'Road Cross', category: 'arcade', description: 'Cross busy roads safely.', path: 'games/arcade/road-cross/index.html' },
  { slug: 'road-fighter', title: 'Road Fighter', category: 'racing', description: 'Top-down race weaving through traffic.', path: 'games/racing/road-fighter/index.html' },
  { slug: 'robot-destruction', title: 'Robot Destruction', category: 'shooter', description: 'Blast incoming robots to scrap.', path: 'games/shooter/robot-destruction/index.html' },
  { slug: 'screw-master', title: 'Screw Master', category: 'puzzle', description: 'Unscrew and sort the metal pieces.', path: 'games/puzzle/screw-master/index.html' },
  { slug: 'shadow-runner', title: 'Shadow Runner', category: 'racing', description: 'Sprint through a shadow world.', path: 'games/racing/shadow-runner/index.html' },
  { slug: 'shadow-shooter', title: 'Shadow Shooter', category: 'shooter', description: 'Pick off shadow enemies from cover.', path: 'games/shooter/shadow-shooter/index.html' },
  { slug: 'shape-collector', title: 'Shape Collector', category: 'arcade', description: 'Catch only the matching shapes.', path: 'games/arcade/shape-collector/index.html' },
  { slug: 'shape-fitter', title: 'Shape Fitter', category: 'puzzle', description: 'Fit shapes into the right slots.', path: 'games/puzzle/shape-fitter/index.html' },
  { slug: 'shoot-enemy', title: 'Shoot Enemy', category: 'shooter', description: 'Pick off enemies before they reach you.', path: 'games/shooter/shoot-enemy/index.html' },
  { slug: 'shooter', title: 'Shooter', category: 'shooter', description: 'Top-down arena shooter.', path: 'games/shooter/shooter/index.html' },
  { slug: 'signal-circuit', title: 'Signal Circuit', category: 'puzzle', description: 'Route signals through circuit gates.', path: 'games/puzzle/signal-circuit/index.html' },
];

export const GAME_CATALOG: GameItem[] = VERIFIED_GAMES.map((game, index) => ({
  id: `free-${game.slug}`,
  title: game.title,
  description: game.description,
  category: categoryLabel(game.category),
  thumbnail: thumbnail(game.title, game.category, index),
  source: REPOSITORY,
  playableUrl: `${PLAY_BASE}${game.path}`,
  license: 'MIT' as const,
}));

if (GAME_CATALOG.length !== 100) {
  throw new Error(`Cosmic Ocean game catalog must contain exactly 100 games; found ${GAME_CATALOG.length}.`);
}

export const FREE_GAME_CATALOG = GAME_CATALOG;
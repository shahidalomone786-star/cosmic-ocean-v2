export type GameStatus = 'available' | 'locked' | 'placeholder';

export type GameItem = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  gameSource: string;
  category: string;
  price: number;
  currency: string;
  isFree: boolean;
  status: GameStatus;
};

const CATALOG_ART = (label: string, tone = '0d1324/92e3ff') =>
  `https://placehold.co/640x360/${tone}?text=${encodeURIComponent(label)}`;

export const FREE_GAME_CATALOG: GameItem[] = [
  {
    id: 'free-2048',
    title: '2048',
    description: 'Slide tiles to combine numbers and reach the 2048 tile.',
    thumbnail: CATALOG_ART('2048'),
    gameSource: 'https://gabrielecirulli.github.io/2048/',
    category: 'Puzzle',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-tetris',
    title: 'Tetris',
    description: 'Stack falling tetrominoes to clear lines in a timeless classic.',
    thumbnail: CATALOG_ART('Tetris', '111827/a7f3d0'),
    gameSource: 'https://chvin.github.io/react-tetris/',
    category: 'Arcade',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-flappy-bird',
    title: 'Flappy Bird',
    description: 'Tap to fly through pipes and see how far you can travel.',
    thumbnail: CATALOG_ART('Flappy Bird', '172033/fde68a'),
    gameSource: 'https://flappybird.io/',
    category: 'Arcade',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-pac-man',
    title: 'Pac-Man',
    description: 'Eat dots, avoid ghosts, and rule the maze.',
    thumbnail: CATALOG_ART('Pac-Man', '1e1633/f9a8d4'),
    gameSource: 'https://freepacman.org/',
    category: 'Arcade',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-breakout',
    title: 'Breakout',
    description: 'Bounce the ball to smash every brick in this Atari classic.',
    thumbnail: CATALOG_ART('Breakout', '172033/fbbf24'),
    gameSource: 'https://elgoog.im/breakout/',
    category: 'Arcade',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-minesweeper',
    title: 'Minesweeper',
    description: 'Uncover tiles without hitting a mine in this logic puzzle.',
    thumbnail: CATALOG_ART('Minesweeper', '10202f/c4b5fd'),
    gameSource: 'https://minesweeper.online/',
    category: 'Puzzle',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-mahjong',
    title: 'Mahjong',
    description: 'Match pairs of tiles to clear the ancient board.',
    thumbnail: CATALOG_ART('Mahjong', '10202f/86efac'),
    gameSource: 'https://www.mahjong-game.com/',
    category: 'Puzzle',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-sudoku',
    title: 'Sudoku',
    description: 'Fill the 9 by 9 grid so every row, column, and box holds 1 to 9.',
    thumbnail: CATALOG_ART('Sudoku', '172033/bae6fd'),
    gameSource: 'https://www.websudoku.com/',
    category: 'Puzzle',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-asteroids',
    title: 'Asteroids',
    description: 'Pilot your ship and clear the asteroid field in a retro flight.',
    thumbnail: CATALOG_ART('Asteroids', '111827/f0abfc'),
    gameSource: 'https://www.kevs3d.co.uk/dev/asteroids/',
    category: 'Action',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
  {
    id: 'free-hexgl-racing',
    title: 'HexGL Racing',
    description: 'Race through a futuristic anti-gravity track at full speed.',
    thumbnail: CATALOG_ART('HexGL Racing', '0f172a/67e8f9'),
    gameSource: 'https://hexgl.bkcore.com/play/',
    category: 'Racing',
    price: 0,
    currency: 'Planetary Coins',
    isFree: true,
    status: 'available',
  },
];

const PAID_CATALOG_PLACEHOLDERS: GameItem[] = Array.from({ length: 90 }, (_, index) => {
  const slot = String(index + 1).padStart(3, '0');
  return {
    id: `paid-placeholder-${slot}`,
    title: `Catalog Placeholder ${slot}`,
    description: 'Reserved Global Game Store slot. Game details will be announced later.',
    thumbnail: CATALOG_ART(`Store Slot ${slot}`, index % 2 === 0 ? '111827/c4b5fd' : '172033/93c5fd'),
    gameSource: '',
    category: 'Coming Soon',
    price: 100 + index * 25,
    currency: 'Planetary Coins',
    isFree: false,
    status: 'locked',
  };
});

export const PAID_GAME_CATALOG = PAID_CATALOG_PLACEHOLDERS;

export const GAME_CATALOG: GameItem[] = [...FREE_GAME_CATALOG, ...PAID_GAME_CATALOG];

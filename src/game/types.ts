export type Phase = "title" | "playing" | "paused" | "over";

export type Kind =
  | "saucer"
  | "cow"
  | "pig"
  | "sheep"
  | "chicken"
  | "farmer"
  | "civilian"
  | "barn"
  | "farmhouse"
  | "townhouse"
  | "shop"
  | "silo"
  | "tractor"
  | "pickup"
  | "sedan"
  | "jeep"
  | "prop"
  | "rubble"
  | "laser"
  | "bullet";

export type Terrain = 0 | 1 | 2 | 3; // grass, wheat, dirt, asphalt

export type Actor = {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  facing: number;
  lift: number;
  abductTime: number;
  abductable: boolean;
  destructible: boolean;
  solid: boolean;
  score: number;
  heat: number;
  sprite: string;
  flash: number;
  dead: boolean;
  flee: number;
  wanderT: number;
  wanderA: number;
  fireCd: number;
  z: number;
  propKey?: string;
  mass?: number;
  invMass?: number;
  spin?: number;
  restitution?: number;
  drag?: number;
  knockX?: number;
  knockY?: number;
};

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
};

export type Popup = {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
};

export type Explosion = {
  x: number;
  y: number;
  t: number;
  scale: number;
};

export type Stats = {
  abducted: number;
  destroyed: number;
  cows: number;
  people: number;
  buildings: number;
  vehicles: number;
  maxCombo: number;
};

export type GameState = {
  phase: Phase;
  timeLeft: number;
  score: number;
  combo: number;
  comboTimer: number;
  heat: number;
  hp: number;
  maxHp: number;
  shake: number;
  hitstop: number;
  camX: number;
  camY: number;
  camZoom: number;
  nextId: number;
  seed: number;
  stats: Stats;
  reason: "time" | "destroyed" | "";
};

export const TILE = 72;
export const COLS = 68;
export const ROWS = 50;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;
export const RAID_TIME = 100;
export const PLAYER_SPEED = 330;
export const BEAM_RADIUS = 82;
export const LASER_SPEED = 680;
export const LASER_RATE = 0.085;
export const MAX_HP = 5;

export const POINTS: Record<string, number> = {
  cow: 250,
  pig: 180,
  sheep: 160,
  chicken: 80,
  farmer: 420,
  civilian: 380,
  tractor: 320,
  pickup: 300,
  sedan: 240,
  jeep: 480,
  barn: 900,
  farmhouse: 780,
  townhouse: 680,
  shop: 820,
  silo: 540,
};

export const HEAT_GAIN: Record<string, number> = {
  cow: 5,
  pig: 4,
  sheep: 4,
  chicken: 2,
  farmer: 8,
  civilian: 8,
  tractor: 6,
  pickup: 6,
  sedan: 5,
  jeep: 3,
  barn: 12,
  farmhouse: 11,
  townhouse: 10,
  shop: 12,
  silo: 8,
};

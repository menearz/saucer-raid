export type Phase = "title" | "playing" | "paused" | "over" | "upgrade";

export type Alert = "calm" | "uneasy" | "alert" | "hostile" | "air-raid";

export type Kind =
  | "saucer"
  | "rival"
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
  | "special"
  | "loot"
  | "tractor"
  | "pickup"
  | "sedan"
  | "jeep"
  | "tank"
  | "heli"
  | "plane"
  | "prop"
  | "rubble"
  | "laser"
  | "bullet";

export type Terrain = 0 | 1 | 2 | 3;

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
  dmg?: number;
  shouted?: number;
  loot?: "weapon" | "cloak";
  boss?: boolean;
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

export type Shout = {
  id: number;
  text: string;
  x: number;
  y: number;
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
  alert: Alert;
  craftId: string;
  beamR: number;
  laserMult: number;
  fireRate: number;
  speed: number;
  heatMult: number;
  weaponTier: number;
  cloakT: number;
  level: number;
  shield: number;
  shieldMax: number;
  abductMul: number;
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
  tank: 900,
  heli: 760,
  plane: 820,
  rival: 1400,
  barn: 900,
  farmhouse: 780,
  townhouse: 680,
  shop: 820,
  silo: 540,
  special: 1100,
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
  tank: 4,
  heli: 3,
  plane: 3,
  rival: 6,
  barn: 12,
  farmhouse: 11,
  townhouse: 10,
  shop: 12,
  silo: 8,
  special: 6,
};

export const ALERTS: { id: Alert; min: number; label: string }[] = [
  { id: "calm", min: 0, label: "Calm valley" },
  { id: "uneasy", min: 18, label: "Uneasy" },
  { id: "alert", min: 40, label: "Military alert" },
  { id: "hostile", min: 62, label: "Hostile air" },
  { id: "air-raid", min: 85, label: "Air raid" },
];

export function alertFromHeat(heat: number): Alert {
  let id: Alert = "calm";
  for (const a of ALERTS) if (heat >= a.min) id = a.id;
  return id;
}

export const HUMAN_SHOUT_MAX = 2;

export function canHumanShout(shouted?: number | boolean): boolean {
  const n = typeof shouted === "number" ? shouted : shouted ? 1 : 0;
  return n < HUMAN_SHOUT_MAX;
}

export const HUMAN_LINES = [
  "AHH NOT AGAIN",
  "not again!",
  "Don't probe me!",
  "AAAAHHH!",
  "Help!",
  "Not the lights!",
  "I have kids!",
  "Please no!",
  "*sobbing*",
  "Get off!",
  "Why me?!",
  "I'm not cattle!",
  "Put me down!",
  "Ma saw this coming!",
  "The cows were right!",
  "I just baked!",
  "Take the mayor!",
  "Not my good hat!",
  "I paid taxes!",
  "Gram said stay in!",
  "Beam's ticklish!",
  "I got chores!",
  "Leave the pie!",
  "This is trespassin'!",
  "Call the sheriff!",
  "I ain't dinner!",
  "Don't drop me!",
  "I got a dentist!",
  "Town's gonna riot!",
  "Save the hens first!",
  "I'm too bony!",
  "Take Earl instead!",
  "I just got home!",
  "Not after harvest!",
  "I drop easily!",
  "This dress is new!",
  "Tell Doris I love her!",
  "I never liked town!",
  "Is this about the well?",
  "I saw you Tuesday!",
  "Keep the tractor!",
  "I'm late for church!",
  "The dog warned us!",
  "Put me by the barn!",
  "I don't even like milk!",
  "This is so rude!",
  "My truck's still runnin'!",
  "That's my lunch!",
  "We voted no aliens!",
  "I just mopped!",
];

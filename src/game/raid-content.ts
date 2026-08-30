import { COLS, ROWS, WORLD_H, WORLD_W, type Actor, type Kind } from "./types.ts";

export const BOSS_SCORE_BONUS = 1800;
export const BOSS_SALVAGE = 8;
export const BOSS_HELLO = "Hey buddy, what are you doing here?";
export const BOSS_REPLY = "I'm not your buddy, pal.";
export const BOSS_STING = "Respect my authority!";
export const BOSS_HELLO_WAIT = 1.85;
export const BOSS_REPLY_WAIT = 1.55;
export const RIVAL_SPRITE = "craft-spike";

export function sectorSeed(level: number): number {
  return (0x51ace11 ^ Math.imul(Math.max(1, level), 0x9e3779b9)) >>> 0;
}

export function mapStyle(level: number): number {
  return (Math.max(1, level) - 1) % 5;
}

export function isBossSector(level: number): boolean {
  return level >= 3 && level % 3 === 0;
}

export function rivalHullForLevel(_level: number): string {
  return RIVAL_SPRITE;
}

export function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintRect(
  t: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  v: 0 | 1 | 2 | 3,
) {
  const xa = Math.max(0, x0);
  const ya = Math.max(0, y0);
  const xb = Math.min(COLS, x1);
  const yb = Math.min(ROWS, y1);
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) t[y * COLS + x] = v;
  }
}

function paintRoadH(t: Uint8Array, y: number, x0: number, x1: number, v: 0 | 1 | 2 | 3) {
  paintRect(t, x0, y, x1, y + 2, v);
}

function paintRoadV(t: Uint8Array, x: number, y0: number, y1: number, v: 0 | 1 | 2 | 3) {
  paintRect(t, x, y0, x + 2, y1, v);
}

export function buildTerrain(level: number): Uint8Array {
  const rand = mulberry(sectorSeed(level));
  const style = mapStyle(level);
  const t = new Uint8Array(COLS * ROWS);

  if (style === 1) {
    t.fill(1);
    for (let i = 0; i < 14; i++) {
      const x = 1 + Math.floor(rand() * (COLS - 8));
      const y = 1 + Math.floor(rand() * (ROWS - 7));
      paintRect(t, x, y, x + 4 + Math.floor(rand() * 6), y + 3 + Math.floor(rand() * 5), 0);
    }
    paintRoadH(t, 16, 0, COLS, 2);
    paintRoadH(t, 34, 8, 50, 2);
    paintRoadV(t, 18, 0, ROWS, 2);
    paintRoadV(t, 40, 8, 42, 2);
    paintRoadH(t, 16, 30, 48, 3);
  } else if (style === 2) {
    t.fill(0);
    for (let i = 0; i < 6; i++) {
      const x = 4 + Math.floor(rand() * 20);
      const y = 4 + Math.floor(rand() * 36);
      paintRect(t, x, y, x + 4 + Math.floor(rand() * 3), y + 3 + Math.floor(rand() * 3), 1);
    }
    for (let y = 3; y < ROWS; y += 6) paintRoadH(t, y, 0, COLS, 3);
    for (let x = 4; x < COLS; x += 6) paintRoadV(t, x, 0, ROWS, 3);
  } else if (style === 3) {
    t.fill(0);
    paintRect(t, 2, 2, 30, 22, 1);
    paintRect(t, 38, 2, 66, 22, 1);
    paintRect(t, 2, 28, 30, 48, 1);
    paintRect(t, 38, 28, 66, 48, 1);
    paintRoadH(t, 24, 0, COLS, 2);
    paintRoadV(t, 33, 0, ROWS, 2);
    paintRect(t, 12, 8, 20, 16, 3);
    paintRect(t, 48, 8, 56, 16, 3);
    paintRect(t, 12, 34, 20, 42, 3);
    paintRect(t, 48, 34, 56, 42, 3);
    paintRoadH(t, 24, 30, 38, 3);
  } else if (style === 4) {
    t.fill(0);
    paintRect(t, 0, 0, COLS, 16, 1);
    paintRect(t, 0, 36, COLS, ROWS, 1);
    paintRect(t, 0, 20, COLS, 32, 3);
    paintRoadV(t, 16, 0, ROWS, 3);
    paintRoadV(t, 48, 0, ROWS, 2);
    paintRoadH(t, 18, 0, COLS, 2);
    paintRoadH(t, 32, 0, COLS, 2);
    for (let i = 0; i < 8; i++) {
      const x = 2 + Math.floor(rand() * 20);
      const y = 2 + Math.floor(rand() * 12);
      paintRect(t, x, y, x + 3 + Math.floor(rand() * 4), y + 2 + Math.floor(rand() * 3), 0);
    }
  } else {
    t.fill(0);
    for (let i = 0; i < 10; i++) {
      const x = 2 + Math.floor(rand() * 28);
      const y = 2 + Math.floor(rand() * 44);
      paintRect(t, x, y, x + 6 + Math.floor(rand() * 5), y + 5 + Math.floor(rand() * 4), 1);
    }
    paintRoadH(t, 12, 0, 42, 2);
    paintRoadH(t, 28, 0, 50, 2);
    paintRoadH(t, 40, 4, 42, 2);
    paintRoadV(t, 8, 0, ROWS, 2);
    paintRoadV(t, 22, 6, 46, 2);
    paintRoadV(t, 36, 0, ROWS, 2);
    paintRect(t, 44, 0, COLS, ROWS, 0);
    for (let y = 4; y < ROWS; y += 8) paintRoadH(t, y, 44, COLS, 3);
    for (let x = 46; x < COLS; x += 7) paintRoadV(t, x, 0, ROWS, 3);
    paintRoadH(t, 28, 36, 50, 3);
  }
  return t;
}

export type BuildingSpec = [Kind, string, number, number, number, number, number];

function jitter(rand: () => number, x: number, y: number, spread: number) {
  return { x: x + (rand() - 0.5) * spread, y: y + (rand() - 0.5) * spread };
}

export function sectorBuildings(level: number): BuildingSpec[] {
  const rand = mulberry(sectorSeed(level) ^ 0xb1d5);
  const style = mapStyle(level);
  const out: BuildingSpec[] = [];
  const add = (
    kind: Kind,
    sprite: string,
    x: number,
    y: number,
    w: number,
    h: number,
    hp: number,
  ) => {
    out.push([kind, sprite, x, y, w, h, hp]);
  };

  if (style === 1) {
    const farms = [
      [620, 720],
      [2280, 1380],
      [1180, 2620],
      [3100, 720],
    ] as const;
    for (const [cx, cy] of farms) {
      const a = jitter(rand, cx, cy, 80);
      add("barn", "barn", a.x, a.y, 96, 86, 140);
      const b = jitter(rand, cx + 220, cy - 80, 70);
      add("farmhouse", "farmhouse", b.x, b.y, 78, 74, 110);
      const c = jitter(rand, cx - 140, cy + 120, 50);
      add("silo", "silo", c.x, c.y, 36, 92, 80);
    }
  } else if (style === 2) {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const x = 380 + col * 720 + rand() * 40;
        const y = 320 + row * 620 + rand() * 40;
        if ((row + col) % 5 === 0) add("shop", "shop", x, y, 78, 64, 120);
        else add("townhouse", "townhouse", x, y, 70, 70, 95);
      }
    }
    add("barn", "barn", 260, 2800, 96, 86, 140);
    add("silo", "silo", 480, 2920, 36, 92, 80);
  } else if (style === 3) {
    const hubs = [
      [1100, 860],
      [3700, 860],
      [1100, 2680],
      [3700, 2680],
    ] as const;
    for (const [i, [cx, cy]] of hubs.entries()) {
      add("farmhouse", "farmhouse", cx - 160 + rand() * 40, cy - 80, 78, 74, 110);
      add("barn", "barn", cx + 140, cy + 40 + rand() * 40, 96, 86, 140);
      add("silo", "silo", cx - 40, cy + 180, 36, 92, 80);
      if (i % 2 === 0) add("shop", "shop", cx + 40, cy - 200, 78, 64, 120);
      else add("townhouse", "townhouse", cx + 80, cy - 180, 70, 70, 95);
    }
  } else if (style === 4) {
    for (let i = 0; i < 8; i++) {
      const x = 280 + i * 560 + rand() * 50;
      add(i % 3 === 0 ? "shop" : "townhouse", i % 3 === 0 ? "shop" : "townhouse", x, 1680 + (i % 2) * 220, 70, 70, 95);
    }
    add("barn", "barn", 520, 480, 96, 86, 140);
    add("farmhouse", "farmhouse", 980, 620, 78, 74, 110);
    add("silo", "silo", 720, 540, 36, 92, 80);
    add("barn", "barn", 3600, 2920, 96, 86, 140);
    add("farmhouse", "farmhouse", 4020, 2780, 78, 74, 110);
  } else {
    add("barn", "barn", 520, 620, 96, 86, 140);
    add("barn", "barn", 1480, 980, 96, 86, 140);
    add("barn", "barn", 780, 2100, 96, 86, 140);
    add("barn", "barn", 1880, 2680, 96, 86, 140);
    add("farmhouse", "farmhouse", 980, 480, 78, 74, 110);
    add("farmhouse", "farmhouse", 420, 1680, 78, 74, 110);
    add("farmhouse", "farmhouse", 1640, 1540, 78, 74, 110);
    add("farmhouse", "farmhouse", 1180, 2920, 78, 74, 110);
    add("silo", "silo", 680, 540, 36, 92, 80);
    add("silo", "silo", 1600, 880, 36, 92, 80);
    add("silo", "silo", 920, 2240, 36, 92, 80);
    add("townhouse", "townhouse", 3560, 420, 70, 70, 95);
    add("townhouse", "townhouse", 3980, 420, 70, 70, 95);
    add("townhouse", "townhouse", 3560, 980, 70, 70, 95);
    add("townhouse", "townhouse", 4120, 980, 70, 70, 95);
    add("townhouse", "townhouse", 3680, 1560, 70, 70, 95);
    add("townhouse", "townhouse", 4100, 1560, 70, 70, 95);
    add("townhouse", "townhouse", 3520, 2140, 70, 70, 95);
    add("townhouse", "townhouse", 4000, 2140, 70, 70, 95);
    add("townhouse", "townhouse", 3720, 2720, 70, 70, 95);
    add("townhouse", "townhouse", 4160, 2720, 70, 70, 95);
    add("shop", "shop", 3840, 720, 78, 64, 120);
    add("shop", "shop", 3920, 1880, 78, 64, 120);
    add("shop", "shop", 3600, 2440, 78, 64, 120);
  }
  return out;
}

export type StockBand = {
  kind: "cow" | "pig" | "sheep" | "chicken";
  sprite: string;
  n: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r: number;
  t: number;
};

export type FolkBand = {
  kind: "farmer" | "civilian";
  sprites: string[];
  n: number;
  x0: number;
  x1: number;
};

export function sectorFauna(level: number): { stock: StockBand[]; folk: FolkBand[] } {
  const style = mapStyle(level);
  if (style === 1) {
    return {
      stock: [
        { kind: "cow", sprite: "cow", n: 14, x0: 160, y0: 180, x1: 4400, y1: 3300, r: 28, t: 0.7 },
        { kind: "pig", sprite: "pig", n: 10, x0: 200, y0: 300, x1: 4200, y1: 3100, r: 22, t: 0.55 },
        { kind: "sheep", sprite: "sheep", n: 12, x0: 240, y0: 180, x1: 4300, y1: 3200, r: 22, t: 0.55 },
        { kind: "chicken", sprite: "chicken", n: 16, x0: 160, y0: 220, x1: 4400, y1: 3300, r: 16, t: 0.35 },
      ],
      folk: [
        { kind: "farmer", sprites: ["farmer-m", "farmer-f"], n: 12, x0: 200, x1: 4200 },
        { kind: "civilian", sprites: ["civilian-m", "civilian-f"], n: 4, x0: 2800, x1: WORLD_W - 160 },
      ],
    };
  }
  if (style === 2) {
    return {
      stock: [
        { kind: "cow", sprite: "cow", n: 4, x0: 180, y0: 2400, x1: 900, y1: 3300, r: 28, t: 0.7 },
        { kind: "pig", sprite: "pig", n: 3, x0: 200, y0: 2500, x1: 800, y1: 3200, r: 22, t: 0.55 },
        { kind: "sheep", sprite: "sheep", n: 3, x0: 240, y0: 2460, x1: 860, y1: 3280, r: 22, t: 0.55 },
        { kind: "chicken", sprite: "chicken", n: 8, x0: 160, y0: 2420, x1: 920, y1: 3320, r: 16, t: 0.35 },
      ],
      folk: [
        { kind: "farmer", sprites: ["farmer-m", "farmer-f"], n: 3, x0: 180, x1: 900 },
        { kind: "civilian", sprites: ["civilian-m", "civilian-f"], n: 20, x0: 400, x1: WORLD_W - 140 },
      ],
    };
  }
  if (style === 3) {
    return {
      stock: [
        { kind: "cow", sprite: "cow", n: 8, x0: 180, y0: 180, x1: 2000, y1: 1500, r: 28, t: 0.7 },
        { kind: "pig", sprite: "pig", n: 6, x0: 2600, y0: 200, x1: 4600, y1: 1500, r: 22, t: 0.55 },
        { kind: "sheep", sprite: "sheep", n: 7, x0: 180, y0: 2100, x1: 2000, y1: 3400, r: 22, t: 0.55 },
        { kind: "chicken", sprite: "chicken", n: 10, x0: 2600, y0: 2100, x1: 4600, y1: 3400, r: 16, t: 0.35 },
      ],
      folk: [
        { kind: "farmer", sprites: ["farmer-m", "farmer-f"], n: 8, x0: 200, x1: 2200 },
        { kind: "civilian", sprites: ["civilian-m", "civilian-f"], n: 8, x0: 2600, x1: WORLD_W - 160 },
      ],
    };
  }
  if (style === 4) {
    return {
      stock: [
        { kind: "cow", sprite: "cow", n: 8, x0: 180, y0: 160, x1: 4400, y1: 1100, r: 28, t: 0.7 },
        { kind: "pig", sprite: "pig", n: 6, x0: 200, y0: 2500, x1: 4200, y1: 3400, r: 22, t: 0.55 },
        { kind: "sheep", sprite: "sheep", n: 6, x0: 240, y0: 180, x1: 4300, y1: 1080, r: 22, t: 0.55 },
        { kind: "chicken", sprite: "chicken", n: 10, x0: 160, y0: 2520, x1: 4400, y1: 3380, r: 16, t: 0.35 },
      ],
      folk: [
        { kind: "farmer", sprites: ["farmer-m", "farmer-f"], n: 5, x0: 200, x1: 1800 },
        { kind: "civilian", sprites: ["civilian-m", "civilian-f"], n: 14, x0: 400, x1: WORLD_W - 160 },
      ],
    };
  }
  return {
    stock: [
      { kind: "cow", sprite: "cow", n: 11, x0: 180, y0: 200, x1: 2300, y1: 3200, r: 28, t: 0.7 },
      { kind: "pig", sprite: "pig", n: 8, x0: 200, y0: 400, x1: 2100, y1: 3000, r: 22, t: 0.55 },
      { kind: "sheep", sprite: "sheep", n: 8, x0: 240, y0: 180, x1: 2200, y1: 3100, r: 22, t: 0.55 },
      { kind: "chicken", sprite: "chicken", n: 14, x0: 160, y0: 220, x1: 2400, y1: 3300, r: 16, t: 0.35 },
    ],
    folk: [
      { kind: "farmer", sprites: ["farmer-m", "farmer-f"], n: 8, x0: 200, x1: 2500 },
      { kind: "civilian", sprites: ["civilian-m", "civilian-f"], n: 12, x0: 3200, x1: WORLD_W - 160 },
    ],
  };
}

export function sectorVehicles(level: number): Array<[Kind, string, number, number]> {
  const style = mapStyle(level);
  if (style === 1) {
    return [
      ["tractor", "tractor", 600, 760],
      ["tractor", "tractor", 2320, 1480],
      ["tractor", "tractor", 1220, 2700],
      ["tractor", "tractor", 3180, 800],
      ["pickup", "pickup", 880, 640],
      ["pickup", "pickup", 2100, 1280],
      ["sedan", "sedan", 3000, 900],
    ];
  }
  if (style === 2) {
    return [
      ["sedan", "sedan", 620, 560],
      ["sedan", "sedan", 1340, 560],
      ["sedan", "sedan", 2060, 1180],
      ["sedan", "sedan", 2780, 1800],
      ["sedan", "sedan", 3500, 2420],
      ["sedan", "sedan", 4220, 1180],
      ["pickup", "pickup", 980, 1800],
      ["pickup", "pickup", 2420, 560],
      ["tractor", "tractor", 320, 2860],
    ];
  }
  if (style === 3) {
    return [
      ["tractor", "tractor", 980, 820],
      ["tractor", "tractor", 3580, 820],
      ["pickup", "pickup", 1180, 2600],
      ["pickup", "pickup", 3820, 2600],
      ["sedan", "sedan", 2360, 1760],
      ["sedan", "sedan", 2520, 1880],
      ["sedan", "sedan", 1100, 1760],
    ];
  }
  if (style === 4) {
    return [
      ["sedan", "sedan", 480, 1760],
      ["sedan", "sedan", 1200, 1880],
      ["sedan", "sedan", 1920, 1760],
      ["sedan", "sedan", 2640, 1900],
      ["sedan", "sedan", 3360, 1760],
      ["pickup", "pickup", 800, 1840],
      ["pickup", "pickup", 4000, 1880],
      ["tractor", "tractor", 560, 560],
      ["tractor", "tractor", 3680, 3000],
    ];
  }
  return [
    ["tractor", "tractor", 600, 760],
    ["tractor", "tractor", 1540, 1120],
    ["tractor", "tractor", 860, 2220],
    ["tractor", "tractor", 1960, 2800],
    ["pickup", "pickup", 1100, 560],
    ["pickup", "pickup", 500, 1780],
    ["pickup", "pickup", 3480, 1100],
    ["pickup", "pickup", 4060, 1680],
    ["sedan", "sedan", 3620, 560],
    ["sedan", "sedan", 4040, 560],
    ["sedan", "sedan", 3700, 1140],
    ["sedan", "sedan", 4180, 1720],
    ["sedan", "sedan", 3580, 2280],
    ["sedan", "sedan", 4080, 2860],
    ["sedan", "sedan", 2300, 2060],
  ];
}

export function sectorStart(level: number): { x: number; y: number } {
  const style = mapStyle(level);
  if (style === 1) return { x: 1800, y: 1600 };
  if (style === 2) return { x: 2400, y: 1600 };
  if (style === 3) return { x: 2440, y: 1760 };
  if (style === 4) return { x: 1400, y: 1400 };
  return { x: 1100, y: 1500 };
}

export function bossHome(level: number): { x: number; y: number } {
  const start = sectorStart(level);
  return { x: start.x + 420, y: start.y - 70 };
}

export function makeBossActor(level: number, x: number, y: number, id: number): Actor {
  const sprite = rivalHullForLevel(level);
  const hp = 340;
  return {
    id,
    kind: "rival",
    x,
    y,
    vx: 0,
    vy: 0,
    r: 48,
    w: 145,
    h: 139,
    hp,
    maxHp: hp,
    facing: 0,
    lift: 0,
    abductTime: 0,
    abductable: false,
    destructible: true,
    solid: false,
    score: 1400,
    heat: 6,
    sprite,
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 0,
    wanderA: 0,
    fireCd: 1.2,
    z: y,
    boss: true,
  };
}

export function sectorPropPlan(level: number): {
  trees: number;
  hay: number;
  bush: number;
  crate: number;
  barrel: number;
  mailbox: number;
  pole: number;
  townX0: number;
} {
  const style = mapStyle(level);
  if (style === 1) return { trees: 22, hay: 24, bush: 16, crate: 4, barrel: 3, mailbox: 4, pole: 4, townX0: 2800 };
  if (style === 2) return { trees: 6, hay: 4, bush: 10, crate: 16, barrel: 12, mailbox: 14, pole: 12, townX0: 200 };
  if (style === 3) return { trees: 16, hay: 12, bush: 14, crate: 8, barrel: 6, mailbox: 8, pole: 8, townX0: 2400 };
  if (style === 4) return { trees: 10, hay: 8, bush: 14, crate: 10, barrel: 8, mailbox: 10, pole: 16, townX0: 200 };
  return { trees: 14, hay: 16, bush: 18, crate: 10, barrel: 8, mailbox: 10, pole: 8, townX0: 3400 };
}

export { WORLD_H, WORLD_W };

import {
  COLS,
  HEAT_GAIN,
  MAX_HP,
  POINTS,
  RAID_TIME,
  ROWS,
  TILE,
  WORLD_H,
  WORLD_W,
  type Actor,
  type Explosion,
  type GameState,
  type Kind,
  type Particle,
  type Popup,
  type Terrain,
} from "./types";

export type World = {
  terrain: Uint8Array;
  actors: Actor[];
  lasers: Actor[];
  bullets: Actor[];
  particles: Particle[];
  popups: Popup[];
  explosions: Explosion[];
  saucer: Actor;
  state: GameState;
  beamOn: boolean;
  aimX: number;
  aimY: number;
  fireCd: number;
  jeepCd: number;
  time: number;
  qaYaw: number;
};

let nid = 1;
function id() {
  return nid++;
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emptyStats() {
  return {
    abducted: 0,
    destroyed: 0,
    cows: 0,
    people: 0,
    buildings: 0,
    vehicles: 0,
    maxCombo: 0,
  };
}

function actor(
  kind: Kind,
  x: number,
  y: number,
  opts: Partial<Actor> & { sprite: string },
): Actor {
  const score = POINTS[kind] ?? 0;
  const heat = HEAT_GAIN[kind] ?? 0;
  return {
    id: id(),
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    r: 22,
    w: 48,
    h: 48,
    hp: 1,
    maxHp: 1,
    facing: 0,
    lift: 0,
    abductTime: 0.55,
    abductable: false,
    destructible: false,
    solid: false,
    score,
    heat,
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: Math.random() * 3,
    wanderA: Math.random() * Math.PI * 2,
    fireCd: 0,
    z: y,
    ...opts,
  };
}

function paintRect(
  t: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  v: Terrain,
) {
  const xa = Math.max(0, x0);
  const ya = Math.max(0, y0);
  const xb = Math.min(COLS, x1);
  const yb = Math.min(ROWS, y1);
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) t[y * COLS + x] = v;
  }
}

function paintRoadH(t: Uint8Array, y: number, x0: number, x1: number, v: Terrain) {
  paintRect(t, x0, y, x1, y + 2, v);
}

function paintRoadV(t: Uint8Array, x: number, y0: number, y1: number, v: Terrain) {
  paintRect(t, x, y0, x + 2, y1, v);
}

export function createWorld(): World {
  nid = 1;
  const rand = mulberry(0x51ace11);
  const terrain = new Uint8Array(COLS * ROWS);
  terrain.fill(0);

  // Wheat pastures on the farm side
  for (let i = 0; i < 10; i++) {
    const x = 2 + Math.floor(rand() * 28);
    const y = 2 + Math.floor(rand() * 44);
    paintRect(terrain, x, y, x + 6 + Math.floor(rand() * 5), y + 5 + Math.floor(rand() * 4), 1);
  }

  // Farm dirt roads
  paintRoadH(terrain, 12, 0, 42, 2);
  paintRoadH(terrain, 28, 0, 50, 2);
  paintRoadH(terrain, 40, 4, 42, 2);
  paintRoadV(terrain, 8, 0, ROWS, 2);
  paintRoadV(terrain, 22, 6, 46, 2);
  paintRoadV(terrain, 36, 0, ROWS, 2);

  // Town streets
  paintRect(terrain, 44, 0, COLS, ROWS, 0);
  for (let y = 4; y < ROWS; y += 8) paintRoadH(terrain, y, 44, COLS, 3);
  for (let x = 46; x < COLS; x += 7) paintRoadV(terrain, x, 0, ROWS, 3);
  // highway linking farm to town
  paintRoadH(terrain, 28, 36, 50, 3);

  const actors: Actor[] = [];

  const place = (
    kind: Kind,
    x: number,
    y: number,
    sprite: string,
    extra: Partial<Actor>,
  ) => {
    actors.push(actor(kind, x, y, { sprite, ...extra }));
  };

  const livestock = (
    kind: Kind,
    sprite: string,
    n: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    t: number,
  ) => {
    for (let i = 0; i < n; i++) {
      place(kind, x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0), sprite, {
        r,
        w: r * 2.1,
        h: r * 2.1,
        abductable: true,
        abductTime: t,
      });
    }
  };

  livestock("cow", "cow", 11, 180, 200, 2300, 3200, 28, 0.7);
  livestock("pig", "pig", 8, 200, 400, 2100, 3000, 22, 0.55);
  livestock("sheep", "sheep", 8, 240, 180, 2200, 3100, 22, 0.55);
  livestock("chicken", "chicken", 14, 160, 220, 2400, 3300, 16, 0.35);

  const folk = (
    kind: Kind,
    sprites: string[],
    n: number,
    x0: number,
    x1: number,
  ) => {
    for (let i = 0; i < n; i++) {
      const sp = sprites[Math.floor(rand() * sprites.length)]!;
      place(kind, x0 + rand() * (x1 - x0), 180 + rand() * (WORLD_H - 360), sp, {
        r: 16,
        w: 36,
        h: 48,
        abductable: true,
        abductTime: 0.62,
      });
    }
  };
  folk("farmer", ["farmer-m", "farmer-f"], 8, 200, 2500);
  folk("civilian", ["civilian-m", "civilian-f"], 12, 3200, WORLD_W - 160);

  const buildings: Array<[Kind, string, number, number, number, number, number]> = [
    ["barn", "barn", 520, 620, 96, 86, 140],
    ["barn", "barn", 1480, 980, 96, 86, 140],
    ["barn", "barn", 780, 2100, 96, 86, 140],
    ["barn", "barn", 1880, 2680, 96, 86, 140],
    ["farmhouse", "farmhouse", 980, 480, 78, 74, 110],
    ["farmhouse", "farmhouse", 420, 1680, 78, 74, 110],
    ["farmhouse", "farmhouse", 1640, 1540, 78, 74, 110],
    ["farmhouse", "farmhouse", 1180, 2920, 78, 74, 110],
    ["silo", "silo", 680, 540, 36, 92, 80],
    ["silo", "silo", 1600, 880, 36, 92, 80],
    ["silo", "silo", 920, 2240, 36, 92, 80],
    ["townhouse", "townhouse", 3560, 420, 70, 70, 95],
    ["townhouse", "townhouse", 3980, 420, 70, 70, 95],
    ["townhouse", "townhouse", 3560, 980, 70, 70, 95],
    ["townhouse", "townhouse", 4120, 980, 70, 70, 95],
    ["townhouse", "townhouse", 3680, 1560, 70, 70, 95],
    ["townhouse", "townhouse", 4100, 1560, 70, 70, 95],
    ["townhouse", "townhouse", 3520, 2140, 70, 70, 95],
    ["townhouse", "townhouse", 4000, 2140, 70, 70, 95],
    ["townhouse", "townhouse", 3720, 2720, 70, 70, 95],
    ["townhouse", "townhouse", 4160, 2720, 70, 70, 95],
    ["shop", "shop", 3840, 720, 78, 64, 120],
    ["shop", "shop", 3920, 1880, 78, 64, 120],
    ["shop", "shop", 3600, 2440, 78, 64, 120],
  ];

  for (const [kind, sprite, x, y, w, h, hp] of buildings) {
    place(kind, x, y, sprite, {
      w,
      h,
      r: Math.max(w, h) * 0.38,
      hp,
      maxHp: hp,
      destructible: true,
      solid: true,
      abductable: false,
    });
  }

  const vehicles: Array<[Kind, string, number, number]> = [
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
  for (const [kind, sprite, x, y] of vehicles) {
    place(kind, x, y, sprite, {
      w: 62,
      h: 38,
      r: 26,
      hp: kind === "tractor" ? 55 : 40,
      maxHp: kind === "tractor" ? 55 : 40,
      destructible: true,
      abductable: true,
      abductTime: 1.15,
    });
  }

  const props: Array<[string, number, number, number, number]> = [];
  for (let i = 0; i < 14; i++) {
    const tree = rand() > 0.45 ? "tree" : "pine";
    props.push([tree, 80 + rand() * 3000, 80 + rand() * 3300, 44, 56]);
  }
  for (let i = 0; i < 16; i++) props.push(["hay", 160 + rand() * 2200, 200 + rand() * 3000, 34, 30]);
  for (let i = 0; i < 18; i++) props.push(["bush", 100 + rand() * 4300, 100 + rand() * 3300, 28, 24]);
  for (let i = 0; i < 10; i++) props.push(["crate", 3400 + rand() * 1200, 200 + rand() * 3000, 24, 24]);
  for (let i = 0; i < 8; i++) props.push(["barrel", 3400 + rand() * 1200, 200 + rand() * 3000, 22, 28]);
  for (let i = 0; i < 10; i++) props.push(["mailbox", 3480 + rand() * 1100, 240 + rand() * 3000, 18, 28]);
  for (let i = 0; i < 8; i++) props.push(["pole", 3500 + rand() * 1100, 200 + rand() * 3000, 16, 70]);
  for (const [key, x, y, w, h] of props) {
    place("prop", x, y, key, {
      propKey: key,
      w,
      h,
      r: Math.max(w, h) * 0.28,
      solid: key === "tree" || key === "pine" || key === "pole",
      destructible: key === "crate" || key === "barrel" || key === "hay" || key === "mailbox",
      hp: 18,
      maxHp: 18,
      score: 40,
      heat: 1,
    });
  }

  const sx = 1100;
  const sy = 1500;
  const saucer = actor("saucer", sx, sy, {
    sprite: "saucer",
    r: 34,
    w: 86,
    h: 86,
    hp: MAX_HP,
    maxHp: MAX_HP,
  });

  const particles: Particle[] = [];
  for (let i = 0; i < 240; i++) {
    particles.push({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 3,
      color: "#fff",
      gravity: 0,
    });
  }

  return {
    terrain,
    actors,
    lasers: [],
    bullets: [],
    particles,
    popups: [],
    explosions: [],
    saucer,
    state: {
      phase: "title",
      timeLeft: RAID_TIME,
      score: 0,
      combo: 0,
      comboTimer: 0,
      heat: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      shake: 0,
      hitstop: 0,
      camX: sx,
      camY: sy,
      camZoom: 1,
      nextId: nid,
      seed: 1,
      stats: emptyStats(),
      reason: "",
    },
    beamOn: false,
    aimX: 1,
    aimY: 0,
    fireCd: 0,
    jeepCd: 0,
    time: 0,
    qaYaw: 0,
  };
}

export function loadBest(): number {
  try {
    return Number(localStorage.getItem("saucer-raid-best") || 0) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number) {
  try {
    const prev = loadBest();
    if (score > prev) localStorage.setItem("saucer-raid-best", String(score));
  } catch {
    /* ignore */
  }
}

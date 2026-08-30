import {
  HEAT_GAIN,
  POINTS,
  RAID_TIME,
  WORLD_H,
  WORLD_W,
  type Actor,
  type Explosion,
  type GameState,
  type Kind,
  type Particle,
  type Popup,
  type Shout,
} from "./types";
import { getCraft } from "./crafts";
import { loadProgress } from "./progress";
import {
  BOSS_HELLO,
  bossHome,
  buildTerrain,
  isBossSector,
  makeBossActor,
  mulberry,
  sectorBuildings,
  sectorFauna,
  sectorPropPlan,
  sectorSeed,
  sectorStart,
  sectorVehicles,
} from "./raid-content";

export type World = {
  terrain: Uint8Array;
  actors: Actor[];
  lasers: Actor[];
  bullets: Actor[];
  particles: Particle[];
  popups: Popup[];
  shouts: Shout[];
  explosions: Explosion[];
  saucer: Actor;
  state: GameState;
  beamOn: boolean;
  aimX: number;
  aimY: number;
  fireCd: number;
  jeepCd: number;
  tankCd: number;
  heliCd: number;
  planeCd: number;
  time: number;
  qaYaw: number;
  bossTalk: number;
  bossTalkT: number;
};

let nid = 1;
function id() {
  return nid++;
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

export function createWorld(): World {
  nid = 1;
  const prog = loadProgress();
  const level = Math.max(1, prog.level || 1);
  const rand = mulberry(sectorSeed(level) ^ 0xa11ce);
  const terrain = buildTerrain(level);

  const actors: Actor[] = [];
  const popups: Popup[] = [];
  const shouts: Shout[] = [];

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

  const fauna = sectorFauna(level);
  for (const s of fauna.stock) {
    livestock(s.kind, s.sprite, s.n, s.x0, s.y0, s.x1, s.y1, s.r, s.t);
  }

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
  for (const f of fauna.folk) folk(f.kind, f.sprites, f.n, f.x0, f.x1);

  const buildings = sectorBuildings(level);

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
      invMass: 0,
      mass: 0,
    });
  }

  const occupied: Array<{ x: number; y: number }> = buildings.map((b) => ({ x: b[2], y: b[3] }));
  const far = (x: number, y: number) => occupied.every((o) => Math.hypot(o.x - x, o.y - y) > 220);
  const specs: Array<["weapon" | "cloak", string]> = [
    ["weapon", "special-armory"],
    ["cloak", "special-cloak"],
    ["weapon", "special-armory"],
    ["cloak", "special-cloak"],
    ["weapon", "special-armory"],
    ["cloak", "special-cloak"],
    ["weapon", "special-armory"],
  ];
  for (const [loot, sprite] of specs) {
    let x = 0;
    let y = 0;
    for (let t = 0; t < 24; t++) {
      x = 180 + rand() * (WORLD_W - 360);
      y = 180 + rand() * (WORLD_H - 360);
      if (far(x, y)) break;
    }
    occupied.push({ x, y });
    place("special", x, y, sprite, {
      w: 82,
      h: 76,
      r: 34,
      hp: 95,
      maxHp: 95,
      destructible: true,
      solid: true,
      abductable: false,
      invMass: 0,
      mass: 0,
      loot,
    });
  }

  const vehicles = sectorVehicles(level);
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

  const plan = sectorPropPlan(level);
  const props: Array<[string, number, number, number, number]> = [];
  for (let i = 0; i < plan.trees; i++) {
    const tree = rand() > 0.45 ? "tree" : "pine";
    props.push([tree, 80 + rand() * 3000, 80 + rand() * 3300, 44, 56]);
  }
  for (let i = 0; i < plan.hay; i++) props.push(["hay", 160 + rand() * 2200, 200 + rand() * 3000, 34, 30]);
  for (let i = 0; i < plan.bush; i++) props.push(["bush", 100 + rand() * 4300, 100 + rand() * 3300, 28, 24]);
  for (let i = 0; i < plan.crate; i++) props.push(["crate", plan.townX0 + rand() * 1200, 200 + rand() * 3000, 24, 24]);
  for (let i = 0; i < plan.barrel; i++) props.push(["barrel", plan.townX0 + rand() * 1200, 200 + rand() * 3000, 22, 28]);
  for (let i = 0; i < plan.mailbox; i++) {
    props.push(["mailbox", plan.townX0 + rand() * 1100, 240 + rand() * 3000, 18, 28]);
  }
  for (let i = 0; i < plan.pole; i++) props.push(["pole", plan.townX0 + rand() * 1100, 200 + rand() * 3000, 16, 70]);
  for (const [key, x, y, w, h] of props) {
    place("prop", x, y, key, {
      propKey: key,
      w,
      h,
      r: Math.max(w, h) * 0.28,
      solid: key === "tree" || key === "pine" || key === "pole",
      invMass: key === "tree" || key === "pine" || key === "pole" ? 0 : undefined,
      destructible: key === "crate" || key === "barrel" || key === "hay" || key === "mailbox",
      hp: 18,
      maxHp: 18,
      score: 40,
      heat: 1,
    });
  }

  const craft = getCraft();
  const u = prog.upgrades;
  const hp = craft.hp + u.armor;
  const speed = craft.speed * (1 + u.engines * 0.12);
  const beam = craft.beam * (1 + u.tractor * 0.08);
  const shieldMax = u.shields;
  const start = sectorStart(level);
  const sx = start.x;
  const sy = start.y;
  const saucer = actor("saucer", sx, sy, {
    sprite: craft.sprite,
    r: craft.r,
    w: craft.w,
    h: craft.h,
    hp,
    maxHp: hp,
  });

  let bossTalk = 2;
  if (isBossSector(level)) {
    const home = bossHome(level);
    const boss = makeBossActor(level, home.x, home.y, id());
    actors.push(boss);
    shouts.push({ id: boss.id, text: BOSS_HELLO, x: boss.x, y: boss.y, life: 2.4, max: 2.4 });
    popups.push({ x: boss.x, y: boss.y - 36, text: BOSS_HELLO, life: 2.2, max: 2.2 });
    bossTalk = 0;
  }
  const bossTalkT = 0;

  const particles: Particle[] = [];
  for (let i = 0; i < 400; i++) {
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
    popups,
    shouts,
    explosions: [],
    saucer,
    state: {
      phase: "title",
      timeLeft: RAID_TIME,
      score: 0,
      combo: 0,
      comboTimer: 0,
      heat: 0,
      hp,
      maxHp: hp,
      shake: 0,
      hitstop: 0,
      camX: sx,
      camY: sy,
      camZoom: 1,
      nextId: nid,
      seed: sectorSeed(level),
      stats: emptyStats(),
      reason: "",
      alert: "calm",
      craftId: craft.id,
      beamR: beam,
      laserMult: craft.laser * (1 + u.weapons * 0.12),
      fireRate: craft.fireRate * (1 - u.weapons * 0.06),
      speed,
      heatMult: craft.heatMult,
      weaponTier: u.weapons,
      cloakT: 0,
      level: prog.level,
      shield: shieldMax,
      shieldMax,
      abductMul: 1 + u.tractor * 0.28,
    },
    beamOn: false,
    aimX: 1,
    aimY: 0,
    fireCd: 0,
    jeepCd: 0,
    tankCd: 1.5,
    heliCd: 2,
    planeCd: 3,
    time: 0,
    qaYaw: 0,
    bossTalk,
    bossTalkT,
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

import { audio } from "./audio";
import { haptics } from "./haptics";
import type { Actions } from "./input";
import {
  applyImpulse,
  beamPull,
  blast,
  collideWorld,
  integrate,
  isStatic,
  sweptHit,
} from "./physics";
import {
  COLS,
  HUMAN_LINES,
  LASER_SPEED,
  ROWS,
  TILE,
  WORLD_H,
  WORLD_W,
  alertFromHeat,
  type Actor,
  type Kind,
} from "./types";
import { createWorld, saveBest, type World } from "./world";
import { awardSalvage, loadProgress, militaryWant, raidSeconds, saveProgress } from "./progress";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function spawnParticle(
  w: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  size: number,
  color: string,
  gravity = 0,
) {
  const p = w.particles.find((n) => !n.alive);
  if (!p) return;
  p.alive = true;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.life = life;
  p.max = life;
  p.size = size;
  p.color = color;
  p.gravity = gravity;
}

function burst(w: World, x: number, y: number, n: number, color: string, speed = 180) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random());
    spawnParticle(
      w,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      0.35 + Math.random() * 0.45,
      2 + Math.random() * 4,
      color,
      40,
    );
  }
}

function popup(w: World, x: number, y: number, text: string) {
  w.popups.push({ x, y, text, life: 0.9, max: 0.9 });
}

function addScore(w: World, amount: number, x: number, y: number) {
  const st = w.state;
  if (st.comboTimer > 0) st.combo += 1;
  else st.combo = 1;
  st.comboTimer = 2.3;
  st.stats.maxCombo = Math.max(st.stats.maxCombo, st.combo);
  const mult = Math.min(6, 1 + Math.floor((st.combo - 1) / 2));
  const gained = amount * mult;
  st.score += gained;
  popup(w, x, y - 20, mult > 1 ? `+${gained}  ×${mult}` : `+${gained}`);
}

function kill(w: World, a: Actor, how: "abduct" | "blast") {
  if (a.dead) return;
  a.dead = true;
  if (how === "abduct") {
    stAbduct(w, a);
    audio.abduct();
    burst(w, a.x, a.y, 14, "#7dffb2", 140);
    burst(w, a.x, a.y, 8, "#e8ffe8", 80);
  } else {
    stDestroy(w, a);
    audio.explode();
    w.explosions.push({ x: a.x, y: a.y, t: 0, scale: a.r > 40 ? 1.6 : 1 });
    burst(w, a.x, a.y, 22, "#ffb060", 260);
    burst(w, a.x, a.y, 10, "#3a2a22", 120);
    blast(w, a.x, a.y, a.r > 40 ? 240 : 150, a.r > 40 ? 980 : 520);
    w.state.shake = Math.min(1, w.state.shake + (a.r > 40 ? 0.55 : 0.32));
    w.state.hitstop = a.r > 40 ? 0.05 : 0.03;
    if (a.destructible && a.kind !== "prop" && a.kind !== "loot") {
      const shards = a.r > 40 ? 5 : 3;
      for (let i = 0; i < shards; i++) {
        const ang = (Math.PI * 2 * i) / shards + Math.random() * 0.4;
        const spd = 80 + Math.random() * 160;
        w.actors.push({
          ...a,
          id: a.id + 90000 + i,
          kind: "rubble",
          sprite: `rubble-${1 + ((a.id + i) % 4)}`,
          hp: 1,
          dead: false,
          destructible: false,
          abductable: false,
          solid: false,
          w: a.w * (0.28 + Math.random() * 0.25),
          h: a.h * (0.22 + Math.random() * 0.2),
          r: a.r * 0.28,
          x: a.x + Math.cos(ang) * 10,
          y: a.y + Math.sin(ang) * 10,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          spin: (Math.random() - 0.5) * 10,
          mass: 1.6,
          invMass: 1 / 1.6,
          restitution: 0.25,
          drag: 2.2,
        });
      }
    }
  }
  w.state.heat = clamp(w.state.heat + a.heat * (w.state.heatMult || 1), 0, 100);
  w.state.alert = alertFromHeat(w.state.heat);
  if (how === "blast" && a.kind === "special") spawnLoot(w, a);
}

function stAbduct(w: World, a: Actor) {
  const s = w.state.stats;
  s.abducted += 1;
  if (a.kind === "cow" || a.kind === "pig" || a.kind === "sheep" || a.kind === "chicken") {
    s.cows += 1;
  }
  if (a.kind === "farmer" || a.kind === "civilian") s.people += 1;
  if (
    a.kind === "tractor" ||
    a.kind === "pickup" ||
    a.kind === "sedan" ||
    a.kind === "jeep" ||
    a.kind === "tank" ||
    a.kind === "heli" ||
    a.kind === "plane"
  ) {
    s.vehicles += 1;
  }
  addScore(w, a.score, a.x, a.y);
}

function stDestroy(w: World, a: Actor) {
  const s = w.state.stats;
  s.destroyed += 1;
  if (
    a.kind === "barn" ||
    a.kind === "farmhouse" ||
    a.kind === "townhouse" ||
    a.kind === "shop" ||
    a.kind === "silo" ||
    a.kind === "special"
  ) {
    s.buildings += 1;
  }
  if (
    a.kind === "tractor" ||
    a.kind === "pickup" ||
    a.kind === "sedan" ||
    a.kind === "jeep" ||
    a.kind === "tank" ||
    a.kind === "heli" ||
    a.kind === "plane"
  ) {
    s.vehicles += 1;
  }
  addScore(w, Math.round(a.score * 0.85), a.x, a.y);
}

function nearestTarget(w: World, s: Actor) {
  let best: Actor | null = null;
  let bestD = 320;
  for (const a of w.actors) {
    if (a.dead) continue;
    if (!a.destructible && !a.abductable) continue;
    if (a.kind === "rubble") continue;
    const d = Math.hypot(a.x - s.x, a.y - s.y);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function spawnLaser(w: World, dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const s = w.saucer;
  const tier = w.state.weaponTier ?? 0;
  const shots: Array<[number, number]> = [[dx, dy]];
  if (tier >= 2) {
    const px = -dy * 14;
    const py = dx * 14;
    shots.length = 0;
    shots.push([dx, dy]);
    shots.push([dx, dy]);
    // twin: parallel offsets applied at spawn pos
  }
  if (tier >= 3) {
    const a = Math.atan2(dy, dx);
    shots.length = 0;
    for (const off of [-0.28, 0, 0.28]) {
      shots.push([Math.cos(a + off), Math.sin(a + off)]);
    }
  } else if (tier >= 2) {
    shots.length = 0;
    shots.push([dx, dy], [dx, dy]);
  }

  const twin = tier === 2;
  shots.forEach((dir, i) => {
    const ox = twin ? -dy * (i === 0 ? -12 : 12) : 0;
    const oy = twin ? dx * (i === 0 ? -12 : 12) : 0;
    w.lasers.push({
      id: 80000 + w.lasers.length + i,
      kind: "laser",
      x: s.x + dir[0] * 36 + ox,
      y: s.y + dir[1] * 36 + oy,
      vx: dir[0] * LASER_SPEED,
      vy: dir[1] * LASER_SPEED,
      r: 8,
      w: 22,
      h: 10,
      hp: 1,
      maxHp: 1,
      facing: Math.atan2(dir[1], dir[0]),
      lift: 0,
      abductTime: 0,
      abductable: false,
      destructible: false,
      solid: false,
      score: 0,
      heat: 0,
      sprite: "laser",
      flash: 0,
      dead: false,
      flee: 0,
      wanderT: 0.7,
      wanderA: 0,
      fireCd: 0,
      z: s.y,
    });
  });
  audio.laser();
  w.state.shake = Math.min(1, w.state.shake + 0.08);
}

function spawnLoot(w: World, a: Actor) {
  const loot = a.loot ?? (Math.random() < 0.5 ? "weapon" : "cloak");
  w.actors.push({
    id: 50000 + Math.floor(Math.random() * 9000),
    kind: "loot",
    x: a.x,
    y: a.y,
    vx: 0,
    vy: 0,
    r: 18,
    w: 36,
    h: 36,
    hp: 1,
    maxHp: 1,
    facing: 0,
    lift: 0,
    abductTime: 0,
    abductable: false,
    destructible: false,
    solid: false,
    score: 0,
    heat: 0,
    sprite: loot === "weapon" ? "pickup-weapon" : "pickup-cloak",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 18,
    wanderA: 0,
    fireCd: 0,
    z: a.y,
    loot,
  });
  popup(w, a.x, a.y - 24, loot === "weapon" ? "WEAPON CACHE" : "CLOAK");
}

function grabLoot(w: World, a: Actor) {
  if (a.dead) return;
  a.dead = true;
  if (a.loot === "weapon") {
    w.state.weaponTier = Math.min(3, (w.state.weaponTier ?? 0) + 1);
    const names = ["Laser", "Laser+", "Twin", "Spread"];
    popup(w, a.x, a.y - 20, names[w.state.weaponTier]!);
    audio.upgrade();
  } else {
    w.state.cloakT = Math.min(16, (w.state.cloakT ?? 0) + 10);
    popup(w, a.x, a.y - 20, "CLOAK");
    audio.cloak();
  }
  burst(w, a.x, a.y, 16, a.loot === "weapon" ? "#ffb060" : "#c9a0ff", 160);
  haptics.tap();
}

function spawnShot(
  w: World,
  x: number,
  y: number,
  dx: number,
  dy: number,
  speed: number,
  dmg: number,
  life = 2.1,
) {
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  w.bullets.push({
    id: 60000 + w.bullets.length + Math.floor(Math.random() * 500),
    kind: "bullet",
    x: x + dx * 28,
    y: y + dy * 28,
    vx: dx * speed,
    vy: dy * speed,
    r: 6 + dmg,
    w: 10,
    h: 10,
    hp: 1,
    maxHp: 1,
    facing: Math.atan2(dy, dx),
    lift: 0,
    abductTime: 0,
    abductable: false,
    destructible: false,
    solid: false,
    score: 0,
    heat: 0,
    sprite: "bullet",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: life,
    wanderA: 0,
    fireCd: 0,
    z: y,
    dmg,
    mass: 0.15,
    invMass: 1 / 0.15,
  });
}

function edgePos() {
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) return { x: Math.random() * WORLD_W, y: 60 };
  if (edge === 1) return { x: WORLD_W - 60, y: Math.random() * WORLD_H };
  if (edge === 2) return { x: Math.random() * WORLD_W, y: WORLD_H - 60 };
  return { x: 60, y: Math.random() * WORLD_H };
}

function spawnUnit(w: World, kind: "jeep" | "tank" | "heli" | "plane") {
  const p = edgePos();
  const specs = {
    jeep: { r: 26, w: 64, h: 40, hp: 70, score: 480, heat: 3, abduct: true, t: 1.2, sprite: "jeep" },
    tank: { r: 34, w: 86, h: 48, hp: 160, score: 900, heat: 4, abduct: true, t: 1.8, sprite: "tank" },
    heli: { r: 30, w: 72, h: 64, hp: 90, score: 760, heat: 3, abduct: false, t: 0, sprite: "heli" },
    plane: { r: 28, w: 88, h: 56, hp: 80, score: 820, heat: 3, abduct: false, t: 0, sprite: "plane" },
  }[kind];
  w.actors.push({
    id: 70000 + Math.floor(Math.random() * 9999),
    kind,
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    r: specs.r,
    w: specs.w,
    h: specs.h,
    hp: specs.hp,
    maxHp: specs.hp,
    facing: 0,
    lift: 0,
    abductTime: specs.t,
    abductable: specs.abduct,
    destructible: true,
    solid: false,
    score: specs.score,
    heat: specs.heat,
    sprite: specs.sprite,
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: kind === "plane" ? 6 : 0,
    wanderA: Math.atan2(w.saucer.y - p.y, w.saucer.x - p.x),
    fireCd: 0.5 + Math.random(),
    z: p.y,
  });
}

function shoutHuman(w: World, a: Actor) {
  if (a.shouted) return;
  a.shouted = true;
  const line = HUMAN_LINES[Math.floor(Math.random() * HUMAN_LINES.length)]!;
  w.shouts.push({ id: a.id, text: line, x: a.x, y: a.y, life: 1.8, max: 1.8 });
  popup(w, a.x, a.y - 28, line);
  const roll = Math.random();
  if (roll < 0.34) audio.scream();
  else if (roll < 0.67) audio.cry();
  else audio.plea();
  haptics.tap();
}

function hurtPlayer(w: World, dmg = 1) {
  if (w.saucer.flash > 0) return;
  if ((w.state.shield ?? 0) > 0) {
    w.state.shield = Math.max(0, w.state.shield - dmg);
    w.saucer.flash = 0.45;
    w.state.shake = Math.min(1, w.state.shake + 0.4);
    audio.hit();
    return;
  }
  w.state.hp = Math.max(0, w.state.hp - dmg);
  w.saucer.hp = w.state.hp;
  w.saucer.flash = 0.7;
  w.state.shake = Math.min(1, w.state.shake + 0.7);
  audio.hurt();
  if (w.state.hp <= 0) {
    w.state.phase = "upgrade";
    w.state.reason = "destroyed";
    saveBest(w.state.score);
    const p = awardSalvage(loadProgress(), w.state.score, false);
    saveProgress(p);
    audio.explode();
    haptics.gameOver();
  }
}

export function smashNearestSpecial(w: World) {
  const s = w.saucer;
  const spec = w.actors
    .filter((a) => a.kind === "special" && !a.dead)
    .sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
  if (!spec) return false;
  spec.x = s.x + 36;
  spec.y = s.y + 8;
  kill(w, spec, "blast");
  return true;
}

export function startRaid(w: World, kind: "start" | "next" | "retry" = "start") {
  const p = loadProgress();
  if (kind === "next") {
    p.level += 1;
    saveProgress(p);
  }
  const next = createWorld();
  Object.assign(w, next);
  w.state.phase = "playing";
  w.state.timeLeft = raidSeconds(loadProgress().level);
  w.state.score = 0;
  audio.ui();
}

export function step(w: World, input: Actions, dt: number) {
  const st = w.state;
  if (st.phase !== "playing") return;

  w.time += dt;
  st.timeLeft -= dt;
  if (st.timeLeft <= 0) {
    st.timeLeft = 0;
    st.phase = "upgrade";
    st.reason = "time";
    saveBest(st.score);
    awardSalvage(loadProgress(), st.score, true);
    haptics.gameOver();
    return;
  }

  st.comboTimer = Math.max(0, st.comboTimer - dt);
  if (st.comboTimer === 0) st.combo = 0;
  st.heat = Math.max(0, st.heat - 1.6 * dt);
  st.alert = alertFromHeat(st.heat);
  st.shake = Math.max(0, st.shake - dt * 1.8);
  st.cloakT = Math.max(0, (st.cloakT ?? 0) - dt);
  if (w.saucer.flash > 0) w.saucer.flash -= dt;
  if ((st.shieldMax ?? 0) > 0 && w.saucer.flash <= 0 && st.shield < st.shieldMax) {
    st.shield = Math.min(st.shieldMax, st.shield + dt * 0.18);
  }

  const s = w.saucer;
  const ax = input.moveX;
  const ay = input.moveY;
  const speed = (st.speed || 330) * (input.beam ? 0.72 : 1);
  const tx = ax * speed;
  const ty = ay * speed;
  s.vx += (tx - s.vx) * (1 - Math.exp(-10 * dt));
  s.vy += (ty - s.vy) * (1 - Math.exp(-10 * dt));
  s.knockX = (s.knockX ?? 0) * Math.exp(-7 * dt);
  s.knockY = (s.knockY ?? 0) * Math.exp(-7 * dt);
  s.x = clamp(s.x + (s.vx + (s.knockX ?? 0)) * dt, 48, WORLD_W - 48);
  s.y = clamp(s.y + (s.vy + (s.knockY ?? 0)) * dt, 48, WORLD_H - 48);

  if (ax || ay) {
    const desired = Math.atan2(ay, ax);
    let d = desired - s.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    s.facing += d * (1 - Math.exp(-8 * dt));
  }

  // QA yaw: A (steer +1 / move left) increases yaw
  if (ax < -0.2) w.qaYaw += 2.4 * dt;
  if (ax > 0.2) w.qaYaw -= 2.4 * dt;

  let aimX = input.aimX;
  let aimY = input.aimY;
  if (Math.hypot(aimX, aimY) < 0.15) {
    const target = nearestTarget(w, s);
    if (target && input.fire) {
      aimX = target.x - s.x;
      aimY = target.y - s.y;
    } else if (Math.hypot(s.vx, s.vy) > 20) {
      aimX = s.vx;
      aimY = s.vy;
    } else {
      aimX = w.aimX;
      aimY = w.aimY;
    }
  }
  const al = Math.hypot(aimX, aimY) || 1;
  w.aimX = aimX / al;
  w.aimY = aimY / al;

  w.beamOn = input.beam;
  if (input.beam) {
    audio.startBeam();
    haptics.beam();
  } else audio.stopBeam();

  w.fireCd = Math.max(0, w.fireCd - dt);
  if (input.fire && w.fireCd <= 0) {
    spawnLaser(w, w.aimX, w.aimY);
    const rate = st.fireRate || 0.085;
    const haste = 1 - Math.min(0.4, (st.weaponTier ?? 0) * 0.1);
    w.fireCd = rate * haste;
  }

  // Military by alert state
  const count = (k: Kind) => w.actors.filter((a) => a.kind === k && !a.dead).length;
  const alert = st.alert;
  const want = militaryWant(st.level || 1, alert);
  w.jeepCd -= dt;
  w.tankCd -= dt;
  w.heliCd -= dt;
  w.planeCd -= dt;
  if (count("jeep") < want.jeep && w.jeepCd <= 0) {
    spawnUnit(w, "jeep");
    w.jeepCd = want.jeepCd;
  }
  if (count("tank") < want.tank && w.tankCd <= 0) {
    spawnUnit(w, "tank");
    w.tankCd = want.tankCd;
  }
  if (count("heli") < want.heli && w.heliCd <= 0) {
    spawnUnit(w, "heli");
    w.heliCd = want.heliCd;
  }
  if (count("plane") < want.plane && w.planeCd <= 0) {
    spawnUnit(w, "plane");
    w.planeCd = want.planeCd;
  }

  const beam = input.beam;

  for (const a of w.actors) {
    if (a.dead) continue;
    a.z = a.y;
    if (a.flash > 0) a.flash -= dt;
    a.fireCd = Math.max(0, a.fireCd - dt);

    const dx = a.x - s.x;
    const dy = a.y - s.y;
    const dist = Math.hypot(dx, dy);

    if (beam && a.abductable && dist < (st.beamR || 82) + a.r * 0.4) {
      if ((a.kind === "farmer" || a.kind === "civilian") && a.lift <= 0) shoutHuman(w, a);
      beamPull(a, s.x, s.y, dt, st.abductMul || 1);
      spawnParticle(
        w,
        a.x + (Math.random() - 0.5) * 16,
        a.y + 10,
        (Math.random() - 0.5) * 20,
        -80 - Math.random() * 40,
        0.35,
        3,
        "#7dffc2",
        0,
      );
      if (a.lift >= a.abductTime) kill(w, a, "abduct");
    } else {
      a.lift = Math.max(0, a.lift - dt * 1.6);
    }

    if (a.kind === "loot") {
      a.wanderT -= dt;
      if (a.wanderT <= 0) a.dead = true;
      if (dist < 46) grabLoot(w, a);
      continue;
    }

    if (a.kind === "jeep" || a.kind === "tank") {
      const cloaked = (st.cloakT ?? 0) > 0;
      const jx = s.x - a.x;
      const jy = s.y - a.y;
      const jl = Math.hypot(jx, jy) || 1;
      const spd = a.kind === "tank" ? 78 : 145;
      if (cloaked) {
        a.wanderT -= dt;
        if (a.wanderT <= 0) {
          a.wanderT = 1.4;
          a.wanderA = Math.random() * Math.PI * 2;
        }
        a.vx += (Math.cos(a.wanderA) * 40 - a.vx) * (1 - Math.exp(-3 * dt));
        a.vy += (Math.sin(a.wanderA) * 40 - a.vy) * (1 - Math.exp(-3 * dt));
        a.facing = Math.atan2(a.vy, a.vx);
      } else {
        a.vx += ((jx / jl) * spd - a.vx) * (1 - Math.exp(-5 * dt));
        a.vy += ((jy / jl) * spd - a.vy) * (1 - Math.exp(-5 * dt));
        a.facing = Math.atan2(a.vy, a.vx);
        const range = a.kind === "tank" ? 580 : 520;
        if (a.fireCd <= 0 && jl < range) {
          a.fireCd = a.kind === "tank" ? 1.85 : 1.15;
          spawnShot(w, a.x, a.y, jx, jy, a.kind === "tank" ? 210 : 280, a.kind === "tank" ? 2 : 1);
          if (a.kind === "tank") audio.tank();
        }
      }
    } else if (a.kind === "heli") {
      const ang = w.time * 0.85 + a.id;
      const ox = s.x + Math.cos(ang) * 240 - a.x;
      const oy = s.y + Math.sin(ang) * 240 - a.y;
      const ol = Math.hypot(ox, oy) || 1;
      a.vx += ((ox / ol) * 190 - a.vx) * (1 - Math.exp(-4 * dt));
      a.vy += ((oy / ol) * 190 - a.vy) * (1 - Math.exp(-4 * dt));
      a.facing = Math.atan2(s.y - a.y, s.x - a.x);
      const jl = Math.hypot(s.x - a.x, s.y - a.y);
      if ((st.cloakT ?? 0) <= 0 && a.fireCd <= 0 && jl < 480) {
        a.fireCd = 0.72;
        spawnShot(w, a.x, a.y, s.x - a.x, s.y - a.y, 300, 1, 1.6);
        audio.heli();
      }
    } else if (a.kind === "plane") {
      const hd = a.wanderA;
      a.vx = Math.cos(hd) * 340;
      a.vy = Math.sin(hd) * 340;
      a.facing = hd;
      a.wanderT -= dt;
      if ((st.cloakT ?? 0) <= 0 && a.fireCd <= 0) {
        a.fireCd = 0.38;
        spawnShot(w, a.x, a.y, Math.cos(hd), Math.sin(hd), 420, 1, 1.1);
        audio.jet();
      }
      if (
        a.wanderT <= 0 ||
        a.x < -80 ||
        a.y < -80 ||
        a.x > WORLD_W + 80 ||
        a.y > WORLD_H + 80
      ) {
        a.dead = true;
      }
    } else if (a.kind === "rubble") {
      a.spin = (a.spin ?? 0) * Math.exp(-1.8 * dt);
    } else if (
      a.kind === "cow" ||
      a.kind === "pig" ||
      a.kind === "sheep" ||
      a.kind === "chicken" ||
      a.kind === "farmer" ||
      a.kind === "civilian"
    ) {
      if (dist < 220) a.flee = 1.6;
      if (a.flee > 0) {
        a.flee -= dt;
        const fl = dist || 1;
        const spd = a.kind === "chicken" ? 95 : a.kind === "cow" ? 55 : 80;
        const wx = (dx / fl) * spd;
        const wy = (dy / fl) * spd;
        a.vx += (wx - a.vx) * (1 - Math.exp(-7 * dt));
        a.vy += (wy - a.vy) * (1 - Math.exp(-7 * dt));
      } else {
        a.wanderT -= dt;
        if (a.wanderT <= 0) {
          a.wanderT = 1.2 + Math.random() * 2.4;
          a.wanderA = Math.random() * Math.PI * 2;
        }
        const spd = 22;
        a.vx += (Math.cos(a.wanderA) * spd - a.vx) * (1 - Math.exp(-4 * dt));
        a.vy += (Math.sin(a.wanderA) * spd - a.vy) * (1 - Math.exp(-4 * dt));
      }
    }

    if (!isStatic(a) && a.kind !== "prop") integrate(a, dt);
  }

  collideWorld(w);

  for (const L of w.lasers) {
    if (L.dead) continue;
    const x0 = L.x;
    const y0 = L.y;
    L.x += L.vx * dt;
    L.y += L.vy * dt;
    L.wanderT -= dt;
    if (L.wanderT <= 0 || L.x < 0 || L.y < 0 || L.x > WORLD_W || L.y > WORLD_H) {
      L.dead = true;
      continue;
    }
    for (const a of w.actors) {
      if (a.dead || !a.destructible) continue;
      if (!sweptHit(x0, y0, L.x, L.y, a.x, a.y, a.r + 12)) continue;
      L.dead = true;
      a.hp -= 22 * (st.laserMult || 1) * (1 + (st.weaponTier ?? 0) * 0.28);
      a.flash = 0.08;
      applyImpulse(a, L.vx * 0.08, L.vy * 0.08);
      audio.hit();
      burst(w, L.x, L.y, 6, "#9dffc4", 90);
      if (a.hp <= 0) kill(w, a, "blast");
      break;
    }
  }

  for (const b of w.bullets) {
    if (b.dead) continue;
    const x0 = b.x;
    const y0 = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.wanderT -= dt;
    if (b.wanderT <= 0) {
      b.dead = true;
      continue;
    }
    if (sweptHit(x0, y0, b.x, b.y, s.x, s.y, s.r + 8)) {
      b.dead = true;
      if ((st.cloakT ?? 0) > 0) {
        burst(w, b.x, b.y, 5, "#c9a0ff", 70);
        continue;
      }
      const ln = Math.hypot(b.vx, b.vy) || 1;
      s.knockX = (s.knockX ?? 0) + (b.vx / ln) * 220;
      s.knockY = (s.knockY ?? 0) + (b.vy / ln) * 220;
      hurtPlayer(w, b.dmg ?? 1);
    }
  }

  w.lasers = w.lasers.filter((l) => !l.dead);
  w.bullets = w.bullets.filter((b) => !b.dead);
  w.actors = w.actors.filter((a) => !a.dead || a.kind === "rubble");

  for (const p of w.particles) {
    if (!p.alive) continue;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    if (p.life <= 0) p.alive = false;
  }
  for (const pop of w.popups) {
    pop.life -= dt;
    pop.y -= 28 * dt;
  }
  w.popups = w.popups.filter((p) => p.life > 0);
  for (const sh of w.shouts) {
    sh.life -= dt;
    const src = w.actors.find((a) => a.id === sh.id);
    if (src && !src.dead) {
      sh.x = src.x;
      sh.y = src.y - 36 - src.lift * 40;
    } else {
      sh.y -= 18 * dt;
    }
  }
  w.shouts = w.shouts.filter((p) => p.life > 0);
  for (const ex of w.explosions) ex.t += dt;
  w.explosions = w.explosions.filter((e) => e.t < 0.45);

  // camera
  const lookX = s.x + s.vx * 0.18;
  const lookY = s.y + s.vy * 0.18;
  st.camX += (lookX - st.camX) * (1 - Math.exp(-7 * dt));
  st.camY += (lookY - st.camY) * (1 - Math.exp(-7 * dt));
}

export function worldToScreen(
  w: World,
  x: number,
  y: number,
  vw: number,
  vh: number,
  zoom: number,
) {
  const sh = traumaOffset(w);
  return {
    x: (x - w.state.camX) * zoom + vw / 2 + sh.x,
    y: (y - w.state.camY) * zoom + vh / 2 + sh.y,
  };
}

export function screenToWorld(
  w: World,
  sx: number,
  sy: number,
  vw: number,
  vh: number,
  zoom: number,
) {
  const sh = traumaOffset(w);
  return {
    x: (sx - vw / 2 - sh.x) / zoom + w.state.camX,
    y: (sy - vh / 2 - sh.y) / zoom + w.state.camY,
  };
}

export function traumaOffset(w: World) {
  const t = w.state.shake * w.state.shake;
  if (t <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() * 2 - 1) * t * 14,
    y: (Math.random() * 2 - 1) * t * 14,
  };
}

export function tileAt(w: World, x: number, y: number) {
  const tx = clamp(Math.floor(x / TILE), 0, COLS - 1);
  const ty = clamp(Math.floor(y / TILE), 0, ROWS - 1);
  return w.terrain[ty * COLS + tx] ?? 0;
}

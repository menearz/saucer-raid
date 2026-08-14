import { audio } from "./audio";
import { haptics } from "./haptics";
import type { Actions } from "./input";
import {
  BEAM_RADIUS,
  COLS,
  LASER_RATE,
  LASER_SPEED,
  PLAYER_SPEED,
  ROWS,
  TILE,
  WORLD_H,
  WORLD_W,
  type Actor,
} from "./types";
import { createWorld, saveBest, type World } from "./world";

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
    w.state.shake = Math.min(1, w.state.shake + (a.r > 40 ? 0.55 : 0.32));
    w.state.hitstop = a.r > 40 ? 0.05 : 0.03;
    if (a.destructible && a.kind !== "prop") {
      w.actors.push({
        ...a,
        id: a.id + 90000,
        kind: "rubble",
        sprite: `rubble-${1 + (a.id % 4)}`,
        hp: 1,
        dead: false,
        destructible: false,
        abductable: false,
        solid: false,
        w: a.w * 0.7,
        h: a.h * 0.45,
        r: a.r * 0.5,
      });
    }
  }
  w.state.heat = clamp(w.state.heat + a.heat, 0, 100);
}

function stAbduct(w: World, a: Actor) {
  const s = w.state.stats;
  s.abducted += 1;
  if (a.kind === "cow" || a.kind === "pig" || a.kind === "sheep" || a.kind === "chicken") {
    s.cows += 1;
  }
  if (a.kind === "farmer" || a.kind === "civilian") s.people += 1;
  if (a.kind === "tractor" || a.kind === "pickup" || a.kind === "sedan" || a.kind === "jeep") {
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
    a.kind === "silo"
  ) {
    s.buildings += 1;
  }
  if (a.kind === "tractor" || a.kind === "pickup" || a.kind === "sedan" || a.kind === "jeep") {
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
  w.lasers.push({
    id: 80000 + w.lasers.length,
    kind: "laser",
    x: s.x + dx * 36,
    y: s.y + dy * 36,
    vx: dx * LASER_SPEED,
    vy: dy * LASER_SPEED,
    r: 8,
    w: 22,
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
    sprite: "laser",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 0.7,
    wanderA: 0,
    fireCd: 0,
    z: s.y,
  });
  audio.laser();
  w.state.shake = Math.min(1, w.state.shake + 0.08);
}

function spawnJeep(w: World) {
  const edge = Math.floor(Math.random() * 4);
  let x = 80;
  let y = 80;
  if (edge === 0) {
    x = Math.random() * WORLD_W;
    y = 60;
  } else if (edge === 1) {
    x = WORLD_W - 60;
    y = Math.random() * WORLD_H;
  } else if (edge === 2) {
    x = Math.random() * WORLD_W;
    y = WORLD_H - 60;
  } else {
    x = 60;
    y = Math.random() * WORLD_H;
  }
  w.actors.push({
    id: 70000 + Math.floor(Math.random() * 9999),
    kind: "jeep",
    x,
    y,
    vx: 0,
    vy: 0,
    r: 26,
    w: 64,
    h: 40,
    hp: 70,
    maxHp: 70,
    facing: 0,
    lift: 0,
    abductTime: 1.2,
    abductable: true,
    destructible: true,
    solid: false,
    score: 480,
    heat: 3,
    sprite: "jeep",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 0,
    wanderA: 0,
    fireCd: 0.6,
    z: y,
  });
}

function hurtPlayer(w: World, dmg = 1) {
  if (w.saucer.flash > 0) return;
  w.state.hp = Math.max(0, w.state.hp - dmg);
  w.saucer.hp = w.state.hp;
  w.saucer.flash = 0.7;
  w.state.shake = Math.min(1, w.state.shake + 0.7);
  audio.hurt();
  if (w.state.hp <= 0) {
    w.state.phase = "over";
    w.state.reason = "destroyed";
    saveBest(w.state.score);
    audio.explode();
    haptics.gameOver();
  }
}

export function startRaid(w: World) {
  const next = createWorld();
  Object.assign(w, next);
  w.state.phase = "playing";
  w.state.timeLeft = 100;
  audio.ui();
}

export function step(w: World, input: Actions, dt: number) {
  const st = w.state;
  if (st.phase !== "playing") return;

  w.time += dt;
  st.timeLeft -= dt;
  if (st.timeLeft <= 0) {
    st.timeLeft = 0;
    st.phase = "over";
    st.reason = "time";
    saveBest(st.score);
    haptics.gameOver();
    return;
  }

  st.comboTimer = Math.max(0, st.comboTimer - dt);
  if (st.comboTimer === 0) st.combo = 0;
  st.heat = Math.max(0, st.heat - 1.6 * dt);
  st.shake = Math.max(0, st.shake - dt * 1.8);
  if (w.saucer.flash > 0) w.saucer.flash -= dt;

  const s = w.saucer;
  const ax = input.moveX;
  const ay = input.moveY;
  const speed = PLAYER_SPEED * (input.beam ? 0.72 : 1);
  const tx = ax * speed;
  const ty = ay * speed;
  s.vx += (tx - s.vx) * (1 - Math.exp(-10 * dt));
  s.vy += (ty - s.vy) * (1 - Math.exp(-10 * dt));
  s.x = clamp(s.x + s.vx * dt, 48, WORLD_W - 48);
  s.y = clamp(s.y + s.vy * dt, 48, WORLD_H - 48);

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
    w.fireCd = LASER_RATE;
  }

  // Jeeps
  const livingJeeps = w.actors.filter((a) => a.kind === "jeep" && !a.dead).length;
  const want = st.heat > 75 ? 4 : st.heat > 50 ? 3 : st.heat > 32 ? 2 : 0;
  w.jeepCd -= dt;
  if (livingJeeps < want && w.jeepCd <= 0) {
    spawnJeep(w);
    w.jeepCd = 3.2;
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

    if (beam && a.abductable && dist < BEAM_RADIUS + a.r * 0.4) {
      a.lift += dt;
      const pull = 3.2;
      a.x += (s.x - a.x) * pull * dt;
      a.y += (s.y - 18 - a.y) * pull * dt;
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
      continue;
    } else {
      a.lift = Math.max(0, a.lift - dt * 1.6);
    }

    if (a.kind === "jeep") {
      const jx = s.x - a.x;
      const jy = s.y - a.y;
      const jl = Math.hypot(jx, jy) || 1;
      const spd = 145;
      a.vx = (jx / jl) * spd;
      a.vy = (jy / jl) * spd;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.facing = Math.atan2(a.vy, a.vx);
      if (a.fireCd <= 0 && jl < 520) {
        a.fireCd = 1.15;
        const ox = jx / jl;
        const oy = jy / jl;
        w.bullets.push({
          id: 60000 + w.bullets.length,
          kind: "bullet",
          x: a.x + ox * 28,
          y: a.y + oy * 28,
          vx: ox * 280,
          vy: oy * 280,
          r: 6,
          w: 10,
          h: 10,
          hp: 1,
          maxHp: 1,
          facing: Math.atan2(oy, ox),
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
          wanderT: 1.8,
          wanderA: 0,
          fireCd: 0,
          z: a.y,
        });
      }
      continue;
    }

    if (a.kind === "rubble" || a.kind === "prop") {
      continue;
    }

    if (
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
        a.x += (dx / fl) * spd * dt;
        a.y += (dy / fl) * spd * dt;
      } else {
        a.wanderT -= dt;
        if (a.wanderT <= 0) {
          a.wanderT = 1.2 + Math.random() * 2.4;
          a.wanderA = Math.random() * Math.PI * 2;
        }
        const spd = 22;
        a.x += Math.cos(a.wanderA) * spd * dt;
        a.y += Math.sin(a.wanderA) * spd * dt;
      }
      a.x = clamp(a.x, 40, WORLD_W - 40);
      a.y = clamp(a.y, 40, WORLD_H - 40);
    }
  }

  for (const L of w.lasers) {
    if (L.dead) continue;
    L.x += L.vx * dt;
    L.y += L.vy * dt;
    L.wanderT -= dt;
    if (L.wanderT <= 0 || L.x < 0 || L.y < 0 || L.x > WORLD_W || L.y > WORLD_H) {
      L.dead = true;
      continue;
    }
    for (const a of w.actors) {
      if (a.dead || !a.destructible) continue;
      const ddx = a.x - L.x;
      const ddy = a.y - L.y;
      if (ddx * ddx + ddy * ddy < (a.r + 10) * (a.r + 10)) {
        L.dead = true;
        a.hp -= 22;
        a.flash = 0.08;
        audio.hit();
        burst(w, L.x, L.y, 6, "#9dffc4", 90);
        if (a.hp <= 0) kill(w, a, "blast");
        break;
      }
    }
  }

  for (const b of w.bullets) {
    if (b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.wanderT -= dt;
    if (b.wanderT <= 0) {
      b.dead = true;
      continue;
    }
    const ddx = b.x - s.x;
    const ddy = b.y - s.y;
    if (ddx * ddx + ddy * ddy < (s.r + 6) * (s.r + 6)) {
      b.dead = true;
      hurtPlayer(w, 1);
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

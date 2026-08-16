import { WORLD_H, WORLD_W, type Actor } from "./types";
import type { World } from "./world";

const CELL = 96;
const MASS: Record<string, number> = {
  saucer: 14,
  cow: 5,
  pig: 3.4,
  sheep: 2.8,
  chicken: 0.9,
  farmer: 2.4,
  civilian: 2.2,
  tractor: 9,
  pickup: 7,
  sedan: 5.5,
  jeep: 8,
  tank: 18,
  heli: 6,
  plane: 5,
  barn: 0,
  farmhouse: 0,
  townhouse: 0,
  shop: 0,
  silo: 0,
  special: 0,
  loot: 0.4,
  prop: 0,
  rubble: 2.2,
  laser: 0.2,
  bullet: 0.15,
};

export function invMassOf(a: Actor) {
  if (a.invMass != null) return a.invMass;
  const m = a.mass ?? MASS[a.kind] ?? 2;
  return m > 0 ? 1 / m : 0;
}

export function isStatic(a: Actor) {
  return invMassOf(a) === 0;
}

function key(cx: number, cy: number) {
  return ((cx + 512) << 16) | ((cy + 512) & 0xffff);
}

export function hashInsert(buckets: Map<number, Actor[]>, a: Actor) {
  const cx = Math.floor(a.x / CELL);
  const cy = Math.floor(a.y / CELL);
  const k = key(cx, cy);
  let list = buckets.get(k);
  if (!list) {
    list = [];
    buckets.set(k, list);
  }
  list.push(a);
}

export function hashQuery(
  buckets: Map<number, Actor[]>,
  x: number,
  y: number,
  r: number,
  out: Actor[],
) {
  out.length = 0;
  const rgt = Math.floor((x + r) / CELL);
  const lft = Math.floor((x - r) / CELL);
  const bot = Math.floor((y + r) / CELL);
  const top = Math.floor((y - r) / CELL);
  for (let cy = top; cy <= bot; cy++) {
    for (let cx = lft; cx <= rgt; cx++) {
      const list = buckets.get(key(cx, cy));
      if (list) for (const a of list) out.push(a);
    }
  }
  return out;
}

export function integrate(a: Actor, dt: number) {
  const drag = a.drag ?? (a.kind === "rubble" ? 2.4 : 1.6);
  const damp = Math.exp(-drag * dt);
  a.vx *= damp;
  a.vy *= damp;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  if (a.spin) a.facing += a.spin * dt;
  const pad = 36;
  if (a.x < pad) {
    a.x = pad;
    a.vx = Math.abs(a.vx) * (a.restitution ?? 0.2);
  } else if (a.x > WORLD_W - pad) {
    a.x = WORLD_W - pad;
    a.vx = -Math.abs(a.vx) * (a.restitution ?? 0.2);
  }
  if (a.y < pad) {
    a.y = pad;
    a.vy = Math.abs(a.vy) * (a.restitution ?? 0.2);
  } else if (a.y > WORLD_H - pad) {
    a.y = WORLD_H - pad;
    a.vy = -Math.abs(a.vy) * (a.restitution ?? 0.2);
  }
}

export function resolveCircles(a: Actor, b: Actor) {
  const imA = invMassOf(a);
  const imB = invMassOf(b);
  if (imA === 0 && imB === 0) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 > min * min || d2 < 1e-8) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const pen = min - d;
  const denom = imA + imB;
  a.x -= nx * pen * (imA / denom);
  a.y -= ny * pen * (imA / denom);
  b.x += nx * pen * (imB / denom);
  b.y += ny * pen * (imB / denom);
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velN = rvx * nx + rvy * ny;
  if (velN > 0) return;
  const e = Math.min(a.restitution ?? 0.15, b.restitution ?? 0.15);
  const j = (-(1 + e) * velN) / denom;
  a.vx -= j * nx * imA;
  a.vy -= j * ny * imA;
  b.vx += j * nx * imB;
  b.vy += j * ny * imB;
}

export function applyImpulse(a: Actor, ix: number, iy: number) {
  const im = invMassOf(a);
  if (im === 0) return;
  a.vx += ix * im;
  a.vy += iy * im;
}

export function blast(w: World, x: number, y: number, radius: number, force: number) {
  const r2 = radius * radius;
  for (const a of w.actors) {
    if (a.dead && a.kind !== "rubble") continue;
    const dx = a.x - x;
    const dy = a.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2 || d2 < 1) continue;
    const d = Math.sqrt(d2);
    const falloff = 1 - d / radius;
    applyImpulse(a, (dx / d) * force * falloff, (dy / d) * force * falloff);
    a.spin = (a.spin ?? 0) + (Math.random() - 0.5) * 8 * falloff;
    a.flee = Math.max(a.flee, 1.1);
  }
  const s = w.saucer;
  const dx = s.x - x;
  const dy = s.y - y;
  const d2 = dx * dx + dy * dy;
  if (d2 < r2 && d2 > 1) {
    const d = Math.sqrt(d2);
    const falloff = 1 - d / radius;
    s.knockX = (s.knockX ?? 0) + (dx / d) * 90 * falloff;
    s.knockY = (s.knockY ?? 0) + (dy / d) * 90 * falloff;
  }
}

export function beamPull(a: Actor, sx: number, sy: number, dt: number, rate = 1) {
  const k = 22;
  const c = 6;
  const fx = (sx - a.x) * k - a.vx * c;
  const fy = (sy - 16 - a.y) * k - a.vy * c;
  applyImpulse(a, fx * dt * 18, fy * dt * 18);
  a.lift += dt * rate;
}

export function collideWorld(w: World) {
  const buckets = new Map<number, Actor[]>();
  for (const a of w.actors) {
    if (a.dead && a.kind !== "rubble") continue;
    hashInsert(buckets, a);
  }
  const near: Actor[] = [];
  for (const a of w.actors) {
    if (a.dead && a.kind !== "rubble") continue;
    if (isStatic(a)) continue;
    hashQuery(buckets, a.x, a.y, a.r + 48, near);
    for (const b of near) {
      if (b.id <= a.id) continue;
      if (b.dead && b.kind !== "rubble") continue;
      if (!a.solid && !b.solid && a.kind !== "rubble" && b.kind !== "rubble") {
        if (!a.abductable || !b.abductable) continue;
      }
      resolveCircles(a, b);
    }
  }
}

export function sweptHit(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  r: number,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const fx = x0 - cx;
  const fy = y0 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  if (a < 1e-8) return c <= 0;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  disc = Math.sqrt(disc);
  const t0 = (-b - disc) / (2 * a);
  const t1 = (-b + disc) / (2 * a);
  return (t0 >= 0 && t0 <= 1) || (t1 >= 0 && t1 <= 1) || (t0 < 0 && t1 > 1);
}

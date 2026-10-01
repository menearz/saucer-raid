import type { Alert } from "./types.ts";
import type { CraftId } from "./crafts.ts";
import { loadCraftId } from "./crafts.ts";

export type UpgradeId = "engines" | "tractor" | "armor" | "shields" | "weapons";

export type UpgradeRanks = Record<UpgradeId, number>;

export type Progress = {
  level: number;
  salvage: number;
  runScore: number;
  /** Mirror of selected craft ranks (compat); prefer ranksFor. */
  upgrades: UpgradeRanks;
  upgradesByCraft: Partial<Record<CraftId, UpgradeRanks>>;
  /** Best quota-clear time in seconds, keyed by level. Lower is better. */
  bestTimes: Record<string, number>;
};

export const UPGRADES: {
  id: UpgradeId;
  name: string;
  blurb: string;
  max: number;
}[] = [
  { id: "engines", name: "Engines", blurb: "Faster disc.", max: 4 },
  { id: "tractor", name: "Tractor", blurb: "Yank them up quicker.", max: 4 },
  { id: "armor", name: "Armor", blurb: "More hull.", max: 4 },
  { id: "shields", name: "Shields", blurb: "Soak military fire.", max: 4 },
  { id: "weapons", name: "Cannons", blurb: "Start the raid hotter.", max: 3 },
];

const KEY = "saucer-raid-progress";

export function emptyRanks(): UpgradeRanks {
  return { engines: 0, tractor: 0, armor: 0, shields: 0, weapons: 0 };
}

export function emptyProgress(): Progress {
  return {
    level: 1,
    salvage: 0,
    runScore: 0,
    upgrades: emptyRanks(),
    upgradesByCraft: {},
    bestTimes: {},
  };
}

function readBestTimes(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const level = Number(k);
    const t = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(level) || level < 1) continue;
    if (!Number.isFinite(t) || t < 0) continue;
    out[String(level)] = t;
  }
  return out;
}

export function ranksFor(p: Progress, craftId: CraftId): UpgradeRanks {
  return { ...emptyRanks(), ...(p.upgradesByCraft[craftId] ?? {}) };
}

/** Normalize saved progress: migrate legacy flat upgrades onto current craft only. */
export function normalizeProgress(raw: Partial<Progress> & { upgrades?: UpgradeRanks }): Progress {
  const base = emptyProgress();
  const craftId = loadCraftId();
  let byCraft: Partial<Record<CraftId, UpgradeRanks>> = {};
  if (raw.upgradesByCraft && typeof raw.upgradesByCraft === "object") {
    for (const [k, v] of Object.entries(raw.upgradesByCraft)) {
      if (v && typeof v === "object") byCraft[k as CraftId] = { ...emptyRanks(), ...v };
    }
  } else if (raw.upgrades && typeof raw.upgrades === "object") {
    byCraft = { [craftId]: { ...emptyRanks(), ...raw.upgrades } };
  }
  const selected = ranksFor({ ...base, upgradesByCraft: byCraft }, craftId);
  return {
    level: Math.max(1, raw.level || 1),
    salvage: Math.max(0, raw.salvage || 0),
    runScore: Math.max(0, raw.runScore || 0),
    upgrades: selected,
    upgradesByCraft: byCraft,
    bestTimes: readBestTimes(raw.bestTimes),
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw) as Progress);
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function resetProgress() {
  const p = emptyProgress();
  saveProgress(p);
  return p;
}

/** Next-rank salvage. Exactly 2.5× the old `8 + rank * 8` line. Max ranks stay put. */
export function upgradeCost(rank: number) {
  return (8 + rank * 8) * 2.5;
}

export function buyUpgrade(p: Progress, craftId: CraftId, id: UpgradeId): Progress {
  const spec = UPGRADES.find((u) => u.id === id)!;
  const ranks = ranksFor(p, craftId);
  const rank = ranks[id] ?? 0;
  if (rank >= spec.max) return p;
  const cost = upgradeCost(rank);
  if (p.salvage < cost) return p;
  const nextRanks = { ...ranks, [id]: rank + 1 };
  const selected = loadCraftId();
  const next: Progress = {
    ...p,
    salvage: p.salvage - cost,
    upgradesByCraft: { ...p.upgradesByCraft, [craftId]: nextRanks },
    upgrades: craftId === selected ? nextRanks : ranksFor(p, selected),
  };
  if (craftId !== selected) {
    next.upgrades = ranksFor(next, selected);
  }
  saveProgress(next);
  return next;
}

export function awardSalvage(p: Progress, score: number, survived: boolean): Progress {
  const gained = Math.max(2, Math.floor(score / 180) + (survived ? 6 : 2));
  const next = {
    ...p,
    salvage: p.salvage + gained,
    runScore: p.runScore + score,
  };
  saveProgress(next);
  return next;
}

/**
 * Legacy survival-clock length. Not the live raid timer and not a fail condition.
 * Kept so the old curve stays inspectable. Par time is `parSec`.
 */
export function raidSeconds(level: number) {
  return Math.max(70, 102 - (level - 1) * 4);
}

/** Abduct quota. Exact spec curve: 400 + (level - 1) * 120. Not tuned. */
export function raidGoal(level: number) {
  const lv = Math.max(1, level);
  return 400 + (lv - 1) * 120;
}

/**
 * Time-attack par in seconds. Grows with the quota: 90 + level * 2.
 * The old `raidSeconds` curve shrinks and was a countdown, so it is not the par.
 */
export function parSec(level: number) {
  const lv = Math.max(1, level);
  return 90 + lv * 2;
}

/** Points added to score (and thus salvage) per second under par. Over par pays 0. */
export const TIME_BONUS_PER_SEC = 5;

export function timeBonusFor(level: number, elapsed: number) {
  const t = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return Math.max(0, Math.round((parSec(level) - t) * TIME_BONUS_PER_SEC));
}

export function formatClock(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/** Record a quota clear. Keeps the faster time. No-op when this run is slower. */
export function noteBestClear(p: Progress, level: number, elapsed: number): Progress {
  const key = String(Math.max(1, Math.floor(level)));
  const t = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const prev = p.bestTimes?.[key];
  if (prev != null && prev <= t) return p;
  const next: Progress = { ...p, bestTimes: { ...p.bestTimes, [key]: t } };
  saveProgress(next);
  return next;
}

/**
 * Repeat-spawn delay. The old curve floored mid-campaign (`oldFloor`).
 * Past that point the delay keeps falling toward `lateFloor`.
 */
function spawnCooldown(
  base: number,
  extra: number,
  rate: number,
  oldFloor: number,
  lateFloor: number,
) {
  const linear = base - extra * rate;
  if (linear >= oldFloor) return linear;
  const extraAtFloor = (base - oldFloor) / rate;
  const past = extra - extraAtFloor;
  return Math.max(lateFloor, oldFloor - past * rate * 0.28);
}

export function militaryWant(level: number, alert: Alert) {
  const lv = Math.max(1, level);
  const extra = Math.max(0, lv - 1);
  const jeep =
    (alert === "uneasy" ? 2 : alert === "alert" ? 2 : alert === "hostile" ? 3 : alert === "air-raid" ? 3 : lv >= 2 ? 1 : 0) +
    Math.floor(extra / 2);
  let tank = alert === "alert" ? 1 : alert === "hostile" ? 2 : alert === "air-raid" ? 2 : 0;
  if (lv >= 2 && alert === "uneasy") tank = Math.max(tank, 1);
  tank += Math.floor(extra / 2);
  let heli = alert === "hostile" ? 1 : alert === "air-raid" ? 2 : 0;
  if (lv >= 3 && (alert === "alert" || alert === "hostile")) heli = Math.max(heli, 1);
  if (lv >= 5) heli += 1;
  if (lv > 5) heli += Math.floor((lv - 5) / 3);
  let plane = alert === "air-raid" ? 2 : 0;
  if (lv >= 4 && alert === "hostile") plane = Math.max(plane, 1);
  if (lv >= 6) plane += 1;
  if (lv > 6) plane += Math.floor((lv - 6) / 3);
  return {
    jeep: Math.min(8 + Math.floor(extra / 3), jeep),
    tank: Math.min(6 + Math.floor(extra / 4), tank),
    heli: Math.min(5 + Math.floor(Math.max(0, lv - 5) / 2), heli),
    plane: Math.min(5 + Math.floor(Math.max(0, lv - 6) / 2), plane),
    jeepCd: spawnCooldown(3.2, extra, 0.18, 1.6, 0.45),
    tankCd: spawnCooldown(5.5, extra, 0.28, 2.4, 0.7),
    heliCd: spawnCooldown(6.2, extra, 0.3, 2.8, 0.85),
    planeCd: spawnCooldown(7.4, extra, 0.32, 3.2, 1),
  };
}

export type MapMark = {
  x: number;
  y: number;
  t: "you" | "gun" | "cloak" | "loot" | "jeep" | "tank" | "heli" | "plane";
};

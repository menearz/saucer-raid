import type { Alert } from "./types";

export type UpgradeId = "engines" | "tractor" | "armor" | "shields" | "weapons";

export type Progress = {
  level: number;
  salvage: number;
  runScore: number;
  upgrades: Record<UpgradeId, number>;
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

export function emptyProgress(): Progress {
  return {
    level: 1,
    salvage: 0,
    runScore: 0,
    upgrades: { engines: 0, tractor: 0, armor: 0, shields: 0, weapons: 0 },
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as Progress;
    const base = emptyProgress();
    return {
      level: Math.max(1, p.level || 1),
      salvage: Math.max(0, p.salvage || 0),
      runScore: Math.max(0, p.runScore || 0),
      upgrades: { ...base.upgrades, ...p.upgrades },
    };
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

export function upgradeCost(rank: number) {
  return 3 + rank * 3;
}

export function buyUpgrade(p: Progress, id: UpgradeId): Progress {
  const spec = UPGRADES.find((u) => u.id === id)!;
  const rank = p.upgrades[id] ?? 0;
  if (rank >= spec.max) return p;
  const cost = upgradeCost(rank);
  if (p.salvage < cost) return p;
  const next = {
    ...p,
    salvage: p.salvage - cost,
    upgrades: { ...p.upgrades, [id]: rank + 1 },
  };
  saveProgress(next);
  return next;
}

export function awardSalvage(p: Progress, score: number, survived: boolean): Progress {
  const gained = Math.max(2, Math.floor(score / 70) + (survived ? 6 : 2));
  const next = {
    ...p,
    salvage: p.salvage + gained,
    runScore: p.runScore + score,
  };
  saveProgress(next);
  return next;
}

export function raidSeconds(level: number) {
  return Math.max(70, 102 - (level - 1) * 4);
}

export function militaryWant(level: number, alert: Alert) {
  const extra = Math.max(0, level - 1);
  const jeep =
    (alert === "uneasy" ? 2 : alert === "alert" ? 2 : alert === "hostile" ? 3 : alert === "air-raid" ? 3 : level >= 2 ? 1 : 0) +
    Math.floor(extra / 2);
  let tank = alert === "alert" ? 1 : alert === "hostile" ? 2 : alert === "air-raid" ? 2 : 0;
  if (level >= 2 && alert === "uneasy") tank = Math.max(tank, 1);
  tank += Math.floor(extra / 2);
  let heli = alert === "hostile" ? 1 : alert === "air-raid" ? 2 : 0;
  if (level >= 3 && (alert === "alert" || alert === "hostile")) heli = Math.max(heli, 1);
  if (level >= 5) heli += 1;
  let plane = alert === "air-raid" ? 2 : 0;
  if (level >= 4 && alert === "hostile") plane = Math.max(plane, 1);
  if (level >= 6) plane += 1;
  return {
    jeep: Math.min(8, jeep),
    tank: Math.min(6, tank),
    heli: Math.min(5, heli),
    plane: Math.min(5, plane),
    jeepCd: Math.max(1.6, 3.2 - extra * 0.18),
    tankCd: Math.max(2.4, 5.5 - extra * 0.28),
    heliCd: Math.max(2.8, 6.2 - extra * 0.3),
    planeCd: Math.max(3.2, 7.4 - extra * 0.32),
  };
}

export type MapMark = {
  x: number;
  y: number;
  t: "you" | "gun" | "cloak" | "loot" | "jeep" | "tank" | "heli" | "plane" | "boss";
};

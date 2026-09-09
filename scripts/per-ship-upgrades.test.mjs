import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS = readFileSync(join(ROOT, "src/game/progress.ts"), "utf8");
const WORLD = readFileSync(join(ROOT, "src/game/world.ts"), "utf8");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const RAID = readFileSync(join(ROOT, "src/game/raid-content.ts"), "utf8");

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  buyUpgrade,
  emptyProgress,
  normalizeProgress,
  ranksFor,
  upgradeCost,
} = await import("../src/game/progress.ts");
const { saveCraftId } = await import("../src/game/crafts.ts");

test("source: upgradesByCraft + ranksFor + per-craft buyUpgrade", () => {
  assert.match(PROGRESS, /upgradesByCraft/);
  assert.match(PROGRESS, /export function ranksFor/);
  assert.match(PROGRESS, /buyUpgrade\(p: Progress, craftId: CraftId, id: UpgradeId\)/);
  assert.match(WORLD, /ranksFor\(prog, craft\.id\)/);
  assert.match(HUD, /buyUpgrade\(loadProgress\(\), craftId, id\)/);
  assert.match(HUD, /ranksFor\(p, craftId\)/);
  assert.match(RAID, /BOSS_SALVAGE = 3/);
});

test("economy nerf numbers stay in place", () => {
  assert.equal(upgradeCost(0), 8);
  assert.equal(upgradeCost(1), 16);
  assert.match(PROGRESS, /score \/ 180/);
});

test("legacy flat upgrades migrate onto current craft only", () => {
  store.clear();
  saveCraftId("spike");
  const migrated = normalizeProgress({
    level: 4,
    salvage: 40,
    runScore: 900,
    upgrades: { engines: 2, tractor: 1, armor: 0, shields: 1, weapons: 0 },
  });
  assert.equal(migrated.level, 4);
  assert.equal(migrated.salvage, 40);
  assert.equal(ranksFor(migrated, "spike").engines, 2);
  assert.equal(ranksFor(migrated, "spike").tractor, 1);
  assert.equal(ranksFor(migrated, "disc").engines, 0);
  assert.equal(ranksFor(migrated, "yoke").armor, 0);
  assert.equal(migrated.upgrades.engines, 2);
});

test("buyUpgrade is per-ship; swap craft shows zeros then restores", () => {
  store.clear();
  saveCraftId("disc");
  let p = emptyProgress();
  p.salvage = 200;
  p = buyUpgrade(p, "disc", "engines");
  p = buyUpgrade(p, "disc", "engines");
  assert.equal(ranksFor(p, "disc").engines, 2);
  assert.equal(ranksFor(p, "wake").engines, 0);

  saveCraftId("wake");
  p = normalizeProgress(p);
  assert.equal(ranksFor(p, "wake").engines, 0);
  assert.equal(p.upgrades.engines, 0);
  p.salvage = 200;
  p = buyUpgrade(p, "wake", "armor");
  assert.equal(ranksFor(p, "wake").armor, 1);
  assert.equal(ranksFor(p, "disc").engines, 2);

  saveCraftId("disc");
  p = normalizeProgress(p);
  assert.equal(ranksFor(p, "disc").engines, 2);
  assert.equal(p.upgrades.engines, 2);
  assert.equal(ranksFor(p, "wake").armor, 1);
});

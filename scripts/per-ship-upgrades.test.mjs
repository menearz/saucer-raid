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
  UPGRADES,
  awardSalvage,
  buyUpgrade,
  emptyProgress,
  normalizeProgress,
  ranksFor,
  upgradeCost,
} = await import("../src/game/progress.ts");
const { loadCraftId, saveCraftId } = await import("../src/game/crafts.ts");

test("source: upgradesByCraft + ranksFor + per-craft buyUpgrade", () => {
  assert.match(PROGRESS, /upgradesByCraft/);
  assert.match(PROGRESS, /export function ranksFor/);
  assert.match(PROGRESS, /buyUpgrade\(p: Progress, craftId: CraftId, id: UpgradeId\)/);
  assert.match(WORLD, /ranksFor\(prog, craft\.id\)/);
  assert.match(HUD, /buyUpgrade\(loadProgress\(\), craftId, id\)/);
  assert.match(HUD, /ranksFor\(p, craftId\)/);
  assert.match(RAID, /BOSS_SALVAGE = 3/);
});

test("one ship costs 2.5× the old salvage to max, and max ranks stay put", () => {
  assert.equal(upgradeCost(0), 20);
  assert.equal(upgradeCost(1), 40);
  assert.equal(upgradeCost(2), 60);
  assert.equal(upgradeCost(3), 80);
  assert.deepEqual(
    UPGRADES.map((u) => [u.id, u.max]),
    [
      ["engines", 4],
      ["tractor", 4],
      ["armor", 4],
      ["shields", 4],
      ["weapons", 3],
    ],
  );
  const oldCost = (rank) => 8 + rank * 8;
  let next = 0;
  let prev = 0;
  for (const u of UPGRADES) {
    for (let rank = 0; rank < u.max; rank++) {
      next += upgradeCost(rank);
      prev += oldCost(rank);
    }
  }
  assert.equal(prev, 368);
  assert.equal(next, 920);
  assert.equal(next / prev, 2.5);
  assert.match(PROGRESS, /score \/ 180/);
});

test("raid salvage payout stays on the current formula", () => {
  store.clear();
  assert.equal(awardSalvage(emptyProgress(), 1800, true).salvage, 16);
  assert.equal(awardSalvage(emptyProgress(), 1800, false).salvage, 12);
  assert.equal(awardSalvage(emptyProgress(), 0, false).salvage, 2);
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

test("lantern and anvil start empty and do not copy another ship's ranks", () => {
  store.clear();
  saveCraftId("disc");
  let p = emptyProgress();
  p.salvage = 400;
  p = buyUpgrade(p, "disc", "engines");
  p = buyUpgrade(p, "disc", "engines");
  const empty = { engines: 0, tractor: 0, armor: 0, shields: 0, weapons: 0 };
  assert.deepEqual(ranksFor(p, "lantern"), empty);
  assert.deepEqual(ranksFor(p, "anvil"), empty);
  assert.equal(ranksFor(p, "disc").engines, 2);

  saveCraftId("lantern");
  p = normalizeProgress(p);
  assert.equal(p.upgrades.engines, 0);
  p.salvage = 400;
  p = buyUpgrade(p, "lantern", "weapons");
  assert.equal(ranksFor(p, "lantern").weapons, 1);
  assert.deepEqual(ranksFor(p, "anvil"), empty);
  assert.equal(ranksFor(p, "disc").engines, 2);

  saveCraftId("anvil");
  p = normalizeProgress(p);
  assert.equal(ranksFor(p, "anvil").weapons, 0);
  assert.equal(p.upgrades.weapons, 0);
  assert.equal(ranksFor(p, "lantern").weapons, 1);
});

test("lantern and anvil save; retired scout, barge, and phantom stay disc", () => {
  store.clear();
  saveCraftId("lantern");
  assert.equal(loadCraftId(), "lantern");
  saveCraftId("anvil");
  assert.equal(loadCraftId(), "anvil");
  for (const retired of ["scout", "barge", "phantom"]) {
    store.set("saucer-raid-craft", retired);
    assert.equal(loadCraftId(), "disc");
  }
});

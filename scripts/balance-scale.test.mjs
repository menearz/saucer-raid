import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { militaryWant, raidSeconds } from "../src/game/progress.ts";
import { MILITARY_BASE_HP, militaryShotDamage, militaryUnitHp } from "../src/game/raid-content.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIM = readFileSync(join(ROOT, "src/game/sim.ts"), "utf8");

const ALERTS = ["calm", "uneasy", "alert", "hostile", "air-raid"];
const KINDS = ["jeep", "tank", "heli", "plane"];

/** Military pressure before this change. Early levels must still match it. */
function legacyMilitaryWant(level, alert) {
  const extra = Math.max(0, level - 1);
  const jeep =
    (alert === "uneasy"
      ? 2
      : alert === "alert"
        ? 2
        : alert === "hostile"
          ? 3
          : alert === "air-raid"
            ? 3
            : level >= 2
              ? 1
              : 0) + Math.floor(extra / 2);
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

test("opening levels keep the old military counts and cooldowns", () => {
  for (const alert of ALERTS) {
    for (let level = 1; level <= 7; level++) {
      const next = militaryWant(level, alert);
      const prev = legacyMilitaryWant(level, alert);
      for (const key of [
        "jeep",
        "tank",
        "heli",
        "plane",
        "jeepCd",
        "tankCd",
        "heliCd",
        "planeCd",
      ]) {
        assert.ok(
          Math.abs(next[key] - prev[key]) < 1e-9,
          `${alert} level ${level} ${key}: ${next[key]} vs legacy ${prev[key]}`,
        );
      }
    }
  }
});

test("military counts and spawn pace keep rising past the old plateau", () => {
  const plateau = legacyMilitaryWant(20, "hostile");
  assert.equal(plateau.jeep, 8);
  assert.equal(plateau.tank, 6);
  assert.equal(plateau.heli, 2);
  assert.equal(plateau.plane, 2);
  assert.equal(plateau.jeepCd, 1.6);
  assert.equal(plateau.tankCd, 2.4);
  assert.equal(plateau.heliCd, 2.8);
  assert.equal(plateau.planeCd, 3.2);

  for (const alert of ["hostile", "air-raid"]) {
    const mid = militaryWant(16, alert);
    const late = militaryWant(22, alert);
    const later = militaryWant(28, alert);
    const stuck = legacyMilitaryWant(20, alert);
    for (const key of ["jeep", "tank", "heli", "plane"]) {
      assert.ok(
        mid[key] > stuck[key],
        `${alert} level 16 ${key} ${mid[key]} should beat plateau ${stuck[key]}`,
      );
      assert.ok(
        later[key] > late[key] && late[key] > mid[key],
        `${alert} ${key} should still climb after level 16`,
      );
    }
    for (const key of ["jeepCd", "tankCd", "heliCd", "planeCd"]) {
      assert.ok(
        mid[key] < stuck[key],
        `${alert} level 16 ${key} should be faster than the old floor`,
      );
      assert.ok(
        later[key] < late[key] && late[key] < mid[key],
        `${alert} ${key} should keep falling`,
      );
      assert.ok(later[key] > 0.4, `${alert} ${key} must stay a real cooldown`);
    }
  }
});

test("ground and air durability and incoming damage scale with level", () => {
  for (const kind of KINDS) {
    assert.equal(militaryUnitHp(kind, 1), MILITARY_BASE_HP[kind]);
    let prev = militaryUnitHp(kind, 1);
    for (let level = 2; level <= 30; level++) {
      const hp = militaryUnitHp(kind, level);
      assert.ok(hp > prev, `${kind} hp should rise at level ${level}`);
      prev = hp;
    }
  }
  assert.equal(militaryUnitHp("jeep", 11), 140);
  assert.equal(militaryUnitHp("tank", 11), 320);

  assert.equal(militaryShotDamage("jeep", 1), 1);
  assert.equal(militaryShotDamage("tank", 1), 2);
  assert.equal(militaryShotDamage("heli", 1), 1);
  assert.equal(militaryShotDamage("plane", 1), 1);
  assert.equal(militaryShotDamage("rival", 1), 1);
  assert.equal(militaryShotDamage("jeep", 6), 1);
  assert.equal(militaryShotDamage("tank", 7), 3);
  for (const kind of [...KINDS, "rival"]) {
    for (let level = 1; level <= 36; level++) {
      assert.equal(militaryShotDamage(kind, level + 6), militaryShotDamage(kind, level) + 1);
      assert.ok(militaryShotDamage(kind, level + 1) >= militaryShotDamage(kind, level));
    }
  }

  assert.match(SIM, /militaryUnitHp\(kind, level\)/);
  assert.match(SIM, /militaryShotDamage\("rival"/);
  assert.match(SIM, /militaryShotDamage\(a\.kind === "tank" \? "tank" : "jeep"/);
  assert.match(SIM, /militaryShotDamage\("heli"/);
  assert.match(SIM, /militaryShotDamage\("plane"/);
  assert.doesNotMatch(SIM, /hp:\s*70/);
  assert.doesNotMatch(SIM, /kind === "tank" \? 2 : 1/);
});

test("raid clock still floors at 70 and is not the new difficulty lever", () => {
  assert.equal(raidSeconds(1), 102);
  assert.equal(raidSeconds(8), 74);
  assert.equal(raidSeconds(9), 70);
  assert.equal(raidSeconds(30), 70);
});

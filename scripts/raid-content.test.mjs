import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { HUMAN_LINES, HUMAN_SHOUT_MAX, canHumanShout, COLS, ROWS } from "../src/game/types.ts";
import {
  BOSS_HELLO,
  BOSS_REPLY,
  BOSS_SALVAGE,
  BOSS_SCORE_BONUS,
  BOSS_STING,
  buildTerrain,
  isBossSector,
  makeBossActor,
  mapStyle,
  sectorBuildings,
  sectorSeed,
} from "../src/game/raid-content.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORLD = readFileSync(join(ROOT, "src/game/world.ts"), "utf8");
const SIM = readFileSync(join(ROOT, "src/game/sim.ts"), "utf8");
const LOOP = readFileSync(join(ROOT, "src/game/loop.ts"), "utf8");

function tileMix(t) {
  const c = [0, 0, 0, 0];
  for (const v of t) c[v] += 1;
  return c;
}

function mixDelta(a, b) {
  const ma = tileMix(a);
  const mb = tileMix(b);
  return ma.reduce((s, n, i) => s + Math.abs(n - mb[i]), 0);
}

test("HUMAN_LINES includes the exact sentinel line and a big short pool", () => {
  const uniq = new Set(HUMAN_LINES);
  assert.ok(HUMAN_LINES.includes("AHH NOT AGAIN"), "pool must include exact AHH NOT AGAIN");
  assert.ok(HUMAN_LINES.includes("not again!"), "pool must include exact not again!");
  assert.ok(HUMAN_LINES.length >= 36, `expected 36+ lines, got ${HUMAN_LINES.length}`);
  assert.equal(uniq.size, HUMAN_LINES.length, "lines must be unique");
  for (const line of HUMAN_LINES) {
    assert.ok(line.length > 0 && line.length <= 28, `"${line}" is too long for the shout UI`);
  }
});

test("abduct shouts can fire more than once per person", () => {
  assert.ok(HUMAN_SHOUT_MAX >= 2);
  assert.equal(canHumanShout(undefined), true);
  assert.equal(canHumanShout(0), true);
  assert.equal(canHumanShout(1), true);
  assert.equal(canHumanShout(HUMAN_SHOUT_MAX), false);
});

test("sim fires a second abduct shout mid-lift, not only the first grab", () => {
  assert.match(SIM, /canHumanShout|HUMAN_SHOUT_MAX/);
  assert.match(SIM, /shoutHuman/);
  assert.match(
    SIM,
    /lift\s*>\s*.*abductTime|abductTime\s*\*\s*0\.\d+/,
    "second shout should fire partway through the lift",
  );
});

test("boss cadence is every 3 sectors starting at 3", () => {
  assert.equal(isBossSector(1), false);
  assert.equal(isBossSector(2), false);
  assert.equal(isBossSector(3), true);
  assert.equal(isBossSector(4), false);
  assert.equal(isBossSector(5), false);
  assert.equal(isBossSector(6), true);
  assert.equal(isBossSector(9), true);
});

const OWN_HULLS = /^(craft-(spike|yoke|ember|keel|wake)|saucer-1)$/;

test("rival boss uses an existing original hull sprite, not military or a knockoff", () => {
  assert.equal(BOSS_HELLO, "Hey buddy, what are you doing here?");
  assert.equal(BOSS_REPLY, "I'm not your buddy, pal.");
  assert.equal(BOSS_STING, "Respect my authority!");
  const a = makeBossActor(3, 100, 200, 7);
  const b = makeBossActor(6, 100, 200, 8);
  const c = makeBossActor(9, 100, 200, 9);
  for (const boss of [a, b, c]) {
    assert.equal(boss.kind, "rival");
    assert.equal(boss.boss, true);
    assert.match(boss.sprite, OWN_HULLS);
    assert.ok(!["tank", "heli", "plane", "jeep"].includes(boss.kind));
    assert.ok(boss.hp > 180);
    assert.ok(boss.r > 30);
  }
  assert.ok(BOSS_SCORE_BONUS >= 1200);
  assert.ok(BOSS_SALVAGE >= 6);
});

test("hangar keeps the six original hull names", () => {
  const crafts = readFileSync(join(ROOT, "src/game/crafts.ts"), "utf8");
  for (const name of [
    "Classic Disc",
    "Yoke Runner",
    "Chrome Spike",
    "Long Ember",
    "Pale Keel",
    "Twin Wake",
  ]) {
    assert.match(crafts, new RegExp(`name:\\s*"${name}"`));
  }
  assert.doesNotMatch(crafts, /Falcon|Destroyer|Enterprise|Normandy|Viper|Millennium/i);
});

test("world seeds maps and the sim plays the exact boss beat", () => {
  assert.match(WORLD, /sectorSeed|buildTerrain/);
  assert.match(WORLD, /isBossSector/);
  assert.match(WORLD, /makeBossActor|boss:\s*true/);
  assert.match(SIM, /BOSS_HELLO/);
  assert.match(SIM, /BOSS_REPLY/);
  assert.match(SIM, /BOSS_STING/);
  assert.match(SIM, /BOSS_SCORE_BONUS|BOSS_SALVAGE/);
  assert.match(SIM, /kind === "rival"/);
});

test("same sector seed is stable; consecutive sectors use different styles", () => {
  assert.equal(sectorSeed(4), sectorSeed(4));
  assert.notEqual(sectorSeed(4), sectorSeed(5));
  assert.notEqual(mapStyle(1), mapStyle(2));
  assert.notEqual(mapStyle(2), mapStyle(3));
});

test("consecutive sectors paint different terrain mixes", () => {
  const a = buildTerrain(1);
  const b = buildTerrain(2);
  const again = buildTerrain(1);
  assert.equal(a.length, COLS * ROWS);
  assert.deepEqual(Array.from(a), Array.from(again), "same sector must be stable");
  assert.ok(mixDelta(a, b) > COLS * ROWS * 0.12, "next sector should feel like a new place");
});

test("two consecutive sectors move building clusters", () => {
  const a = sectorBuildings(1)
    .map((b) => b.join(":"))
    .join("|");
  const b = sectorBuildings(2)
    .map((x) => x.join(":"))
    .join("|");
  assert.notEqual(a, b);
  assert.deepEqual(sectorBuildings(1), sectorBuildings(1));
});

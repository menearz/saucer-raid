import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BOSS_COMBAT, BOSS_SCORE_BONUS } from "../src/game/raid-content.ts";
import { EN, ES } from "../src/game/i18n.ts";
import { QUOTA_POINTS, quotaPoints } from "../src/game/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIM = readFileSync(join(ROOT, "src/game/sim.ts"), "utf8");
const LOOP = readFileSync(join(ROOT, "src/game/loop.ts"), "utf8");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const TYPES = readFileSync(join(ROOT, "src/game/types.ts"), "utf8");
const STORE = readFileSync(join(ROOT, "src/game/store.ts"), "utf8");

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  emptyProgress,
  formatClock,
  normalizeProgress,
  noteBestClear,
  parSec,
  raidGoal,
  timeBonusFor,
  TIME_BONUS_PER_SEC,
  loadProgress,
} = await import("../src/game/progress.ts");
const { createWorld } = await import("../src/game/world.ts");
const { startRaid, step } = await import("../src/game/sim.ts");

const idle = {
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fire: false,
  beam: false,
  pause: false,
  start: false,
};

function boot(level = 1) {
  store.clear();
  store.set(
    "saucer-raid-progress",
    JSON.stringify({
      level,
      salvage: 0,
      runScore: 0,
      upgrades: { engines: 0, tractor: 0, armor: 0, shields: 0, weapons: 0 },
      upgradesByCraft: {},
      bestTimes: {},
    }),
  );
  const w = createWorld();
  startRaid(w, "start");
  return w;
}

function sliceBetween(source, startMark, endMark) {
  const start = source.indexOf(startMark);
  const end = source.indexOf(endMark, start + startMark.length);
  assert.ok(start >= 0 && end > start, `missing slice ${startMark} … ${endMark}`);
  return source.slice(start, end);
}

test("goal, par, and time bonus match the locked picks", () => {
  assert.equal(TIME_BONUS_PER_SEC, 5);
  assert.equal(raidGoal(1), 400);
  assert.equal(raidGoal(2), 520);
  assert.equal(raidGoal(10), 400 + 9 * 120);
  assert.equal(parSec(1), 92);
  assert.equal(parSec(5), 100);
  assert.equal(timeBonusFor(1, 0), 92 * 5);
  assert.equal(timeBonusFor(1, 90), 10);
  assert.equal(timeBonusFor(1, 92), 0);
  assert.equal(timeBonusFor(1, 140), 0);
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(600), "10:00");
});

test("abduct ladder is chicken < pig < sheep < cow < human, military is outside", () => {
  assert.equal(quotaPoints("chicken"), 25);
  assert.equal(quotaPoints("pig"), 50);
  assert.equal(quotaPoints("sheep"), 75);
  assert.equal(quotaPoints("cow"), 100);
  assert.equal(quotaPoints("farmer"), 200);
  assert.equal(quotaPoints("civilian"), 200);
  assert.ok(QUOTA_POINTS.chicken < QUOTA_POINTS.pig);
  assert.ok(QUOTA_POINTS.pig < QUOTA_POINTS.sheep);
  assert.ok(QUOTA_POINTS.sheep < QUOTA_POINTS.cow);
  assert.ok(QUOTA_POINTS.cow < QUOTA_POINTS.farmer);
  for (const kind of ["jeep", "tank", "heli", "plane", "tractor", "pickup", "sedan", "barn", "rival"]) {
    assert.equal(quotaPoints(kind), 0, kind);
  }
});

test("best clear times keep the faster run and drop junk", () => {
  store.clear();
  let p = emptyProgress();
  p = noteBestClear(p, 2, 40);
  assert.equal(p.bestTimes["2"], 40);
  p = noteBestClear(p, 2, 55);
  assert.equal(p.bestTimes["2"], 40);
  p = noteBestClear(p, 2, 12.5);
  assert.equal(p.bestTimes["2"], 12.5);
  const loaded = normalizeProgress({
    level: 3,
    bestTimes: { 3: "18.5", 0: 4, nope: 9, 4: -2, 5: 1 },
  });
  assert.equal(loaded.bestTimes["3"], 18.5);
  assert.equal(loaded.bestTimes["5"], 1);
  assert.equal(loaded.bestTimes["0"], undefined);
  assert.equal(loaded.bestTimes["4"], undefined);
  assert.equal(loaded.bestTimes.nope, undefined);
});

test("countdown cannot fail the raid; quota clear and destroyed still do", () => {
  assert.doesNotMatch(SIM, /timeLeft/);
  assert.doesNotMatch(LOOP, /timeLeft/);
  assert.doesNotMatch(STORE, /timeLeft/);
  assert.doesNotMatch(TYPES, /timeLeft/);
  assert.doesNotMatch(HUD, /timeLeft/);
  assert.doesNotMatch(SIM, /reason = "time"/);
  assert.match(SIM, /reason = "quota"/);
  assert.match(SIM, /reason = "destroyed"/);
  assert.match(SIM, /if \(!cutscene\)[\s\S]*elapsed \+= dt/);
  assert.match(LOOP, /world\.state\.score = Math\.max\(world\.state\.score, world\.state\.goal\)/);

  const destroy = SIM.slice(SIM.indexOf("function stDestroy"), SIM.indexOf("function nearestTarget"));
  assert.doesNotMatch(destroy, /addScore/);
  const abduct = SIM.slice(SIM.indexOf("function stAbduct"), SIM.indexOf("function stDestroy"));
  assert.match(abduct, /quotaPoints\(a\.kind\)/);

  const w = boot(1);
  w.state.hp = 500;
  w.state.maxHp = 500;
  w.state.shield = 500;
  w.state.shieldMax = 500;
  w.saucer.hp = 500;
  step(w, idle, 130);
  assert.equal(w.state.phase, "playing");
  assert.equal(w.state.reason, "");
  assert.ok(w.state.elapsed >= 130);
});

test("only the abduct ladder feeds the quota; blasts and military do not", () => {
  const w = boot(1);
  const chicken = w.actors.find((a) => a.kind === "chicken" && !a.dead);
  assert.ok(chicken);
  w.saucer.x = chicken.x;
  w.saucer.y = chicken.y;
  chicken.lift = chicken.abductTime;
  step(w, { ...idle, beam: true }, 0.05);
  assert.equal(w.state.score, 25);
  assert.equal(chicken.dead, true);

  const jeep = {
    ...chicken,
    id: 99001,
    kind: "jeep",
    dead: false,
    score: 480,
    abductable: true,
    abductTime: 0.2,
    lift: 5,
    x: w.saucer.x,
    y: w.saucer.y,
  };
  w.actors.push(jeep);
  step(w, { ...idle, beam: true }, 0.05);
  assert.equal(jeep.dead, true);
  assert.equal(w.state.score, 25);

  const barn = w.actors.find((a) => a.kind === "barn" && !a.dead);
  assert.ok(barn);
  barn.hp = 1;
  for (const a of w.actors) if (a !== barn) a.destructible = false;
  w.lasers.push({
    id: 88001,
    kind: "laser",
    x: barn.x,
    y: barn.y,
    vx: 0,
    vy: 0,
    r: 8,
    w: 22,
    h: 10,
    hp: 1,
    maxHp: 1,
    facing: 0,
    lift: 0,
    abductTime: 0,
    abductable: false,
    destructible: false,
    solid: false,
    score: 900,
    heat: 0,
    sprite: "laser",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 2,
    wanderA: 0,
    fireCd: 0,
    z: barn.y,
  });
  step(w, idle, 0.05);
  assert.equal(barn.dead, true);
  assert.equal(w.state.score, 25);
  assert.equal(w.state.phase, "playing");
});

test("hitting the goal clears for quota, pays time bonus, and Next bumps level", () => {
  const w = boot(1);
  w.state.elapsed = 10;
  w.state.score = w.state.goal;
  step(w, idle, 0.05);
  assert.equal(w.state.phase, "upgrade");
  assert.equal(w.state.reason, "quota");
  assert.equal(loadProgress().level, 1);
  assert.equal(w.state.timeBonus, timeBonusFor(1, w.state.elapsed));
  assert.ok(w.state.timeBonus > 0);
  assert.equal(w.state.score, raidGoal(1) + w.state.timeBonus);
  assert.ok(Math.abs(loadProgress().bestTimes["1"] - w.state.elapsed) < 1e-9);
  assert.ok(loadProgress().salvage > 0);

  startRaid(w, "next");
  assert.equal(loadProgress().level, 2);
  assert.equal(w.state.level, 2);
  assert.equal(w.state.goal, raidGoal(2));
  assert.equal(w.state.elapsed, 0);
  assert.equal(w.state.score, 0);
  assert.equal(w.state.phase, "playing");
  assert.equal(w.state.reason, "");

  startRaid(w, "retry");
  assert.equal(loadProgress().level, 2);
});

test("over par clears with no time penalty", () => {
  const w = boot(1);
  w.state.elapsed = 400;
  w.state.score = w.state.goal;
  step(w, idle, 0.05);
  assert.equal(w.state.reason, "quota");
  assert.equal(w.state.timeBonus, 0);
  assert.equal(w.state.score, raidGoal(1));
});

test("destroyed fails without a level bump or a best time", () => {
  const w = boot(4);
  w.state.hp = 1;
  w.state.shield = 0;
  w.state.shieldMax = 0;
  w.saucer.hp = 1;
  w.state.score = 80;
  w.bullets.push({
    id: 42,
    kind: "bullet",
    x: w.saucer.x,
    y: w.saucer.y,
    vx: 0,
    vy: 0,
    r: 6,
    w: 10,
    h: 10,
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
    sprite: "bullet",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 5,
    wanderA: 0,
    fireCd: 0,
    z: 0,
    dmg: 1,
  });
  step(w, idle, 0.05);
  assert.equal(w.state.phase, "upgrade");
  assert.equal(w.state.reason, "destroyed");
  assert.equal(w.state.timeBonus, 0);
  assert.equal(loadProgress().level, 4);
  assert.equal(loadProgress().bestTimes["4"], undefined);
});

test("boss talk pauses the elapsed clock and the boss bonus counts toward quota", () => {
  const w = boot(3);
  assert.ok(w.bossTalk < BOSS_COMBAT);
  step(w, idle, 1);
  step(w, idle, 1);
  assert.equal(w.state.elapsed, 0);
  assert.equal(w.state.phase, "playing");

  const boss = w.actors.find((a) => a.boss && !a.dead);
  assert.ok(boss);
  w.bossTalk = BOSS_COMBAT;
  w.state.goal = 999999;
  boss.hp = 1;
  boss.shield = 0;
  for (const a of w.actors) if (a !== boss) a.destructible = false;
  w.lasers.push({
    id: 88002,
    kind: "laser",
    x: boss.x,
    y: boss.y,
    vx: 0,
    vy: 0,
    r: 8,
    w: 22,
    h: 10,
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
    sprite: "laser",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 2,
    wanderA: 0,
    fireCd: 0,
    z: boss.y,
  });
  step(w, idle, 0.05);
  assert.equal(boss.dead, true);
  assert.equal(w.state.score, BOSS_SCORE_BONUS);
  assert.equal(w.state.phase, "playing");
});

test("playing HUD shows quota text and elapsed, clear toast shows time bonus", () => {
  assert.equal(EN.quotaClear, "Quota filled");
  assert.equal(ES.quotaClear, "Cupo lleno");
  assert.equal(EN.clearTime, "Clear time {t}");
  assert.equal(ES.clearTime, "Tiempo {t}");
  assert.equal(EN.timeBonus, "Time bonus +{n}");
  assert.equal(ES.timeBonus, "Bonus de tiempo +{n}");
  assert.equal(EN.goalLabel, "{score} / {goal}");
  assert.equal(ES.goalLabel, "{score} / {goal}");

  const hud = sliceBetween(HUD, "function HudOverlay(", "function MiniMap(");
  const score = hud.indexOf("{hud.score}");
  const sector = hud.indexOf('t("sector"');
  const goal = hud.indexOf('t("goalLabel"');
  assert.ok(score >= 0 && sector > score && goal > sector);
  assert.match(hud, /style=\{metaShadow\}\s*>\s*\{hud\.score\}/);
  assert.match(hud, /style=\{metaShadow\}\s*>\s*\{m\}:\{s\}/);
  assert.match(hud, /hud\.elapsed/);
  assert.match(hud, /landscape:pr-\[6\.25rem\]/);
  assert.match(hud, /h-1\.5 w-36 shrink-0 overflow-hidden rounded-full bg-black\/40/);
  assert.doesNotMatch(hud, /bg-bg\/75/);
  assert.doesNotMatch(hud, /backdrop-blur/);

  const bay = sliceBetween(HUD, "function UpgradeBay", "function TouchLayer");
  assert.match(bay, /hud\.reason === "quota"/);
  assert.match(bay, /t\("quotaClear"\)/);
  assert.match(bay, /t\("clearTime"/);
  assert.match(bay, /t\("timeBonus"/);
  assert.match(bay, /t\("saucerDown"\)/);
  assert.doesNotMatch(bay, /timeLeft|time's up|times up/i);
});

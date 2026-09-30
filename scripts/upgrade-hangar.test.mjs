import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const LOOP = readFileSync(join(ROOT, "src/game/loop.ts"), "utf8");
const SIM = readFileSync(join(ROOT, "src/game/sim.ts"), "utf8");

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} is missing`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  assert.fail(`${name} body did not close`);
}

function sliceBetween(source, startMark, endMark) {
  const start = source.indexOf(startMark);
  const end = source.indexOf(endMark, start + startMark.length);
  assert.ok(start >= 0 && end > start, `missing slice ${startMark} … ${endMark}`);
  return source.slice(start, end);
}

test("returnToHangar leaves a cleared sector's upgrade bay on the title hangar", () => {
  const returnToHangar = new Function("w", functionBody(SIM, "returnToHangar"));
  const cleared = {
    state: { phase: "upgrade", reason: "time", level: 4, score: 120 },
    beamOn: true,
  };
  returnToHangar(cleared);
  // The loop publishes world.state.phase. A HUD-only write used to snap back to upgrade.
  const shown = cleared.state.phase;
  assert.equal(shown, "title");
  assert.equal(cleared.state.reason, "time");
  assert.equal(cleared.state.level, 4);
  assert.equal(cleared.state.score, 120);
  assert.equal(cleared.beamOn, false);

  const playing = { state: { phase: "playing" }, beamOn: true };
  returnToHangar(playing);
  assert.equal(playing.state.phase, "playing");
  assert.equal(playing.beamOn, true);
});

test("upgrade bay Hangar is wired through the world phase, not only the HUD store", () => {
  const bay = sliceBetween(HUD, "function UpgradeBay", "function TouchLayer");
  assert.match(bay, /<Ghost onClick=\{onHangar\}>\{t\("hangar"\)\}<\/Ghost>/);

  const upgradeScreen = sliceBetween(HUD, 'hud.phase === "upgrade"', 'hud.phase === "title"');
  assert.match(upgradeScreen, /onHangar=\{toTitle\}/);

  const toTitle = sliceBetween(HUD, "const toTitle", "const toggleMute");
  assert.match(toTitle, /handle\.toHangar\(\)/);

  const handleType = sliceBetween(LOOP, "export type GameHandle", "export function runGame");
  assert.match(handleType, /toHangar:\s*\(\)\s*=>\s*void/);

  const method = sliceBetween(LOOP, "toHangar()", "pause()");
  assert.match(method, /returnToHangar\(world\)/);
  assert.match(method, /flushHud\(\)/);
  const ret = method.indexOf("returnToHangar(world)");
  const flush = method.indexOf("flushHud()");
  assert.ok(ret >= 0 && flush > ret, "world phase updates before the hud flush");
  assert.match(LOOP, /phase:\s*st\.phase/);
});

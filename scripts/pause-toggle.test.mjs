import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOOP = readFileSync(join(ROOT, "src/game/loop.ts"), "utf8");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const TYPES = readFileSync(join(ROOT, "src/game/types.ts"), "utf8");

function shouldResetInput(lastPhase, phase) {
  const match = LOOP.match(
    /if\s*\(\s*lastPhase === "playing"\s*&&\s*world\.state\.phase !== "playing"([^)]*)\)\s*\{\s*input\.reset\(\);/,
  );
  assert.ok(match, "expected leave-playing input.reset() guard in loop.ts");
  const cond = `lastPhase === "playing" && world.state.phase !== "playing"${match[1]}`;
  const world = { state: { phase } };
  return Boolean(eval(cond));
}

test("input resets on raid end (upgrade/title), not on pause", () => {
  assert.equal(shouldResetInput("playing", "paused"), false);
  assert.equal(shouldResetInput("playing", "upgrade"), true);
  assert.equal(shouldResetInput("playing", "title"), true);
  assert.equal(shouldResetInput("paused", "playing"), false);
});

test("unused Raid over overlay is gone; upgrade bay still ends the raid", () => {
  assert.doesNotMatch(HUD, /Raid over/);
  assert.doesNotMatch(HUD, /hud\.phase === "over"/);
  assert.doesNotMatch(TYPES, /Phase = .*"over"/);
  assert.match(HUD, /hud\.phase === "upgrade"/);
  assert.match(HUD, /<UpgradeBay/);
});

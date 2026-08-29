import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOOP = readFileSync(join(ROOT, "src/game/loop.ts"), "utf8");

function shouldResetInput(lastPhase, phase) {
  const match = LOOP.match(
    /if\s*\(\s*lastPhase === "playing"\s*&&\s*world\.state\.phase !== "playing"([^)]*)\)\s*\{\s*input\.reset\(\);/,
  );
  assert.ok(match, "expected leave-playing input.reset() guard in loop.ts");
  const cond = `lastPhase === "playing" && world.state.phase !== "playing"${match[1]}`;
  const world = { state: { phase } };
  return Boolean(eval(cond));
}

test("input resets on raid end (upgrade/over/title), not on pause", () => {
  assert.equal(shouldResetInput("playing", "paused"), false);
  assert.equal(shouldResetInput("playing", "upgrade"), true);
  assert.equal(shouldResetInput("playing", "over"), true);
  assert.equal(shouldResetInput("playing", "title"), true);
  assert.equal(shouldResetInput("paused", "playing"), false);
});

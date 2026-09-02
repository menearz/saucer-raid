import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");

test("hangar pitch is the spec copy, above Launch, no extra splash", () => {
  assert.match(HUD, /You are the saucer\./);
  assert.match(
    HUD,
    /Fly the farm\. Beam up cows and people\. Blast what shoots back\./,
  );
  assert.match(
    HUD,
    /Stick or WASD to fly\. Hold Beam to grab\. Hold Fire to shoot\. Beat the clock\./,
  );
  assert.doesNotMatch(HUD, /Pick a hull\. Survive the clock/);
  const pitch = HUD.indexOf("<HangarPitch");
  const launch = HUD.indexOf("<LaunchButton");
  assert.ok(pitch >= 0 && launch > pitch, "HangarPitch must sit above Launch");
  assert.doesNotMatch(HUD, /function Splash/);
  assert.match(HUD, /title-bg\.png/);
});

test("hangar title is Saucer Raid on github.io and Alien Attack Saucer on wrap", () => {
  assert.match(HUD, /SITE_HANGAR_TITLE = "Saucer Raid"/);
  assert.match(HUD, /WRAP_HANGAR_TITLE = "Alien Attack Saucer"/);
  assert.match(HUD, /VITE_WRAP === "true"/);
  assert.match(HUD, /Alien Attack/);
  assert.match(HUD, /Saucer\s*\n\s*<br \/>\s*\n\s*Raid/);
});

test("hangar primary button is Launch, not Play or Launch sector", () => {
  assert.match(HUD, /\{ready \? "Launch" : "Loading the valley…"\}/);
  assert.doesNotMatch(HUD, /Launch sector/);
  assert.doesNotMatch(HUD, />Play</);
  assert.match(HUD, /<HangarPreview/);
});

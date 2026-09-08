import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { EN, ES } from "../src/game/i18n.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");

test("hangar pitch is the spec copy, above Launch, no extra splash", () => {
  assert.equal(EN.pitchLead, "You are the saucer.");
  assert.equal(EN.pitchFly, "Fly the farm. Beam up cows and people. Blast what shoots back.");
  assert.equal(
    EN.pitchControls,
    "Stick or WASD to fly. Hold Beam to grab. Hold Fire to shoot. Beat the clock.",
  );
  assert.equal(ES.pitchLead, "Tú eres el platillo.");
  assert.equal(
    ES.pitchFly,
    "Vuela la granja. Absorbe vacas y gente. Dispara a lo que te dispara.",
  );
  assert.equal(
    ES.pitchControls,
    "Stick o WASD para volar. Mantén Beam para agarrar. Mantén Fire para disparar. Gana al reloj.",
  );
  assert.match(HUD, /t\("pitchLead"\)/);
  assert.match(HUD, /t\("pitchFly"\)/);
  assert.match(HUD, /t\("pitchControls"\)/);
  assert.doesNotMatch(HUD, /Pick a hull\. Survive the clock/);
  const pitch = HUD.indexOf("<HangarPitch");
  const launch = HUD.indexOf("<LaunchButton");
  assert.ok(pitch >= 0 && launch > pitch, "HangarPitch must sit above Launch");
  assert.doesNotMatch(HUD, /function Splash/);
  assert.match(HUD, /title-bg\.png/);
});

test("hangar title is Saucer Raid on github.io and Alien Attack Saucer on wrap", () => {
  assert.equal(EN.siteTitle, "Saucer Raid");
  assert.equal(EN.wrapTitle, "Alien Attack Saucer");
  assert.equal(ES.siteTitle, "Incursión del Platillo");
  assert.equal(ES.wrapTitle, "Ataque Alienígena");
  assert.match(HUD, /VITE_WRAP === "true"/);
  assert.match(HUD, /t\("wrapTitle"\)/);
  assert.match(HUD, /t\("siteTitle"\)/);
  assert.match(HUD, /siteTitleL1/);
  assert.match(HUD, /wrapTitleL1/);
});

test("hangar primary button is Launch, not Play or Launch sector", () => {
  assert.equal(EN.launch, "Launch");
  assert.equal(ES.launch, "Lanzar");
  assert.match(HUD, /ready \? t\("launch"\) : t\("loading"\)/);
  assert.doesNotMatch(HUD, /Launch sector/);
  assert.doesNotMatch(HUD, />Play</);
  assert.match(HUD, /<HangarPreview/);
});

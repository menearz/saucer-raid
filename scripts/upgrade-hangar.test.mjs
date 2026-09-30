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

test("pause Hangar leaves an in-progress raid on the title hangar", () => {
  const returnToHangar = new Function("w", functionBody(SIM, "returnToHangar"));
  const body = functionBody(SIM, "returnToHangar");
  assert.doesNotMatch(body, /resetProgress|saveProgress|craftId/);

  const paused = {
    state: { phase: "paused", reason: "", level: 7, score: 40 },
    beamOn: true,
  };
  // A click that only writes the HUD store is overwritten on the next flush,
  // which copies world.state.phase back. The world phase has to become title.
  const hudOnly = { phase: "title" };
  const flushed = paused.state.phase;
  assert.notEqual(hudOnly.phase, flushed);

  returnToHangar(paused);
  const shown = paused.state.phase;
  assert.equal(shown, "title");
  assert.equal(paused.state.level, 7);
  assert.equal(paused.state.score, 40);
  assert.equal(paused.beamOn, false);
});

test("pause Hangar is wired through the world phase, not only the HUD store", () => {
  const pause = sliceBetween(HUD, 'hud.phase === "paused"', 'hud.phase === "upgrade"');
  const resume = pause.indexOf('{t("resume")}');
  const restart = pause.indexOf('{t("restartRaid")}');
  const hangar = pause.indexOf('{t("hangar")}');
  const lang = pause.indexOf("<LangSwitch");
  assert.ok(
    resume >= 0 && restart > resume && hangar > restart && lang > hangar,
    "order is Resume → Restart Raid → Hangar → Lang",
  );
  assert.match(pause, /<Ghost onClick=\{toTitle\}>\{t\("hangar"\)\}<\/Ghost>/);
  assert.doesNotMatch(pause, /useHud\.setState/);
  assert.doesNotMatch(pause, /phase:\s*"title"/);

  const toTitle = sliceBetween(HUD, "const toTitle", "const toggleMute");
  assert.match(toTitle, /handle\.toHangar\(\)/);

  const playingHud = sliceBetween(HUD, "function HudOverlay(", "function MiniMap(");
  assert.doesNotMatch(playingHud, /t\("hangar"\)/);
});

test("raid HUD drops the full-width plate and keeps overlay chrome", () => {
  const hud = sliceBetween(HUD, "function HudOverlay(", "function MiniMap(");
  assert.match(hud, /pointer-events-none absolute inset-x-0 top-0 z-10/);
  assert.match(hud, /env\(safe-area-inset-top\)/);
  assert.doesNotMatch(hud, /rounded-xl/);
  assert.doesNotMatch(hud, /bg-bg\/75/);
  assert.doesNotMatch(hud, /backdrop-blur/);
  assert.doesNotMatch(hud, /border-white\/10/);
  assert.doesNotMatch(hud, /bg-bg\/\d+/);
  assert.match(hud, /textShadow: "0 1px 2px #000, 0 0 6px #000"/);
  assert.match(hud, /style=\{metaShadow\}\s*>\s*\{hud\.score\}/);
  assert.match(hud, /style=\{metaShadow\}\s*>\s*\{m\}:\{s\}/);
  assert.match(hud, /hud\.combo > 1/);
  assert.match(hud, /h-1\.5[^"]*bg-black\/40/);
  assert.match(hud, /bg-black\/70/);
});

test("landscape HUD is two floating clusters, not a full-width band", () => {
  const hud = sliceBetween(HUD, "function HudOverlay(", "function MiniMap(");
  assert.match(hud, /landscape:text-2xl/);
  assert.match(hud, /landscape:gap-1/);
  assert.match(hud, /landscape:pr-\[6\.25rem\]/);
  assert.match(hud, /h-1\.5 w-36 shrink-0 overflow-hidden rounded-full bg-black\/40/);
  assert.match(hud, /hidden items-center gap-1 landscape:flex/);
  assert.match(hud, /mt-2 flex items-center gap-2 landscape:hidden/);
  assert.match(hud, /hud\.alert !== "calm"/);
  assert.match(hud, /showChips &&/);
  assert.doesNotMatch(hud, /backdrop-blur/);
  assert.doesNotMatch(hud, /bg-bg\/\d+/);
  assert.doesNotMatch(hud, /border-white\/10/);

  const map = sliceBetween(HUD, "function MiniMap(", "function UpgradeBay(");
  assert.match(map, /landscape:h-24 landscape:w-24/);
  assert.match(map, /landscape:top-\[max\(4\.75rem,calc\(env\(safe-area-inset-top\)\+4rem\)\)\]/);

  const touch = sliceBetween(HUD, "function TouchLayer(", "function HoldBtn(");
  assert.match(touch, /landscape:top-\[max\(0\.45rem,env\(safe-area-inset-top\)\)\]/);
  assert.match(touch, /landscape:h-16 landscape:w-16/);
  assert.match(touch, /landscape:h-\[72px\] landscape:w-\[72px\]/);
});

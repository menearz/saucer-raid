import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  captionPriority,
  createCaptionEngine,
  isDialogueCaption,
  minReadSec,
  pickHeadIndex,
  syncCaptionEngine,
} from "../src/components/game/shout-caption.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");

test("ShoutLayer is single caption slot, not world multi-pill map", () => {
  const start = HUD.indexOf("function ShoutLayer(");
  assert.ok(start >= 0);
  const end = HUD.indexOf("function HudOverlay(", start);
  const layer = HUD.slice(start, end);
  assert.doesNotMatch(layer, /shouts\.map\s*\(/);
  assert.doesNotMatch(layer, /border-fg\/15/);
  assert.doesNotMatch(layer, /bg-surface\/90/);
  assert.doesNotMatch(layer, /text-\[11px\]/);
  assert.match(layer, /bg-black\/80/);
  assert.match(layer, /border-white\/20/);
  assert.match(layer, /text-white/);
  assert.match(layer, /rounded-xl/);
  assert.match(layer, /textShadow/);
  assert.match(layer, /z-\[25\]|z-25/);
  assert.match(layer, /safe-area-inset-bottom/);
  assert.match(layer, /syncCaptionEngine|createCaptionEngine/);
});

test("score and loot strings stay out of dialogue caption", () => {
  assert.equal(isDialogueCaption("+120"), false);
  assert.equal(isDialogueCaption("×3"), false);
  assert.equal(isDialogueCaption("WEAPON CACHE"), false);
  assert.equal(isDialogueCaption("CLOAK"), false);
  assert.equal(isDialogueCaption("AHH NOT AGAIN"), true);
  assert.equal(isDialogueCaption("Hey buddy, what are you doing here?"), true);
});

test("priority: boss > AHH > comedy", () => {
  assert.ok(captionPriority("Hey buddy, what are you doing here?") < captionPriority("AHH NOT AGAIN"));
  assert.ok(captionPriority("AHH NOT AGAIN") < captionPriority("Don't probe me!"));
  assert.equal(
    pickHeadIndex([
      { text: "Don't probe me!" },
      { text: "AHH NOT AGAIN" },
      { text: "Respect my authority!" },
    ]),
    2,
  );
});

test("min read time clamps 1.4–2.6s", () => {
  assert.equal(minReadSec("Hi"), 1.4);
  assert.ok(minReadSec("x".repeat(80)) === 2.6);
  assert.ok(Math.abs(minReadSec("x".repeat(40)) - 2.0) < 1e-9);
});

test("queue shows one line at a time and advances after min read", () => {
  const eng = createCaptionEngine();
  let v = syncCaptionEngine(
    eng,
    [
      { id: 1, text: "Help!", life: 1.8 },
      { id: 2, text: "AHH NOT AGAIN", life: 1.8 },
      { id: 3, text: "Hey buddy, what are you doing here?", life: 2.6 },
    ],
    0,
  );
  assert.equal(v.text, "Hey buddy, what are you doing here?");
  assert.equal(v.pending, 2);

  v = syncCaptionEngine(eng, [
    { id: 1, text: "Help!", life: 1.5 },
    { id: 2, text: "AHH NOT AGAIN", life: 1.5 },
    { id: 3, text: "Hey buddy, what are you doing here?", life: 2.0 },
  ], 0.5);
  assert.equal(v.text, "Hey buddy, what are you doing here?");

  const hold = minReadSec("Hey buddy, what are you doing here?");
  v = syncCaptionEngine(
    eng,
    [
      { id: 1, text: "Help!", life: 1.0 },
      { id: 2, text: "AHH NOT AGAIN", life: 1.0 },
    ],
    hold + 0.05,
  );
  assert.equal(v.text, "AHH NOT AGAIN");
  assert.equal(v.pending, 1);

  const hold2 = minReadSec("AHH NOT AGAIN");
  v = syncCaptionEngine(eng, [{ id: 1, text: "Help!", life: 0.4 }], hold + hold2 + 0.1);
  assert.equal(v.text, "Help!");
  assert.equal(v.pending, 0);
});

test("playing phase still mounts ShoutLayer", () => {
  assert.match(HUD, /hud\.phase === "playing" && <ShoutLayer/);
});

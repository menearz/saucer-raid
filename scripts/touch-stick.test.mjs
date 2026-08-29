import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");

function touchLayerSource() {
  const start = HUD.indexOf("function TouchLayer(");
  assert.ok(start >= 0, "expected TouchLayer in SaucerRaid.tsx");
  const hold = HUD.indexOf("function HoldBtn(", start);
  assert.ok(hold > start, "expected HoldBtn after TouchLayer");
  return HUD.slice(start, hold);
}

test("playing phase mounts TouchLayer", () => {
  assert.match(HUD, /hud\.phase === "playing" && \(\s*<TouchLayer/);
});

test("left stick ring is always painted during play, HoldBtn chrome", () => {
  const layer = touchLayerSource();
  assert.doesNotMatch(layer, /knob\.show/);
  assert.match(
    layer,
    /rounded-full border border-fg\/20 (?:bg-surface\/75|bg-fg\/5) backdrop-blur/,
  );
  assert.match(layer, /beginStick/);
  assert.match(layer, /moveStick/);
  assert.match(layer, /endStick/);
  assert.match(layer, /setKnob\(\{ x: 0, y: 0 \}\)/);
});

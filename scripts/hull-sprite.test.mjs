import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { hullSpriteName } from "../src/game/hull-sprite.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RENDER = readFileSync(join(ROOT, "src/game/render.ts"), "utf8");
const GL = readFileSync(join(ROOT, "src/game/gl.ts"), "utf8");
const SAUCER = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");

test("disc keeps the animated saucer sheet", () => {
  assert.equal(hullSpriteName("disc", "saucer-1", 0), "saucer-1");
  assert.equal(hullSpriteName("disc", "saucer-1", 2), "saucer-3");
  assert.equal(hullSpriteName("", "saucer-1", 1), "saucer-2");
});

test("non-disc hulls draw craft.sprite, not Classic Disc frames", () => {
  assert.equal(hullSpriteName("yoke", "craft-yoke", 0), "craft-yoke");
  assert.equal(hullSpriteName("spike", "craft-spike", 3), "craft-spike");
  assert.equal(hullSpriteName("ember", "craft-ember", 1), "craft-ember");
  assert.equal(hullSpriteName("keel", "craft-keel", 2), "craft-keel");
  assert.equal(hullSpriteName("wake", "craft-wake", 0), "craft-wake");
});

test("canvas raid uses hullSpriteName instead of always art.saucer[fi]", () => {
  assert.match(RENDER, /hullSpriteName/);
  assert.doesNotMatch(RENDER, /drawSprite\(ctx,\s*art\.saucer\[fi\]/);
});

test("WebGL raid uses hullSpriteName for the player hull", () => {
  assert.match(GL, /hullSpriteName/);
});

test("hangar portraits stay hangar-* img tags", () => {
  assert.match(SAUCER, /assetUrl\(`\/game\/\$\{craft\.portrait\}\.png`\)/);
  assert.match(SAUCER, /assetUrl\(`\/game\/\$\{c\.portrait\}\.png`\)/);
});

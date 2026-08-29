import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = readFileSync(join(ROOT, "src/game/assets.ts"), "utf8");

function loadArtBody() {
  const start = ASSETS.indexOf("export async function loadArt");
  assert.ok(start >= 0, "expected loadArt in assets.ts");
  return ASSETS.slice(start);
}

test("title-bg still fails independently", () => {
  assert.match(ASSETS, /title-bg\.png"\)\)\.catch\(\(\) => null\)/);
});

test("sheet frames (saucer/explode/laser/rubble) fail independently", () => {
  const body = loadArtBody();
  for (const sheet of ["saucer", "explode", "laser", "rubble"]) {
    assert.match(
      body,
      new RegExp(`PATHS\\.${sheet}\\.map\\([^)]*(?:loadOptional|loadImage\\([^)]+\\)\\.catch)`),
      `${sheet} frames must catch per image, not reject the batch`,
    );
  }
});

test("singles, props, and tiles fail independently", () => {
  const body = loadArtBody();
  assert.doesNotMatch(
    body,
    /Promise\.all\(PATHS\.singles\.map\(\(n\) => loadImage\(/,
    "singles must not Promise.all raw loadImage",
  );
  assert.doesNotMatch(
    body,
    /Promise\.all\(PATHS\.props\.map\(\(n\) => loadImage\(/,
    "props must not Promise.all raw loadImage",
  );
  assert.doesNotMatch(
    body,
    /Promise\.all\(PATHS\.tiles\.map\(\(n\) => loadImage\(/,
    "tiles must not Promise.all raw loadImage",
  );
  assert.match(body, /PATHS\.singles\.map\(\(n\) => loadOptional/);
  assert.match(body, /PATHS\.props\.map\(\(n\) => loadOptional/);
  assert.match(body, /PATHS\.tiles\.map\(\(n\) => loadOptional/);
});

test("loadArt still marks ready after optional misses", () => {
  const body = loadArtBody();
  assert.match(body, /art\.ready = true/);
  assert.match(body, /loadOptional/);
});

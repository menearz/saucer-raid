import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { EDGE_BAND, fencePosts, FIELD_EDGE_CLAMP } from "../src/game/boundary.ts";
import { WORLD_H, WORLD_W } from "../src/game/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GL = readFileSync(join(ROOT, "src/game/gl.ts"), "utf8");
const RENDER = readFileSync(join(ROOT, "src/game/render.ts"), "utf8");
const SIM = readFileSync(join(ROOT, "src/game/sim.ts"), "utf8");

test("fence posts ring the playfield seam on all four sides", () => {
  const posts = fencePosts();
  assert.ok(posts.length > 40);
  const top = posts.filter((p) => !p.vertical && p.y === 0);
  const bottom = posts.filter((p) => !p.vertical && p.y === WORLD_H);
  const left = posts.filter((p) => p.vertical && p.x === 0);
  const right = posts.filter((p) => p.vertical && p.x === WORLD_W);
  assert.ok(top.length > 8);
  assert.ok(bottom.length > 8);
  assert.ok(left.length > 8);
  assert.ok(right.length > 8);
  for (const p of posts) {
    const onSeam = p.x === 0 || p.x === WORLD_W || p.y === 0 || p.y === WORLD_H;
    assert.equal(onSeam, true);
  }
});

test("edge tint reaches inside the saucer clamp", () => {
  assert.equal(FIELD_EDGE_CLAMP, 48);
  assert.ok(EDGE_BAND > FIELD_EDGE_CLAMP);
  assert.match(SIM, /FIELD_EDGE_CLAMP/);
  assert.match(GL, /fencePosts\(\)/);
  assert.match(GL, /0x05070b/);
  assert.match(GL, /tex\("fence"\)/);
  assert.match(RENDER, /drawFieldEdge/);
  assert.match(RENDER, /art\.sprite\.fence/);
  assert.match(RENDER, /EDGE_BAND/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { pickVictimSting, VICTIM_STINGS } from "../src/game/audio.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO = readFileSync(join(ROOT, "src/game/audio.ts"), "utf8");
const SIM = readFileSync(join(ROOT, "src/game/sim.ts"), "utf8");

function methodBody(src, name) {
  const start = src.indexOf(`  ${name}() {`);
  assert.ok(start >= 0, `${name}() missing`);
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed ${name}()`);
}

test("victim pool has six distinct stings", () => {
  assert.deepEqual([...VICTIM_STINGS], ["scream", "cry", "plea", "yelp", "gasp", "holler"]);
  assert.equal(new Set(VICTIM_STINGS).size, VICTIM_STINGS.length);
});

test("pickVictimSting avoids the last two used", () => {
  const seen = new Set();
  /** @type {string[]} */
  const recent = [];
  for (let n = 0; n < 48; n++) {
    const id = pickVictimSting(recent, Math.random);
    for (const prev of recent.slice(-2)) assert.notEqual(id, prev);
    seen.add(id);
    recent.push(id);
  }
  assert.equal(seen.size, VICTIM_STINGS.length);

  for (const a of VICTIM_STINGS) {
    for (const b of VICTIM_STINGS) {
      const window = a === b ? [a] : [a, b];
      const blocked = new Set(window.slice(-2));
      const pool = VICTIM_STINGS.filter((id) => !blocked.has(id));
      for (let i = 0; i < pool.length; i++) {
        const id = pickVictimSting(window, () => (i + 0.01) / pool.length);
        assert.equal(id, pool[i]);
        assert.equal(blocked.has(id), false);
      }
    }
  }
});

test("shoutHuman calls victimShout and leaves the line picker alone", () => {
  const start = SIM.indexOf("function shoutHuman(");
  assert.ok(start >= 0);
  const body = SIM.slice(start, SIM.indexOf("function stingBoss(", start));
  assert.match(body, /audio\.victimShout\(\)/);
  assert.match(body, /pickHumanLine\(n\)/);
  assert.doesNotMatch(body, /audio\.scream\(\)|audio\.cry\(\)|audio\.plea\(\)/);
  assert.doesNotMatch(body, /roll < 0\.34/);
  assert.doesNotMatch(SIM, /AHH_FIRST_SHOUT_CHANCE\s*=/);
});

test("sting knits stay distinct", () => {
  const scream = methodBody(AUDIO, "scream");
  assert.match(scream, /sawtooth/);
  assert.match(scream, /bandpass/);
  assert.match(scream, /Math\.random\(\) \* 420/);

  const cry = methodBody(AUDIO, "cry");
  assert.match(cry, /"sine"/);
  assert.match(cry, /"triangle"/);
  assert.match(cry, /this\.noise\(/);
  assert.match(cry, /0\.84/);

  const plea = methodBody(AUDIO, "plea");
  assert.match(plea, /"triangle"/);
  assert.match(plea, /"sine"/);
  assert.match(plea, /, 0\.1\)/);

  const yelp = methodBody(AUDIO, "yelp");
  assert.match(yelp, /"square"/);
  assert.match(yelp, /t \+ 0\.12/);

  const gasp = methodBody(AUDIO, "gasp");
  assert.match(gasp, /createBuffer/);
  assert.match(gasp, /const dur = 0\.2/);
  assert.match(gasp, /setValueAtTime\(0\.0001/);
  assert.match(gasp, /exponentialRampToValueAtTime\(0\.09/);

  const holler = methodBody(AUDIO, "holler");
  assert.match(holler, /sawtooth/);
  assert.match(holler, /t \+ 0\.35/);
  assert.match(holler, /f\.Q\.value = 0\.7/);

  const shout = methodBody(AUDIO, "victimShout");
  for (const id of VICTIM_STINGS) assert.match(shout, new RegExp(`this\\.${id}\\(\\)`));
  assert.match(shout, /pickVictimSting\(this\.recentVictims\)/);
});

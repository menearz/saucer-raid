import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { EN, ES, KILLER_KEYS, translate } from "../src/game/i18n.ts";
import { DAMAGE_SOURCES, HULL_HIT_FLASH_S, isDamageSource, isLowHull } from "../src/game/damage.ts";
import { showTouchControls } from "../src/game/touch-ui.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const SIM = readFileSync(join(ROOT, "src/game/sim.ts"), "utf8");
const INPUT = readFileSync(join(ROOT, "src/game/input.ts"), "utf8");
const LOOP = readFileSync(join(ROOT, "src/game/loop.ts"), "utf8");
const CSS = readFileSync(join(ROOT, "src/styles.css"), "utf8");
const AUDIO = readFileSync(join(ROOT, "src/game/audio.ts"), "utf8");

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { createWorld } = await import("../src/game/world.ts");
const { startRaid, step } = await import("../src/game/sim.ts");

const idle = {
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fire: false,
  beam: false,
  pause: false,
  start: false,
};

function boot() {
  store.clear();
  store.set(
    "saucer-raid-progress",
    JSON.stringify({
      level: 1,
      salvage: 0,
      runScore: 0,
      upgrades: { engines: 0, tractor: 0, armor: 0, shields: 0, weapons: 0 },
      upgradesByCraft: {},
      bestTimes: {},
    }),
  );
  const w = createWorld();
  startRaid(w, "start");
  w.state.hp = 5;
  w.state.maxHp = 5;
  w.saucer.hp = 5;
  w.saucer.flash = 0;
  w.state.shield = 0;
  w.state.shieldMax = 0;
  w.state.hitFlash = 0;
  w.state.lastDamage = "";
  w.bullets = [];
  w.jeepCd = 99;
  w.tankCd = 99;
  w.heliCd = 99;
  w.planeCd = 99;
  for (const a of w.actors) {
    if (
      a.kind === "jeep" ||
      a.kind === "tank" ||
      a.kind === "heli" ||
      a.kind === "plane" ||
      a.kind === "rival"
    ) {
      a.dead = true;
    }
  }
  return w;
}

function shot(from, dmg = 1) {
  return {
    id: 80000 + Math.floor(Math.random() * 1000),
    kind: "bullet",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 6,
    w: 10,
    h: 10,
    hp: 1,
    maxHp: 1,
    facing: 0,
    lift: 0,
    abductTime: 0,
    abductable: false,
    destructible: false,
    solid: false,
    score: 0,
    heat: 0,
    sprite: "bullet",
    flash: 0,
    dead: false,
    flee: 0,
    wanderT: 2,
    wanderA: 0,
    fireCd: 0,
    z: 0,
    dmg,
    shotBy: from,
  };
}

function hitWith(w, from, dmg = 1) {
  const b = shot(from, dmg);
  b.x = w.saucer.x;
  b.y = w.saucer.y;
  w.saucer.flash = 0;
  w.bullets.push(b);
  step(w, idle, 1 / 60);
}

test("hull hits flash for 200ms and remember the real shooter", () => {
  assert.ok(HULL_HIT_FLASH_S >= 0.15 && HULL_HIT_FLASH_S <= 0.25);
  const w = boot();
  hitWith(w, "tank", 2);
  assert.equal(w.state.hp, 3);
  assert.equal(w.state.lastDamage, "tank");
  assert.equal(w.state.hitFlash, HULL_HIT_FLASH_S);
  assert.equal(w.state.phase, "playing");

  w.saucer.flash = 0;
  hitWith(w, "heli", 1);
  assert.equal(w.state.hp, 2);
  assert.equal(w.state.lastDamage, "heli");

  step(w, idle, 0.05);
  assert.ok(Math.abs(w.state.hitFlash - (HULL_HIT_FLASH_S - 0.05)) < 1e-9);
});

test("shield soak is not a hull hit and does not change the killer", () => {
  const w = boot();
  w.state.shield = 2;
  w.state.shieldMax = 2;
  hitWith(w, "jeep", 1);
  assert.equal(w.state.hp, 5);
  assert.equal(w.state.shield, 1);
  assert.equal(w.state.hitFlash, 0);
  assert.equal(w.state.lastDamage, "");
  assert.equal(w.state.phase, "playing");
});

test("killing shot names that shooter on the destroyed raid", () => {
  const w = boot();
  w.state.hp = 1;
  w.saucer.hp = 1;
  hitWith(w, "plane", 1);
  assert.equal(w.state.hp, 0);
  assert.equal(w.state.phase, "upgrade");
  assert.equal(w.state.reason, "destroyed");
  assert.equal(w.state.lastDamage, "plane");
  assert.equal(w.state.hitFlash, HULL_HIT_FLASH_S);

  w.state.phase = "playing";
  w.state.hp = 1;
  w.saucer.hp = 1;
  w.saucer.flash = 0;
  hitWith(w, "rival", 1);
  assert.equal(w.state.lastDamage, "rival");
  assert.equal(w.state.reason, "destroyed");
});

test("spawnShot tags each real damage source", () => {
  for (const source of DAMAGE_SOURCES) {
    assert.match(SIM, new RegExp(`spawnShot\\([\\s\\S]*?"${source}"`));
  }
  assert.match(SIM, /hurtPlayer\(w, b\.dmg \?\? 1, b\.shotBy\)/);
  assert.match(SIM, /w\.state\.hitFlash = HULL_HIT_FLASH_S/);
  assert.match(SIM, /if \(from\) w\.state\.lastDamage = from/);
  assert.doesNotMatch(AUDIO, /hitFlash|lastDamage|HULL LOW/);
  assert.match(AUDIO, /victimShout\(\)/);
});

test("low hull is the last pip, and the HUD pulses it unless motion is reduced", () => {
  assert.equal(isLowHull(1), true);
  assert.equal(isLowHull(2), false);
  assert.equal(isLowHull(0), false);
  assert.equal(EN.hullLow, "HULL LOW");
  assert.equal(ES.hullLow, "CASCO BAJO");
  const hud = HUD.slice(HUD.indexOf("function HudOverlay("), HUD.indexOf("function MiniMap("));
  assert.match(hud, /isLowHull\(hud\.hp\)/);
  assert.match(hud, /t\("hullLow"\)/);
  assert.match(hud, /hull-pip-pulse/);
  assert.match(hud, /mt-2 flex items-center gap-2 landscape:hidden pr-\[7\.5rem\]/);
  assert.match(CSS, /\.hull-pip-pulse/);
  assert.match(
    CSS,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.hull-pip-pulse \{\s*animation: none !important;/,
  );
});

test("death screen names the killer from i18n, with no placeholder", () => {
  assert.equal(translate("en", "killedBy", { what: "tank fire" }), "Downed by tank fire");
  assert.equal(
    translate("es", "killedBy", { what: "fuego de tanque" }),
    "Derribado por fuego de tanque",
  );
  for (const source of DAMAGE_SOURCES) {
    assert.equal(isDamageSource(source), true);
    const key = KILLER_KEYS[source];
    assert.ok(EN[key].length > 0);
    assert.ok(ES[key].length > 0);
    assert.doesNotMatch(EN[key], /todo|placeholder|unknown|lorem/i);
    assert.doesNotMatch(ES[key], /todo|placeholder|unknown|lorem/i);
  }
  const bay = HUD.slice(HUD.indexOf("function UpgradeBay"), HUD.indexOf("function TouchLayer"));
  assert.match(bay, /isDamageSource\(hud\.lastDamage\)/);
  assert.match(bay, /t\("killedBy"/);
  assert.match(bay, /KILLER_KEYS\[hud\.lastDamage\]/);
  assert.match(HUD, /hull-hit-flash/);
  assert.match(CSS, /\.hull-hit-flash/);
  assert.match(LOOP, /hitFlash: st\.hitFlash/);
  assert.match(LOOP, /lastDamage: st\.lastDamage/);
});

test("controls copy names the keys the input code actually binds", () => {
  assert.match(INPUT, /MOVE_LEFT_KEYS = \["KeyA", "ArrowLeft"\]/);
  assert.match(INPUT, /MOVE_RIGHT_KEYS = \["KeyD", "ArrowRight"\]/);
  assert.match(INPUT, /MOVE_UP_KEYS = \["KeyW", "ArrowUp"\]/);
  assert.match(INPUT, /MOVE_DOWN_KEYS = \["KeyS", "ArrowDown"\]/);
  assert.match(INPUT, /BEAM_KEYS = \["Space", "KeyK"\]/);
  assert.match(INPUT, /FIRE_KEYS = \["KeyJ", "Mouse0", "ControlLeft"\]/);
  assert.match(INPUT, /PAUSE_KEY_CODES = \["Escape", "KeyP"\]/);
  assert.match(INPUT, /anyHeld\(keys, MOVE_LEFT_KEYS\)/);
  assert.match(INPUT, /anyHeld\(keys, MOVE_RIGHT_KEYS\)/);
  assert.match(INPUT, /anyHeld\(keys, MOVE_UP_KEYS\)/);
  assert.match(INPUT, /anyHeld\(keys, MOVE_DOWN_KEYS\)/);
  assert.match(INPUT, /anyHeld\(keys, BEAM_KEYS\)/);
  assert.match(INPUT, /anyHeld\(keys, FIRE_KEYS\)/);
  assert.match(INPUT, /anyHeld\(keys, PAUSE_KEY_CODES\)/);
  assert.doesNotMatch(INPUT, /cloak/);
  assert.doesNotMatch(INPUT, /mute/i);
  assert.match(EN.pitchControls, /WASD or arrows/);
  assert.match(EN.pitchControls, /Space or K/);
  assert.match(EN.pitchControls, /J, Ctrl, or click/);
  assert.match(EN.pitchControls, /Esc or P/);
  assert.match(EN.pitchControlsTouch, /Stick/);
  assert.doesNotMatch(EN.pitchControlsTouch, /Space|KeyJ|Ctrl/);
  assert.match(ES.pitchControls, /Espacio o K/);
  assert.match(ES.pitchControls, /Esc o P/);
});

test("touch controls follow capability, not width, and still reveal on a touch", () => {
  assert.equal(
    showTouchControls({ pointerCoarse: false, maxTouchPoints: 0, sawTouch: false }),
    false,
  );
  assert.equal(
    showTouchControls({ pointerCoarse: true, maxTouchPoints: 0, sawTouch: false }),
    true,
  );
  assert.equal(
    showTouchControls({ pointerCoarse: false, maxTouchPoints: 1, sawTouch: false }),
    true,
  );
  assert.equal(
    showTouchControls({ pointerCoarse: false, maxTouchPoints: 0, sawTouch: true }),
    true,
  );
  const hook = HUD.slice(
    HUD.indexOf("function useTouchControls"),
    HUD.indexOf("function HullHitFlash"),
  );
  assert.match(hook, /matchMedia\("\(pointer: coarse\)"\)/);
  assert.match(hook, /maxTouchPoints/);
  assert.match(hook, /touchstart/);
  assert.match(hook, /pointerType !== "touch"/);
  assert.doesNotMatch(hook, /innerWidth|min-width|max-width|matchMedia\("\(max-width/);
  const layer = HUD.slice(HUD.indexOf("function TouchLayer("), HUD.indexOf("function HoldBtn("));
  const gate = layer.indexOf("{showTouch && (");
  const mute = layer.indexOf('t("unmute")');
  const stick = layer.indexOf("beginStick");
  const beam = layer.indexOf('label={t("beam")}');
  const fire = layer.indexOf('label={t("fire")}');
  assert.ok(mute >= 0 && gate > mute, "mute stays outside the touch gate");
  assert.ok(gate >= 0 && stick > gate && beam > gate && fire > gate);
});

test("portrait minimap shrinks and its legend still clears the stick by 12px", () => {
  const map = HUD.slice(HUD.indexOf("function MiniMap("), HUD.indexOf("function UpgradeBay("));
  assert.match(map, /h-16 w-16/);
  assert.match(map, /landscape:h-24 landscape:w-24/);
  assert.doesNotMatch(map, /h-28 w-28/);
  assert.match(map, /bottom-\[max\(11\.75rem,calc\(env\(safe-area-inset-bottom\)\+10\.75rem\)\)\]/);
  assert.match(map, /flex flex-row items-end/);
  const stick = HUD.slice(HUD.indexOf("function TouchLayer("), HUD.indexOf("function HoldBtn("));
  assert.match(stick, /bottom-16 left-10 size-28/);
  // Stick top sits at 4rem + 7rem = 11rem. Legend shares the map box bottom at 11.75rem.
  // 0.75rem = 12px.
  assert.equal(11.75 - (4 + 7), 0.75);
});

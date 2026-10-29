import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CRAFTS } from "../src/game/crafts.ts";
import { LOW_HULL_HP } from "../src/game/damage.ts";
import {
  HOW_TO_PLAY_SECTIONS,
  HowToPlaySession,
  isHowToPlayDismissKey,
  trapTab,
} from "../src/game/how-to-play.ts";
import { EN, ES } from "../src/game/i18n.ts";
import {
  BEAM_KEYS,
  FIRE_KEYS,
  KEY_GUIDE,
  MOVE_DOWN_KEYS,
  MOVE_LEFT_KEYS,
  MOVE_RIGHT_KEYS,
  MOVE_UP_KEYS,
  PAD_AIM_AXES,
  PAD_BEAM_BUTTONS,
  PAD_FIRE_BUTTONS,
  PAD_LABELS,
  PAD_MOVE_AXES,
  PAD_PAUSE_BUTTON,
  PAUSE_KEY_CODES,
  keyboardGuideCodes,
} from "../src/game/input.ts";
import {
  BOSS_SALVAGE,
  BOSS_SCORE_BONUS,
  isBossSector,
  militaryShotDamage,
  sectorFauna,
} from "../src/game/raid-content.ts";
import { QUOTA_POINTS } from "../src/game/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const HUD = read("src/components/game/SaucerRaid.tsx");
const INPUT = read("src/game/input.ts");
const SIM = read("src/game/sim.ts");
const WORLD = read("src/game/world.ts");
const LOOP = read("src/game/loop.ts");
const PROGRESS = read("src/game/progress.ts");
const CSS = read("src/styles.css");

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { parSec, raidGoal, TIME_BONUS_PER_SEC, UPGRADES, upgradeCost } =
  await import("../src/game/progress.ts");

const howEn = HOW_TO_PLAY_SECTIONS.map((s) => `${EN[s.title]}\n${EN[s.body]}`).join("\n");
const howEs = HOW_TO_PLAY_SECTIONS.map((s) => `${ES[s.title]}\n${ES[s.body]}`).join("\n");

function hasLabel(text, label) {
  if (/^[A-Za-z]$/.test(label)) {
    return new RegExp(`(^|[^A-Za-z])${label}([^A-Za-z]|$)`).test(text);
  }
  return text.includes(label);
}

function slice(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing slice ${start} … ${end}`);
  return source.slice(a, b);
}

test("how to play keys exist in English and Spanish", () => {
  assert.equal(EN.howToPlay, "How to play");
  assert.equal(ES.howToPlay, "Cómo jugar");
  assert.equal(EN.howToClose, "Close");
  assert.equal(ES.howToClose, "Cerrar");
  assert.ok(HOW_TO_PLAY_SECTIONS.length >= 8);
  for (const section of HOW_TO_PLAY_SECTIONS) {
    assert.ok(EN[section.title].length > 0, section.title);
    assert.ok(EN[section.body].length > 0, section.body);
    assert.ok(ES[section.title].length > 0, section.title);
    assert.ok(ES[section.body].length > 0, section.body);
    assert.notEqual(ES[section.body], EN[section.body], `ES copy matches EN for ${section.body}`);
  }
  for (const key of Object.keys(EN)) {
    assert.ok(ES[key]?.length > 0, `ES missing ${key}`);
  }
});

test("panel opens and closes, Escape dismisses, P does not, focus returns", () => {
  const session = new HowToPlaySession();
  let focuses = 0;
  const opener = {
    focus() {
      focuses += 1;
    },
  };
  assert.equal(session.open, false);
  assert.equal(session.onKey({ key: "Escape", code: "Escape" }), false);
  session.show(opener);
  assert.equal(session.open, true);
  assert.equal(isHowToPlayDismissKey({ key: "p", code: "KeyP" }), false);
  assert.equal(session.onKey({ key: "p", code: "KeyP" }), false);
  assert.equal(session.open, true);
  assert.equal(session.onKey({ key: "Esc" }), true);
  assert.equal(session.open, false);
  assert.equal(focuses, 1);
  session.show(opener);
  session.hide();
  assert.equal(session.open, false);
  assert.equal(focuses, 2);
  session.hide();
  assert.equal(focuses, 2);

  assert.equal(trapTab({ count: 3, activeIndex: 1, shiftKey: false }), null);
  assert.equal(trapTab({ count: 3, activeIndex: 2, shiftKey: false }), 0);
  assert.equal(trapTab({ count: 3, activeIndex: 0, shiftKey: true }), 2);
  assert.equal(trapTab({ count: 3, activeIndex: -1, shiftKey: false }), 0);
  assert.equal(trapTab({ count: 3, activeIndex: -1, shiftKey: true }), 2);
  assert.equal(trapTab({ count: 1, activeIndex: 0, shiftKey: false }), 0);
  assert.equal(trapTab({ count: 0, activeIndex: 0, shiftKey: false }), null);

  const title = slice(HUD, "function TitleScreen", "function HowToPlayButton");
  const firstGuide = title.indexOf("<HowToPlayButton");
  const secondGuide = title.indexOf("<HowToPlayButton", firstGuide + 1);
  const firstLaunch = title.indexOf("<LaunchButton");
  const secondLaunch = title.indexOf("<LaunchButton", firstLaunch + 1);
  assert.ok(firstGuide >= 0 && secondGuide > firstGuide, "portrait and landscape entries");
  assert.ok(
    firstGuide < firstLaunch && secondGuide < secondLaunch,
    "How to play sits above Launch",
  );
  assert.match(HUD, /guideSession\.current\.show\(el\)/);
  assert.match(HUD, /guideSession\.current\.hide\(\)/);
  assert.match(HUD, /guideOpen && hud\.phase === "title"/);
  assert.match(HUD, /<HowToPlayPanel/);

  const panel = slice(HUD, "function HowToPlayPanel", "function HangarWordmark");
  assert.match(panel, /role="dialog"/);
  assert.match(panel, /aria-modal="true"/);
  assert.match(panel, /aria-labelledby="how-to-play-title"/);
  assert.match(panel, /overflow-y-auto/);
  assert.match(panel, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
  assert.match(panel, /max-w-\[min\(22\.5rem,calc\(100vw-1\.5rem\)\)\]/);
  assert.match(panel, /sticky top-0/);
  assert.match(panel, /t\("howToClose"\)/);
  assert.match(panel, /session\.onKey\(e\)/);
  assert.match(panel, /trapTab\(/);
  assert.match(panel, /closeRef\.current\?\.focus\(\)/);
  assert.match(panel, /session\.hide\(\)/);
  assert.match(panel, /HOW_TO_PLAY_SECTIONS\.map/);
  assert.match(panel, /bg-surface/);
  assert.match(panel, /text-fg/);
  assert.match(panel, /bg-fg/);
  assert.match(panel, /text-bg/);
  const closeAt = panel.indexOf('t("howToClose")');
  const scrollAt = panel.indexOf("overflow-y-auto");
  assert.ok(closeAt >= 0 && closeAt < scrollAt, "close button stays outside the scroller");
  assert.doesNotMatch(panel, /animate-|transition-|@keyframes/);
  assert.match(CSS, /prefers-reduced-motion:\s*reduce/);
  const hud = slice(HUD, "function HudOverlay", "function MiniMap");
  assert.doesNotMatch(hud, /howToPlay|HowToPlay/);
});

test("how to play key names match input.ts bindings", () => {
  const codes = keyboardGuideCodes();
  assert.deepEqual(codes.slice(0, 2), [...MOVE_LEFT_KEYS]);
  assert.ok(codes.includes("KeyW") && codes.includes("ArrowUp"));
  assert.deepEqual([...MOVE_UP_KEYS], ["KeyW", "ArrowUp"]);
  assert.deepEqual([...MOVE_DOWN_KEYS], ["KeyS", "ArrowDown"]);
  assert.deepEqual([...MOVE_RIGHT_KEYS], ["KeyD", "ArrowRight"]);
  assert.deepEqual([...BEAM_KEYS], ["Space", "KeyK"]);
  assert.deepEqual([...FIRE_KEYS], ["KeyJ", "Mouse0", "ControlLeft"]);
  assert.deepEqual([...PAUSE_KEY_CODES], ["Escape", "KeyP"]);

  const update = slice(INPUT, "update() {", "this.justFire");
  assert.match(update, /anyHeld\(keys, MOVE_LEFT_KEYS\)/);
  assert.match(update, /anyHeld\(keys, MOVE_RIGHT_KEYS\)/);
  assert.match(update, /anyHeld\(keys, MOVE_UP_KEYS\)/);
  assert.match(update, /anyHeld\(keys, MOVE_DOWN_KEYS\)/);
  assert.match(update, /anyHeld\(keys, BEAM_KEYS\)/);
  assert.match(update, /anyHeld\(keys, FIRE_KEYS\)/);
  assert.match(update, /anyHeld\(keys, PAUSE_KEY_CODES\)/);
  assert.match(update, /PAD_MOVE_AXES/);
  assert.match(update, /PAD_AIM_AXES/);
  assert.match(update, /PAD_FIRE_BUTTONS\.some/);
  assert.match(update, /PAD_BEAM_BUTTONS\.some/);
  assert.match(update, /PAD_PAUSE_BUTTON/);
  assert.doesNotMatch(update, /keys\.has\("KeyJ"\)/);
  assert.doesNotMatch(update, /buttons\[0\]/);

  for (const code of codes) {
    const guide = KEY_GUIDE[code];
    assert.ok(guide, `no guide label for ${code}`);
    assert.ok(hasLabel(howEn, guide.en), `EN missing ${code} (${guide.en})`);
    assert.ok(hasLabel(howEs, guide.es), `ES missing ${code} (${guide.es})`);
  }
  assert.equal(KEY_GUIDE.ControlLeft.en, "left Ctrl");
  assert.doesNotMatch(EN.howControlsBody, /right Ctrl/);
  assert.equal(KEY_GUIDE.Mouse0.en, "click");
  assert.equal(KEY_GUIDE.Mouse0.es, "clic");

  assert.deepEqual([...PAD_MOVE_AXES], [0, 1]);
  assert.deepEqual([...PAD_AIM_AXES], [2, 3]);
  assert.deepEqual(PAD_FIRE_BUTTONS, [0, 7]);
  assert.deepEqual(PAD_BEAM_BUTTONS, [1, 6]);
  assert.equal(PAD_PAUSE_BUTTON, 9);
  for (const label of [
    PAD_LABELS.move,
    PAD_LABELS.aim,
    ...PAD_LABELS.fire,
    ...PAD_LABELS.beam,
    PAD_LABELS.pause,
  ]) {
    assert.ok(howEn.includes(label.en), label.en);
    assert.ok(howEs.includes(label.es), label.es);
  }

  assert.match(EN.howControlsBody, new RegExp(`Hold the ${EN.beam} button`));
  assert.match(EN.howControlsBody, new RegExp(`Hold the ${EN.fire} button`));
  assert.match(ES.howControlsBody, new RegExp(`botón ${ES.beam}`));
  assert.match(ES.howControlsBody, new RegExp(`botón ${ES.fire}`));
  assert.match(EN.howControlsBody, /drag the stick/);
  assert.match(ES.howControlsBody, /arrastra la palanca/);
  assert.match(HUD, /beginStick\(e\.pointerId, x, y, "move"\)/);
  assert.match(HUD, /input\.setBeam\(v\)/);
  assert.match(HUD, /input\.setFire\(v\)/);
  assert.match(LOOP, /hasMouseAim/);
  assert.match(EN.howControlsBody, /The mouse aims the shot/);
  assert.match(ES.howControlsBody, /El mouse apunta el disparo/);
});

test("how to play numbers match the raid rules", () => {
  assert.match(EN.howPointsBody, new RegExp(`chicken ${QUOTA_POINTS.chicken}`));
  assert.match(EN.howPointsBody, new RegExp(`pig ${QUOTA_POINTS.pig}`));
  assert.match(EN.howPointsBody, new RegExp(`sheep ${QUOTA_POINTS.sheep}`));
  assert.match(EN.howPointsBody, new RegExp(`cow ${QUOTA_POINTS.cow}`));
  assert.match(EN.howPointsBody, new RegExp(`farmer ${QUOTA_POINTS.farmer}`));
  assert.match(EN.howPointsBody, new RegExp(`town person ${QUOTA_POINTS.civilian}`));
  assert.match(ES.howPointsBody, new RegExp(`pollo ${QUOTA_POINTS.chicken}`));
  assert.match(ES.howPointsBody, new RegExp(`cerdo ${QUOTA_POINTS.pig}`));
  assert.match(ES.howPointsBody, new RegExp(`oveja ${QUOTA_POINTS.sheep}`));
  assert.match(ES.howPointsBody, new RegExp(`vaca ${QUOTA_POINTS.cow}`));
  assert.match(ES.howPointsBody, new RegExp(`granjero ${QUOTA_POINTS.farmer}`));
  assert.match(ES.howPointsBody, new RegExp(`persona del pueblo ${QUOTA_POINTS.civilian}`));

  const stock = {};
  for (let level = 1; level <= 5; level++) {
    for (const band of sectorFauna(level).stock) {
      if (stock[band.kind] == null) stock[band.kind] = band.t;
      else assert.equal(band.t, stock[band.kind], band.kind);
    }
  }
  for (const kind of ["chicken", "pig", "sheep", "cow"]) {
    assert.ok(howEn.includes(String(stock[kind])), kind);
    assert.ok(howEs.includes(String(stock[kind])), kind);
  }
  const folk = slice(WORLD, "const folk =", "for (const f of fauna.folk)");
  const folkTime = folk.match(/abductTime: ([0-9.]+)/)?.[1];
  assert.ok(folkTime);
  assert.ok(howEn.includes(folkTime));
  assert.ok(howEs.includes(folkTime));
  const vehicles = slice(WORLD, "const vehicles = sectorVehicles", "const plan = sectorPropPlan");
  const vehicleTime = vehicles.match(/abductTime: ([0-9.]+)/)?.[1];
  assert.ok(vehicleTime);
  assert.ok(howEn.includes(vehicleTime));
  const spawn = slice(SIM, "function spawnUnit", "function shoutHuman");
  const jeepTime = spawn.match(/jeep:[\s\S]*?t: ([0-9.]+)/)?.[1];
  const tankTime = spawn.match(/tank:[\s\S]*?t: ([0-9.]+)/)?.[1];
  assert.equal(spawn.match(/heli:[\s\S]*?abduct: (false|true)/)?.[1], "false");
  assert.equal(spawn.match(/plane:[\s\S]*?abduct: (false|true)/)?.[1], "false");
  assert.ok(jeepTime && howEn.includes(jeepTime));
  assert.ok(tankTime && howEn.includes(tankTime));
  assert.match(EN.howAbductBody, /Helicopters and jets cannot/);
  assert.match(ES.howAbductBody, /No puedes absorber helicópteros ni cazas/);

  const add = slice(SIM, "function addScore", "function kill");
  assert.match(add, /comboTimer = 2\.3/);
  assert.match(add, /Math\.min\(6, 1 \+ Math\.floor\(\(st\.combo - 1\) \/ 2\)\)/);
  assert.match(EN.howPointsBody, /2\.3 seconds/);
  assert.match(ES.howPointsBody, /2\.3 segundos/);
  assert.match(EN.howPointsBody, /first two grabs/);
  assert.match(EN.howPointsBody, /stops at 6/);
  assert.match(ES.howPointsBody, /dos primeras capturas/);
  assert.match(ES.howPointsBody, /Se detiene en 6/);

  assert.equal(raidGoal(1), 400);
  assert.equal(raidGoal(2) - raidGoal(1), 120);
  assert.equal(parSec(1), 92);
  assert.equal(parSec(1), 90 + 2);
  assert.equal(TIME_BONUS_PER_SEC, 5);
  assert.match(EN.howWinBody, /Sector 1 is 400 points/);
  assert.match(EN.howWinBody, /Each next sector adds 120/);
  assert.match(EN.howWinBody, /90 seconds plus 2 seconds times the sector number/);
  assert.match(EN.howWinBody, /Sector 1's par is 92 seconds/);
  assert.match(EN.howWinBody, /5 points for each second left/);
  assert.match(EN.howWinBody, /that bonus is 0/);
  assert.match(ES.howWinBody, /400 puntos/);
  assert.match(ES.howWinBody, /suma 120/);
  assert.match(ES.howWinBody, /92 segundos/);

  assert.equal(isBossSector(1), false);
  assert.equal(isBossSector(3), true);
  assert.equal(isBossSector(6), true);
  assert.equal(isBossSector(9), true);
  assert.equal(BOSS_SCORE_BONUS, 1800);
  assert.equal(BOSS_SALVAGE, 3);
  assert.match(EN.howPointsBody, /sector 3, then 6, then 9/);
  assert.match(EN.howPointsBody, /1800 points/);
  assert.match(EN.howPointsBody, /get 3 salvage/);
  assert.match(EN.howPointsBody, /cannot beam the rival/);
  assert.match(ES.howPointsBody, /1800 puntos/);
  assert.match(ES.howPointsBody, /3 de chatarra/);

  assert.equal(militaryShotDamage("tank", 1), 2);
  assert.equal(militaryShotDamage("jeep", 1), 1);
  assert.equal(militaryShotDamage("heli", 6), 1);
  assert.equal(militaryShotDamage("tank", 6), 2);
  assert.equal(militaryShotDamage("tank", 7), 3);
  assert.equal(militaryShotDamage("jeep", 7), 2);
  assert.equal(militaryShotDamage("jeep", 13), 3);
  assert.match(EN.howThreatsBody, /sectors 1 through 6/);
  assert.match(EN.howThreatsBody, /tank shot deals 2 damage and every other shot deals 1/);
  assert.match(EN.howThreatsBody, /From sector 7, add 1/);
  assert.match(EN.howThreatsBody, /sector 13, 19/);
  assert.match(EN.howThreatsBody, /Jeeps, tanks, helicopters, and jets/);
  assert.match(ES.howThreatsBody, /jeeps, tanques, helicópteros y cazas/);

  assert.equal(LOW_HULL_HP, 1);
  assert.match(EN.howLoseBody, /HULL LOW/);
  assert.match(ES.howLoseBody, /CASCO BAJO/);
  assert.match(EN.howLoseBody, /Retry sector/);
  assert.match(EN.howLoseBody, /Refit/);
  assert.match(ES.howLoseBody, /Reintentar sector/);
  assert.match(ES.howLoseBody, /Reequipar/);

  const loot = slice(SIM, "function spawnLoot", "function grabLoot");
  assert.match(loot, /wanderT: 18/);
  const grab = slice(SIM, "function grabLoot", "function spawnShot");
  assert.match(grab, /Math\.min\(16, \(w\.state\.cloakT \?\? 0\) \+ 10\)/);
  assert.match(grab, /Math\.min\(3, \(w\.state\.weaponTier \?\? 0\) \+ 1\)/);
  assert.match(EN.howHullBody, /lasts 18 seconds/);
  assert.match(EN.howHullBody, /adds 10 seconds/);
  assert.match(EN.howHullBody, /up to 16 seconds/);
  assert.match(EN.howHullBody, /Laser\+, then Twin, then Spread/);
  assert.match(ES.howHullBody, /18 segundos/);
  assert.match(ES.howHullBody, /suma 10 segundos/);
  assert.match(ES.howHullBody, /hasta 16 segundos/);
  assert.match(ES.howHullBody, /Láser\+, luego Doble, luego Abanico/);

  assert.match(PROGRESS, /Math\.floor\(score \/ 180\)/);
  assert.match(PROGRESS, /survived \? 6 : 2/);
  assert.match(EN.howHangarBody, /Divide the score by 180/);
  assert.match(EN.howHangarBody, /Add 6 if you filled the goal, or add 2 if you were shot down/);
  assert.match(EN.howHangarBody, /at least 2/);
  assert.match(ES.howHangarBody, /entre 180/);
  assert.match(ES.howHangarBody, /Suma 6 si llenaste la meta, o suma 2 si te derribaron/);
  assert.equal(upgradeCost(0), 20);
  assert.equal(upgradeCost(1) - upgradeCost(0), 20);
  assert.match(EN.howHangarBody, /costs 20 salvage/);
  assert.match(EN.howHangarBody, /costs 20 more/);
  assert.match(WORLD, /craft\.speed \* \(1 \+ u\.engines \* 0\.12\)/);
  assert.match(WORLD, /craft\.beam \* \(1 \+ u\.tractor \* 0\.08\)/);
  assert.match(WORLD, /1 \+ u\.tractor \* 0\.28/);
  assert.match(WORLD, /craft\.hp \+ u\.armor/);
  assert.match(WORLD, /shieldMax = u\.shields/);
  assert.match(WORLD, /1 \+ u\.weapons \* 0\.12/);
  assert.match(WORLD, /1 - u\.weapons \* 0\.06/);
  assert.match(EN.howHangarBody, /12% speed/);
  assert.match(EN.howHangarBody, /8% beam width/);
  assert.match(EN.howHangarBody, /28% faster/);
  assert.match(EN.howHangarBody, /12% laser power/);
  assert.match(EN.howHangarBody, /by 6%/);
  const maxById = Object.fromEntries(UPGRADES.map((u) => [u.id, u.max]));
  assert.equal(maxById.engines, 4);
  assert.equal(maxById.tractor, 4);
  assert.equal(maxById.armor, 4);
  assert.equal(maxById.shields, 4);
  assert.equal(maxById.weapons, 3);
  assert.match(EN.howHangarBody, /stop at rank 4/);
  assert.match(EN.howHangarBody, /stop at rank 3/);

  for (const craft of CRAFTS) {
    assert.match(EN.howHangarBody, new RegExp(craft.name));
    if (craft.id === "yoke") assert.match(ES.howHangarBody, new RegExp(ES.craftYokeName));
    else assert.match(ES.howHangarBody, new RegExp(craft.name));
  }

  assert.match(EN.howHangarBody, /speaker button mutes/);
  assert.match(EN.howHangarBody, /EN and ES change the language/);
  assert.match(EN.howHangarBody, /Restart raid starts this sector over/);
  assert.match(ES.howHangarBody, /silencia el sonido/);
  assert.match(ES.howHangarBody, /Nueva campaña/);
});

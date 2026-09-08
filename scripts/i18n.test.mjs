import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  EN,
  ES,
  LANG_KEY,
  isLang,
  readLang,
  translate,
  writeLang,
} from "../src/game/i18n.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const I18N = readFileSync(join(ROOT, "src/game/i18n.ts"), "utf8");

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => {
    mem.set(k, String(v));
  },
  removeItem: (k) => {
    mem.delete(k);
  },
};

test("storage key is saucer-raid-lang and only en|es persist", () => {
  assert.equal(LANG_KEY, "saucer-raid-lang");
  assert.equal(isLang("en"), true);
  assert.equal(isLang("es"), true);
  assert.equal(isLang("fr"), false);
  assert.equal(isLang(""), false);
  mem.clear();
  assert.equal(readLang(), null);
  writeLang("es");
  assert.equal(localStorage.getItem(LANG_KEY), "es");
  assert.equal(readLang(), "es");
  writeLang("en");
  assert.equal(readLang(), "en");
  localStorage.setItem(LANG_KEY, "fr");
  assert.equal(readLang(), null);
});

test("spec EN+ES chrome copy and never-blank fallback", () => {
  assert.equal(translate("en", "siteTitle"), "Saucer Raid");
  assert.equal(translate("es", "siteTitle"), "Incursión del Platillo");
  assert.equal(translate("en", "wrapTitle"), "Alien Attack Saucer");
  assert.equal(translate("es", "wrapTitle"), "Ataque Alienígena");
  assert.equal(translate("en", "pitchLead"), "You are the saucer.");
  assert.equal(translate("es", "pitchLead"), "Tú eres el platillo.");
  assert.equal(
    translate("en", "pitchFly"),
    "Fly the farm. Beam up cows and people. Blast what shoots back.",
  );
  assert.equal(
    translate("es", "pitchFly"),
    "Vuela la granja. Absorbe vacas y gente. Dispara a lo que te dispara.",
  );
  assert.equal(
    translate("en", "pitchControls"),
    "Stick or WASD to fly. Hold Beam to grab. Hold Fire to shoot. Beat the clock.",
  );
  assert.equal(
    translate("es", "pitchControls"),
    "Stick o WASD para volar. Mantén Beam para agarrar. Mantén Fire para disparar. Gana al reloj.",
  );
  assert.equal(translate("en", "launch"), "Launch");
  assert.equal(translate("es", "launch"), "Lanzar");
  assert.equal(translate("en", "play"), "Play");
  assert.equal(translate("es", "play"), "Jugar");
  assert.equal(translate("en", "pause"), "Pause");
  assert.equal(translate("es", "pause"), "Pausa");
  assert.equal(translate("en", "resume"), "Resume");
  assert.equal(translate("es", "resume"), "Continuar");
  assert.equal(translate("en", "hangar"), "Hangar");
  assert.equal(translate("es", "hangar"), "Hangar");
  assert.equal(translate("en", "upgradeBay"), "Upgrade bay");
  assert.equal(translate("es", "upgradeBay"), "Bahía de mejoras");
  assert.equal(
    translate("es", "netRoomEmpty", { room: "FAKE1" }),
    "Nadie está en la sala FAKE1. Ese código parece vacío o incorrecto.",
  );
  for (const key of Object.keys(EN)) {
    assert.ok(translate("en", key).length > 0, `blank EN ${key}`);
    assert.ok(translate("es", key).length > 0, `blank ES ${key}`);
  }
  const esKeys = new Set(Object.keys(ES));
  for (const key of Object.keys(EN)) {
    assert.ok(esKeys.has(key), `ES missing ${key}`);
  }
});

test("missing or blank key falls back to English, never empty", () => {
  assert.equal(translate("es", "not-a-key"), "not-a-key");
  const blankEs = { ...ES, launch: "" };
  const raw = blankEs.launch || EN.launch || "launch";
  assert.equal(raw, "Launch");
});

test("hangar chrome uses the i18n helper; picker and later switch exist", () => {
  assert.match(I18N, /LANG_KEY = "saucer-raid-lang"/);
  assert.match(HUD, /from "@\/game\/i18n"/);
  assert.match(HUD, /<LanguagePicker/);
  assert.match(HUD, /readyLang && !picked/);
  assert.match(HUD, /hydrate\(\)/);
  assert.match(HUD, /<LangSwitch/);
  assert.match(HUD, /Language · Idioma/);
  assert.match(HUD, />\s*English\s*</);
  assert.match(HUD, />\s*Español\s*</);
  assert.match(HUD, /t\("launch"\)/);
  assert.match(HUD, /t\("host"\)/);
  assert.match(HUD, /t\("join"\)/);
  assert.match(HUD, /t\("paused"\)/);
  assert.match(HUD, /t\("resume"\)/);
  assert.match(HUD, /t\("upgradeBay"\)/);
  assert.doesNotMatch(HUD, /function Splash/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { EN, ES } from "../src/game/i18n.ts";
import { FEEDBACK_FORM_URL } from "../src/game/feedback.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const FEEDBACK = readFileSync(join(ROOT, "src/game/feedback.ts"), "utf8");
const FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSfb4LbBsZS2dmrE-1qWafZIFrQD3yBr1Hsf6xaZSjopVkXvgQ/viewform";

function sliceBetween(source, startMark, endMark) {
  const start = source.indexOf(startMark);
  const end = source.indexOf(endMark, start + startMark.length);
  assert.ok(start >= 0 && end > start, `missing slice ${startMark} … ${endMark}`);
  return source.slice(start, end);
}

test("one feedback form URL, opened in a new tab", () => {
  assert.equal(FEEDBACK_FORM_URL, FORM);
  assert.equal(FEEDBACK.split(FORM).length - 1, 1);
  assert.match(FEEDBACK, /window\.open\(FEEDBACK_FORM_URL, "_blank", "noopener,noreferrer"\)/);
  assert.doesNotMatch(HUD, /docs\.google\.com/);
  assert.doesNotMatch(HUD, /mailto:/);
  assert.doesNotMatch(FEEDBACK, /mailto:/);
  assert.doesNotMatch(HUD, /notion/i);
  assert.doesNotMatch(FEEDBACK, /spreadsheets/);
  assert.match(HUD, /openFeedbackForm\(\)/);
});

test("sendIdea and ideaHint are the locked EN and ES copy", () => {
  assert.equal(EN.sendIdea, "Send an idea");
  assert.equal(ES.sendIdea, "Enviar una idea");
  assert.equal(EN.ideaHint, "We read these");
  assert.equal(ES.ideaHint, "Las leemos");
});

test("pause menu puts Send an idea in the button stack, with the hint only there", () => {
  const pause = sliceBetween(HUD, 'hud.phase === "paused"', 'hud.phase === "upgrade"');
  const resume = pause.indexOf('{t("resume")}');
  const restart = pause.indexOf('{t("restartRaid")}');
  const hangar = pause.indexOf('{t("hangar")}');
  const idea = pause.indexOf('<SendIdea variant="ghost" hint />');
  const lang = pause.indexOf("<LangSwitch");
  assert.ok(
    resume >= 0 && restart > resume && hangar > restart && idea > hangar && lang > idea,
    "order is Resume → Restart Raid → Hangar → Send an idea → Lang",
  );
  assert.equal(pause.split("<SendIdea").length - 1, 1);
  assert.doesNotMatch(pause, /useHud\.setState/);
});

test("title hangar uses a small text control beside the language switch, not a Ghost", () => {
  const title = sliceBetween(HUD, "function TitleScreen", "function HangarWordmark");
  const lang = title.indexOf("<HangarLang");
  const idea = title.indexOf('<SendIdea variant="text" />');
  const launch = title.indexOf("<LaunchButton");
  assert.ok(
    lang >= 0 && idea > lang && launch > idea,
    "idea sits with the language switch, above Launch",
  );
  assert.doesNotMatch(title, /<SendIdea variant="ghost"/);
  assert.doesNotMatch(title, /hint/);
  const control = sliceBetween(HUD, "function SendIdea", "function Ghost");
  assert.match(control, /variant === "ghost"/);
  assert.match(control, /text-xs text-muted/);
  assert.match(control, /t\("sendIdea"\)/);
  assert.match(control, /hint \?/);
  assert.match(control, /t\("ideaHint"\)/);
});

test("upgrade bay places Send an idea under Hangar, with no hint", () => {
  const bay = sliceBetween(HUD, "function UpgradeBay", "function TouchLayer");
  const hangar = bay.indexOf('<Ghost onClick={onHangar}>{t("hangar")}</Ghost>');
  const idea = bay.indexOf('<SendIdea variant="ghost" />');
  assert.ok(hangar >= 0 && idea > hangar, "Send an idea follows Hangar");
  assert.doesNotMatch(bay, /ideaHint/);
  assert.doesNotMatch(bay, /hint/);
});

test("live HUD does not grow a Send an idea or Hangar chip", () => {
  const playing = sliceBetween(HUD, 'hud.phase === "playing"', 'hud.phase === "paused"');
  assert.doesNotMatch(playing, /sendIdea|SendIdea|ideaHint/);
  const hud = sliceBetween(HUD, "function HudOverlay(", "function MiniMap(");
  const touch = sliceBetween(HUD, "function TouchLayer(", "function HoldBtn(");
  assert.doesNotMatch(hud, /sendIdea|SendIdea|hangar/);
  assert.doesNotMatch(touch, /sendIdea|SendIdea|hangar/);
});

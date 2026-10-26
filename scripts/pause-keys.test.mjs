import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Input } from "../src/game/input.ts";
import { phaseAfterPauseKey } from "../src/game/pause.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const INPUT_SRC = readFileSync(join(ROOT, "src/game/input.ts"), "utf8");
const LOOP = readFileSync(join(ROOT, "src/game/loop.ts"), "utf8");

function createNode() {
  const caps = new Map();
  const bub = new Map();
  return {
    addEventListener(type, fn, opts) {
      const capture = opts === true || !!opts?.capture;
      const map = capture ? caps : bub;
      const list = map.get(type) ?? [];
      list.push(fn);
      map.set(type, list);
    },
    removeEventListener(type, fn, opts) {
      const capture = opts === true || !!opts?.capture;
      const map = capture ? caps : bub;
      map.set(
        type,
        (map.get(type) ?? []).filter((f) => f !== fn),
      );
    },
    fire(type, event, capture) {
      const map = capture ? caps : bub;
      for (const fn of [...(map.get(type) ?? [])]) {
        fn(event);
        if (event.stoppedImmediate) return;
      }
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 };
    },
  };
}

const root = createNode();
const win = createNode();
const doc = createNode();
globalThis.window = win;
globalThis.document = doc;

function makeKey(type, init = {}) {
  return {
    type,
    code: init.code ?? "",
    key: init.key ?? "",
    repeat: !!init.repeat,
    target: init.target ?? root,
    defaultPrevented: false,
    stopped: false,
    stoppedImmediate: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    },
    stopImmediatePropagation() {
      this.stopped = true;
      this.stoppedImmediate = true;
    },
  };
}

/** Window capture, then document, then the game root — the path a real key takes. */
function dispatchKey(event) {
  const chain = [win, doc, root];
  for (const node of chain) {
    node.fire(event.type, event, true);
    if (event.stopped) return event;
  }
  for (const node of [...chain].reverse()) {
    node.fire(event.type, event, false);
    if (event.stopped) return event;
  }
  return event;
}

function attach() {
  const input = new Input();
  input.attach(root);
  return input;
}

test("listeners are capture-phase on window, document, and the game root", () => {
  assert.match(INPUT_SRC, /window\.addEventListener\("keydown", kd, true\)/);
  assert.match(INPUT_SRC, /window\.addEventListener\("keyup", ku, true\)/);
  assert.match(INPUT_SRC, /document\.addEventListener\("keydown", kd, true\)/);
  assert.match(INPUT_SRC, /document\.addEventListener\("keyup", ku, true\)/);
  assert.match(INPUT_SRC, /target\.addEventListener\("keydown", kd, true\)/);
  assert.match(INPUT_SRC, /target\.addEventListener\("keyup", ku, true\)/);
  assert.match(LOOP, /phaseAfterPauseKey\(world\.state\.phase, input\.justPause, cutscene\)/);
  assert.match(HUD, /tabIndex=\{-1\}/);
  assert.match(HUD, /wrap\.focus\(\{ preventScroll: true \}\)/);
  assert.match(HUD, /handleRef\.current\?\.pause\(\)/);
  assert.match(HUD, /handleRef\.current\?\.resume\(\)/);
});

test("Escape and P keydown on the real listeners toggle pause and resume", () => {
  const input = attach();
  let phase = "playing";
  const down = makeKey("keydown", { code: "Escape", key: "Escape" });
  dispatchKey(down);
  assert.equal(down.defaultPrevented, true);
  input.update();
  phase = phaseAfterPauseKey(phase, input.justPause, false);
  assert.equal(phase, "paused");
  input.update();
  assert.equal(input.justPause, false);
  phase = phaseAfterPauseKey(phase, input.justPause, false);
  assert.equal(phase, "paused");

  dispatchKey(makeKey("keyup", { code: "Escape", key: "Escape" }));
  input.update();
  phase = phaseAfterPauseKey(phase, input.justPause, false);
  assert.equal(phase, "paused");

  dispatchKey(makeKey("keydown", { code: "KeyP", key: "p" }));
  input.update();
  phase = phaseAfterPauseKey(phase, input.justPause, false);
  assert.equal(phase, "playing");
  input.detach();
});

test("keyup-only Escape still pauses when keydown was swallowed", () => {
  const input = attach();
  const up = makeKey("keyup", { code: "Escape", key: "Escape" });
  dispatchKey(up);
  assert.equal(up.defaultPrevented, true);
  input.update();
  assert.equal(input.justPause, true);
  assert.equal(phaseAfterPauseKey("playing", input.justPause, false), "paused");
  input.update();
  assert.equal(input.justPause, false);
  input.detach();
});

test("keydown and keyup in the same turn toggle once", () => {
  const input = attach();
  dispatchKey(makeKey("keydown", { code: "KeyP", key: "P" }));
  dispatchKey(makeKey("keyup", { code: "KeyP", key: "P" }));
  input.update();
  assert.equal(input.justPause, true);
  assert.equal(phaseAfterPauseKey("paused", input.justPause, false), "playing");
  input.update();
  assert.equal(input.justPause, false);
  input.detach();
});

test("Escape with an empty code and a focused game root still pauses", () => {
  const input = attach();
  const viaRoot = makeKey("keydown", { code: "", key: "Escape" });
  root.fire("keydown", viaRoot, true);
  input.update();
  assert.equal(input.justPause, true);
  assert.equal(viaRoot.defaultPrevented, true);

  input.update();
  dispatchKey(makeKey("keyup", { key: "Escape" }));
  input.update();
  assert.equal(input.justPause, false);

  const viaDoc = makeKey("keydown", { code: "", key: "p" });
  doc.fire("keydown", viaDoc, true);
  input.update();
  assert.equal(input.justPause, true);
  assert.equal(phaseAfterPauseKey("paused", true, false), "playing");
  input.detach();
});

test("blur between keydown and the frame does not drop the pause edge", () => {
  const input = attach();
  dispatchKey(makeKey("keydown", { code: "Escape", key: "Escape" }));
  win.fire("blur", { type: "blur" }, false);
  input.update();
  assert.equal(input.justPause, true);
  assert.equal(phaseAfterPauseKey("playing", input.justPause, false), "paused");
  input.detach();
});

test("repeat Escape does not toggle twice, and WASD still moves", () => {
  const input = attach();
  dispatchKey(makeKey("keydown", { code: "Escape", key: "Escape" }));
  input.update();
  assert.equal(input.justPause, true);
  dispatchKey(makeKey("keydown", { code: "Escape", key: "Escape", repeat: true }));
  input.update();
  assert.equal(input.justPause, false);

  dispatchKey(makeKey("keydown", { code: "KeyD", key: "d" }));
  input.update();
  assert.equal(input.actions.moveX, 1);
  assert.equal(input.justPause, false);
  input.detach();
});

test("P typed into a field is not a pause key", () => {
  const input = attach();
  const ev = makeKey("keydown", {
    code: "KeyP",
    key: "p",
    target: { tagName: "INPUT", isContentEditable: false },
  });
  dispatchKey(ev);
  input.update();
  assert.equal(ev.defaultPrevented, false);
  assert.equal(input.justPause, false);
  input.detach();
});

test("cutscene blocks opening pause and does not block resume", () => {
  assert.equal(phaseAfterPauseKey("playing", true, true), "playing");
  assert.equal(phaseAfterPauseKey("playing", true, false), "paused");
  assert.equal(phaseAfterPauseKey("paused", true, true), "playing");
  assert.equal(phaseAfterPauseKey("title", true, false), "title");
});

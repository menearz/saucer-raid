export type Actions = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  beam: boolean;
  pause: boolean;
  start: boolean;
};

const DEAD = 0.18;

/** Keyboard codes `update()` actually reads. Labels are the words in How to play. */
export const MOVE_LEFT_KEYS = ["KeyA", "ArrowLeft"] as const;
export const MOVE_RIGHT_KEYS = ["KeyD", "ArrowRight"] as const;
export const MOVE_UP_KEYS = ["KeyW", "ArrowUp"] as const;
export const MOVE_DOWN_KEYS = ["KeyS", "ArrowDown"] as const;
export const BEAM_KEYS = ["Space", "KeyK"] as const;
export const FIRE_KEYS = ["KeyJ", "Mouse0", "ControlLeft"] as const;
export const PAUSE_KEY_CODES = ["Escape", "KeyP"] as const;

export const KEY_GUIDE: Record<string, { en: string; es: string }> = {
  KeyW: { en: "W", es: "W" },
  KeyA: { en: "A", es: "A" },
  KeyS: { en: "S", es: "S" },
  KeyD: { en: "D", es: "D" },
  ArrowUp: { en: "up arrow", es: "flecha arriba" },
  ArrowDown: { en: "down arrow", es: "flecha abajo" },
  ArrowLeft: { en: "left arrow", es: "flecha izquierda" },
  ArrowRight: { en: "right arrow", es: "flecha derecha" },
  Space: { en: "Space", es: "Espacio" },
  KeyK: { en: "K", es: "K" },
  KeyJ: { en: "J", es: "J" },
  ControlLeft: { en: "left Ctrl", es: "Ctrl izquierdo" },
  Mouse0: { en: "click", es: "clic" },
  Escape: { en: "Esc", es: "Esc" },
  KeyP: { en: "P", es: "P" },
};

/** Standard-mapping gamepad. `update()` reads these indexes. */
export const PAD_MOVE_AXES = [0, 1] as const;
export const PAD_AIM_AXES = [2, 3] as const;
export const PAD_LABELS = {
  move: { en: "left stick", es: "palanca izquierda" },
  aim: { en: "right stick", es: "palanca derecha" },
  fire: [
    { button: 0, en: "bottom face button", es: "botón de abajo" },
    { button: 7, en: "right trigger", es: "gatillo derecho" },
  ],
  beam: [
    { button: 1, en: "right face button", es: "botón de la derecha" },
    { button: 6, en: "left trigger", es: "gatillo izquierdo" },
  ],
  pause: { button: 9, en: "Start", es: "Start" },
} as const;
export const PAD_FIRE_BUTTONS = PAD_LABELS.fire.map((b) => b.button);
export const PAD_BEAM_BUTTONS = PAD_LABELS.beam.map((b) => b.button);
export const PAD_PAUSE_BUTTON = PAD_LABELS.pause.button;

export function keyboardGuideCodes(): readonly string[] {
  return [
    ...MOVE_LEFT_KEYS,
    ...MOVE_RIGHT_KEYS,
    ...MOVE_UP_KEYS,
    ...MOVE_DOWN_KEYS,
    ...BEAM_KEYS,
    ...FIRE_KEYS,
    ...PAUSE_KEY_CODES,
  ];
}

function anyHeld(keys: Set<string>, codes: readonly string[]) {
  for (const code of codes) if (keys.has(code)) return true;
  return false;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as HTMLElement;
  if (typeof el.tagName !== "string") return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(el.isContentEditable);
}

/** Physical Escape/P, including hosts that set key and leave code empty. */
export function isPauseKey(e: { code?: string; key?: string }): boolean {
  const code = e.code ?? "";
  const key = e.key ?? "";
  return (
    code === "Escape" ||
    code === "KeyP" ||
    key === "Escape" ||
    key === "Esc" ||
    key === "p" ||
    key === "P"
  );
}

function pauseCode(e: { code?: string; key?: string }): "Escape" | "KeyP" {
  const code = e.code ?? "";
  const key = e.key ?? "";
  if (code === "KeyP" || key === "p" || key === "P") return "KeyP";
  return "Escape";
}

function radial(x: number, y: number, dz = DEAD) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const s = (m - dz) / (1 - dz) / m;
  return { x: x * s, y: y * s };
}

export type PointerStick = {
  id: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
  kind: "move" | "aim";
};

export class Input {
  keys = new Set<string>();
  injected = new Set<string>();
  actions: Actions = {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    fire: false,
    beam: false,
    pause: false,
    start: false,
  };
  prevFire = false;
  prevPause = false;
  prevStart = false;
  justFire = false;
  justPause = false;
  justStart = false;
  mouseX = 0;
  mouseY = 0;
  hasMouseAim = false;
  beamHeld = false;
  fireHeld = false;
  sticks: PointerStick[] = [];
  overrideMove: { x: number; y: number } | null = null;
  qaSteer = 0;
  /** Latched on the key event so a blur/reset before the next frame cannot drop it. */
  private pauseEdge = false;
  /** True when this gesture's keydown was delivered. Keyup then must not toggle again. */
  private sawPauseDown = false;
  /** Same event object can hit window, document, and the game root. Count it once. */
  private pauseStamp: Event | null = null;
  private unsubs: Array<() => void> = [];

  reset() {
    this.keys.clear();
    this.injected.clear();
    this.sticks = [];
    this.beamHeld = false;
    this.fireHeld = false;
    this.overrideMove = null;
    this.qaSteer = 0;
    this.hasMouseAim = false;
    this.prevFire = false;
    this.prevPause = false;
    this.prevStart = false;
    this.justFire = false;
    this.justPause = false;
    this.justStart = false;
    this.pauseEdge = false;
    this.sawPauseDown = false;
    this.pauseStamp = null;
    this.actions = {
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      fire: false,
      beam: false,
      pause: false,
      start: false,
    };
  }

  attach(target: HTMLElement) {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (isPauseKey(e)) {
        // Room-code fields must still receive P. Everywhere else, pause keys
        // are consumed even when a HUD button has focus.
        if (isTypingTarget(e.target)) return;
        this.notePauseKey(e, down);
        return;
      }
      const code = e.code;
      if (
        [
          ...MOVE_LEFT_KEYS,
          ...MOVE_RIGHT_KEYS,
          ...MOVE_UP_KEYS,
          ...MOVE_DOWN_KEYS,
          "Space",
        ].includes(code)
      ) {
        e.preventDefault();
      }
      if (down) this.keys.add(code);
      else this.keys.delete(code);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    // Alt-tab should drop stuck movement, but not a pause edge that just landed.
    const blur = () => {
      const edge = this.pauseEdge;
      const saw = this.sawPauseDown;
      this.reset();
      this.pauseEdge = edge;
      this.sawPauseDown = saw;
    };
    const pointerLost = (e: PointerEvent) => {
      this.endStick(e.pointerId);
      if (e.pointerType === "mouse") this.keys.delete("Mouse0");
    };
    const mm = (e: PointerEvent) => {
      const r = target.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
      this.hasMouseAim = e.pointerType === "mouse";
    };
    // Capture on window, document, and the game root. A bubble-only window
    // listener misses Escape when a focused overlay stops the event on the
    // way up, and some hosts deliver Escape on keyup only (keydown swallowed).
    window.addEventListener("keydown", kd, true);
    window.addEventListener("keyup", ku, true);
    document.addEventListener("keydown", kd, true);
    document.addEventListener("keyup", ku, true);
    target.addEventListener("keydown", kd, true);
    target.addEventListener("keyup", ku, true);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    window.addEventListener("pointerup", pointerLost);
    window.addEventListener("pointercancel", pointerLost);
    target.addEventListener("pointermove", mm);
    this.unsubs.push(() => {
      window.removeEventListener("keydown", kd, true);
      window.removeEventListener("keyup", ku, true);
      document.removeEventListener("keydown", kd, true);
      document.removeEventListener("keyup", ku, true);
      target.removeEventListener("keydown", kd, true);
      target.removeEventListener("keyup", ku, true);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
      window.removeEventListener("pointerup", pointerLost);
      window.removeEventListener("pointercancel", pointerLost);
      target.removeEventListener("pointermove", mm);
    });
  }

  private notePauseKey(e: KeyboardEvent, down: boolean) {
    if (this.pauseStamp === e) return;
    this.pauseStamp = e;
    e.preventDefault();
    e.stopPropagation();
    const code = pauseCode(e);
    if (down) {
      if (!e.repeat) {
        this.sawPauseDown = true;
        this.pauseEdge = true;
      }
      this.keys.add(code);
    } else if (!this.sawPauseDown) {
      // keydown never reached the page; the keyup is the real press.
      this.pauseEdge = true;
      this.keys.delete("Escape");
      this.keys.delete("KeyP");
    } else {
      this.sawPauseDown = false;
      this.keys.delete("Escape");
      this.keys.delete("KeyP");
    }
  }

  detach() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  setSteer(v: number) {
    this.qaSteer = v;
  }

  setBeam(v: boolean) {
    this.beamHeld = v;
  }

  setFire(v: boolean) {
    this.fireHeld = v;
  }

  beginStick(id: number, x: number, y: number, kind: "move" | "aim") {
    this.sticks = this.sticks.filter((s) => s.id !== id);
    this.sticks.push({ id, ox: x, oy: y, x, y, kind });
  }

  moveStick(id: number, x: number, y: number) {
    const s = this.sticks.find((p) => p.id === id);
    if (s) {
      s.x = x;
      s.y = y;
    }
  }

  endStick(id: number) {
    this.sticks = this.sticks.filter((s) => s.id !== id);
  }

  update() {
    const keys = new Set([...this.keys, ...this.injected]);
    let mx = 0;
    let my = 0;
    if (anyHeld(keys, MOVE_LEFT_KEYS)) mx -= 1;
    if (anyHeld(keys, MOVE_RIGHT_KEYS)) mx += 1;
    if (anyHeld(keys, MOVE_UP_KEYS)) my -= 1;
    if (anyHeld(keys, MOVE_DOWN_KEYS)) my += 1;

    const moveStick = this.sticks.find((s) => s.kind === "move");
    if (moveStick) {
      const dx = (moveStick.x - moveStick.ox) / 54;
      const dy = (moveStick.y - moveStick.oy) / 54;
      const v = radial(dx, dy, 0.12);
      mx = v.x;
      my = v.y;
    }

    if (this.qaSteer !== 0) mx = -this.qaSteer;
    if (this.overrideMove) {
      mx = this.overrideMove.x;
      my = this.overrideMove.y;
    }

    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    let ax = 0;
    let ay = 0;
    const aimStick = this.sticks.find((s) => s.kind === "aim");
    if (aimStick) {
      const dx = (aimStick.x - aimStick.ox) / 48;
      const dy = (aimStick.y - aimStick.oy) / 48;
      const v = radial(dx, dy, 0.18);
      ax = v.x;
      ay = v.y;
    }

    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : [];
    let padFire = false;
    let padBeam = false;
    if (pads) {
      for (const p of pads) {
        if (!p) continue;
        const ls = radial(p.axes[PAD_MOVE_AXES[0]] ?? 0, p.axes[PAD_MOVE_AXES[1]] ?? 0);
        if (ls.x || ls.y) {
          mx = ls.x;
          my = ls.y;
        }
        const rs = radial(p.axes[PAD_AIM_AXES[0]] ?? 0, p.axes[PAD_AIM_AXES[1]] ?? 0);
        if (rs.x || rs.y) {
          ax = rs.x;
          ay = rs.y;
        }
        if (PAD_FIRE_BUTTONS.some((i) => p.buttons[i]?.pressed)) padFire = true;
        if (PAD_BEAM_BUTTONS.some((i) => p.buttons[i]?.pressed)) padBeam = true;
        if (p.buttons[PAD_PAUSE_BUTTON]?.pressed) keys.add("Escape");
      }
    }

    const fire =
      this.fireHeld ||
      padFire ||
      anyHeld(keys, FIRE_KEYS) ||
      (aimStick != null && Math.hypot(ax, ay) > 0.35);
    const beam = this.beamHeld || padBeam || anyHeld(keys, BEAM_KEYS);
    const pauseHeld = anyHeld(keys, PAUSE_KEY_CODES);
    const start = keys.has("Enter") || keys.has("Space");

    this.justFire = fire && !this.prevFire;
    this.justPause = this.pauseEdge || (pauseHeld && !this.prevPause);
    this.pauseEdge = false;
    this.justStart = start && !this.prevStart;
    this.prevFire = fire;
    this.prevPause = pauseHeld;
    this.prevStart = start;

    this.actions = {
      moveX: mx,
      moveY: my,
      aimX: ax,
      aimY: ay,
      fire,
      beam,
      pause: pauseHeld,
      start,
    };
  }
}

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
  const s = ((m - dz) / (1 - dz)) / m;
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
          "Space",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
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
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;

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
        const ls = radial(p.axes[0] ?? 0, p.axes[1] ?? 0);
        if (ls.x || ls.y) {
          mx = ls.x;
          my = ls.y;
        }
        const rs = radial(p.axes[2] ?? 0, p.axes[3] ?? 0);
        if (rs.x || rs.y) {
          ax = rs.x;
          ay = rs.y;
        }
        if (p.buttons[0]?.pressed || p.buttons[7]?.pressed) padFire = true;
        if (p.buttons[1]?.pressed || p.buttons[6]?.pressed) padBeam = true;
        if (p.buttons[9]?.pressed) keys.add("Escape");
      }
    }

    const fire =
      this.fireHeld ||
      padFire ||
      keys.has("KeyJ") ||
      keys.has("Mouse0") ||
      keys.has("ControlLeft") ||
      (aimStick != null && Math.hypot(ax, ay) > 0.35);
    const beam = this.beamHeld || padBeam || keys.has("Space") || keys.has("KeyK");
    const pauseHeld = keys.has("Escape") || keys.has("KeyP");
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

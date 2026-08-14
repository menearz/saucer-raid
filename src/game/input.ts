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
  private unsubs: Array<() => void> = [];

  attach(target: HTMLElement) {
    const onKey = (e: KeyboardEvent, down: boolean) => {
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
    const blur = () => {
      this.keys.clear();
      this.sticks = [];
      this.beamHeld = false;
      this.fireHeld = false;
    };
    const mm = (e: PointerEvent) => {
      const r = target.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
      this.hasMouseAim = e.pointerType === "mouse";
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    target.addEventListener("pointermove", mm);
    this.unsubs.push(() => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
      target.removeEventListener("pointermove", mm);
    });
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
        if (p.buttons[0]?.pressed || p.buttons[7]?.pressed) this.fireHeld = true;
        if (p.buttons[1]?.pressed || p.buttons[6]?.pressed) this.beamHeld = true;
        if (p.buttons[9]?.pressed) keys.add("Escape");
      }
    }

    const fire =
      this.fireHeld ||
      keys.has("KeyJ") ||
      keys.has("Mouse0") ||
      keys.has("ControlLeft") ||
      (aimStick != null && Math.hypot(ax, ay) > 0.35);
    const beam = this.beamHeld || keys.has("Space") || keys.has("KeyK");
    const pause = keys.has("Escape") || keys.has("KeyP");
    const start = keys.has("Enter") || keys.has("Space");

    this.justFire = fire && !this.prevFire;
    this.justPause = pause && !this.prevPause;
    this.justStart = start && !this.prevStart;
    this.prevFire = fire;
    this.prevPause = pause;
    this.prevStart = start;

    this.actions = {
      moveX: mx,
      moveY: my,
      aimX: ax,
      aimY: ay,
      fire,
      beam,
      pause,
      start,
    };
  }
}

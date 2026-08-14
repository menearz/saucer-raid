type Pattern = number | number[];

function supported() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

let enabled = true;
let lastLaser = 0;
let lastBeam = 0;
let unlocked = false;

function rumblePad(duration: number, strong = 0.45, weak = 0.25) {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return;
  for (const pad of navigator.getGamepads()) {
    const actuator = pad?.vibrationActuator;
    if (!actuator) continue;
    void actuator.playEffect("dual-rumble", {
      startDelay: 0,
      duration,
      strongMagnitude: strong,
      weakMagnitude: weak,
    });
  }
}

function pulse(pattern: Pattern) {
  if (!enabled) return;
  if (supported()) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* some WebViews throw */
    }
  }
  const first = Array.isArray(pattern) ? pattern[0] : pattern;
  rumblePad(Math.max(12, first ?? 12));
}

export const haptics = {
  unlock() {
    unlocked = true;
    pulse(8);
  },
  isUnlocked() {
    return unlocked;
  },
  laser() {
    const now = performance.now();
    if (now - lastLaser < 80) return;
    lastLaser = now;
    pulse(16);
    rumblePad(18, 0.18, 0.35);
  },
  beam() {
    const now = performance.now();
    if (now - lastBeam < 280) return;
    lastBeam = now;
    pulse(18);
    rumblePad(22, 0.12, 0.28);
  },
  abduct() {
    pulse([20, 24, 40]);
    rumblePad(70, 0.55, 0.4);
  },
  explode(heavy = false) {
    pulse(heavy ? [40, 20, 64] : [24, 16, 34]);
    rumblePad(heavy ? 90 : 50, heavy ? 0.85 : 0.45, 0.4);
  },
  hit() {
    pulse(14);
    rumblePad(16, 0.22, 0.18);
  },
  hurt() {
    pulse([50, 30, 80]);
    rumblePad(140, 1, 0.6);
  },
  gameOver() {
    pulse([80, 40, 80, 40, 140]);
    rumblePad(280, 1, 0.7);
  },
  tap() {
    pulse(14);
  },
  setEnabled(on: boolean) {
    enabled = on;
    if (!on && supported()) navigator.vibrate(0);
  },
};

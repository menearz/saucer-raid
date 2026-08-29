import { audio } from "./audio";
import type { CraftId } from "./crafts";
import { createGlRenderer } from "./gl";
import type { Input } from "./input";
import { smashNearestSpecial, startRaid, step, screenToWorld, worldToScreen } from "./sim";
import { patchHud } from "./store";
import { loadBest, type World } from "./world";
import { loadProgress, type MapMark } from "./progress";
import { WORLD_H, WORLD_W } from "./types";

const STEP = 1 / 60;

export type GameHandle = {
  destroy: () => void;
  start: (kind?: "start" | "next" | "retry") => void;
  pause: () => void;
  resume: () => void;
  world: World;
};

export function runGame(
  canvas: HTMLCanvasElement,
  world: World,
  input: Input,
): GameHandle {
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let hudT = 0;
  let running = true;
  let lastPhase = world.state.phase;
  const gl = createGlRenderer(canvas);

  const resize = () => {
    gl.resize();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener("orientationchange", resize);
  window.visualViewport?.addEventListener("resize", resize);

  const probe = () => {
    window.__controlsTest = {
      getYaw: () => world.qaYaw,
      getSpeed: () => Math.hypot(world.saucer.vx, world.saucer.vy),
      getX: () => world.saucer.x,
      getY: () => world.saucer.y,
      setKeys: (codes) => input.setKeys(codes),
      setSteer: (v) => input.setSteer(v),
      restart: () => {
        input.reset();
        startRaid(world, "retry");
        last = performance.now();
        acc = 0;
        flushHud();
      },
      getMove: () => ({ x: input.actions.moveX, y: input.actions.moveY }),
      smashNearestSpecial: () => smashNearestSpecial(world),
      getLoot: () => world.actors.filter((a) => a.kind === "loot" && !a.dead).length,
      getTier: () => world.state.weaponTier,
      getCloak: () => world.state.cloakT,
      getLevel: () => world.state.level,
      endSector: () => {
        world.state.timeLeft = 0.05;
      },
    };
  };
  probe();

  const flushHud = () => {
    const st = world.state;
    const zoom = world.state.camZoom || 1;
    const marks: MapMark[] = [
      { x: world.saucer.x / WORLD_W, y: world.saucer.y / WORLD_H, t: "you" },
    ];
    for (const a of world.actors) {
      if (a.dead) continue;
      if (a.kind === "special") {
        marks.push({
          x: a.x / WORLD_W,
          y: a.y / WORLD_H,
          t: a.loot === "cloak" ? "cloak" : "gun",
        });
      } else if (a.kind === "loot") {
        marks.push({ x: a.x / WORLD_W, y: a.y / WORLD_H, t: "loot" });
      } else if (a.kind === "jeep" || a.kind === "tank" || a.kind === "heli" || a.kind === "plane") {
        marks.push({ x: a.x / WORLD_W, y: a.y / WORLD_H, t: a.kind });
      }
    }
    const prog = loadProgress();
    patchHud({
      phase: st.phase,
      score: st.score,
      combo: st.combo,
      heat: st.heat,
      timeLeft: st.timeLeft,
      hp: st.hp,
      maxHp: st.maxHp,
      abducted: st.stats.abducted,
      destroyed: st.stats.destroyed,
      best: Math.max(loadBest(), st.score),
      stats: st.stats,
      reason: st.reason,
      alert: st.alert,
      ...(st.phase === "playing"
        ? { craftId: (st.craftId as CraftId) || "disc" }
        : {}),
      shouts: (world.shouts ?? []).map((s) => {
        const p = worldToScreen(world, s.x, s.y, canvas.clientWidth, canvas.clientHeight, zoom);
        return { ...s, x: p.x, y: p.y };
      }),
      weaponTier: st.weaponTier ?? 0,
      cloakT: st.cloakT ?? 0,
      level: st.level || prog.level,
      salvage: prog.salvage,
      shield: st.shield ?? 0,
      shieldMax: st.shieldMax ?? 0,
      marks,
    });
  };

  const frame = (now: number) => {
    if (!running) return;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    input.update();

    if (input.hasMouseAim && !input.sticks.some((s) => s.kind === "aim")) {
      const zoom = world.state.camZoom || 1;
      const wpos = screenToWorld(
        world,
        input.mouseX,
        input.mouseY,
        canvas.clientWidth,
        canvas.clientHeight,
        zoom,
      );
      const dx = wpos.x - world.saucer.x;
      const dy = wpos.y - world.saucer.y;
      const len = Math.hypot(dx, dy);
      if (len > 8) {
        input.actions.aimX = dx / len;
        input.actions.aimY = dy / len;
      }
    }

    if (world.state.phase === "playing" && input.justPause) {
      world.state.phase = "paused";
      audio.stopBeam();
      flushHud();
    } else if (world.state.phase === "paused" && input.justPause) {
      world.state.phase = "playing";
      flushHud();
    }

    acc += dt;
    while (acc >= STEP) {
      if (world.state.phase === "playing") {
        if (world.state.hitstop > 0) world.state.hitstop -= STEP;
        else step(world, input.actions, STEP);
      }
      acc -= STEP;
    }

    if (
      lastPhase === "playing" &&
      world.state.phase !== "playing" &&
      world.state.phase !== "paused"
    ) {
      input.reset();
    }
    lastPhase = world.state.phase;

    gl.render(world, now);

    hudT += dt;
    if (hudT > 0.08) {
      hudT = 0;
      flushHud();
    }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  flushHud();

  return {
    world,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      audio.stopBeam();
      gl.dispose();
      delete window.__controlsTest;
    },
    start(kind: "start" | "next" | "retry" = "start") {
      input.reset();
      audio.unlock();
      startRaid(world, kind);
      last = performance.now();
      acc = 0;
      flushHud();
    },
    pause() {
      if (world.state.phase === "playing") world.state.phase = "paused";
      flushHud();
    },
    resume() {
      if (world.state.phase === "paused") world.state.phase = "playing";
      flushHud();
    },
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX?: () => number;
      getY?: () => number;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
      restart?: () => void;
      getMove?: () => { x: number; y: number };
      smashNearestSpecial?: () => boolean;
      getLoot?: () => number;
      getTier?: () => number;
      getCloak?: () => number;
      getLevel?: () => number;
      endSector?: () => void;
    };
  }
}

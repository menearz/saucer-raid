import { audio } from "./audio";
import { createGlRenderer } from "./gl";
import type { Input } from "./input";
import { startRaid, step, screenToWorld } from "./sim";
import { patchHud } from "./store";
import { loadBest, type World } from "./world";

const STEP = 1 / 60;

export type GameHandle = {
  destroy: () => void;
  start: () => void;
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
    };
  };
  probe();

  const flushHud = () => {
    const st = world.state;
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
    start() {
      audio.unlock();
      startRaid(world);
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
    };
  }
}

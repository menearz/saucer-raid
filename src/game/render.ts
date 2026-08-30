import { art } from "./assets";
import { hullSpriteName } from "./hull-sprite";
import { traumaOffset } from "./sim";
import { COLS, ROWS, TILE, WORLD_H, WORLD_W, type Actor } from "./types";
import type { World } from "./world";

function hullImage(w: World, now: number): HTMLImageElement | undefined {
  const fi = Math.floor(now / 140) % 4;
  const name = hullSpriteName(w.state.craftId, w.saucer.sprite, fi);
  if (name.startsWith("saucer-")) {
    const i = Number(name.slice(-1)) - 1;
    return art.saucer[i];
  }
  return art.sprite[name];
}

function img(name: string) {
  return art.sprite[name];
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  im: HTMLImageElement | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  rot = 0,
  alpha = 1,
  flash = false,
) {
  if (!im) return;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  if (flash) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, w: World, now: number) {
  const canvas = ctx.canvas;
  const dpr = canvas.width / Math.max(1, canvas.clientWidth);
  const vw = canvas.width / dpr;
  const vh = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#0b120e";
  ctx.fillRect(0, 0, vw, vh);

  const landscape = vw > vh;
  const zoom = landscape ? vh / 380 : vw / 400;
  w.state.camZoom = zoom;
  const sh = traumaOffset(w);
  const camX = w.state.camX;
  const camY = w.state.camY;

  ctx.save();
  ctx.translate(vw / 2 + sh.x, vh / 2 + sh.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-camX, -camY);

  const viewL = camX - vw / 2 / zoom - TILE;
  const viewT = camY - vh / 2 / zoom - TILE;
  const viewR = camX + vw / 2 / zoom + TILE;
  const viewB = camY + vh / 2 / zoom + TILE;
  const tx0 = Math.max(0, Math.floor(viewL / TILE));
  const ty0 = Math.max(0, Math.floor(viewT / TILE));
  const tx1 = Math.min(COLS, Math.ceil(viewR / TILE));
  const ty1 = Math.min(ROWS, Math.ceil(viewB / TILE));

  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const t = w.terrain[ty * COLS + tx] ?? 0;
      const tile = art.tile[t];
      if (tile) ctx.drawImage(tile, tx * TILE, ty * TILE, TILE + 0.6, TILE + 0.6);
    }
  }

  // dusk wash
  ctx.fillStyle = "rgba(12, 22, 36, 0.26)";
  ctx.fillRect(viewL, viewT, viewR - viewL, viewB - viewT);

  // saucer spotlight
  const s = w.saucer;
  const spot = ctx.createRadialGradient(s.x, s.y, 20, s.x, s.y, 260);
  spot.addColorStop(0, "rgba(180, 230, 200, 0.16)");
  spot.addColorStop(1, "rgba(180, 230, 200, 0)");
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 260, 0, Math.PI * 2);
  ctx.fill();

  if (w.beamOn) {
    const pulse = 0.55 + Math.sin(now * 0.014) * 0.12;
    const grd = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 88);
    grd.addColorStop(0, `rgba(140, 255, 190, ${0.42 * pulse})`);
    grd.addColorStop(0.55, `rgba(80, 220, 150, ${0.16 * pulse})`);
    grd.addColorStop(1, "rgba(80, 220, 150, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 10, 78, 86, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(160, 255, 200, ${0.35 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 8, 70, 76, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const drawables: Actor[] = [
    ...w.actors.filter((a) => !a.dead || a.kind === "rubble"),
    s,
  ];
  drawables.sort((a, b) => a.y - b.y);

  for (const a of drawables) {
    if (a.x < viewL - 80 || a.x > viewR + 80 || a.y < viewT - 80 || a.y > viewB + 80) {
      continue;
    }
    if (a.kind === "saucer") continue;

    const lift = a.lift > 0 ? Math.min(36, a.lift * 48) : 0;
    const bob = a.abductable ? Math.sin(now * 0.004 + a.id) * 1.2 : 0;
    const alpha = a.kind === "rubble" ? 0.92 : 1;
    const flash = a.flash > 0;

    // soft contact shadow
    ctx.save();
    ctx.globalAlpha = 0.22 * (1 - lift / 40);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(a.x, a.y + a.h * 0.28, a.w * 0.28, a.h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const spriteName =
      a.kind === "rubble" ? a.sprite : a.propKey ? a.propKey : a.sprite;
    const im = img(spriteName);
    const rot = a.kind === "jeep" || a.kind === "laser" ? a.facing : 0;
    drawSprite(ctx, im, a.x, a.y - lift + bob, a.w, a.h, rot, alpha, flash);

    if (a.destructible && a.hp < a.maxHp && a.kind !== "prop") {
      const pct = a.hp / a.maxHp;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(a.x - 16, a.y - a.h * 0.55, 32, 4);
      ctx.fillStyle = pct > 0.4 ? "#6fdb9a" : "#d46a4c";
      ctx.fillRect(a.x - 16, a.y - a.h * 0.55, 32 * pct, 4);
    }
  }

  // lasers
  let li = 0;
  for (const L of w.lasers) {
    const frame = art.laser[li++ % art.laser.length];
    drawSprite(ctx, frame, L.x, L.y, 28, 14, L.facing, 1, false);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#9dffc8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.x - Math.cos(L.facing) * 10, L.y - Math.sin(L.facing) * 10);
    ctx.lineTo(L.x + Math.cos(L.facing) * 8, L.y + Math.sin(L.facing) * 8);
    ctx.stroke();
    ctx.restore();
  }

  for (const b of w.bullets) {
    ctx.fillStyle = "#d46a4c";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd0b8";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of w.particles) {
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const ex of w.explosions) {
    const fi = Math.min(3, Math.floor((ex.t / 0.45) * 4));
    const frame = art.explode[fi];
    const sc = 90 * ex.scale * (0.85 + ex.t);
    drawSprite(ctx, frame, ex.x, ex.y, sc, sc, 0, 1 - ex.t * 0.4, false);
  }

  // saucer last so it reads on top
  const hover = Math.sin(now * 0.006) * 4;
  const hull = hullImage(w, now);
  const hullRot = w.state.craftId && w.state.craftId !== "disc" ? s.facing : 0;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 22, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (s.flash > 0 && Math.floor(now / 70) % 2 === 0) ctx.globalAlpha = 0.45;
  drawSprite(ctx, hull, s.x, s.y + hover, s.w, s.h, hullRot, 1, s.flash > 0.4);
  ctx.globalAlpha = 1;

  for (const pop of w.popups) {
    const a = pop.life / pop.max;
    ctx.globalAlpha = a;
    ctx.font = "700 16px 'IBM Plex Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8ffe8";
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(
    vw / 2,
    vh / 2,
    Math.min(vw, vh) * 0.25,
    vw / 2,
    vh / 2,
    Math.max(vw, vh) * 0.72,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, vw, vh);

  void WORLD_W;
  void WORLD_H;
}

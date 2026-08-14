import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] || "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(page, name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}`, fullPage: false });
  console.log("shot", name);
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot(page, "mobile-title.png");

await page.getByRole("button", { name: /begin raid/i }).click();
await page.waitForTimeout(700);
await shot(page, "mobile-play.png");

// Hold D (right) then A (left) and read probe
const before = await page.evaluate(() => {
  const t = window.__controlsTest;
  return t ? { x: t.getX?.(), yaw: t.getYaw(), speed: t.getSpeed() } : null;
});
await page.keyboard.down("KeyD");
await page.waitForTimeout(500);
const afterD = await page.evaluate(() => {
  const t = window.__controlsTest;
  return t ? { x: t.getX?.(), yaw: t.getYaw(), speed: t.getSpeed() } : null;
});
await page.keyboard.up("KeyD");
await page.keyboard.down("KeyA");
await page.waitForTimeout(500);
const afterA = await page.evaluate(() => {
  const t = window.__controlsTest;
  return t ? { x: t.getX?.(), yaw: t.getYaw(), speed: t.getSpeed() } : null;
});
await page.keyboard.up("KeyA");

await page.keyboard.down("Space");
await page.waitForTimeout(600);
await shot(page, "mobile-beam.png");
await page.keyboard.up("Space");

await page.keyboard.down("KeyJ");
await page.waitForTimeout(400);
await shot(page, "mobile-fire.png");
await page.keyboard.up("KeyJ");

// fly around a bit
await page.keyboard.down("KeyW");
await page.waitForTimeout(1200);
await page.keyboard.up("KeyW");
await shot(page, "mobile-fly.png");

console.log(JSON.stringify({ before, afterD, afterA, errors }, null, 2));

const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
desk.on("pageerror", (e) => errors.push("desk " + String(e)));
await desk.goto(url, { waitUntil: "networkidle" });
await desk.waitForTimeout(600);
await desk.getByRole("button", { name: /begin raid/i }).click();
await desk.waitForTimeout(800);
await desk.screenshot({ path: "/workspace/screenshots/desktop-play.png" });

await browser.close();
if (errors.length) {
  console.error("ERRORS", errors);
  process.exit(1);
}

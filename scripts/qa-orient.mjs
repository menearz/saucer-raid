import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function run(viewport, name) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`${name} ${e}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} ${m.text()}`);
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    inner: window.innerWidth,
    bodyOverflow: document.body.scrollWidth > window.innerWidth + 2,
  }));
  await page.screenshot({ path: `/workspace/screenshots/${name}-title.png` });
  await page.getByRole("button", { name: /begin raid/i }).click({ timeout: 15000 });
  await page.waitForTimeout(600);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(400);
  const afterD = await page.evaluate(() => {
    const t = window.__controlsTest;
    return t ? { x: t.getX?.(), speed: t.getSpeed() } : null;
  });
  await page.keyboard.up("KeyD");
  await page.screenshot({ path: `/workspace/screenshots/${name}-play.png` });
  await page.close();
  console.log(name, JSON.stringify({ overflow, afterD }));
}

await run({ width: 390, height: 844 }, "port");
await run({ width: 844, height: 390 }, "land");

await browser.close();
if (errors.length) {
  console.error(errors);
  process.exit(1);
}
console.log("ok");

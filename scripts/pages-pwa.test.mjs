import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

function pngSize(rel) {
  const buf = readFileSync(join(ROOT, rel));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("Pages config wires vite-plugin-pwa on the github.io base", () => {
  const pages = read("vite.pages.config.ts");
  assert.match(pages, /from "vite-plugin-pwa"/);
  assert.match(pages, /VitePWA\(/);
  assert.match(pages, /base:\s*"\/saucer-raid\/"/);
  assert.match(pages, /pwa:\s*true/);
  assert.match(pages, /start_url:\s*PAGES_BASE/);
  assert.match(pages, /scope:\s*PAGES_BASE/);
});

test("PWA icons are cropped from Spectre's store square", () => {
  assert.equal(pngSize("public/pwa-192.png").width, 192);
  assert.equal(pngSize("public/pwa-192.png").height, 192);
  assert.equal(pngSize("public/pwa-512.png").width, 512);
  assert.equal(pngSize("public/pwa-512.png").height, 512);
  assert.equal(pngSize("public/apple-touch-icon.png").width, 180);
  assert.equal(pngSize("public/apple-touch-icon.png").height, 180);
  assert.ok(existsSync(join(ROOT, "store/icon-1024.png")), "store icon missing");
});

test("built docs/ ships an installable Pages PWA", () => {
  const html = read("docs/index.html");
  assert.match(html, /rel="manifest"/);
  assert.match(html, /\/saucer-raid\/manifest\.webmanifest/);
  assert.match(html, /serviceWorker|workbox|registerSW|navigator\.serviceWorker/);
  assert.match(html, /apple-touch-icon/);

  const manifest = JSON.parse(read("docs/manifest.webmanifest"));
  assert.equal(manifest.name, "Saucer Raid");
  assert.equal(manifest.short_name, "Saucer Raid");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/saucer-raid/");
  assert.equal(manifest.scope, "/saucer-raid/");
  const sizes = new Set(manifest.icons.map((icon) => icon.sizes));
  assert.ok(sizes.has("192x192"), "missing 192 icon");
  assert.ok(sizes.has("512x512"), "missing 512 icon");

  const swName = ["docs/sw.js", "docs/service-worker.js"].find((rel) => existsSync(join(ROOT, rel)));
  assert.ok(swName, "service worker missing from docs/");
  const sw = read(swName);
  // Workbox generateSW registers fetch via precacheAndRoute / registerRoute.
  assert.match(sw, /precacheAndRoute|registerRoute|addEventListener\(\s*["']fetch["']/);
  assert.match(sw, /\/saucer-raid\/index\.html/);
  assert.ok(existsSync(join(ROOT, "docs/pwa-192.png")));
  assert.ok(existsSync(join(ROOT, "docs/pwa-512.png")));
  assert.ok(existsSync(join(ROOT, "docs/registerSW.js")));
});

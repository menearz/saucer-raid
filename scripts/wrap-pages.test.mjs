import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

test("Pages build keeps github.io base and docs output", () => {
  const pages = read("vite.pages.config.ts");
  const pkg = read("package.json");
  assert.match(pages, /base:\s*"\/saucer-raid\/"/);
  assert.match(pages, /outDir:.*["']docs["']/);
  assert.match(
    pkg,
    /"build:pages": "vite build --config vite.pages.config.ts && cp docs\/index.html docs\/404.html && touch docs\/.nojekyll"/,
  );
});

test("wrap build uses root base and dist, not the Pages path", () => {
  const wrap = read("vite.wrap.config.ts");
  const cap = read("capacitor.config.ts");
  assert.match(wrap, /base:\s*"\/"/);
  assert.match(wrap, /outDir:.*["']dist["']/);
  assert.doesNotMatch(wrap, /base:\s*"\/saucer-raid\/"/);
  assert.match(wrap, /pwa:\s*false/);
  assert.doesNotMatch(wrap, /VitePWA/);
  assert.match(cap, /appId:\s*"com\.saucerraid\.alienattacksaucer"/);
  assert.match(cap, /appName:\s*"Alien Attack Saucer"/);
  assert.match(cap, /webDir:\s*"dist"/);
});

test("native wrap projects exist with the store package id", () => {
  const gradle = read("android/app/build.gradle");
  const strings = read("android/app/src/main/res/values/strings.xml");
  const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
  const plist = read("ios/App/App/Info.plist");
  assert.match(gradle, /namespace = "com\.saucerraid\.alienattacksaucer"/);
  assert.match(gradle, /applicationId "com\.saucerraid\.alienattacksaucer"/);
  assert.match(gradle, /versionCode 3/);
  assert.match(gradle, /versionName "1\.2\.0"/);
  assert.match(strings, /<string name="app_name">Alien Attack Saucer<\/string>/);
  assert.match(strings, /<string name="package_name">com\.saucerraid\.alienattacksaucer<\/string>/);
  assert.match(
    read("android/app/src/main/java/com/saucerraid/alienattacksaucer/MainActivity.java"),
    /package com\.saucerraid\.alienattacksaucer;/,
  );
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = com\.menearz\.saucerraid;/);
  assert.match(plist, /<string>Alien Attack Saucer<\/string>/);
  assert.ok(existsSync(join(ROOT, "resources/icon.png")), "icon slot missing");
  assert.ok(existsSync(join(ROOT, "WRAP.md")), "WRAP.md missing");
});

test("published privacy page uses the Play package and Alien Attack Saucer label", () => {
  for (const rel of ["public/privacy/index.html", "docs/privacy/index.html"]) {
    const html = read(rel);
    assert.match(html, /com\.saucerraid\.alienattacksaucer/);
    assert.doesNotMatch(html, /com\.menearz\.saucerraid/);
    assert.match(html, /App label: Alien Attack Saucer/);
  }
});

test("github.io spa title stays Saucer Raid; wrap stamps Alien Attack Saucer", () => {
  const spa = read("spa/index.html");
  const wrap = read("vite.wrap.config.ts");
  assert.match(spa, /<title>Saucer Raid<\/title>/);
  assert.match(spa, /apple-mobile-web-app-title" content="Saucer Raid"/);
  assert.doesNotMatch(spa, /Alien Attack Saucer/);
  assert.match(wrap, /VITE_WRAP/);
  assert.match(wrap, /Alien Attack Saucer/);
  assert.match(wrap, /transformIndexHtml/);
});

test("resources/icon.png is Spectre's store icon, not the 7KB placeholder", () => {
  const icon = readFileSync(join(ROOT, "resources/icon.png"));
  const store = readFileSync(join(ROOT, "store/icon-1024.png"));
  assert.equal(icon.byteLength, store.byteLength);
  assert.ok(icon.byteLength > 1_000_000, `icon too small: ${icon.byteLength}`);
  assert.deepEqual(icon, store);
  for (const name of [
    "screenshot-hangar.png",
    "screenshot-raid.png",
    "screenshot-portrait.png",
    "screenshot-boss.png",
  ]) {
    assert.ok(existsSync(join(ROOT, "store", name)), `missing store/${name}`);
  }
});

import path from "node:path";
import { createSpaConfig } from "./vite.pages.config.ts";

/**
 * Same SPA as GitHub Pages, but `base: '/'` so a Capacitor WebView can load
 * assets. Do not use this for github.io — that stays on vite.pages.config.ts
 * (`base: '/saucer-raid/'` → docs/).
 *
 * PWA is off here: installability is for github.io only. A service worker
 * inside the native WebView would fight Capacitor's asset loading.
 */
export default createSpaConfig({
  base: "/",
  outDir: path.resolve(import.meta.dirname, "dist"),
  pwa: false,
});

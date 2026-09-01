import { mergeConfig, defineConfig } from "vite";
import path from "node:path";
import pagesConfig from "./vite.pages.config.ts";

/**
 * Same SPA as GitHub Pages, but `base: '/'` so a Capacitor WebView can load
 * assets. Do not use this for github.io — that stays on vite.pages.config.ts
 * (`base: '/saucer-raid/'` → docs/).
 */
export default mergeConfig(
  pagesConfig,
  defineConfig({
    base: "/",
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
  }),
);

import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const PAGES_BASE = "/saucer-raid/";

/**
 * Shared no-account SPA used by GitHub Pages and the Capacitor wrap.
 * PWA installability is Pages-only — wrap must pass `pwa: false` so a
 * service worker is not injected into the native WebView bundle.
 */
export function createSpaConfig(opts: {
  base: string;
  outDir: string;
  pwa?: boolean;
}) {
  return defineConfig({
    // spa/ is the HTML/entry root. Tailwind v4 does not follow the module graph;
    // src/styles.css must @source "." so utilities in src/components/game emit.
    root: path.resolve(import.meta.dirname, "spa"),
    base: opts.base,
    publicDir: path.resolve(import.meta.dirname, "public"),
    plugins: [
      tailwindcss(),
      viteReact(),
      ...(opts.pwa
        ? VitePWA({
            registerType: "autoUpdate",
            injectRegister: "script-defer",
            includeAssets: ["favicon.svg", "apple-touch-icon.png", "pwa-192.png", "pwa-512.png"],
            manifest: {
              name: "Saucer Raid",
              short_name: "Saucer Raid",
              description: "Fly a saucer. Abduct livestock. Blast the countryside.",
              theme_color: "#090b0e",
              background_color: "#090b0e",
              display: "standalone",
              orientation: "any",
              start_url: PAGES_BASE,
              scope: PAGES_BASE,
              id: PAGES_BASE,
              icons: [
                {
                  src: "pwa-192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "pwa-512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "pwa-512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
              navigateFallback: `${PAGES_BASE}index.html`,
            },
          })
        : []),
    ],
    define: {
      "import.meta.env.VITE_AUTH_ENABLED": JSON.stringify("false"),
      "import.meta.env.VITE_PAGES": JSON.stringify("true"),
    },
    resolve: {
      alias: [
        {
          find: "@/lib/auth/use-current-user",
          replacement: path.resolve(import.meta.dirname, "spa/stubs/auth.ts"),
        },
        {
          find: "@/lib/auth/gates",
          replacement: path.resolve(import.meta.dirname, "spa/stubs/auth.ts"),
        },
        {
          find: "@/lib/auth/provider",
          replacement: path.resolve(import.meta.dirname, "spa/stubs/auth.ts"),
        },
        {
          find: "@tanstack/react-router",
          replacement: path.resolve(import.meta.dirname, "spa/stubs/router.tsx"),
        },
        { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
      ],
    },
    build: {
      outDir: opts.outDir,
      emptyOutDir: true,
    },
  });
}

export default createSpaConfig({
  base: "/saucer-raid/",
  outDir: path.resolve(import.meta.dirname, "docs"),
  pwa: true,
});

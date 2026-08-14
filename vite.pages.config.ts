import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "spa"),
  base: "/saucer-raid/",
  publicDir: path.resolve(import.meta.dirname, "public"),
  plugins: [tailwindcss(), viteReact()],
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
    outDir: path.resolve(import.meta.dirname, "docs"),
    emptyOutDir: true,
  },
});

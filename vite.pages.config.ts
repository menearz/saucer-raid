import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "spa"),
  base: "/saucer-raid/",
  publicDir: path.resolve(__dirname, "public"),
  plugins: [tailwindcss(), viteReact()],
  define: {
    "import.meta.env.VITE_AUTH_ENABLED": JSON.stringify("false"),
    "import.meta.env.VITE_PAGES": JSON.stringify("true"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "docs"),
    emptyOutDir: true,
  },
});

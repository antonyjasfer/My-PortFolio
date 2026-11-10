import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // three.js is its own lazy chunk (~140 kB gzip), loaded after the hero
    // paints, so its size is expected and not a startup cost.
    chunkSizeWarningLimit: 600,
  },
  preview: { port: 4173, strictPort: true },
});

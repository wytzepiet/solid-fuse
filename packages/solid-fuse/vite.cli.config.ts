// The `fuse` CLI as JavaScript for Node (dist/cli/), so apps don't need Bun.
// Dependencies stay external: they're the package's own.
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    ssr: true,
    target: "node20",
    outDir: "dist/cli",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "cli/index.ts"),
        create: resolve(import.meta.dirname, "cli/create.ts"),
      },
      output: { format: "es", entryFileNames: "[name].js", chunkFileNames: "[name]-[hash].js" },
    },
  },
});

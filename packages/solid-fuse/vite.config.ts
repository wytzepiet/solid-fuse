import { defineConfig } from "vite";
import solidPlugin from "@solidjs/vite-plugin";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    solidPlugin({
      solid: {
        generate: "universal",
        moduleName: "~/renderer",
      },
    }),
  ],
  resolve: {
    alias: {
      "~": resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    target: "es2020",
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        config: resolve(import.meta.dirname, "src/config.ts"),
        "icons/material": resolve(import.meta.dirname, "src/icons/material.ts"),
        "icons/cupertino": resolve(import.meta.dirname, "src/icons/cupertino.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["solid-js", "solid-js/web", "@solidjs/universal"],
    },
  },
});

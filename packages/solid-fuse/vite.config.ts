import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
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
      "~": resolve(__dirname, "src"),
    },
  },
  build: {
    target: "es2020",
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        config: resolve(__dirname, "src/config.ts"),
        "icons/material": resolve(__dirname, "src/icons/material.ts"),
        "icons/cupertino": resolve(__dirname, "src/icons/cupertino.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["solid-js", "solid-js/web", "@solidjs/universal"],
    },
  },
});

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
      // Force npm punycode over Node built-in (which is deprecated and has
      // different exports shape).
      "punycode": resolve(import.meta.dirname, "node_modules/punycode/punycode.js"),
    },
  },
  build: {
    target: "es2020",
    lib: {
      entry: resolve(import.meta.dirname, "src/polyfills.ts"),
      formats: ["iife"],
      name: "FusePolyfills",
      fileName: () => "polyfills.js",
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});

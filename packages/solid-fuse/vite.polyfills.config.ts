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
      // Force npm punycode over Node built-in (which is deprecated and has
      // different exports shape).
      "punycode": resolve(__dirname, "node_modules/punycode/punycode.js"),
    },
  },
  build: {
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/polyfills.ts"),
      formats: ["iife"],
      name: "FusePolyfills",
      fileName: () => "polyfills.js",
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});

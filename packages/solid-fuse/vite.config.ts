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
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["solid-js", "solid-js/web", "@solidjs/universal"],
    },
  },
});

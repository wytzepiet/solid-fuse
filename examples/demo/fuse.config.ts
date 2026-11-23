import { defineConfig } from "solid-fuse/config";

export default defineConfig({
  vite: {
    plugins: [
      {
        // When solid-fuse is yalc'd or workspace-linked, Vite's pre-bundled
        // copy in .vite/deps goes stale after `bun run build + yalc push` and
        // only updates on full dev server restart. This plugin takes it off
        // the pre-bundle path so edits flow through normal module resolution
        // (and HMR) without a restart.
        name: "fuse-demo-unbundle-workspace",
        enforce: "pre",
        config(cfg) {
          cfg.optimizeDeps ??= {};
          cfg.optimizeDeps.include = (cfg.optimizeDeps.include ?? []).filter(
            (n) => n !== "solid-fuse",
          );
          cfg.optimizeDeps.exclude = [
            ...(cfg.optimizeDeps.exclude ?? []),
            "solid-fuse",
          ];
        },
      },
    ],
    server: {
      // Vite doesn't watch node_modules by default — opt in for the yalc'd
      // solid-fuse copy so its rebuilds trigger HMR.
      watch: {
        ignored: ["!**/node_modules/solid-fuse/**"],
      },
    },
  },
});

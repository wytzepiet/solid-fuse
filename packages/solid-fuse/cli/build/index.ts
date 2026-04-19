import { defineCommand } from "citty";
import { findProjectRoot } from "../utils";
import { loadFuseConfig } from "../config";
import { buildApp } from "./app";
import { buildLibrary } from "./library";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Build a Fuse app (default) or library (with `library: true` in fuse.config.ts)",
  },
  run: async ({ rawArgs }) => {
    const projectRoot = findProjectRoot();
    const fuseConfig = await loadFuseConfig(projectRoot);
    if (fuseConfig?.library) {
      await buildLibrary(projectRoot, fuseConfig);
    } else {
      await buildApp(projectRoot, fuseConfig, rawArgs);
    }
  },
});

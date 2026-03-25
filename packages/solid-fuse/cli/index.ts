#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { linkCommand } from "./link";
import { devCommand } from "./dev";
import { buildCommand } from "./build";

const main = defineCommand({
  meta: {
    name: "fuse",
    version: "0.1.0",
    description: "Fuse CLI — SolidJS + Flutter tooling",
  },
  subCommands: {
    link: linkCommand,
    dev: devCommand,
    build: buildCommand,
  },
});

runMain(main);

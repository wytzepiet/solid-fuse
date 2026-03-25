#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { linkCommand } from "./link";

const main = defineCommand({
  meta: {
    name: "fuse",
    version: "0.1.0",
    description: "Fuse CLI — SolidJS + Flutter tooling",
  },
  subCommands: {
    link: linkCommand,
  },
});

runMain(main);

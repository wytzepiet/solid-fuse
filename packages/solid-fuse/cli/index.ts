#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { linkCommand } from "./link";
import { devCommand } from "./dev";
import { buildCommand } from "./build";
import { genCommand } from "./gen/command";
import { driveCommand } from "./drive";
import { createCommand } from "./create";
import { doctorCommand } from "./doctor";

const main = defineCommand({
  meta: {
    name: "fuse",
    version: "0.1.0",
    description: "Fuse CLI — SolidJS + Flutter tooling",
  },
  subCommands: {
    create: createCommand,
    link: linkCommand,
    dev: devCommand,
    build: buildCommand,
    gen: genCommand,
    drive: driveCommand,
    doctor: doctorCommand,
  },
});

runMain(main);

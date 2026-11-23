#!/usr/bin/env bun
// `bun create solid-fuse my-app` runs this: the same as `fuse create my-app`.
import { runMain } from "citty";
import { createCommand } from "solid-fuse/cli/create";

runMain(createCommand);

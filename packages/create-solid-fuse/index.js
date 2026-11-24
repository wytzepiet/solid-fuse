#!/usr/bin/env node
// `npm create solid-fuse my-app` (or bun, pnpm, yarn) runs this: the same as
// `fuse create my-app`.
import { runMain } from "citty";
import { createCommand } from "solid-fuse/cli/create";

runMain(createCommand);

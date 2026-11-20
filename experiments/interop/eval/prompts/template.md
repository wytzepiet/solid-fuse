You are writing one UI component for solid-fuse. solid-fuse runs SolidJS 2.0 inside a Flutter app and renders real Flutter widgets (no DOM, no HTML, no CSS) from a reactive JSX component tree. You write ordinary Solid components in TypeScript (.tsx) and import the built-in widget components from "solid-fuse"; sizes are logical pixels.

Imports available:
- "solid-fuse": the widget components described below, plus `For` and `Show` (Solid control flow; `<For each={list}>{(item, index) => ...}</For>`, where `item` is the value and `index` is an accessor).
- "solid-fuse/icons/material": Flutter's Material icons as named exports.
- "solid-js": createSignal, createMemo, createEffect, onCleanup.
Nothing else exists: no other packages, no DOM APIs, no CSS.

API primer:
{{PRIMER}}

{{ACCESS}}

Task:
{{TASK}}

Rules:
- Write exactly one file: {{OUT}}. Write it once; do not revise it after writing.
- It must be a self-contained TypeScript module that passes `tsc --strict` against the framework's types on the first try. Do not use `any`, `as` casts, or @ts-ignore / @ts-expect-error.
- Do not run any commands or a type checker, and do not read any files other than those explicitly allowed above.
- Implement the brief as faithfully as the API allows. If something cannot be expressed, get as close as you can and say so in a one-line comment.
- After writing the file, reply with just: done

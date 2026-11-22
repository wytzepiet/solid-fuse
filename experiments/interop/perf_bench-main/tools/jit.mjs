import fs from "node:fs";
import vm from "node:vm";
const [,, bundle, reps] = process.argv;
globalThis.fjs = { bridge_call: () => Promise.resolve(null) };
globalThis.__fuseHost = { mode: "release", platform: "linux", brightness: "light" };
vm.runInThisContext(fs.readFileSync(bundle, "utf8"), { filename: "bundle.js" });
await new Promise(r => setTimeout(r, 20));
const d = (c) => globalThis.__dispatch("bench", c);
const out = { mount: [], upd: [] };
for (let i = 0; i < +reps; i++) {
  out.mount.push((await d({ cmd: "mount", nodes: 5000 })).jsMs); await d({ cmd: "clear" });
}
for (let i = 0; i < +reps; i++) {
  out.upd.push((await d({ cmd: "updPrep" })).jsMs); await d({ cmd: "clear" });
}
globalThis.gc?.();
const h0 = process.memoryUsage().heapUsed;
await d({ cmd: "mount", nodes: 5000 });
globalThis.gc?.();
const h1 = process.memoryUsage().heapUsed;
process.stdout.write(JSON.stringify({ ...out, heapKB: Math.round((h1 - h0) / 1024) }) + "\n");

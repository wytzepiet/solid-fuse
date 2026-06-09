// Dev-only JS side of the JS<->Dart bridge micro-benchmark.
//
// Registers the handlers the Dart side (bridge_bench.dart) drives, and runs the
// measurements that must be timed on the JS clock (performance.now(), from
// fjs's perfHooks builtin). Results are sent back to Dart, which prints one
// unified report. See bridge_bench.dart for the methodology.
//
// IMPORTANT: the JS-clock loop does `await channels.call(...)` (JS→Dart). That
// must NOT run nested inside a Dart→JS dispatch — awaiting a reverse bridge call
// while a forward call's dispatch is suspended panics the fjs executor. So Dart
// fires `_startJsBench` fire-and-forget, and we run the loop in a setTimeout,
// i.e. at a clean JS top level, then `send` the results back.

import { channels, send } from "solid-fuse";

const now = () => (globalThis as any).performance.now() as number;

interface Stats {
  mean: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

// Samples are in microseconds.
function stats(samplesUs: number[]): Stats {
  const s = [...samplesUs].sort((a, b) => a - b);
  const n = s.length;
  const pct = (p: number) => s[Math.min(n - 1, Math.floor(p * n))];
  return {
    mean: s.reduce((a, b) => a + b, 0) / n,
    min: s[0],
    p50: pct(0.5),
    p95: pct(0.95),
    p99: pct(0.99),
    max: s[n - 1],
  };
}

function payload(fields: number): Record<string, number> {
  const o: Record<string, number> = {};
  for (let i = 0; i < fields; i++) o[`k${i}`] = i;
  return o;
}

const payloads: Record<string, Record<string, number>> = {
  empty: {},
  "tiny(1)": payload(1),
  "med(50)": payload(50),
  "large(200)": payload(200),
};

async function runJsBench(cfg: any) {
  const { warmup, iters, opIters, benchIdBase, opSizes } = cfg;

  // performance.now() resolution: smallest nonzero delta we can observe.
  let perfRes = Infinity;
  for (let i = 0; i < 5000; i++) {
    const a = now();
    let b = now();
    while (b === a) b = now();
    perfRes = Math.min(perfRes, b - a);
  }
  if (!isFinite(perfRes)) perfRes = 0;

  // (A) JS-initiated echo RTT  J->D->J
  const jsEcho: Record<string, Stats> = {};
  for (const [label, p] of Object.entries(payloads)) {
    for (let i = 0; i < warmup; i++) await channels.call("_benchEchoDart", p);
    const samples: number[] = [];
    for (let i = 0; i < iters; i++) {
      const t0 = now();
      await channels.call("_benchEchoDart", p);
      samples.push((now() - t0) * 1000); // ms -> µs
    }
    jsEcho[label] = stats(samples);
  }

  // (B) End-to-end op apply RTT  J->D(applyOps)->J  (Dart applies + acks)
  const jsApply: Record<string, Stats> = {};
  for (const size of opSizes) {
    const ops: any[] = [];
    for (let i = 0; i < size; i++) {
      ops.push({ op: "setProp", id: benchIdBase + i, name: "opacity", value: (i % 100) / 100 });
    }
    for (let i = 0; i < warmup; i++) await channels.call("_benchApply", { ops });
    const samples: number[] = [];
    for (let i = 0; i < opIters; i++) {
      const t0 = now();
      await channels.call("_benchApply", { ops });
      samples.push((now() - t0) * 1000);
    }
    jsApply[String(size)] = stats(samples);
  }

  return { jsEcho, jsApply, perfRes };
}

export function installBench() {
  // Echo handler the Dart-initiated direction calls back into.
  channels.on("_benchEchoJs", (d) => d);

  // Emits a synthetic ops batch back to Dart (fire-and-forget, exactly like the
  // renderer's real flush) so Dart can time tick → ops → apply. The trailing
  // sentinel op carries a token Dart watches for in onOpsApplied.
  channels.on("_benchEmitOps", (cfg: any) => {
    const { size, benchIdBase, token } = cfg;
    const ops: any[] = [];
    for (let i = 0; i < size; i++) {
      ops.push({ op: "setProp", id: benchIdBase + i, name: "opacity", value: (i % 100) / 100 });
    }
    ops.push({ op: "setProp", id: benchIdBase, name: "__sentinel__", value: token });
    send("_ops", { ops });
    return true;
  });

  // Dart fires this (fire-and-forget). We defer the actual benchmark to a
  // setTimeout so its reverse channels.call() loops run at a clean top level,
  // not nested in this dispatch, then send the results back.
  channels.on("_startJsBench", (cfg: any) => {
    setTimeout(() => {
      runJsBench(cfg).then(
        (r) => send("_benchResults", r),
        (e) => send("_benchResults", { error: String(e) }),
      );
    }, 0);
    return true;
  });
}

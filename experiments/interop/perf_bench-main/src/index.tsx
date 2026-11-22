// perf_bench: JS side of the render benchmark. Dart (dart/lib/main.dart) drives
// everything through one channel, `bench`.
import { render, View, Navigator, createNavigationController, channels } from "solid-fuse";
import { createSignal } from "solid-js";
import { now, clockKind, stats, timed } from "./harness";
import {
  MountScreen, UpdateScreen, ListScreen, cardsFor, makeRows, rows, setRows, rnd,
  t1, setT1, t50, setT50, t1000, setT1000, c1, setC1, c50, setC50, c1000, setC1000,
} from "./screens";
import { microCmds } from "./micro";

const Empty = () => <View />;
const [screen, setScreenRaw] = createSignal<{ render: () => any }>({ render: Empty });
// (a function passed to createSignal or to a setter is treated as a compute/updater, hence the wrapper)
const setScreen = (render: () => any) => setScreenRaw({ render });
const nav = createNavigationController({ initialPage: () => <View>{screen().render()}</View> });
render(() => <Navigator controller={nav} />);

const cmds: Record<string, (a: any) => any> = {
  ...microCmds,
  info: () => ({ clock: clockKind, t: now() }),
  detail: (a) => { stats.detail = !!a.on; return {}; },
  clear: () => timed(() => setScreen(Empty)),
  mount: (a) => timed(() => setScreen(() => <MountScreen cards={cardsFor(a.nodes)} />), { cards: cardsFor(a.nodes) }),
  updPrep: () => timed(() => setScreen(() => <UpdateScreen />)),
  upd: (a) => {
    const set = ({ t1: setT1, t50: setT50, t1000: setT1000, c1: setC1, c50: setC50, c1000: setC1000 } as any)[a.sig];
    const get = ({ t1, t50, t1000, c1, c50, c1000 } as any)[a.sig];
    const next = get() + 1;
    return timed(() => set(next));
  },
  listPrep: (a) => timed(() => { setRows(makeRows(a.n)); setScreen(() => <ListScreen />); }),
  listReplace: (a) => { const next = makeRows(a.n); return timed(() => setRows(next)); },
  listShuffle: () => {
    const next = rows().map((r) => ({ r, k: rnd() })).sort((x, y) => x.k - y.k).map((x) => x.r);
    return timed(() => setRows(next));
  },
  // includes the sort itself, as an app would do it
  listSort: () => timed(() => setRows(rows().slice().sort((x, y) => x.value - y.value))),
  listReverse: () => timed(() => setRows(rows().slice().reverse())),
  listFilter: () => timed(() => setRows(rows().filter((r) => r.value % 2 === 0))),
  listNames: () => ({ names: rows().map((r) => r.name) }),
};

channels.on("bench", async (d: any) => {
  const fn = cmds[d.cmd];
  if (!fn) return { error: "unknown cmd " + d.cmd };
  try {
    return await fn(d);
  } catch (e: any) {
    return { error: String(e && e.stack ? e.stack : e) };
  }
});

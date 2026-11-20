// Executes the JS half for real: generated factories + fuse-objects.ts + the
// REAL solid-fuse handle.ts / renderer.ts / channels.ts, with only the fjs
// bridge faked. Asserts the ops and RPCs JS sends, and that Dart's pushes
// land in signals.
//
//   NODE_PATH=node_modules bun test --conditions browser
import { beforeAll, expect, test } from "bun:test";

const sent: any[] = [];
let respond: (msg: any) => any = () => undefined;
(globalThis as any).__fuseHost = { mode: "debug", platform: "linux", brightness: "light" };
(globalThis as any).fjs = {
  bridge_call: (msg: any) => {
    sent.push(JSON.parse(JSON.stringify(msg)));
    return Promise.resolve(respond(msg));
  },
};
/** What Dart's `channels.send(channel, data)` does. */
const dispatch = (channel: string, data: any) => (globalThis as any).__dispatch(channel, data);
const opsSent = () => sent.filter((m) => m.channel === "_ops").flatMap((m) => m.ops);
const tick = () => new Promise((r) => setTimeout(r, 0));

let gen: typeof import("./generated/controllers");
let url: typeof import("./generated/url_launcher");
let prefs: typeof import("./generated/shared_preferences");
let geo: typeof import("./generated/geolocator");
let rt: typeof import("./fuse-objects");
let solid: typeof import("solid-js");

beforeAll(async () => {
  solid = await import("solid-js");
  rt = await import("./fuse-objects");
  gen = await import("./generated/controllers");
  url = await import("./generated/url_launcher");
  prefs = await import("./generated/shared_preferences");
  geo = await import("./generated/geolocator");
});

test("createScrollController: create op, seeded signal, state patches, RPC, owner dispose", async () => {
  sent.length = 0;
  let scroll!: import("./generated/controllers").ScrollController;
  let disposeRoot!: () => void;
  solid.createRoot((d) => {
    disposeRoot = d;
    scroll = gen.createScrollController({ initialScrollOffset: 120 });
  });
  expect(scroll.offset()).toBe(120); // seeded from the constructor option
  expect(scroll.hasClients()).toBe(false);
  await tick();
  const id = scroll.node.id;
  const ops = opsSent();
  expect(ops[0]).toEqual({ op: "create", id, type: "gen_ScrollController", props: { initialScrollOffset: 120 } });
  expect(ops.slice(1, 3)).toEqual([
    { op: "setProp", id, name: "$state", value: true },
    { op: "setProp", id, name: "$event", value: true },
  ]);

  // Dart pushes one patch; both signals update.
  await dispatch("_functionCall", { nodeId: id, name: "$state", value: { hasClients: true, offset: 300 } });
  expect(scroll.offset()).toBe(300);
  expect(scroll.hasClients()).toBe(true);

  // RPC: arguments packed into one map keyed by Dart parameter name.
  respond = () => null;
  await scroll.animateTo(500, { duration: 200, curve: "Curves.easeInOut" });
  expect(sent.at(-1)).toEqual({
    channel: "_handleCall",
    node: id,
    method: "animateTo",
    value: { offset: 500, duration: 200, curve: "Curves.easeInOut" },
  });
  respond = () => true;
  expect(await scroll.get("keepScrollOffset")).toBe(true);
  expect(sent.at(-1).value).toEqual({ name: "keepScrollOffset" });

  // Typed error: Dart's envelope becomes a FuseError with fields.
  respond = () => ({ $err: { type: "ArgumentError", message: "bad", code: "curve" } });
  const err = await scroll.jumpTo(1).catch((e) => e);
  expect(err).toBeInstanceOf(rt.FuseError);
  expect(err.type).toBe("ArgumentError");
  expect(err.code).toBe("curve");

  // Reactive owner cleanup disposes the Dart object.
  sent.length = 0;
  disposeRoot();
  await tick();
  expect(opsSent()).toEqual([{ op: "dispose", id }]);
});

test("an object returned by Dart is adopted with its state and its own RPC target", async () => {
  const scroll = gen.createScrollController();
  respond = (m) => (m.method === "$get" ? { _node: -7, type: "gen_ScrollPosition", state: { pixels: 40, maxScrollExtent: 900 } } : null);
  sent.length = 0;
  const pos = await scroll.position();
  expect(pos.node.id).toBe(-7);
  expect(pos.pixels()).toBe(40); // seeded from the snapshot Dart sent with the reference
  expect(pos.maxScrollExtent()).toBe(900);
  await tick();
  // JS registered its handlers on Dart's node ...
  expect(opsSent()).toContainEqual({ op: "setProp", id: -7, name: "$state", value: true });
  // ... so pushes for that node land in its signals
  await dispatch("_functionCall", { nodeId: -7, name: "$state", value: { pixels: 55 } });
  expect(pos.pixels()).toBe(55);
  await pos.jumpTo(10);
  expect(sent.at(-1)).toEqual({ channel: "_handleCall", node: -7, method: "jumpTo", value: { value: 10 } });
  scroll.dispose();
});

test("object arguments cross as node references; undefined options are not sent", async () => {
  const a = gen.createFocusNode();
  const b = gen.createFocusNode({ debugLabel: undefined, skipTraversal: true });
  respond = () => null;
  await a.requestFocus(b);
  expect(sent.at(-1).value).toEqual({ node: { _node: b.node.id } });
  const create = opsSent().find((o) => o.op === "create" && o.id === b.node.id);
  expect(create.props).toEqual({ skipTraversal: true });
  a.dispose();
  b.dispose();
});

test("named constructor carries $ctor; record-valued mirror starts undefined", async () => {
  sent.length = 0;
  const v = gen.createVideoPlayerControllerNetworkUrl("https://example.com/a.mp4", { videoPlayerOptions: { mixWithOthers: true } });
  expect(v.value()).toBeUndefined();
  await tick();
  expect(opsSent()[0].props).toEqual({ $ctor: "networkUrl", url: "https://example.com/a.mp4", videoPlayerOptions: { mixWithOthers: true } });
  await dispatch("_functionCall", { nodeId: v.node.id, name: "$state", value: { value: { isPlaying: true, duration: 10000 } } });
  expect(v.value()?.isPlaying).toBe(true);
  v.dispose();
});

test("plugin module: functions are one channel call; statics return adopted objects", async () => {
  respond = () => true;
  expect(await url.launchUrl("https://solidjs.com", { mode: "externalApplication" })).toBe(true);
  expect(sent.at(-1)).toEqual({ channel: "mod:url_launcher", m: "launchUrl", a: { url: "https://solidjs.com", mode: "externalApplication" } });

  respond = (m) => (m.m === "SharedPreferences.getInstance" ? { _node: -9, type: "shared_preferences_SharedPreferences", state: {} } : "hi");
  const p = await prefs.SharedPreferences.getInstance();
  expect(await p.getString("greeting")).toBe("hi");
  expect(sent.at(-1)).toEqual({ channel: "_handleCall", node: -9, method: "getString", value: { key: "greeting" } });
});

test("plugin module: a Dart Stream is a subscription with cancel", async () => {
  respond = () => null;
  const seen: number[] = [];
  const cancel = geo.Geolocator.getPositionStream({ locationSettings: { accuracy: "high" } })((p) => seen.push(p.latitude));
  const listen = sent.at(-1);
  expect(listen.m).toBe("$listen");
  expect(listen.a.$stream).toBe("Geolocator.getPositionStream");
  expect(listen.a.locationSettings).toEqual({ accuracy: "high" });
  await dispatch("mod:geolocator:event", { id: listen.a.$id, v: { latitude: 1 } });
  await dispatch("mod:geolocator:event", { id: listen.a.$id, v: { latitude: 2 } });
  expect(seen).toEqual([1, 2]);
  cancel();
  expect(sent.at(-1)).toEqual({ channel: "mod:geolocator", m: "$cancel", a: { $id: listen.a.$id } });
  await dispatch("mod:geolocator:event", { id: listen.a.$id, v: { latitude: 3 } });
  expect(seen).toEqual([1, 2]);
});

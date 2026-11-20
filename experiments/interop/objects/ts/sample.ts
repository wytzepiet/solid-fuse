// Type-level usage sample for the generated object factories.
// Type-checked with `tsc --strict` against the generated TS, the hand-written
// runtime (fuse-objects.ts) and the REAL solid-fuse source (handle.ts,
// channels.ts, renderer.ts via tsconfig "paths").
import { createEffect } from "solid-js";
import type { Handle, HandleRuntime } from "solid-fuse/handle";
import type { ScrollController as HandWrittenScrollController } from "solid-fuse/scroll-controller";
import { FuseError, type FuseObject } from "./fuse-objects";
import {
  createScrollController,
  createFocusNode,
  createTextEditingController,
  createTextEditingControllerFromValue,
  createPageController,
  createAnimationController,
  createTabController,
  createVideoPlayerControllerNetworkUrl,
  type ScrollController,
  type ScrollPosition,
  type AnimationController,
  type TextEditingValueOut,
  type AnimationStatus,
} from "./generated/controllers";

// ── ScrollController ────────────────────────────────────────────────────────
const scroll = createScrollController({ initialScrollOffset: 120, keepScrollOffset: false });
const offset: number = scroll.offset(); // mirrored signal, seeded from initialScrollOffset
const attached: boolean = scroll.hasClients();
// Flutter's real signature: duration and curve are required, records by the same rules as widget props
const done: Promise<void> = scroll.animateTo(500, { duration: 300, curve: "Curves.easeInOut" });
void scroll.animateTo(0, { duration: { milliseconds: 250 }, curve: { $: "Cubic", a: 0.2, b: 0, c: 0, d: 1 } });
void scroll.jumpTo(0);
// on-demand read of a getter that is not mirrored
const keep: Promise<boolean> = scroll.get("keepScrollOffset");
// @ts-expect-error duration and curve are required by ScrollController.animateTo
void scroll.animateTo(500);
// @ts-expect-error not a curve
void scroll.animateTo(500, { duration: 300, curve: "Curves.nope" });
// @ts-expect-error unknown getter
void scroll.get("positions");
// @ts-expect-error attach/detach are excluded by the declaration file
void scroll.attach;

// The generated handle is still a solid-fuse Handle: it has a node, and the node type is its tag.
const asHandle: Handle<"gen_ScrollController"> = scroll;
const nodeType: "gen_ScrollController" = scroll.node.type;
// @ts-expect-error a different handle kind
const wrongKind: Handle<"gen_FocusNode"> = scroll;
// @ts-expect-error `call` stays closure-scoped, as in the hand-written factories
const leaked: HandleRuntime<"gen_ScrollController">["call"] = scroll.call;
// The hand-written shape is NOT assignable from the generated one (scrollOffset vs offset, node type).
// @ts-expect-error
const old: HandWrittenScrollController = scroll;

// An object returned by Dart: a borrowed ScrollPosition, with its own mirrored state.
async function position(): Promise<number> {
  const pos: ScrollPosition = await scroll.position();
  const max: number = pos.maxScrollExtent();
  await pos.animateTo(max, { duration: 200, curve: "Curves.ease" });
  const edge: boolean = await pos.get("atEdge");
  return edge ? pos.pixels() : max;
}

// ── FocusNode ───────────────────────────────────────────────────────────────
const focus = createFocusNode({ skipTraversal: true, debugLabel: "search" });
const focused: boolean = focus.hasFocus();
void focus.requestFocus();
void focus.unfocus({ disposition: "previouslyFocusedChild" });
const moved: Promise<boolean> = focus.focusInDirection("down");
void focus.set("canRequestFocus", false);
// object argument: another generated FocusNode
void focus.requestFocus(createFocusNode());
// @ts-expect-error a ScrollController is not a FocusNode
void focus.requestFocus(scroll);
// @ts-expect-error unknown enum value
void focus.unfocus({ disposition: "nope" });
// @ts-expect-error not writable
void focus.set("hasFocus", true);

// ── TextEditingController (ValueNotifier: `value` is mirrored by rule, no declaration) ──
const text = createTextEditingController({ text: "hello" });
const tv: TextEditingValueOut | undefined = text.value();
const caret: number | undefined = text.value()?.selection.baseOffset;
void text.set("text", "bye");
void text.set("selection", { $: "collapsed", offset: 2 });
void text.clear();
const fromValue = createTextEditingControllerFromValue({ text: "x", selection: { baseOffset: 0, extentOffset: 1 } });
// @ts-expect-error wrong type for a setter
void text.set("text", 3);

// ── PageController ──────────────────────────────────────────────────────────
const pages = createPageController({ initialPage: 2, viewportFraction: 0.8 });
const page: number | null | undefined = pages.page(); // null until laid out, undefined until first push
void pages.nextPage({ duration: 250, curve: "Curves.easeOut" });
void pages.animateToPage(3, { duration: 250, curve: "Curves.easeOut" });
void pages.jumpToPage(0);

// ── AnimationController: vsync is environmental and never appears in TS ─────
const anim = createAnimationController({ duration: 400, lowerBound: 0, upperBound: 1 });
const status: AnimationStatus = anim.status() ?? "dismissed";
const running: boolean = anim.isAnimating();
async function animate() {
  try {
    await anim.forward({ from: 0 });
    await anim.animateTo(0.5, { curve: "Curves.easeIn", duration: 100 });
    await anim.repeat({ reverse: true, count: 2 });
  } catch (e) {
    // typed errors: Dart's TickerCanceled arrives with its type, not as a string
    if (e instanceof FuseError && e.type === "TickerCanceled") return;
    throw e;
  }
  const v: number = await anim.get("value"); // per-frame value is NOT mirrored; read on demand
  await anim.set("duration", 800);
  return v;
}
// @ts-expect-error vsync is supplied by the generated handle
createAnimationController({ vsync: null });
// Subtyping by brand: an AnimationController is accepted where an Animation is expected ...
declare function fadeTransitionOpacity(a: FuseObject<"Animation">): void;
fadeTransitionOpacity(anim);
// @ts-expect-error ... and a ScrollController is not
fadeTransitionOpacity(scroll);
const sameType: AnimationController = anim;

// ── TabController ───────────────────────────────────────────────────────────
const tabs = createTabController({ length: 3, initialIndex: 1 });
const index: number = tabs.index(); // seeded from initialIndex
void tabs.animateTo(2, { duration: 200, curve: "Curves.ease" });
void tabs.set("index", 0); // Flutter's own "jump": assign index
const len: Promise<number> = tabs.get("length");
// @ts-expect-error length is required by TabController
createTabController({});

// ── A pub.dev controller: video_player ──────────────────────────────────────
const video = createVideoPlayerControllerNetworkUrl("https://example.com/a.mp4", {
  videoPlayerOptions: { mixWithOthers: true },
});
async function play() {
  await video.initialize();
  await video.setVolume(0.5);
  await video.seekTo(1500);
  await video.play();
  const pos: number | null = await video.get("position"); // Future<Duration?> getter, ms
  return pos;
}
createEffect(
  () => video.value(),
  (v) => {
    if (v?.isPlaying) console.log(v.position, v.duration, v.size.width, v.buffered.length, v.errorDescription);
  },
);

export { offset, attached, done, keep, asHandle, nodeType, position, focused, moved, tv, caret, fromValue, page, status, running, animate, sameType, index, len, play };

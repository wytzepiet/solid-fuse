import { capture } from "./node";

/**
 * How `fuse dev` builds the Dart. The JS is live from Vite in every mode.
 *
 * - debug: Flutter's debug build (JIT). Dart hot reload, debug checks. On a
 *   phone it needs the debugger attached: iOS stops it once that drops.
 * - checked: compiled (AOT, like profile) with Flutter's debug checks kept
 *   (asserts, `kDebugMode`). Runs on its own, fast; no Dart hot reload.
 * - profile, release: Flutter's own. Profile keeps the VM service (DevTools,
 *   `fuse drive`), release doesn't.
 */
export type DevMode = "debug" | "checked" | "profile" | "release";

/** The mode asked for on the command line, if any. */
export function askedMode(args: string[]): DevMode | null {
  if (args.includes("--checked")) return "checked";
  if (args.includes("--release")) return "release";
  if (args.includes("--profile")) return "profile";
  if (args.includes("--debug")) return "debug";
  return null;
}

/** What a mode adds to `flutter run`'s arguments (`--checked` is ours). */
export function modeArgs(mode: DevMode, args: string[]): string[] {
  const rest = args.filter((a) => a !== "--checked");
  if (mode !== "checked") return rest;
  return [
    ...rest,
    // A profile build (AOT, the profile engine) that compiles the asserts
    // in and reads as debug to the Dart (`kDebugMode`): Flutter's profile
    // build skips asserts, and with them on, its `defaultTargetPlatform`
    // can't fold to a constant as profile mode asks.
    "--profile",
    "--extra-front-end-options=--enable-asserts,-Ddart.vm.profile=false",
    "--extra-gen-snapshot-options=--enable-asserts",
  ];
}

/** A row of `flutter devices --machine`. */
export interface FlutterDevice {
  id: string;
  name: string;
  targetPlatform: string;
  emulator: boolean;
}

/** The `-d` value, if any. */
export function deviceArg(args: string[]): string | null {
  const i = args.findIndex((a) => a === "-d" || a === "--device-id");
  if (i >= 0) return args[i + 1] ?? null;
  return args.find((a) => a.startsWith("--device-id="))?.slice(12) ?? null;
}

/** Devices `-d` names that are never a phone: no need to ask Flutter. */
const notPhones = new Set(["linux", "macos", "windows", "chrome", "edge", "web-server"]);

/** The device `flutter run` will pick, as far as we can tell: `-d` the way Flutter matches it, or the only one there is. */
export function pickDevice(args: string[], devices: FlutterDevice[]): FlutterDevice | null {
  const d = deviceArg(args);
  if (d == null) return devices.length === 1 ? devices[0] : null;
  const exact = devices.filter((x) => x.id === d || x.name === d);
  if (exact.length === 1) return exact[0];
  const lower = d.toLowerCase();
  const prefix = devices.filter((x) => x.id.toLowerCase().startsWith(lower) || x.name.toLowerCase().startsWith(lower));
  return prefix.length === 1 ? prefix[0] : null;
}

/** A phone or tablet in your hand, not a simulator, emulator or desktop. */
export function isPhysicalMobile(device: FlutterDevice | null): boolean {
  if (!device || device.emulator) return false;
  return device.targetPlatform === "ios" || device.targetPlatform.startsWith("android");
}

/**
 * The mode when none is asked for: checked on a phone, which runs on its
 * own after you unplug it; debug elsewhere (simulators, emulators, desktop,
 * web), where nothing comes loose and Dart hot reload works.
 */
export async function defaultMode(args: string[], dartRoot: string): Promise<{ mode: DevMode; device: FlutterDevice | null }> {
  const d = deviceArg(args);
  if (d != null && notPhones.has(d)) return { mode: "debug", device: null };
  const device = pickDevice(args, await flutterDevices(dartRoot));
  return { mode: isPhysicalMobile(device) ? "checked" : "debug", device };
}

async function flutterDevices(dartRoot: string): Promise<FlutterDevice[]> {
  try {
    const { stdout } = await capture(["flutter", "devices", "--machine"], dartRoot);
    return JSON.parse(stdout.slice(stdout.indexOf("["))) as FlutterDevice[];
  } catch {
    return [];
  }
}

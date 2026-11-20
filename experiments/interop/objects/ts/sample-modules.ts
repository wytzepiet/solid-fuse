// Type-level usage sample for the generated plugin modules (non-UI half of
// `fuse add <package>`). Everything is async; records and enums follow the
// same rules as widget props; instances are objects; Streams are subscriptions.
import { FuseError } from "./fuse-objects";
import { launchUrl, canLaunchUrl, launchUrlString, type LaunchMode } from "./generated/url_launcher";
import { SharedPreferences, createSharedPreferencesAsync } from "./generated/shared_preferences";
import { getApplicationDocumentsDirectory, getExternalStorageDirectories } from "./generated/path_provider";
import { Geolocator, type PositionOut, type GeolocatorErrorType } from "./generated/geolocator";
import { SharePlus } from "./generated/share_plus";
import { createMobileScannerController, type BarcodeCaptureOut } from "./generated/mobile_scanner";

// ── url_launcher: top-level functions ───────────────────────────────────────
const mode: LaunchMode = "externalApplication";
const opened: Promise<boolean> = launchUrl("https://solidjs.com", {
  mode,
  webViewConfiguration: { enableJavaScript: false, headers: { "x-a": "b" } },
});
const can: Promise<boolean> = canLaunchUrl("tel:+31201234567");
void launchUrlString("mailto:a@b.c");
// @ts-expect-error url is required
void launchUrl();
// @ts-expect-error not a LaunchMode
void launchUrl("https://a.b", { mode: "popup" });
// @ts-expect-error results are typed
const wrong: Promise<string> = canLaunchUrl("https://a.b");

// ── shared_preferences: static factory -> instance object -> typed methods ──
async function prefs() {
  const p = await SharedPreferences.getInstance();
  const s: string | null = await p.getString("greeting");
  const ok: boolean = await p.setStringList("l", ["a", "b"]);
  const keys: string[] = await p.getKeys();
  // @ts-expect-error wrong value type
  await p.setInt("n", "3");
  // constructor-created instance (sync on the JS side, like any handle)
  const a = createSharedPreferencesAsync();
  const n: number | null = await a.getInt("n");
  await a.setBool("flag", true);
  const all: Record<string, unknown> = await a.getAll({ allowList: ["flag"] });
  a.dispose();
  return [s, ok, keys, n, all];
}

// ── path_provider: dart:io Directory crosses as its path ────────────────────
async function paths() {
  const docs: string = await getApplicationDocumentsDirectory();
  const ext: string[] | null = await getExternalStorageDirectories({ type: "downloads" });
  return [docs, ext];
}

// ── geolocator: static methods, a record result, a Stream as a subscription ─
async function where(): Promise<number> {
  try {
    if ((await Geolocator.checkPermission()) === "denied") await Geolocator.requestPermission();
    const pos: PositionOut = await Geolocator.getCurrentPosition({ locationSettings: { accuracy: "high", distanceFilter: 10 } });
    return Geolocator.distanceBetween(pos.latitude, pos.longitude, 52.37, 4.89);
  } catch (e) {
    // typed errors: the package's own exception classes, by name
    const denied: GeolocatorErrorType = "PermissionDeniedException";
    if (e instanceof FuseError && e.type === denied) return -1;
    throw e;
  }
}
const stop: () => void = Geolocator.getPositionStream({ locationSettings: { accuracy: "best" } })(
  (p) => console.log(p.latitude, p.longitude, p.timestamp),
  (err) => console.error(err.type, err.message),
);
// @ts-expect-error not a LocationAccuracy
Geolocator.getPositionStream({ locationSettings: { accuracy: "perfect" } });

// ── share_plus: singleton getter -> instance -> method taking a record ──────
async function share() {
  const s = await SharePlus.instance();
  const r = await s.share({ text: "hello", subject: "hi", files: [{ path: "/tmp/a.png" }] });
  return r.status === "success";
}

// ── mobile_scanner: a controller found in a pub package, unassisted ─────────
const scanner = createMobileScannerController({ detectionSpeed: "noDuplicates", facing: "back", formats: ["qrCode"] });
const torch = scanner.value()?.torchState; // ValueNotifier<MobileScannerState>: mirrored by rule
const off = scanner.barcodes((capture: BarcodeCaptureOut) => console.log(capture.barcodes.map((b) => b.rawValue)));
async function scan() {
  await scanner.start();
  await scanner.toggleTorch();
  await scanner.setZoomScale(0.5);
  await scanner.stop();
  off();
}

export { opened, can, wrong, prefs, paths, where, stop, share, torch, scan };

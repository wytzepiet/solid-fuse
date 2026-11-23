// The generator over popular pub.dev packages (gen/test/corpus/pubspec.yaml):
// it must not fail on any of them, and what it writes must compile. Heavy
// (a pub get of ~120 packages, a cold analyzer cache), so it runs on demand:
//
//   FUSE_CORPUS=1 bun test --conditions browser cli/gen/corpus.test.ts
import { beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { runGenerator, writeGenerated, type Manifest } from "./index";

const pkg = join(import.meta.dir, "..", "..");
const genPkg = join(pkg, "gen");
const corpus = join(genPkg, "test", "corpus");
const out = join(pkg, ".gen-test", "corpus");

/** Entry library per package; `{}` exports everything it declares. */
export const CORPUS = [
  "fl_chart/fl_chart.dart",
  "flutter_map/flutter_map.dart",
  "cached_network_image/cached_network_image.dart",
  "flutter_svg/flutter_svg.dart",
  "shimmer/shimmer.dart",
  "lottie/lottie.dart",
  "carousel_slider/carousel_slider.dart",
  "flutter_slidable/flutter_slidable.dart",
  "percent_indicator/percent_indicator.dart",
  "smooth_page_indicator/smooth_page_indicator.dart",
  "photo_view/photo_view.dart",
  "video_player/video_player.dart",
  "flutter_staggered_grid_view/flutter_staggered_grid_view.dart",
  "auto_size_text/auto_size_text.dart",
  "flutter_rating_bar/flutter_rating_bar.dart",
  "pull_to_refresh/pull_to_refresh.dart",
  "modal_bottom_sheet/modal_bottom_sheet.dart",
];

async function run(cmd: string[], cwd: string): Promise<{ code: number; output: string }> {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [code, stdout, stderr] = await Promise.all([p.exited, new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code, output: stdout + stderr };
}

describe.skipIf(!process.env.FUSE_CORPUS)("fuse gen over popular pub.dev packages", () => {
  let m: Manifest;
  beforeAll(async () => {
    const r = await run(["flutter", "pub", "get"], corpus);
    if (r.code !== 0) throw new Error(r.output);
    m = await runGenerator({
      dartRoot: corpus,
      libraries: Object.fromEntries(CORPUS.map((l) => [`package:${l}`, {}])),
      command: { cmd: ["dart", "run", "solid_fuse_gen"], cwd: genPkg },
    });
    writeGenerated(m, { tsDir: join(out, "out"), dartFile: join(corpus, "lib", "_generated", "fuse.generated.dart") });
    mkdirSync(out, { recursive: true });
    writeFileSync(
      join(out, "tsconfig.json"),
      JSON.stringify({
        extends: "../../tsconfig.json",
        compilerOptions: {
          paths: { "solid-fuse": ["../../src/index.ts"], "solid-fuse/generated": ["../../src/generated.ts"], "~/*": ["../../src/*"] },
        },
        include: ["out", "../../src/jsx.d.ts", "../../src/global.d.ts"],
      }),
    );
  }, 900_000);

  test("every package gives widgets, and nothing fails internally", () => {
    for (const lib of CORPUS) {
      const name = lib.split("/")[0];
      expect({ name, widgets: m.widgets.filter((w) => w.id.startsWith(`package:${name}/`)).length > 0 }).toEqual({ name, widgets: true });
    }
    expect(m.skipped.filter((s) => s.reason.includes("internal error"))).toEqual([]);
    expect(m.skipped.filter((s) => s.reason.includes("did not load"))).toEqual([]);
  });

  test("the Dart passes flutter analyze", async () => {
    const r = await run(["flutter", "analyze", "--no-pub", "lib/_generated"], corpus);
    if (!r.output.includes("No issues found")) console.log(r.output);
    expect(r.output).toContain("No issues found");
  }, 300_000);

  test("the TypeScript passes tsc", async () => {
    const r = await run([join(pkg, "node_modules", ".bin", "tsc"), "-p", join(out, "tsconfig.json")], pkg);
    if (r.code !== 0) console.log(r.output);
    expect(r.code).toBe(0);
  }, 300_000);
});

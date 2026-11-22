// `fuse gen` end to end over all of widgets, material_ui and cupertino_ui plus
// the generator's rule fixture: the Dart output passes `flutter analyze`, the
// adapters pump in widget tests, and the TypeScript passes tsc together with
// a file that uses it the way apps will. Needs `dart` and `flutter` on PATH;
// skipped without them.
import { beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { runGenerator, writeGenerated, type Manifest } from "./index";

const pkg = resolve(import.meta.dirname, "../..");
const genPkg = join(pkg, "gen");
const fixture = join(genPkg, "test", "fixtures", "app");
const out = join(pkg, ".gen-test");
const hasFlutter = Bun.which("flutter") !== null && Bun.which("dart") !== null;

async function run(cmd: string[], cwd: string): Promise<{ code: number; output: string }> {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [code, stdout, stderr] = await Promise.all([p.exited, new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code, output: stdout + stderr };
}

const usage = `
import { Padding, EdgeInsets, Text, Container, BoxDecoration, BorderRadius, Alignment, Row, Column, GestureDetector } from "./out/flutter";
import { Colors, ElevatedButton, Slider } from "./out/material_ui";
import { FixtureBox, Point, Square, Mode, Menu, MenuItem } from "./out/fixture_app";

export const a = (
  <Padding padding={EdgeInsets.symmetric({ horizontal: 8 })}>
    <Column mainAxisAlignment="center" spacing={4}>
      <Text maxLines={2}>hi</Text>
      <Row>
        <Container color={Colors.red} alignment={Alignment.center} decoration={BoxDecoration({ borderRadius: BorderRadius.circular(12) })} />
      </Row>
    </Column>
  </Padding>
);
export const b = <Slider value={0.5} onChanged={(v) => v.toFixed()} />;
export const c = <ElevatedButton onPressed={() => {}}><Text>Go</Text></ElevatedButton>;
export const d = <FixtureBox at={Point(1, 2)} shape={Square.unit()} mode={"b" satisfies Mode} />;
export const e = <GestureDetector onTapDown={(details) => details.globalPosition.dx} />;
export const menu = (
  <Menu
    items={[MenuItem("a", { onTap: () => {} }), MenuItem("b", { icon: <Text>i</Text> })]}
    trailing={[<Text>end</Text>]}
    onRefresh={async () => {}}
    onPick={async (s) => s.length}
  />
);
// @ts-expect-error a number is not EdgeInsets (until shorthands)
export const f = <Padding padding={8} />;
// @ts-expect-error not a MainAxisAlignment
export const g = <Column mainAxisAlignment="middle" />;
// @ts-expect-error padding is required
export const h = <Padding />;
`;

describe.skipIf(!hasFlutter)("fuse gen over widgets, material_ui, cupertino_ui", () => {
  let m: Manifest;
  beforeAll(async () => {
    if (!(await Bun.file(join(fixture, ".dart_tool", "package_config.json")).exists())) {
      const r = await run(["flutter", "pub", "get"], fixture);
      if (r.code !== 0) throw new Error(r.output);
    }
    m = await runGenerator({
      dartRoot: fixture,
      libraries: {
        "package:fixture_app/fixture.dart": {},
        "package:flutter/widgets.dart": {},
        "package:material_ui/material_ui.dart": {},
        "package:cupertino_ui/cupertino_ui.dart": {},
      },
      command: { cmd: ["dart", "run", "solid_fuse_gen"], cwd: genPkg },
    });
    writeGenerated(m, { tsDir: join(out, "out"), dartFile: join(fixture, "lib", "generated", "fuse.generated.dart") });
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "usage.tsx"), usage);
    writeFileSync(
      join(out, "tsconfig.json"),
      JSON.stringify({
        extends: "../tsconfig.json",
        compilerOptions: {
          paths: { "solid-fuse": ["../src/index.ts"], "solid-fuse/generated": ["../src/generated.ts"], "~/*": ["../src/*"] },
        },
        include: ["out", "usage.tsx", "../src/jsx.d.ts", "../src/global.d.ts"],
      }),
    );
  }, 300_000);

  test("covers the libraries", () => {
    expect(m.widgets.length).toBeGreaterThan(550);
  });

  test("the Dart passes flutter analyze", async () => {
    const r = await run(["flutter", "analyze", "--no-pub", "lib/generated"], fixture);
    expect(r.output).toContain("No issues found");
  }, 300_000);

  test("the adapters pump", async () => {
    const r = await run(["flutter", "test", "--no-pub", "test/adapters_test.dart"], fixture);
    if (r.code !== 0) console.log(r.output);
    expect(r.code).toBe(0);
  }, 300_000);

  test("the TypeScript passes tsc, used the way apps use it", async () => {
    const r = await run([join(pkg, "node_modules", ".bin", "tsc"), "-p", join(out, "tsconfig.json")], pkg);
    if (r.code !== 0) console.log(r.output);
    expect(r.code).toBe(0);
  }, 300_000);
});

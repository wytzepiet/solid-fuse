import Link from "next/link";
import { DotGrid } from "@/components/home/dot-grid";
import { highlight } from "@/lib/highlight";

const mono = { fontFamily: "var(--font-mono)" };

/* ── Hero Code Panels ─────────────────────────────────────────────── */

function CodePanel({
  badge,
  badgeColor,
  filename,
  lines,
  html,
}: {
  badge: string;
  badgeColor: string;
  filename: string;
  lines: number;
  html: string;
}) {
  return (
    <div className="overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-[#0a0a0c]">
      <div
        className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-[11px]"
        style={mono}
      >
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider"
          style={{
            background: badgeColor,
            color:
              badge === "TYPESCRIPT" ? "var(--fuse-warm)" : "var(--fuse-blue)",
          }}
        >
          {badge}
        </span>
        <span className="text-[#3a3936]">{filename}</span>
        <span className="ml-auto text-[#3a3936]">{lines} ln</span>
      </div>
      <div
        className="overflow-x-auto text-[11.5px] leading-[1.7] [&_pre]:!bg-transparent [&_pre]:px-4 [&_pre]:py-4 [&_code]:!text-[11.5px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* ── Code snippets ────────────────────────────────────────────────── */

const fuseCode = `import { createSignal } from "solid-js";

export default function App() {
  const [count, setCount] = createSignal(0);

  return (
    <view flex={{ align: "center", justify: "center", expand: true }}>
      <text fontSize={48} fontWeight="bold">
        {count()}
      </text>
      <gestureDetector onTap={() => setCount(c => c + 1)} />
    </view>
  );
}`;

const dartCode = `import 'package:flutter/material.dart';
import 'package:solid_fuse/solid_fuse.dart';
import '_generated/fuse_packages.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final runtime = await FuseRuntime.create();
  registerFusePackages(runtime);
  await runtime.start();

  runApp(MaterialApp(
    home: FuseView(runtime: runtime),
  ));
}`;

const reactivityCode = `const [count, setCount] = createSignal(0);

// signal changes → one widget rebuilds
<text fontSize={48}>{count()}</text>
<gestureDetector onTap={() => setCount(c => c + 1)} />`;

const extendCode = `// JSX type
badge: { label: string; color?: ColorInput };

// Dart widget
class FuseBadge extends StatelessWidget {
  const FuseBadge(this.node);
  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(node.string('label') ?? ''));
  }
}

// Register
runtime.registerWidget('badge', FuseBadge.new);`;

/* ── Page ─────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [fuseHtml, dartHtml, reactivityHtml, extendHtml] = await Promise.all([
    highlight(fuseCode, "tsx"),
    highlight(dartCode, "dart"),
    highlight(reactivityCode, "tsx"),
    highlight(extendCode, "dart"),
  ]);

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative mx-2.5 mt-2.5 overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_60%_at_78%_25%,rgba(212,147,89,0.07)_0%,transparent_60%)]" />
        <DotGrid
          color="rgba(212, 147, 89, 0.25)"
          glow={{ x: 0.78, y: 0.25, radius: 0.45, intensity: 0.5 }}
        />

        <div className="relative z-10 px-8 pt-14 md:px-14">
          <div
            className="mb-7 text-xs text-[var(--fuse-accent)] tracking-wide"
            style={mono}
          >
            // build native apps with SolidJS and Flutter
          </div>
          <h1 className="mb-10 text-[52px] font-medium leading-[1.05] tracking-[-0.035em] md:text-[72px]">
            Signals in.
            <br />
            Pixels out.
          </h1>
          <div className="mb-16 flex gap-2.5">
            <Link
              href="/docs/getting-started"
              className="rounded-[10px] px-6 py-2.5 text-[13px] font-semibold tracking-wide"
              style={{
                ...mono,
                background: "var(--fuse-accent)",
                color: "#18120a",
              }}
            >
              get started
            </Link>
            <a
              href="https://github.com/wytzepiet/solid-fuse"
              className="rounded-[10px] border border-white/10 px-6 py-2.5 text-[13px] font-normal text-[#76746e] backdrop-blur-[1.5px]"
              style={mono}
            >
              view source
            </a>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-2.5 px-2.5 md:grid-cols-2">
          <CodePanel
            badge="TYPESCRIPT"
            badgeColor="var(--fuse-warm-dim)"
            filename="App.tsx"
            lines={fuseCode.split("\n").length}
            html={fuseHtml}
          />
          <CodePanel
            badge="DART"
            badgeColor="var(--fuse-blue-dim)"
            filename="main.dart"
            lines={dartCode.split("\n").length}
            html={dartHtml}
          />
        </div>
      </section>

      {/* ── Introduction ─────────────────────────────────────── */}
      <section className="px-8 py-28 md:px-14">
        <p className="max-w-[820px] text-[32px] font-medium leading-snug tracking-tight text-[#e8e6e0] md:text-[40px]">
          Fuse is a framework for building{" "}
          <span className="text-[var(--fuse-accent)]">native apps</span> with{" "}
          <a
            href="https://www.solidjs.com/"
            className="underline decoration-white/40 underline-offset-4 hover:decoration-white/60"
          >
            SolidJS
          </a>{" "}
          and{" "}
          <a
            href="https://flutter.dev/"
            className="underline decoration-white/40 underline-offset-4 hover:decoration-white/60"
          >
            Flutter
          </a>
          . Reactive signals drive real widgets through an embedded JS engine.{" "}
          <span className="text-[#76746e]">
            No webview, no bridge serialization, no compromise. Write TSX,
            render with Impeller, ship to all platforms.
          </span>
        </p>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="px-8 pb-28 md:px-14">
        <div className="mb-3" style={mono}>
          <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--fuse-accent)]">
            01 &mdash; features
          </span>
        </div>
        <div className="mb-16 grid grid-cols-1 gap-x-20 md:grid-cols-2">
          <h2 className="text-[40px] font-medium leading-tight tracking-tight md:text-[56px]">
            Why Solid Fuse
          </h2>
          <p className="mt-4 max-w-[480px] self-end text-lg font-light leading-relaxed text-white/40 md:mt-0">
            The best parts of two ecosystems, connected at the rendering layer.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-6">
          {/* ── Hero card: Reactivity ── */}
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f] md:col-span-4">
            <div className="p-10 pb-0">
              <h3 className="mb-3 text-xl font-semibold tracking-tight">
                Fine-grained reactivity
              </h3>
              <p className="max-w-[400px] text-sm font-light leading-relaxed text-[#76746e]">
                Signals propagate directly to widget props. No VDOM, no diffing.
                A signal changes, one widget rebuilds.
              </p>
            </div>
            <div
              className="mt-8 ml-10 overflow-hidden rounded-tl-lg border-l border-t border-white/5 bg-[#08080a] text-[11px] leading-[1.7] [&_pre]:!bg-transparent [&_pre]:px-4 [&_pre]:py-4 [&_code]:!text-[11px]"
              dangerouslySetInnerHTML={{ __html: reactivityHtml }}
            />
          </div>

          {/* ── Side card: Native performance ── */}
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f] p-10 md:col-span-2">
            <h3 className="mb-3 text-xl font-semibold tracking-tight">
              Native performance
            </h3>
            <p className="mb-8 text-sm font-light leading-relaxed text-[#76746e]">
              Impeller GPU rendering. Rust-powered JS runtime. Even fetch and
              crypto run at native speed.
            </p>
            <div className="flex flex-wrap gap-1.5" style={mono}>
              {[
                "Impeller",
                "Rust FFI",
                "fetch",
                "crypto",
                "timers",
                "streams",
                "zlib",
                "fs",
                "bytecode",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-[#7ec699]/10 bg-[#7ec699]/5 px-2.5 py-1 text-[10px] text-[#7ec699]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* ── Easy to extend ── */}
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f] md:col-span-3">
            <div className="p-10 pb-0">
              <h3 className="mb-3 text-xl font-semibold tracking-tight">
                Easy to extend
              </h3>
              <p className="text-sm font-light leading-relaxed text-[#76746e]">
                Write a Dart class, add a JSX type, register it. Any Flutter
                widget becomes a JSX element.
              </p>
            </div>
            <div
              className="mt-8 ml-10 overflow-hidden rounded-tl-lg border-l border-t border-white/5 bg-[#08080a] text-[11px] leading-[1.7] [&_pre]:!bg-transparent [&_pre]:px-4 [&_pre]:py-4 [&_code]:!text-[11px]"
              dangerouslySetInnerHTML={{ __html: extendHtml }}
            />
          </div>

          {/* ── Hot reload ── */}
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f] p-10 md:col-span-3">
            <h3 className="mb-3 text-xl font-semibold tracking-tight">
              Hot reload
            </h3>
            <p className="mb-8 text-sm font-light leading-relaxed text-[#76746e]">
              Vite HMR on a real device. Edit, save, see it update — without
              restarting Flutter.
            </p>
            <div
              className="overflow-hidden rounded-lg border border-white/5 bg-[#08080a]"
              style={mono}
            >
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5 text-[10px] text-[#3a3936]">
                <span className="h-2 w-2 rounded-full bg-[#7ec699]" />
                terminal
              </div>
              <div className="px-4 py-3 text-[11px] leading-[1.8] text-[#76746e]">
                <div>
                  <span className="text-[#3a3936]">$</span>{" "}
                  <span className="text-[#e8e6e0]">bun dev</span>
                </div>
                <div className="text-[#3a3936]">┌ vite dev server running</div>
                <div className="text-[#3a3936]">├ flutter: launching...</div>
                <div className="text-[#7ec699]">✓ connected</div>
                <div className="mt-2 text-[#3a3936]">
                  hmr update{" "}
                  <span className="text-[var(--fuse-accent)]">App.tsx</span>{" "}
                  <span className="text-[#7ec699]">12ms</span>
                </div>
                <div className="text-[#3a3936]">
                  hmr update{" "}
                  <span className="text-[var(--fuse-accent)]">Header.tsx</span>{" "}
                  <span className="text-[#7ec699]">8ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture ──────────────────────────────────────── */}
      <section className="relative mx-2.5 overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_70%_at_35%_30%,rgba(212,147,89,0.08)_0%,transparent_60%)]" />
        <DotGrid
          color="rgba(212, 147, 89, 0.12)"
          spacing={14}
          glow={{ x: 0.35, y: 0.3, radius: 0.7, intensity: 0.3 }}
        />
        <div className="relative z-10 px-8 py-28 md:px-14">
          <div className="mb-3" style={mono}>
            <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--fuse-accent)]">
              02 &mdash; architecture
            </span>
          </div>
          <div className="mb-20 grid grid-cols-1 gap-x-20 md:grid-cols-2">
            <h2 className="text-[40px] font-medium leading-tight tracking-tight md:text-[56px]">
              From signal to pixel
            </h2>
            <p className="mt-4 max-w-[480px] self-end text-lg font-light leading-relaxed text-white/40 md:mt-0">
              TypeScript runs in QuickJS, embedded via FFI. Signals flow
              directly to native widgets.
            </p>
          </div>
          <div className="flex items-stretch justify-center gap-1">
            {[
              { label: "SolidJS", sub: "your code", style: "js" as const },
              { label: "QuickJS", sub: "runtime", style: "purple" as const },
              { label: "Rust FFI", sub: "bridge", style: "bridge" as const },
              { label: "Flutter", sub: "widgets", style: "dart" as const },
              { label: "Impeller", sub: "pixels", style: "native" as const },
            ].map((node, i, arr) => (
              <div key={node.label} className="flex items-start">
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full whitespace-nowrap rounded-xl border px-5 py-4 text-center text-sm font-semibold backdrop-blur-[1.5px]"
                    style={{
                      ...mono,
                      ...(node.style === "js"
                        ? {
                            background: "rgba(100,160,255,0.05)",
                            color: "var(--fuse-blue)",
                            borderColor: "rgba(100,160,255,0.1)",
                          }
                        : node.style === "purple"
                          ? {
                              background: "var(--fuse-violet-dim)",
                              color: "var(--fuse-violet)",
                              borderColor: "rgba(168,130,220,0.1)",
                            }
                          : node.style === "bridge"
                            ? {
                                background: "var(--fuse-accent-dim)",
                                color: "var(--fuse-accent)",
                                borderColor: "rgba(212,147,89,0.1)",
                              }
                            : node.style === "dart"
                              ? {
                                  background: "rgba(100,160,255,0.05)",
                                  color: "var(--fuse-blue)",
                                  borderColor: "rgba(100,160,255,0.1)",
                                }
                              : {
                                  background: "rgba(126,198,153,0.05)",
                                  color: "#7ec699",
                                  borderColor: "rgba(126,198,153,0.1)",
                                }),
                    }}
                  >
                    {node.label}
                  </div>
                  <span className="text-[10px] text-[#3a3936]" style={mono}>
                    {node.sub}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <span
                    className="self-start mt-4 px-2 text-sm text-[#3a3936]"
                    style={mono}
                  >
                    {"\u2192"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two audiences ─────────────────────────────────────── */}
      <section className="px-8 py-28 md:px-14">
        <div className="mb-3" style={mono}>
          <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--fuse-accent)]">
            03 &mdash; two ecosystems
          </span>
        </div>
        <div className="mb-16 grid grid-cols-1 gap-x-20 md:grid-cols-2">
          <h2 className="text-[40px] font-medium leading-tight tracking-tight md:text-[56px]">
            The best of both worlds
          </h2>
          <p className="mt-4 max-w-[480px] self-end text-lg font-light leading-relaxed text-white/40 md:mt-0">
            TypeScript for your app logic. Flutter for rendering. You don&apos;t
            compromise on either.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0f] p-10 md:p-14">
            <span
              className="mb-6 inline-block rounded px-2.5 py-0.5 text-[10px] font-semibold tracking-wider"
              style={{
                ...mono,
                background: "var(--fuse-warm-dim)",
                color: "var(--fuse-warm)",
              }}
            >
              WHAT TYPESCRIPT GIVES YOU
            </span>
            <div className="space-y-2 text-[15px] font-light leading-relaxed text-[#76746e]">
              {[
                "SolidJS signals for state and UI",
                "Your existing npm packages",
                "Vite HMR on a real device",
                "Ship updates without the App Store",
                "No Dart required to build features",
              ].map((text) => (
                <div key={text} className="flex items-baseline gap-3">
                  <span
                    className="shrink-0 text-[10px] text-[#3a3936]"
                    style={mono}
                  >
                    //
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0f] p-10 md:p-14">
            <span
              className="mb-6 inline-block rounded px-2.5 py-0.5 text-[10px] font-semibold tracking-wider"
              style={{
                ...mono,
                background: "var(--fuse-blue-dim)",
                color: "var(--fuse-blue)",
              }}
            >
              WHAT FLUTTER GIVES YOU
            </span>
            <div className="space-y-2 text-[15px] font-light leading-relaxed text-[#76746e]">
              {[
                "Impeller GPU rendering on every platform",
                "Pixel-perfect UI without platform quirks",
                "Add a widget in one Dart class",
                "Full access to any pub.dev package",
                "Share extensions on npm",
              ].map((text) => (
                <div key={text} className="flex items-baseline gap-3">
                  <span
                    className="shrink-0 text-[10px] text-[#3a3936]"
                    style={mono}
                  >
                    //
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ────────────────────────────────────────── */}
      <section className="px-8 pb-28 md:px-14">
        <div className="mb-3" style={mono}>
          <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--fuse-accent)]">
            04 &mdash; comparison
          </span>
        </div>
        <h2 className="mb-16 text-[40px] font-medium leading-tight tracking-tight md:text-[56px]">
          How it stacks up
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f]">
          <table className="w-full border-collapse text-[13px]" style={mono}>
            <thead>
              <tr>
                <th className="border-b border-white/5 px-8 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-[#3a3936]" />
                <th className="border-b border-white/5 bg-[var(--fuse-accent-dim)] px-8 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--fuse-accent)]">
                  solid-fuse
                </th>
                <th className="border-b border-white/5 px-8 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-[#3a3936]">
                  react native
                </th>
                <th className="border-b border-white/5 px-8 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-[#3a3936]">
                  flutter
                </th>
                <th className="border-b border-white/5 px-8 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-[#3a3936]">
                  capacitor
                </th>
              </tr>
            </thead>
            <tbody className="font-light text-[#76746e]">
              {(
                [
                  ["language", "TypeScript", "JS / TS", "Dart", "JS / TS"],
                  [
                    "rendering",
                    "Impeller (GPU)",
                    "native views",
                    "Impeller (GPU)",
                    "webview",
                  ],
                  [
                    "reactivity",
                    "signals",
                    "VDOM diff",
                    "setState",
                    "VDOM diff",
                  ],
                  [
                    "npm ecosystem",
                    ["check", ""],
                    ["check", ""],
                    ["cross", ""],
                    ["check", ""],
                  ],
                  [
                    "pixel-perfect",
                    ["check", ""],
                    ["cross", ""],
                    ["check", ""],
                    ["cross", ""],
                  ],
                  [
                    "ota updates",
                    ["check", "built-in"],
                    ["check", "codepush"],
                    ["cross", ""],
                    ["check", "native"],
                  ],
                ] as const
              ).map((row, ri, arr) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isHighlight = ci === 1;
                    const isLast = ri === arr.length - 1;
                    let content: React.ReactNode;

                    if (typeof cell === "string") {
                      content =
                        ci === 0 ? (
                          <span className="font-medium text-[#e8e6e0]">
                            {cell}
                          </span>
                        ) : (
                          cell
                        );
                    } else {
                      const [type, label] = cell;
                      const icon =
                        type === "check" ? (
                          <span className="text-[#7ec699]">&#10003;</span>
                        ) : (
                          <span className="text-[#4a3e3e]">&#10005;</span>
                        );
                      content = (
                        <span>
                          {icon}
                          {label && <span className="ml-1.5">{label}</span>}
                        </span>
                      );
                    }

                    return (
                      <td
                        key={ci}
                        className={`px-8 py-4 ${!isLast ? "border-b border-white/5" : ""} ${isHighlight ? "bg-[rgba(212,147,89,0.02)] text-[#e8e6e0]" : ""}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="relative mx-2.5 overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0f]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(212,147,89,0.08)_0%,transparent_60%)]" />
        <DotGrid
          color="rgba(212, 147, 89, 0.12)"
          spacing={14}
          glow={{ x: 0.5, y: 0.4, radius: 0.6, intensity: 0.3 }}
        />
        <div className="relative z-10 px-8 py-28 text-center md:px-14 md:py-36">
          <h2 className="mb-4 text-[48px] font-medium tracking-tight md:text-[64px]">
            Start building.
          </h2>
          <p className="mb-10 text-lg font-light text-[#76746e]">
            Zero to running app in under a minute.
          </p>
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-base backdrop-blur-[1.5px]"
            style={mono}
          >
            <span className="select-none text-[#3a3936]">$</span>
            bunx create-solid-fuse my-app
          </div>
          <div className="flex justify-center gap-2.5">
            <Link
              href="/docs/getting-started"
              className="rounded-[10px] px-7 py-3 text-[13px] font-semibold"
              style={{
                ...mono,
                background: "var(--fuse-accent)",
                color: "#18120a",
              }}
            >
              read the docs
            </Link>
            <a
              href="https://github.com/wytzepiet/solid-fuse"
              className="rounded-[10px] border border-white/10 px-7 py-3 text-[13px] font-normal text-[#76746e] backdrop-blur-[1.5px]"
              style={mono}
            >
              github
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        className="flex items-center justify-between px-8 py-6 text-[11px] text-[#3a3936] md:px-14"
        style={mono}
      >
        <span>solid-fuse // early preview</span>
        <div className="flex gap-5">
          <Link href="/docs" className="hover:text-[#76746e]">
            docs
          </Link>
          <a
            href="https://github.com/wytzepiet/solid-fuse"
            className="hover:text-[#76746e]"
          >
            github
          </a>
        </div>
      </footer>
    </div>
  );
}

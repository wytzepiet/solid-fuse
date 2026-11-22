import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { createSignal, flush } from "solid-js";
import { FUSE_INTRINSICS, transformJsx, trimText } from "./compile-plugin";

// Run through `bun run test`: Solid's client build is needed (see
// src/renderer.test.ts).
//
// The claim under test: compiling JSX through the compile step and then
// Solid's compiler gives Dart the same tree as Solid's compiler alone, at
// mount and after every update. Each fixture is compiled both ways, run
// against the real renderer, and the ops are applied to a model of
// `FuseRuntime.applyOps`. The batches of the templated run are also written
// to dart/test/fixtures/template_ops.json, which the Dart tests replay
// through the real `applyOps` (dart/test/template_ops_test.dart).

const sent: any[] = [];
(globalThis as any).__fuseHost = { mode: "release", platform: "linux", brightness: "light" };
(globalThis as any).fjs = {
  bridge_call: (msg: any) => (sent.push(msg), Promise.resolve(null)),
};

const rendererPath = resolve(import.meta.dirname, "../src/renderer.ts");
const compiler: { transform(code: string, options: object): { code: string } } = createRequire(
  createRequire(import.meta.url).resolve("@solidjs/vite-plugin"),
)("@solidjs/compiler");

let R: typeof import("../src/renderer");
let dir: string;
let runtimePath: string;
beforeAll(async () => {
  R = await import(rendererPath);
  dir = mkdtempSync(join(tmpdir(), "fuse-compile-"));
  // What fixtures import as "solid-fuse": the renderer, the wrapper
  // components as the compiler emits them, and a component of our own.
  runtimePath = join(dir, "runtime.ts");
  writeFileSync(
    runtimePath,
    `export * from ${JSON.stringify(rendererPath)};
import { createElement, spread, createTextNode, insertNode } from ${JSON.stringify(rendererPath)};
const wrapper = (tag) => (props) => { const el = createElement(tag); spread(el, props, false); return el; };
${Object.entries(FUSE_INTRINSICS).map(([name, tag]) => `export const ${name} = wrapper(${JSON.stringify(tag)});`).join("\n")}
export const Badge = (props) => { const el = createElement("badge", { label: props.label }); return el; };
`,
  );
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// --- A model of FuseRuntime.applyOps ---

interface ModelNode {
  type: string;
  props: Record<string, any>;
  children: number[];
  parent?: number;
}

class Model {
  nodes = new Map<number, ModelNode>([[0, { type: "root", props: {}, children: [] }]]);
  templates = new Map<number, any[]>();

  apply(flat: any[]) {
    for (let i = 0; i < flat.length; ) {
      switch (flat[i]) {
        case 0: this.nodes.set(flat[i + 1], { type: flat[i + 2], props: { ...flat[i + 3] }, children: [] }); i += 4; break;
        case 1: this.nodes.set(flat[i + 1], { type: "__text__", props: { text: flat[i + 2] }, children: [] }); i += 3; break;
        case 2: this.get(flat[i + 1]).props[flat[i + 2]] = flat[i + 3]; i += 4; break;
        case 3: this.get(flat[i + 1]).props.text = flat[i + 2]; i += 3; break;
        case 4: {
          const [parent, child, before] = [flat[i + 1], flat[i + 2], flat[i + 3]];
          i += 4;
          this.get(child);
          this.detach(child);
          const list = this.get(parent).children;
          const at = before === null ? -1 : list.indexOf(before);
          list.splice(at < 0 ? list.length : at, 0, child);
          this.nodes.get(child)!.parent = parent;
          break;
        }
        case 5: this.get(flat[i + 1]); this.detach(flat[i + 1]); i += 2; break;
        case 6: if (this.nodes.has(flat[i + 1])) { this.detach(flat[i + 1]); this.drop(flat[i + 1]); } i += 2; break;
        case 7: this.templates.set(flat[i + 1], flat[i + 2]); i += 3; break;
        case 8: {
          const shape = this.templates.get(flat[i + 1]);
          if (!shape) throw new Error(`unknown template ${flat[i + 1]}`);
          this.instantiate(shape, flat[i + 2], undefined);
          i += 4;
          break;
        }
        case 9: Object.assign(this.get(flat[i + 1]).props, flat[i + 2]); i += 3; break;
        default: throw new Error(`unknown opcode ${flat[i]} at ${i}`);
      }
    }
  }

  private instantiate(shape: any[], id: number, parent: number | undefined): number {
    const self = id++;
    this.nodes.set(self, { type: shape[0], props: shape[1] ? { ...shape[1] } : {}, children: [], parent });
    if (parent !== undefined) this.nodes.get(parent)!.children.push(self);
    for (const child of shape.slice(2)) {
      if (typeof child === "string") {
        this.nodes.set(id, { type: "__text__", props: { text: child }, children: [], parent: self });
        this.nodes.get(self)!.children.push(id++);
      } else {
        id = this.instantiate(child, id, self);
      }
    }
    return id;
  }

  private get(id: number): ModelNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`op for unknown node ${id}`);
    return node;
  }
  private detach(id: number) {
    const node = this.nodes.get(id)!;
    if (node.parent === undefined) return;
    const list = this.nodes.get(node.parent)!.children;
    list.splice(list.indexOf(id), 1);
    node.parent = undefined;
  }
  private drop(id: number) {
    for (const child of this.nodes.get(id)!.children) this.drop(child);
    this.nodes.delete(id);
  }

  /** The tree without ids: text as a string, node references resolved. */
  snapshot(id = 0): any {
    const node = this.get(id);
    if (node.type === "__text__") return node.props.text;
    const props: Record<string, any> = {};
    for (const key of Object.keys(node.props).sort()) {
      const value = node.props[key];
      if (value === undefined) continue;
      props[key] = value !== null && typeof value === "object" && "_node" in value ? this.snapshot(value._node) : value;
    }
    // Empty text nodes are Solid's placeholders; `FuseNode.children` skips them.
    const children = node.children.filter((c) => {
      const child = this.get(c);
      return !(child.type === "__text__" && child.props.text === "");
    });
    // Adjacent text is compared joined: Solid's compiler joins literal text
    // that a component's children array keeps apart (\`a{"b"}c\`).
    const out: any[] = [node.type, props];
    for (const child of children) {
      const snap = this.snapshot(child);
      if (typeof snap === "string" && typeof out[out.length - 1] === "string" && out.length > 2) out[out.length - 1] += snap;
      else out.push(snap);
    }
    return out;
  }
}

// --- Fixtures ---
//
// Each is the body of `function Fixture(s)`; `s` holds the signals below.

const fixtures: Record<string, string> = {
  "static tree": `
    return (
      <View padding={8} decoration={{ color: "#fff", radius: 4 }}>
        <Text fontSize={12}>Total</Text>
        <View flex={{ direction: "horizontal", gap: -2 }} visible><Text>a</Text><Text>b</Text></View>
      </View>
    );`,
  "dynamic prop and text, deep": `
    return (
      <View padding={8}>
        <View>
          <View width={1}><Text color="red" fontSize={s.count() + 10}>{s.name()}</Text></View>
          <Text>static</Text>
        </View>
        <Text>tail</Text>
      </View>
    );`,
  "text around an expression": `
    return <Text>Hello {s.name()}! You have {s.count()}
      new   messages</Text>;`,
  "whitespace": `
    return (
      <View>
        <Text>  padded  </Text> <Text>
          two
          lines
        </Text>
        {/* a comment */}
        <Text>x</Text>
      </View>
    );`,
  "component between static siblings": `
    return (
      <View>
        <Text>before</Text>
        <Badge label={s.name()} />
        <Text>after</Text>
        <Badge label="last" />
      </View>
    );`,
  "handler, ref and node prop": `
    let seen;
    const el = (
      <View>
        <View onTap={() => s.setCount(s.count() + 1)} ref={(n) => (seen = n)} leading={<Text>lead</Text>}>
          <Text>tap {s.count()}</Text>
        </View>
      </View>
    );
    s.tap = () => globalThis.__dispatch("_functionCall", { nodeId: seen.id, name: "onTap" });
    return el;`,
  "keyed list of templated rows": `
    return (
      <View>
        <Text>header</Text>
        <For each={s.items()}>{(item) => (
          <View padding={4}>
            <Text fontSize={10}>row</Text>
            <Text>{item}</Text>
          </View>
        )}</For>
        <Text>footer</Text>
      </View>
    );`,
  "show and conditional": `
    return (
      <View>
        <Show when={s.show()}><View><Text>shown</Text></View></Show>
        <Text>middle</Text>
        {s.show() ? <Text>yes <Text>nested</Text></Text> : <View height={1} />}
        {s.items().map((i) => <Text>{i}</Text>)}
      </View>
    );`,
  "spread and children attribute": `
    const extra = { height: 3, get width() { return s.count(); } };
    return (
      <View>
        <View padding={1} {...extra} margin={2}><Text>in spread</Text></View>
        <Text children="as attribute" fontSize={9} />
        <View><Text>plain</Text></View>
      </View>
    );`,
  "children Solid's compiler places itself": `
    return (
      <View>
        <Text>fish &amp; chips</Text>
        <Text>a{"b"}c</Text>
        <View><Text>x</Text>{"lit"}<Text>y</Text></View>
        <View><Text>p</Text><><Text>q</Text><Text>r</Text></><Text>s</Text></View>
        <View><Text>m</Text>{<Text>n</Text>}<Text>o</Text></View>
        <View title="a&quot;b" note={\`t\`}><Text>z</Text></View>
      </View>
    );`,
  "held element re-inserted": `
    const held = <View width={7}><Text>held</Text></View>;
    return <View><Text>top</Text><Show when={s.show()}>{held}</Show><Text>bottom</Text></View>;`,
  "aliased wrapper, lowercase tags, component root": `
    return (
      <Badge label="root">
        <view><T>alias</T><text fontSize={1}>lower</text></view>
      </Badge>
    );`,
  "fragment root and only dynamic children": `
    return (
      <>
        <View><Text>one</Text></View>
        <View>{s.name()}</View>
        <View>{s.items().length}<Text>n</Text></View>
      </>
    );`,
};

const header = `import { View, Text, Text as T, Badge, For, Show } from "solid-fuse";\n`;

interface Run {
  batches: any[][];
  snapshots: any[];
}

const steps: ((s: any) => unknown)[] = [
  (s) => s.setCount(1),
  (s) => s.setName("Bea"),
  (s) => s.setShow(false),
  (s) => s.setItems(["c", "b", "a"]),
  (s) => s.tap?.(),
  (s) => s.setShow(true),
  (s) => s.setItems(["b", "d"]),
  (s) => s.setItems([]),
  (s) => (s.setShow(false), s.setCount(2)),
  (s) => (s.setShow(true), s.setItems(["x"])),
];

let moduleCount = 0;

async function run(name: string, mode: "templates" | "intrinsics" | "plain"): Promise<Run> {
  const source = `${header}export default function Fixture(s) {${fixtures[name]}\n}\n`;
  const pre = mode === "plain" ? null : transformJsx(source, "/fixture.tsx", { templates: mode === "templates", moduleName: "solid-fuse" });
  const compiled = compiler.transform(pre?.code ?? source, {
    filename: "fixture.tsx",
    generate: "universal",
    moduleName: "solid-fuse",
  }).code;
  const file = join(dir, `fixture-${moduleCount++}.ts`);
  writeFileSync(file, compiled.replaceAll(`from "solid-fuse"`, `from ${JSON.stringify(runtimePath)}`));
  const Fixture = (await import(file)).default;

  const [count, setCount] = createSignal(0);
  const [label, setName] = createSignal("Ann");
  const [show, setShow] = createSignal(true);
  const [items, setItems] = createSignal(["a", "b", "c"]);
  const s: any = { count, setCount, name: label, setName, show, setShow, items, setItems };

  const model = new Model();
  const out: Run = { batches: [], snapshots: [] };
  const take = () => {
    flush();
    R.flushOps();
    const batch: any[] = [];
    for (const m of sent) if (m.channel === "_ops") batch.push(...JSON.parse(m.json));
    sent.length = 0;
    // A node collected from an earlier run may be disposed here; it is not
    // part of this run's tree.
    for (let i = 0; i < batch.length; ) {
      if (batch[i] === 6 && !model.nodes.has(batch[i + 1])) batch.splice(i, 2);
      else i += opLength[batch[i]];
    }
    model.apply(batch);
    out.batches.push(batch);
    out.snapshots.push(model.snapshot());
  };

  R.flushOps();
  sent.length = 0;
  const dispose = R.render(() => Fixture(s));
  take();
  for (const step of steps) {
    await step(s);
    take();
  }
  dispose();
  R.flushOps();
  sent.length = 0;
  return out;
}

const opLength = [4, 3, 4, 3, 4, 2, 2, 3, 4, 3];

const count = (batch: any[], opcode: number) => {
  let n = 0;
  for (let i = 0; i < batch.length; i += opLength[batch[i]]) if (batch[i] === opcode) n++;
  return n;
};

describe("templates give Dart the same tree as Solid's compiler alone", () => {
  const recorded: Record<string, { batches: any[][]; snapshots: any[] }> = {};

  for (const name of Object.keys(fixtures)) {
    test(name, async () => {
      const plain = await run(name, "plain");
      const intrinsics = await run(name, "intrinsics");
      const templates = await run(name, "templates");
      expect(intrinsics.snapshots).toEqual(plain.snapshots);
      expect(templates.snapshots).toEqual(plain.snapshots);
      recorded[name] = templates;
    });
  }

  test("the batches the Dart tests replay are up to date", () => {
    // Ids depend on what ran before; renumber from the first id of each run
    // so the file is stable.
    const file = resolve(import.meta.dirname, "../dart/test/fixtures/template_ops.json");
    const runs = Object.entries(normalise(recorded)).map(([name, run]) => `${JSON.stringify(name)}: ${JSON.stringify(run)}`);
    const json = `{\n${runs.join(",\n")}\n}\n`;
    if (process.env.UPDATE_FIXTURES) writeFileSync(file, json);
    expect(readFileSync(file, "utf8")).toBe(json);
  });
});

/** Shift node and template ids so that each run starts from 1 and 0, and drop disposals. */
function normalise(recorded: Record<string, Run>) {
  const out: Record<string, Run> = {};
  for (const [name, run] of Object.entries(recorded)) {
    let firstNode = Infinity, firstTemplate = Infinity;
    const scan = (visit: (batch: any[], i: number) => void) => {
      for (const batch of run.batches) for (let i = 0; i < batch.length; i += opLength[batch[i]]) visit(batch, i);
    };
    scan((b, i) => {
      if (b[i] === 0 || b[i] === 1) firstNode = Math.min(firstNode, b[i + 1]);
      if (b[i] === 8) firstNode = Math.min(firstNode, b[i + 2]);
      if (b[i] === 7) firstTemplate = Math.min(firstTemplate, b[i + 1]);
    });
    const node = (id: number | null) => (id === null || id === 0 ? id : id - firstNode + 1);
    const batches = run.batches.map((batch) => {
      const b = structuredClone(batch);
      // When a node is disposed depends on the garbage collector.
      for (let i = 0; i < b.length; ) {
        if (b[i] === 6) b.splice(i, 2);
        else i += opLength[b[i]];
      }
      for (let i = 0; i < b.length; i += opLength[b[i]]) {
        switch (b[i]) {
          case 0: case 1: case 3: case 5: case 6: case 9: b[i + 1] = node(b[i + 1]); break;
          case 2:
            b[i + 1] = node(b[i + 1]);
            if (b[i + 3] !== null && typeof b[i + 3] === "object" && "_node" in b[i + 3]) b[i + 3]._node = node(b[i + 3]._node);
            break;
          case 4: b[i + 1] = node(b[i + 1]); b[i + 2] = node(b[i + 2]); b[i + 3] = node(b[i + 3]); break;
          case 7: b[i + 1] -= firstTemplate; break;
          case 8: b[i + 1] -= firstTemplate; b[i + 2] = node(b[i + 2]); break;
        }
      }
      return b;
    });
    out[name] = { batches, snapshots: run.snapshots };
  }
  return out;
}

describe("what templates save", () => {
  test("a static tree mounts as one instantiate and one insert", async () => {
    const { batches } = await run("static tree", "templates");
    const mount = batches[0];
    expect([count(mount, 0), count(mount, 1), count(mount, 8), count(mount, 4)]).toEqual([0, 0, 1, 1]);
  });

  test("a template is defined once, however often it is used", async () => {
    const { batches } = await run("keyed list of templated rows", "templates");
    const all = batches.flat();
    // The outer tree and the row.
    expect(count(all, 7)).toBe(2);
    // 3 rows at mount; later steps add "d" and "x".
    expect(count(batches[0], 8)).toBe(4);
    expect(count(batches[0], 0)).toBe(0);
  });
});

describe("the compile step", () => {
  const compile = (body: string, options = {}) =>
    transformJsx(`import { View, Text } from "solid-fuse";\nconst x = ${body};\n`, "/a.tsx", options)?.code ?? null;

  test("leaves a file without JSX, or with nothing to do, alone", () => {
    expect(transformJsx("export const a = 1 < 2;", "/a.tsx")).toBeNull();
    expect(transformJsx(`const x = <Foo a={1}><Bar /></Foo>;`, "/a.tsx")).toBeNull();
    expect(transformJsx(`const x = <view a={b()} />;`, "/a.tsx")).toBeNull();
  });

  test("a wrapper component compiles as its element, also without templates", () => {
    expect(compile(`<View a={b()}><Text>{c()}</Text></View>`, { templates: false })).toContain(
      `const x = <view a={b()}><text>{c()}</text></view>;`,
    );
    // Not imported from solid-fuse: a component like any other.
    expect(transformJsx(`const x = <View><Text>a</Text></View>;`, "/a.tsx")).toBeNull();
  });

  test("only literals are lifted into the shape", () => {
    const code = compile(
      `<View a={1} b="s" c d={[1, { e: -2 }]} f={g} h={() => 1} i={j.k} l={\`m\${n}\`} o={1 as number} p={null}><Text>t</Text></View>`,
    )!;
    expect(code).toContain(
      `_$template(["view",{"a":1,"b":"s","c":true,"d":[1,{"e":-2}],"o":1,"p":null},["text",0,"t"]], 3)`,
    );
    expect(code).toMatch(/<h\$view \$t=\{_at\$1\} \$i=\{0\}\s+f=\{g\} h=\{\(\) => 1\} i=\{j\.k\} l=\{`m\$\{n\}`\}\s+>/);
  });

  test("generated builders with literal arguments fold into the shape", () => {
    const options = {
      intrinsics: { "solid-fuse/flutter": { Padding: "flutter_Padding" } },
      builders: {
        "solid-fuse/flutter": {
          "EdgeInsets.all": { tag: "EdgeInsets.all", positional: ["value"] },
          "EdgeInsets.only": { tag: "EdgeInsets.only", positional: [] },
          "Colors.red": { const: "Colors.red" },
          FlSpot: { tag: "FlSpot", positional: ["x", "y"] },
        },
      },
    };
    const code = transformJsx(
      `import { Padding, EdgeInsets as E, Colors, FlSpot } from "solid-fuse/flutter";\n` +
        `const x = <Padding a={E.all(8)} b={E.only({ left: 1 })} c={Colors.red} d={[FlSpot(0, 1)]} e={E.all(n)} f={Colors.blue} g={E.only(1)} />;\n`,
      "/a.tsx",
      options,
    )!.code;
    expect(code).toContain(
      `["flutter_Padding",{"a":{"$":"EdgeInsets.all","value":8},"b":{"$":"EdgeInsets.only","left":1},"c":"Colors.red","d":[{"$":"FlSpot","x":0,"y":1}]}]`,
    );
    // A dynamic argument, an unknown member, a non-object named argument: left to run.
    expect(code).toMatch(/e=\{E\.all\(n\)\} f=\{Colors\.blue\} g=\{E\.only\(1\)\}/);
  });

  test("line numbers do not move", () => {
    const source = `import { View, Text } from "solid-fuse";\nconst x = (\n  <View>\n    <Text>\n      a\n    </Text>\n    <Text>{b()}</Text>\n  </View>\n);\nthrow new Error("line 10");\n`;
    const out = transformJsx(source, "/a.tsx")!;
    expect(out.code.split("\n").length).toBe(source.split("\n").length);
    expect(out.code.split("\n")[9]).toBe(`throw new Error("line 10");`);
    expect(out.map.mappings.length).toBeGreaterThan(0);
  });

  test("text is trimmed the way Solid's compiler trims it", () => {
    for (const text of ["a", " a ", "  a   b  ", "\n  a\n  b\n", "a\n\n  b  ", " \n ", " ", "a \n b", "\ta\t"]) {
      const compiled = compiler.transform(`const x = <text>${text}<v/></text>;`, {
        filename: "a.tsx",
        generate: "universal",
        moduleName: "m",
      }).code;
      const match = compiled.match(/createTextNode\((".*")\)/);
      expect([text, trimText(text)]).toEqual([text, match ? JSON.parse(match[1]) : ""]);
    }
  });

  test("every listed wrapper is a plain forward to its element", () => {
    const widgets = resolve(import.meta.dirname, "../src/widgets");
    const sources = ["view", "text", "stack", "positioned", "gesture-detector", "icon", "scroll-view", "text-field"]
      .map((f) => readFileSync(join(widgets, `${f}.tsx`), "utf8"))
      .join("\n");
    for (const [name, tag] of Object.entries(FUSE_INTRINSICS)) {
      expect(sources).toMatch(
        new RegExp(`export function ${name}\\(props: \\w+\\) \\{\\s*return <${tag} \\{\\.\\.\\.props\\} />;\\s*\\}`),
      );
    }
  });
});

/**
 * TypeScript half of `fuse gen`: one `.tsx` module per Dart package (all of
 * Flutter and dart:* is `flutter`). A module holds
 *
 *  - a component per widget (`props => <tag {...props} />`, which the compile
 *    step turns into the element itself),
 *  - a type per enum (string literal union) and per data type (the union of
 *    what its decoder accepts),
 *  - builders that spell values the Dart way: `EdgeInsets.symmetric({ horizontal: 8 })`,
 *    `Colors.red`, `FlSpot(0, 1)`. They return the wire value (`{ $: tag, ... }`
 *    or `"Owner.field"`), which users never write by hand.
 */
import { tagOf } from "./emit-dart";
import { moduleOf, mustSupply, uriOf, type DataType, type FnRef, type Manifest, type Param, type Ref, type Variant } from "./manifest";

export interface TsModule {
  /** Package name; the file is `<name>.tsx`. */
  name: string;
  code: string;
}

/** For the compile step: how to fold a builder call into its value. */
export interface BuilderEntry {
  tag: string;
  /** Positional parameter names, in order; a further object argument holds the named ones. */
  positional: string[];
}

export interface TsOutput {
  modules: TsModule[];
  /** Module name -> component -> element tag. */
  intrinsics: Record<string, Record<string, string>>;
  /** Module name -> `Namespace.member` (or `Name` for a callable) -> how to fold it. */
  builders: Record<string, Record<string, BuilderEntry | { const: string }>>;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const RESERVED = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "enum",
  "export", "extends", "false", "finally", "for", "function", "if", "import", "in", "instanceof", "new", "null",
  "return", "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "let", "static", "implements", "interface", "package", "private", "protected", "public", "await",
]);
const prop = (n: string) => (IDENT.test(n) ? n : JSON.stringify(n));
const lit = (s: string) => JSON.stringify(s);

function jsdoc(indent: string, doc?: string, deprecated?: boolean, extra: string[] = []): string {
  const lines = [...(doc ? [doc.replace(/\*\//g, "*\\/")] : []), ...extra, ...(deprecated ? ["@deprecated"] : [])];
  if (lines.length === 0) return "";
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return `${indent}/**\n${lines.map((l) => `${indent} * ${l}`).join("\n")}\n${indent} */\n`;
}

class Module {
  readonly values = new Set<string>();
  readonly types = new Set<string>();
  readonly imports = new Map<string, Set<string>>(); // module -> names
  readonly typeImports = new Map<string, Set<string>>();
  readonly parts: string[] = [];
  readonly intrinsics: Record<string, string> = {};
  readonly builders: Record<string, BuilderEntry | { const: string }> = {};
  usesHandle = false;
  usesBuild = false;
  constructor(readonly name: string) {}

  claim(space: "value" | "type", base: string): string {
    const set = space === "value" ? this.values : this.types;
    let n = RESERVED.has(base) ? `${base}_` : base;
    for (let i = 2; set.has(n); i++) n = `${base}${i}`;
    set.add(n);
    return n;
  }
}

export function emitTs(m: Manifest): TsOutput {
  const modules = new Map<string, Module>();
  const mod = (name: string) => {
    let x = modules.get(name);
    if (!x) modules.set(name, (x = new Module(name)));
    return x;
  };
  const prefixModule = new Map(m.imports.map((i) => [i.prefix, moduleOf(i.uri)]));
  /** Module of a Dart name like `material_ui.Colors` (dart:core names have no prefix). */
  const moduleOfDart = (dart: string) => {
    const dot = dart.indexOf(".");
    const lt = dart.indexOf("<");
    if (dot < 0 || (lt >= 0 && lt < dot)) return "flutter";
    return prefixModule.get(dart.slice(0, dot)) ?? "flutter";
  };
  /** `widgets.WidgetStatePropertyAll<widgets.Color?>` -> `WidgetStatePropertyAll`. */
  const className = (dart: string) => {
    const head = dart.split("<")[0].replace(/\?$/, "");
    return head.slice(head.lastIndexOf(".") + 1);
  };

  // ── type names ──────────────────────────────────────────────────────────

  const typeNames = new Map<string, { module: string; name: string }>();
  const outNames = new Map<string, { module: string; name: string }>();
  const pendingTypes: string[] = [];
  const pendingOut: string[] = [];

  function typeName(id: string, from: Module): string {
    let t = typeNames.get(id);
    if (!t) {
      const decl = m.types[id];
      const module = moduleOf(uriOf(id));
      const display = id.slice(id.indexOf("#") + 1);
      const base = display.replace(/\?/g, "N").replace(/[<>, ]+/g, (s) => (s.includes("<") ? "Of" : s.includes(",") ? "And" : "")).replace(/[^A-Za-z0-9_$]/g, "");
      t = { module, name: mod(module).claim("type", decl.kind === "enum" || !display.includes("<") ? decl.name : base) };
      typeNames.set(id, t);
      pendingTypes.push(id);
    }
    return use(from, t, true);
  }

  function outName(id: string, from: Module): string {
    let t = outNames.get(id);
    if (!t) {
      const module = moduleOf(uriOf(id));
      t = { module, name: mod(module).claim("type", `${m.types[id].name}Out`) };
      outNames.set(id, t);
      pendingOut.push(id);
    }
    return use(from, t, true);
  }

  function use(from: Module, t: { module: string; name: string }, isType: boolean): string {
    if (t.module !== from.name) {
      const map = isType ? from.typeImports : from.imports;
      let s = map.get(t.module);
      if (!s) map.set(t.module, (s = new Set()));
      s.add(t.name);
    }
    return t.name;
  }

  // ── refs ────────────────────────────────────────────────────────────────

  /** The TS type JS writes for an input ref. */
  function tsIn(ref: Ref, from: Module): string {
    let t: string;
    switch (ref.k) {
      case "bool":
        t = "boolean";
        break;
      case "int":
      case "double":
      case "num":
        t = "number";
        break;
      case "String":
        t = "string";
        break;
      case "Object":
      case "dynamic":
      case "typeParam":
        return "unknown";
      case "enum":
      case "data":
        t = typeName(ref.id, from);
        break;
      case "list":
      case "set":
      case "iterable": {
        const e = tsIn(ref.of, from);
        t = /[ |&]/.test(e) ? `(${e})[]` : `${e}[]`;
        break;
      }
      case "map": {
        const v = tsIn(ref.of, from);
        t = ref.key.k === "enum" ? `Partial<Record<${typeName(ref.key.id, from)}, ${v}>>` : `Record<string, ${v}>`;
        break;
      }
      case "widget":
        t = "JSX.Element";
        break;
      case "key":
        t = "string | number";
        break;
      case "handle":
        from.usesHandle = true;
        t = "Handle<string>";
        break;
      case "fn":
        t = tsFn(ref, from);
        if (ref.null) t = `(${t})`;
        break;
      default:
        t = "never";
    }
    return "null" in ref && ref.null ? `${t} | null` : t;
  }

  /** The TS type JS receives for an output ref (callback arguments). */
  function tsOut(ref: Ref, from: Module): string {
    let t: string;
    switch (ref.k) {
      case "bool":
        t = "boolean";
        break;
      case "int":
      case "double":
      case "num":
        t = "number";
        break;
      case "String":
        t = "string";
        break;
      case "enum":
        t = typeName(ref.id, from);
        break;
      case "data":
        t = outName(ref.id, from);
        break;
      case "list":
      case "set":
      case "iterable": {
        const e = tsOut(ref.of, from);
        t = /[ |&]/.test(e) ? `(${e})[]` : `${e}[]`;
        break;
      }
      case "map":
        t = `Record<string, ${tsOut(ref.of, from)}>`;
        break;
      case "omitted":
        return "undefined";
      default:
        return "unknown";
    }
    return "null" in ref && ref.null ? `${t} | null` : t;
  }

  function tsFn(fn: FnRef, from: Module): string {
    const args = fn.args.filter((a) => a.type.k !== "context");
    const used = new Set<string>();
    const params = args.map((a, i) => {
      let n = IDENT.test(a.name) && !RESERVED.has(a.name) ? a.name : `arg${i}`;
      while (used.has(n)) n = `${n}_`;
      used.add(n);
      return `${n}: ${tsOut(a.type, from)}`;
    });
    if (!fn.async) return `(${params.join(", ")}) => void`;
    // Dart waits for the result; a Promise is awaited.
    const ret = fn.ret.k === "void" ? "void" : tsIn(fn.ret, from);
    return `(${params.join(", ")}) => ${ret} | Promise<${ret}>`;
  }

  // ── data types ──────────────────────────────────────────────────────────

  /**
   * `{ $: "Tag"; a: A; b?: B }`, the wire shape of one variant. The tag is
   * optional for the declared type's own unnamed constructor ([declName]),
   * so a plain object works there.
   */
  function variantShape(v: Variant, declName: string | null, from: Module): string {
    const fields = [`${v.tag === declName ? "$?" : "$"}: ${lit(v.tag)}`];
    for (const p of v.params) {
      if (!p.type) continue;
      fields.push(`${prop(p.name)}${mustSupply(p) ? "" : "?"}: ${tsIn(p.type, from)}`);
    }
    return `{ ${fields.join("; ")} }`;
  }

  function emitDataType(id: string) {
    const t = typeNames.get(id)!;
    const module = mod(t.module);
    const decl = m.types[id];
    if (decl.kind === "enum") {
      const values = decl.values.map((v) => (typeof v === "string" ? lit(v) : lit(v.name)));
      module.parts.push(`${jsdoc("", decl.doc, decl.deprecated, [`Dart: \`${decl.name}\``])}export type ${t.name} = ${values.length ? values.join(" | ") : "never"};`);
      return;
    }
    if (decl.kind !== "data") return;
    const arms: string[] = [];
    const consts = (decl.consts ?? []).filter((c) => !c.deprecated).map((c) => lit(c.name));
    for (let i = 0; i < consts.length; i += 6) arms.push(consts.slice(i, i + 6).join(" | "));
    for (const v of decl.variants ?? []) {
      arms.push(variantShape(v, decl.name, module));
      builderFor(v);
    }
    for (const c of decl.consts ?? []) constFor(c.name, c.dart, c.deprecated);
    module.parts.push(
      `${jsdoc("", decl.doc, decl.deprecated, [`Dart: \`${id.slice(id.indexOf("#") + 1)}\`. Build one with its builders.`])}export type ${t.name} =\n${arms.map((a) => `  | ${a}`).join("\n")};`,
    );
  }

  function emitOutType(id: string) {
    const t = outNames.get(id)!;
    const module = mod(t.module);
    const decl = m.types[id] as DataType;
    const fields = (decl.fields ?? []).map((f) => `  ${prop(f.name)}: ${tsOut(f.type, module)};`);
    module.parts.push(`/** What Dart's \`${decl.name}\` looks like when a callback receives it. */\nexport interface ${t.name} {\n${fields.join("\n")}\n}`);
  }

  // ── builders ────────────────────────────────────────────────────────────

  interface Ctor {
    tag: string;
    positional: string[];
    /** Overloads: one per distinct signature (generic classes have several). */
    sigs: Map<string, { deprecated?: true }>;
  }
  interface Builder {
    module: Module;
    name: string;
    callable: Ctor | null;
    members: Map<string, Ctor | { const: string; deprecated?: true }>;
  }
  const builders = new Map<string, Builder>(); // module|class -> builder

  function builderOf(dart: string): Builder {
    const module = mod(moduleOfDart(dart));
    const cls = className(dart);
    const key = `${module.name}|${cls}`;
    let b = builders.get(key);
    if (!b) builders.set(key, (b = { module, name: cls, callable: null, members: new Map() }));
    return b;
  }

  // The Dart type of each data class, so a variant of a decl's own class
  // finds its module.
  const classDart = new Map<string, string>();
  for (const d of Object.values(m.types)) {
    if (d.kind === "data" && !classDart.has(d.name)) classDart.set(d.name, d.dart);
  }

  const safeParam = (n: string) => (IDENT.test(n) && !RESERVED.has(n) ? n : `${n.replace(/[^A-Za-z0-9_$]/g, "_")}_`);

  function builderFor(v: Variant) {
    const [cls, ctor] = v.tag.split(".");
    const dart = v.class ?? classDart.get(cls);
    if (!dart) return;
    const b = builderOf(dart);
    const params: string[] = [];
    for (const p of v.params) {
      if (p.named || !p.type) continue;
      params.push(`${safeParam(p.name)}${mustSupply(p) ? "" : "?"}: ${tsIn(p.type, b.module)}`);
    }
    const named = v.params.filter((p) => p.named && p.type);
    if (named.length) {
      const fields = named.map((p) => `${prop(p.name)}${mustSupply(p) ? "" : "?"}: ${tsIn(p.type!, b.module)}`);
      params.push(`named${named.some(mustSupply) ? "" : "?"}: { ${fields.join("; ")} }`);
    }
    const sig = `(${params.join(", ")}): ${variantShape(v, null, b.module)}`;
    const positional = v.params.filter((p) => !p.named && p.type).map((p) => p.name);
    let e: Ctor;
    if (!ctor) {
      e = b.callable ??= { tag: v.tag, positional, sigs: new Map() };
    } else {
      const old = b.members.get(ctor);
      if (old && !("const" in old)) e = old;
      else b.members.set(ctor, (e = { tag: v.tag, positional, sigs: new Map() }));
    }
    if (!e.sigs.has(sig)) e.sigs.set(sig, { deprecated: v.deprecated });
  }

  function constFor(name: string, dart: string, deprecated?: true) {
    const field = name.slice(name.indexOf(".") + 1);
    const b = builderOf(dart.slice(0, dart.lastIndexOf(".")));
    if (!b.members.has(field)) b.members.set(field, { const: name, deprecated });
  }

  function functionBlock(fn: string, e: Ctor, exported: boolean): string {
    const ex = exported ? "export " : "";
    const lines: string[] = [];
    for (const [sig, info] of e.sigs) lines.push(`${jsdoc("", undefined, info.deprecated)}${ex}function ${fn}${sig};`);
    lines.push(`${ex}function ${fn}(...a: any[]): any {\n  return $build(${lit(e.tag)}, ${JSON.stringify(e.positional)}, a);\n}`);
    return lines.join("\n");
  }

  function emitBuilder(b: Builder) {
    const module = b.module;
    // A component with the same name wins; the values stay reachable through
    // plain objects and the other builders.
    if (module.values.has(b.name)) return;
    const name = module.claim("value", b.name);
    module.usesBuild = true;
    const out: string[] = [];
    for (const [k, e] of b.members) {
      if ("const" in e) {
        module.builders[`${name}.${k}`] = { const: e.const };
        continue;
      }
      out.push(functionBlock(`${name}$${k}`, e, false));
      module.builders[`${name}.${k}`] = { tag: e.tag, positional: e.positional };
    }
    const value = (e: Ctor | { const: string }, k: string) => ("const" in e ? `${lit(e.const)} as const` : `${name}$${k}`);
    if (b.callable) {
      out.push(functionBlock(name, b.callable, true));
      module.builders[name] = { tag: b.callable.tag, positional: b.callable.positional };
      // Expando properties: TS types them from the declaration.
      for (const [k, e] of b.members) {
        if (!IDENT.test(k)) continue;
        out.push(`${jsdoc("", undefined, "const" in e ? e.deprecated : undefined)}${name}.${k} = ${value(e, k)};`);
      }
    } else {
      const entries = [...b.members].map(
        ([k, e]) => `${jsdoc("  ", undefined, "const" in e ? e.deprecated : undefined)}  ${prop(k)}: ${value(e, k)},`,
      );
      out.push(`export const ${name} = {\n${entries.join("\n")}\n};`);
    }
    module.parts.push(out.join("\n"));
  }

  // ── widgets ─────────────────────────────────────────────────────────────

  for (const w of m.widgets) {
    const module = mod(moduleOf(uriOf(w.id)));
    const name = module.claim("value", w.component);
    const propsName = module.claim("type", `${name}Props`);
    const fields: string[] = [];
    for (const p of w.params) {
      if (!p.type || p.name === w.children?.param || p.name === w.textChild) continue;
      if (p.name === "children") continue; // a widget whose children are not a slot
      fields.push(`${jsdoc("  ", p.doc, p.deprecated, p.defaultValue !== undefined ? [`@default ${JSON.stringify(p.defaultValue)}`] : [])}  ${prop(p.name)}${mustSupply(p) ? "" : "?"}: ${tsIn(p.type, module)};`);
    }
    const childParam = w.children && w.params.find((p) => p.name === w.children!.param);
    const textParam = w.textChild && w.params.find((p) => p.name === w.textChild);
    if (childParam || textParam) {
      const required = (childParam && mustSupply(childParam) && !w.children!.many) || false;
      const doc = textParam ? "The text (Dart: the `" + textParam.name + "` argument)." : `Dart: \`${childParam!.name}\`.`;
      fields.push(`${jsdoc("  ", doc)}  children${required ? "" : "?"}: JSX.Element;`);
    }
    const tag = tagOf(w);
    module.intrinsics[name] = tag;
    module.parts.push(
      [
        `export interface ${propsName} {`,
        ...fields,
        "}",
        "",
        `${jsdoc("", w.doc, w.deprecated, [`Dart: \`${w.class}${w.ctor ? `.${w.ctor}` : ""}\``])}export function ${name}(props: ${propsName}): JSX.Element {`,
        `  return <${tag} {...props} />;`,
        "}",
      ].join("\n"),
    );
  }

  // Types and builders reached from the widgets (and from each other).
  const emittedTypes = new Set<string>();
  const emittedOut = new Set<string>();
  while (pendingTypes.length || pendingOut.length) {
    const id = pendingTypes.shift();
    if (id !== undefined) {
      if (!emittedTypes.has(id)) {
        emittedTypes.add(id);
        emitDataType(id);
      }
      continue;
    }
    const out = pendingOut.shift()!;
    if (!emittedOut.has(out)) {
      emittedOut.add(out);
      emitOutType(out);
    }
  }
  for (const b of builders.values()) emitBuilder(b);

  // ── files ───────────────────────────────────────────────────────────────

  const result: TsOutput = { modules: [], intrinsics: {}, builders: {} };
  for (const module of [...modules.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const head = [
      "// GENERATED by `fuse gen` from the solid_fuse_gen manifest. Do not edit.",
      `// Manifest fingerprint: ${m.fingerprint}`,
      "/* eslint-disable */",
    ];
    const fromFuse = [...(module.usesBuild ? ["$build"] : [])];
    if (fromFuse.length) head.push(`import { ${fromFuse.join(", ")} } from "solid-fuse/generated";`);
    if (module.usesHandle) head.push('import type { Handle } from "solid-fuse";');
    for (const [other, names] of [...module.typeImports].sort()) {
      head.push(`import type { ${[...names].sort().join(", ")} } from "./${other}";`);
    }
    for (const [other, names] of [...module.imports].sort()) {
      head.push(`import { ${[...names].sort().join(", ")} } from "./${other}";`);
    }
    result.modules.push({ name: module.name, code: `${head.join("\n")}\n\n${module.parts.join("\n\n")}\n` });
    result.intrinsics[module.name] = module.intrinsics;
    result.builders[module.name] = module.builders;
  }
  return result;
}

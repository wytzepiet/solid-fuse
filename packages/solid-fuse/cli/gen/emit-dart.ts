/**
 * Dart half of `fuse gen`: one adapter (a StatelessWidget reading a FuseNode)
 * per widget, one decoder per data type that props carry, one encoder per
 * data type that callbacks hand to JS, and a function that registers the
 * adapters. Everything it writes goes through the prefixes the manifest
 * lists, so names from different libraries never collide.
 */
import { moduleOf, mustSupply, uriOf, type DataType, type FnRef, type HandleType, type Manifest, type Param, type Ref, type Widget } from "./manifest";

/** The element tag a generated component renders; `registerWidget` key. */
export function tagOf(w: Widget): string {
  return `${moduleOf(uriOf(w.id))}_${w.component}`;
}

/** Handle id -> node type (`registerHandle` key, `Handle<K>` brand) of the
 *  handles JS creates. */
export function handleTags(m: Manifest): Map<string, string> {
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const id of m.handles) {
    const base = `${moduleOf(uriOf(id))}_${m.types[id].name}`;
    let tag = base;
    for (let i = 2; taken.has(tag); i++) tag = `${base}${i}`;
    taken.add(tag);
    out.set(id, tag);
  }
  return out;
}

/** JS arguments of a handle method: index of each typed positional
 *  parameter, and where the object with the named ones goes. */
export function methodArgs(params: Param[]): { index: Map<string, number>; named: number } {
  const index = new Map<string, number>();
  for (const p of params) if (!p.named && p.type) index.set(p.name, index.size);
  return { index, named: index.size };
}

const q = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\$/g, "\\$")}'`;
const noQ = (dart: string) => (dart.endsWith("?") ? dart.slice(0, -1) : dart);
const RAW = new Set(["Object", "dynamic", "typeParam"]);

export interface DartOutput {
  code: string;
  /** Component tag -> adapter class, for reports. */
  tags: Record<string, string>;
}

export function emitDart(m: Manifest, options: { registerFunction?: string } = {}): DartOutput {
  const registerFunction = options.registerFunction ?? "registerFuseGenerated";
  const decoders = new Map<string, string>(); // type id -> function name
  const encoders = new Map<string, string>();
  const pendingDec: string[] = [];
  const pendingEnc: string[] = [];
  const used = new Set<string>();

  function ident(prefix: string, id: string): string {
    const base = id.slice(id.indexOf("#") + 1).replace(/\?/g, "N").replace(/[^A-Za-z0-9]+/g, "_").replace(/_+$/, "");
    let name = `${prefix}${base}`;
    for (let i = 2; used.has(name); i++) name = `${prefix}${base}${i}`;
    used.add(name);
    return name;
  }

  function decoderOf(id: string): string {
    let name = decoders.get(id);
    if (!name) {
      name = ident("_dec", id);
      decoders.set(id, name);
      pendingDec.push(id);
    }
    return name;
  }

  function encoderOf(id: string): string {
    let name = encoders.get(id);
    if (!name) {
      name = ident("_enc", id);
      encoders.set(id, name);
      pendingEnc.push(id);
    }
    return name;
  }

  // ── JS -> Dart ──────────────────────────────────────────────────────────

  /**
   * Where a decode happens: [n] is the Dart expression of the FuseNode
   * (`node` in an adapter, `n` in a decoder), [prop] the prop being read (a
   * function prop arrives as `true` and is called by that name), [sub] maps a
   * generic widget's type parameters to the types it is instantiated with.
   */
  interface Cx {
    n: string;
    prop: string;
    sub: (dart: string) => string;
  }

  /** An expression of the ref's type, nullable, read from [src]. */
  function dec(ref: Ref, src: string, cx: Cx): string {
    switch (ref.k) {
      case "bool":
        return `decBool(${src})`;
      case "int":
        return `decInt(${src})`;
      case "double":
        return `decDouble(${src})`;
      case "num":
        return `decNum(${src})`;
      case "String":
        return `decString(${src})`;
      case "enum":
        return `decEnum(${noQ(m.types[ref.id].dart)}.values, ${src})`;
      case "data":
        return `${decoderOf(ref.id)}(${src}, ${cx.n})`;
      case "key":
        return `decKey(${src})`;
      case "vsync":
        return "fuseVsync";
      case "widget":
        return ref.as === "preferredSize" ? `decPreferredSize(${cx.n}, ${src}, fuseGeneratedWidgets)` : `decWidget(${cx.n}, ${src})`;
      case "handle":
        return `decHandle<${noQ(cx.sub(m.types[ref.id].dart))}>(${cx.n}, ${src})`;
      case "fn":
        return fnExpr(ref, src, cx);
      case "list":
      case "set":
      case "iterable": {
        const of = cx.sub((ref as any).ofDart);
        const list = `decList<${of}>(${src}, (e) => ${elem(ref.of, "e", of, cx)})`;
        return ref.k === "set" ? `${list}?.toSet()` : list;
      }
      case "map": {
        const r = ref as any;
        const kd = cx.sub(r.keyDart);
        const kf =
          ref.key.k === "enum"
            ? `(k) => decEnum(${noQ(m.types[ref.key.id].dart)}.values, k)!`
            : ref.key.k === "int"
              ? "(k) => int.parse(k)"
              : `(k) => k as ${kd}`;
        const of = cx.sub(r.ofDart);
        return `decMap<${kd}, ${of}>(${src}, ${kf}, (e) => ${elem(ref.of, "e", of, cx)})`;
      }
      case "Object":
      case "dynamic":
      case "typeParam":
        return src;
    }
    throw new Error(`no decoder for ${ref.k}`);
  }

  /** A non-null value of type [dart] (unless the ref is nullable). */
  function elem(ref: Ref, src: string, dart: string, cx: Cx): string {
    if (RAW.has(ref.k)) return dart === "dynamic" ? src : `${src} as ${dart}`;
    const e = dec(ref, src, cx);
    return "null" in ref && ref.null ? e : `${e}!`;
  }

  /**
   * A Dart closure of the callback's type that calls the JS function: the
   * arguments are encoded (a BuildContext stays in Dart), several are spread
   * on the JS side, and a Future callback waits for the JS result.
   */
  function fnExpr(fn: FnRef, src: string, cx: Cx): string {
    const params = fn.args.map((_, i) => `a${i}`);
    const sent = fn.args.flatMap((a, i) => (a.type.k === "context" ? [] : [a.type.k === "omitted" ? "null" : enc(a.type, `a${i}`)]));
    const payload = sent.length === 0 ? "" : sent.length === 1 ? sent[0] : `FuseCallArgs([${sent.join(", ")}])`;
    if (fn.sync) {
      // Dart blocks until JS returns. A widget is built in a JS root of its
      // own (decFnBuild); any other value is decoded like an argument.
      const nullable = "null" in fn.ret && fn.ret.null;
      let body: string;
      if (fn.ret.k === "widget") {
        body = nullable ? `f(${payload})` : `fuseWidget(f(${payload}))`;
        return `switch (decFnBuild(${cx.n}, ${src}, ${q(cx.prop)})) {\n        final f? => (${params.join(", ")}) => ${body},\n        null => null,\n      }`;
      }
      const got = `f(${payload})`;
      body = RAW.has(fn.ret.k)
        ? `${got} as dynamic`
        : nullable
          ? dec(fn.ret, got, cx)
          : `fuseReq(${dec(fn.ret, got, cx)}, ${q(cx.prop)}, 'result')`;
      return `switch (decFnSync(${cx.n}, ${src}, ${q(cx.prop)})) {\n        final f? => (${params.join(", ")}) => ${body},\n        null => null,\n      }`;
    }
    const read = `${fn.async ? "decFnAsync" : "decFn"}(${cx.n}, ${src}, ${q(cx.prop)})`;
    if (!fn.async && params.length === 0) return read; // void Function([Object?]) is a VoidCallback
    let body: string;
    if (!fn.async) {
      body = `=> f(${payload})`;
    } else if (fn.ret.k === "void") {
      body = `async {\n          await f(${payload});\n        }`;
    } else {
      const got = `(await f(${payload}))`;
      body = RAW.has(fn.ret.k)
        ? `async => ${got} as dynamic`
        : `async => ${"null" in fn.ret && fn.ret.null ? dec(fn.ret, got, cx) : `fuseReq(${dec(fn.ret, got, cx)}, ${q(cx.prop)}, 'result')`}`;
    }
    return `switch (${read}) {\n        final f? => (${params.join(", ")}) ${body},\n        null => null,\n      }`;
  }

  /** The argument passed for [p], or null to leave it out. */
  function arg(p: Param, owner: string, read: string, cx: Cx): string | null {
    if (!p.type) return p.passNull ? "null" : null;
    if (p.type.k === "vsync") return "fuseVsync";
    const dart = cx.sub(p.dart!);
    const e = RAW.has(p.type.k) ? (dart === "dynamic" ? read : `(${read} as ${dart.endsWith("?") ? dart : `${dart}?`})`) : dec(p.type, read, { ...cx, prop: p.name });
    if (p.default !== undefined && p.default !== "null") return `${e} ?? ${p.default}`;
    if (mustSupply(p)) return `fuseReq(${e}, ${q(owner)}, ${q(p.name)})`;
    return e;
  }

  function call(callee: string, params: Param[], argOf: (p: Param) => string | null): string {
    const positional: string[] = [];
    const named: string[] = [];
    for (const p of params) {
      const a = argOf(p);
      if (a === null) continue;
      if (p.named) named.push(`${p.name}: ${a}`);
      else positional.push(a);
    }
    const args = [...positional, ...named];
    return args.length <= 1 ? `${callee}(${args.join(", ")})` : `${callee}(\n${args.map((a) => `      ${a},`).join("\n")}\n    )`;
  }

  function decoderBody(id: string, name: string): string {
    const t = m.types[id] as DataType;
    const lines: string[] = [];
    const tn = noQ(t.dart);
    lines.push(`${tn}? ${name}(Object? v, FuseNode n) {`);
    lines.push("  if (v == null) return null;");
    const short = new Map((t.shorthands ?? []).map((sh) => [sh.kind, sh]));
    const shortCall = (kind: string) => {
      const sh = short.get(kind)!;
      return `${sh.fn}(${elem(sh.type, "v", sh.dart, { n: "n", prop: t.name, sub: (d) => d })})`;
    };
    const test = { bool: "v is bool", number: "v is num", list: "v is List" } as const;
    for (const kind of ["bool", "number", "list"] as const) {
      if (short.has(kind)) lines.push(`  if (${test[kind]}) return ${shortCall(kind)};`);
    }
    const consts = t.consts ?? [];
    if (consts.length > 0) {
      lines.push("  if (v is String) {");
      lines.push("    return switch (v) {");
      for (const c of consts) lines.push(`      ${q(c.name)} => ${c.dart},`);
      lines.push(`      _ => ${short.has("string") ? shortCall("string") : `fuseBad(${q(t.name)}, v)`},`);
      lines.push("    };");
      lines.push("  }");
    } else if (short.has("string")) {
      lines.push(`  if (v is String) return ${shortCall("string")};`);
    }
    const variants = t.variants ?? [];
    if (variants.length > 0) {
      lines.push(`  if (v is! Map) return fuseBad(${q(t.name)}, v);`);
      lines.push(`  switch (fuseTag(v, ${q(t.name)})) {`);
      for (const variant of variants) {
        const cls = noQ(variant.class ?? t.dart);
        const callee = variant.name ? `${cls}.${variant.name}` : cls;
        lines.push(`    case ${q(variant.tag)}:`);
        lines.push(`      return ${call(callee, variant.params, (p) => arg(p, variant.tag, `v[${q(p.name)}]`, { n: "n", prop: p.name, sub: (d) => d }))};`);
      }
      lines.push("  }");
    }
    lines.push(`  return fuseBad(${q(t.name)}, v);`);
    lines.push("}");
    return lines.join("\n");
  }

  // ── Dart -> JS ──────────────────────────────────────────────────────────

  function enc(ref: Ref, src: string): string {
    const nul = "null" in ref && ref.null ? "?" : "";
    switch (ref.k) {
      case "double":
        return `encDouble(${src})`;
      case "enum":
        return `${src}${nul}.name`;
      case "list":
      case "set":
      case "iterable":
        return `${src}${nul}.map((e) => ${enc(ref.of, "e")}).toList()`;
      case "map": {
        const k = ref.key.k === "enum" ? "k.name" : ref.key.k === "String" ? "k" : "'$k'";
        return `${src}${nul}.map((k, e) => MapEntry(${k}, ${enc(ref.of, "e")}))`;
      }
      case "data":
        return `${encoderOf(ref.id)}(${src})`;
      case "dynamic":
      case "Object":
        return `encAny(${src})`;
      default:
        return src;
    }
  }

  function encoderBody(id: string, name: string): string {
    const t = m.types[id] as DataType;
    const lines = [`Map<String, Object?>? ${name}(${noQ(t.dart)}? v) => v == null`, "    ? null", "    : {"];
    for (const f of t.fields ?? []) lines.push(`        ${q(f.name)}: ${enc(f.type, `v.${f.name}`)},`);
    lines.push("      };");
    return lines.join("\n");
  }

  // ── widgets ─────────────────────────────────────────────────────────────

  function widgetArg(w: Widget, p: Param, sub: (dart: string) => string): string | null {
    if (!p.type) return p.passNull ? "null" : null;
    if (w.children?.param === p.name) {
      if (w.children.many) return "node.childrenSlot";
      if (p.default !== undefined && p.default !== "null") return `node.childSlot ?? ${p.default}`;
      return mustSupply(p) ? `fuseReq(node.childSlot, ${q(w.component)}, ${q(p.name)})` : "node.childSlot";
    }
    if (w.textChild === p.name) return "node.textContent";
    return arg(p, w.component, `node[${q(p.name)}]`, { n: "node", prop: p.name, sub });
  }

  const adapters: string[] = [];
  const registrations: string[] = [];
  const tags: Record<string, string> = {};
  m.widgets.forEach((w, i) => {
    const cls = `_W${i}_${w.component}`;
    // A generic widget is instantiated at its bounds (Object? when unbounded).
    const tps = w.typeParams ?? [];
    const bounds = new Map(tps.map((tp) => [tp.name, tp.bound ?? "Object?"]));
    const tpRe = new RegExp(`(?<![.\\w])(${tps.map((tp) => tp.name).join("|")})\\b(\\?)?`, "g");
    const sub = (dart: string) =>
      tps.length === 0
        ? dart
        : dart.replace(tpRe, (_, n: string, nq?: string) => {
            const b = bounds.get(n)!;
            return nq && !b.endsWith("?") ? `${b}?` : b;
          });
    const typeArgs = tps.length ? `<${tps.map((tp) => bounds.get(tp.name)).join(", ")}>` : "";
    const callee = `${w.dart}${typeArgs}${w.ctor ? `.${w.ctor}` : ""}`;
    const made = call(callee, w.params, (p) => widgetArg(w, p, sub));
    adapters.push(
      (w.preferredSize
        ? [
            // Built without a context, so the slot can ask for the size.
            `class ${cls} extends $fw.StatelessWidget implements $fw.PreferredSizeWidget {`,
            `  const ${cls}(this.node, {super.key});`,
            "  final FuseNode node;",
            `  ${noQ(w.dart)}${typeArgs} _make() => ${made};`,
            "  @override",
            "  $fw.Size get preferredSize => _make().preferredSize;",
            "  @override",
            "  $fw.Widget build($fw.BuildContext context) => _make();",
            "}",
          ]
        : [
            `class ${cls} extends $fw.StatelessWidget {`,
            `  const ${cls}(this.node, {super.key});`,
            "  final FuseNode node;",
            "  @override",
            `  $fw.Widget build($fw.BuildContext context) => ${made};`,
            "}",
          ]
      ).join("\n"),
    );
    const tag = tagOf(w);
    tags[tag] = cls;
    registrations.push(`  ${q(tag)}: ${cls}.new,`);
  });

  // ── handles ─────────────────────────────────────────────────────────────

  const handleCode: string[] = [];
  const handleRegs: string[] = [];
  const hTags = handleTags(m);
  const plain: Cx = { n: "node", prop: "", sub: (d) => d };

  /** A value of [dart] decoded from [src]; a non-null one is required. */
  function need(ref: Ref, dart: string, src: string, owner: string, what: string, nullable: boolean): string {
    if (RAW.has(ref.k)) return dart === "dynamic" ? src : `${src} as ${dart}`;
    const e = dec(ref, src, { ...plain, prop: what });
    return nullable ? e : `fuseReq(${e}, ${q(owner)}, ${q(what)})`;
  }

  m.handles.forEach((id, i) => {
    const h = m.types[id] as HandleType;
    const T = noQ(h.dart);
    const cls = `_H${i}_${h.name}`;
    const tag = hTags.get(id)!;
    const make = (c: (typeof h.ctors)[number]) =>
      call(c.name ? `${T}.${c.name}` : T, c.params, (p) => arg(p, h.name, `node[${q(p.name)}]`, { ...plain, prop: p.name }));
    const lines = [`class ${cls} extends FuseGeneratedHandle<${T}> {`, `  ${cls}(super.node) : object = _make(node) {`, "    start();", "  }", ""];
    lines.push(`  static ${T} _make(FuseNode node) {`);
    if (h.ctors.length === 1) {
      lines.push(`    return ${make(h.ctors[0])};`);
    } else {
      // `$ctor` names the constructor; none is the unnamed one (or the first).
      const fallback = h.ctors.find((c) => !c.name) ?? h.ctors[0];
      lines.push("    switch (node[r'$ctor']) {");
      for (const c of h.ctors) {
        if (c === fallback) continue;
        lines.push(`      case ${q(c.name!)}:`, `        return ${make(c)};`);
      }
      lines.push("    }", `    return ${make(fallback)};`);
    }
    lines.push("  }", "", "  @override", `  final ${T} object;`);
    if (h.state?.length) {
      lines.push("", "  @override", "  void snapshot(FuseSnapshot put) {");
      for (const f of h.state) lines.push(`    put(${q(f.name)}, () => ${enc(f.type, `object.${f.name}`)});`);
      lines.push("  }");
    }
    if (h.setters?.length) {
      lines.push("", "  @override", "  void set(String name, Object? v) {", "    switch (name) {");
      for (const st of h.setters) {
        lines.push(`      case ${q(st.name)}:`, `        object.${st.name} = ${need(st.type, st.dart, "v", h.name, st.name, !!st.nullable)};`);
      }
      lines.push("      default:", "        super.set(name, v);", "    }", "  }");
    }
    if (h.methods?.length) {
      lines.push("", "  @override", "  Future<Object?> invoke(String name, List<Object?> a) async {", "    switch (name) {");
      for (const mt of h.methods) {
        const { index, named } = methodArgs(mt.params);
        const c = call(`object.${mt.name}`, mt.params, (p) => {
          if (!p.type) return p.passNull ? "null" : null;
          const src = p.named ? `fuseNamed(a, ${named})[${q(p.name)}]` : `fuseAt(a, ${index.get(p.name)})`;
          return arg(p, `${h.name}.${mt.name}`, src, { ...plain, prop: p.name });
        });
        const got = mt.async ? `(await ${c})` : c;
        lines.push(`      case ${q(mt.name)}:`);
        if (mt.ret.k === "void") lines.push(`        ${mt.async ? `await ${c}` : c};`, "        return null;");
        else lines.push(`        return ${enc(mt.ret, got)};`);
      }
      lines.push("    }", "    return super.invoke(name, a);", "  }");
    }
    if (h.streams?.length) {
      lines.push("", "  @override", "  Stream<Object?>? stream(String name) => switch (name) {");
      for (const st of h.streams) lines.push(`        ${q(st.name)} => object.${st.name}.map((e) => ${enc(st.type, "e")}),`);
      lines.push("        _ => null,", "      };");
    }
    if (h.disposable) lines.push("", "  @override", "  void release() => object.dispose();");
    lines.push("}");
    handleCode.push(lines.join("\n"));
    handleRegs.push(`  ${q(tag)}: ${cls}.new,`);
  });

  // Decoders and encoders are discovered while writing the adapters and each
  // other; drain until no new ones appear.
  const decoderCode: string[] = [];
  const encoderCode: string[] = [];
  while (pendingDec.length || pendingEnc.length) {
    while (pendingDec.length) {
      const id = pendingDec.shift()!;
      decoderCode.push(decoderBody(id, decoders.get(id)!));
    }
    while (pendingEnc.length) {
      const id = pendingEnc.shift()!;
      encoderCode.push(encoderBody(id, encoders.get(id)!));
    }
  }

  const header = [
    "// GENERATED by `fuse gen` from the solid_fuse_gen manifest. Do not edit.",
    `// Manifest fingerprint: ${m.fingerprint}`,
    "// ignore_for_file: type=lint, deprecated_member_use, deprecated_member_use_from_same_package, unnecessary_import, unused_import, unnecessary_cast",
    "",
    "import 'package:flutter/widgets.dart' as $fw;",
    "import 'package:solid_fuse/solid_fuse.dart';",
    "import 'package:solid_fuse/generated.dart';",
    ...m.imports.map((i) => `import ${q(i.uri)} as ${i.prefix};`),
    "",
    `/// Manifest fingerprint; the JS bundle carries the same string.`,
    `const fuseGeneratedFingerprint = ${q(m.fingerprint)};`,
    "",
    "/// Element tag -> adapter.",
    "const fuseGeneratedWidgets = <String, FuseWidgetBuilder>{",
    ...registrations,
    "};",
    "",
    "/// Node type -> handle, for the handles JS creates.",
    "const fuseGeneratedHandles = <String, FuseHandle Function(FuseNode)>{",
    ...handleRegs,
    "};",
    "",
    `void ${registerFunction}(FuseRuntime runtime) {`,
    "  fuseGeneratedWidgets.forEach(runtime.registerWidget);",
    "  fuseGeneratedHandles.forEach(runtime.registerHandle);",
    "}",
    "",
  ];
  return {
    code: [...header, ...adapters, "", ...handleCode, "", ...decoderCode, "", ...encoderCode, ""].join("\n"),
    tags,
  };
}

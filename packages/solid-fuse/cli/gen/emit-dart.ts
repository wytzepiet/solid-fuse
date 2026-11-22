/**
 * Dart half of `fuse gen`: one adapter (a StatelessWidget reading a FuseNode)
 * per widget, one decoder per data type that props carry, one encoder per
 * data type that callbacks hand to JS, and a function that registers the
 * adapters. Everything it writes goes through the prefixes the manifest
 * lists, so names from different libraries never collide.
 */
import { moduleOf, mustSupply, uriOf, type DataType, type FnRef, type Manifest, type Param, type Ref, type Widget } from "./manifest";

/** The element tag a generated component renders; `registerWidget` key. */
export function tagOf(w: Widget): string {
  return `${moduleOf(uriOf(w.id))}_${w.component}`;
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
   * An expression of the ref's type, nullable, read from [src]. [sub] maps a
   * generic widget's type parameters to the types it is instantiated with.
   */
  function dec(ref: Ref, src: string, sub: (dart: string) => string): string {
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
        return `${decoderOf(ref.id)}(${src})`;
      case "key":
        return `decKey(${src})`;
      case "list":
      case "set":
      case "iterable": {
        const of = sub((ref as any).ofDart);
        const list = `decList<${of}>(${src}, (e) => ${elem(ref.of, "e", of, sub)})`;
        return ref.k === "set" ? `${list}?.toSet()` : list;
      }
      case "map": {
        const r = ref as any;
        const kd = sub(r.keyDart);
        const kf =
          ref.key.k === "enum"
            ? `(k) => decEnum(${noQ(m.types[ref.key.id].dart)}.values, k)!`
            : ref.key.k === "int"
              ? "(k) => int.parse(k)"
              : `(k) => k as ${kd}`;
        const of = sub(r.ofDart);
        return `decMap<${kd}, ${of}>(${src}, ${kf}, (e) => ${elem(ref.of, "e", of, sub)})`;
      }
      case "Object":
      case "dynamic":
      case "typeParam":
        return src;
    }
    throw new Error(`no decoder for ${ref.k} here`);
  }

  /** A non-null element of type [dart] (unless the element type is nullable). */
  function elem(ref: Ref, src: string, dart: string, sub: (dart: string) => string): string {
    if (RAW.has(ref.k)) return dart === "dynamic" ? src : `${src} as ${dart}`;
    const e = dec(ref, src, sub);
    return "null" in ref && ref.null ? e : `${e}!`;
  }

  /** The argument passed for [p], or null to leave it out. */
  function arg(p: Param, owner: string, read: string, sub: (dart: string) => string): string | null {
    if (!p.type) return p.passNull ? "null" : null;
    const dart = sub(p.dart!);
    let e: string;
    if (RAW.has(p.type.k)) {
      e = dart === "dynamic" ? read : `(${read} as ${dart.endsWith("?") ? dart : `${dart}?`})`;
    } else {
      e = dec(p.type, read, sub);
    }
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
    lines.push(`${tn}? ${name}(Object? v) {`);
    lines.push("  if (v == null) return null;");
    const consts = t.consts ?? [];
    if (consts.length > 0) {
      lines.push("  if (v is String) {");
      lines.push("    return switch (v) {");
      for (const c of consts) lines.push(`      ${q(c.name)} => ${c.dart},`);
      lines.push(`      _ => fuseBad(${q(t.name)}, v),`);
      lines.push("    };");
      lines.push("  }");
    }
    const variants = t.variants ?? [];
    if (variants.length > 0) {
      lines.push(`  if (v is! Map) return fuseBad(${q(t.name)}, v);`);
      lines.push(`  switch (fuseTag(v, ${q(t.name)})) {`);
      for (const variant of variants) {
        const cls = noQ(variant.class ?? t.dart);
        const callee = variant.name ? `${cls}.${variant.name}` : cls;
        lines.push(`    case ${q(variant.tag)}:`);
        lines.push(`      return ${call(callee, variant.params, (p) => arg(p, variant.tag, `v[${q(p.name)}]`, (d) => d))};`);
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

  function callback(p: Param, fn: FnRef, owner: string): string {
    const params = fn.args.map((_, i) => `a${i}`);
    const sent = fn.args.flatMap((a, i) => (a.type.k === "context" ? [] : [a.type.k === "omitted" ? "null" : enc(a.type, `a${i}`)]));
    const read = sent.length > 1 ? `node.callbackArgs(${q(p.name)})` : `node.callback(${q(p.name)})`;
    let e: string;
    if (sent.length === 0 && params.length === 0) {
      e = read;
    } else {
      const body = sent.length === 0 ? "f()" : sent.length === 1 ? `f(${sent[0]})` : `f([${sent.join(", ")}])`;
      e = `switch (${read}) {\n        final f? => (${params.join(", ")}) => ${body},\n        null => null,\n      }`;
    }
    return mustSupply(p) ? `fuseReq(${e}, ${q(owner)}, ${q(p.name)})` : e;
  }

  function widgetArg(w: Widget, p: Param, sub: (dart: string) => string): string | null {
    if (!p.type) return p.passNull ? "null" : null;
    const owner = w.component;
    const req = (e: string) =>
      p.default !== undefined && p.default !== "null"
        ? `${e} ?? ${p.default}`
        : mustSupply(p)
          ? `fuseReq(${e}, ${q(owner)}, ${q(p.name)})`
          : e;
    if (w.children?.param === p.name) return w.children.many ? "node.childrenSlot" : req("node.childSlot");
    if (w.textChild === p.name) return "node.textContent";
    switch (p.type.k) {
      case "widget":
        return req(`node.widgetProp(${q(p.name)})`);
      case "handle":
        return req(`node.handle<${noQ(sub(p.dart!))}>(${q(p.name)})`);
      case "fn":
        return p.default !== undefined && p.default !== "null" ? `${callback({ ...p, required: false }, p.type, owner)} ?? ${p.default}` : callback(p, p.type, owner);
    }
    return arg(p, owner, `node[${q(p.name)}]`, sub);
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
    adapters.push(
      [
        `class ${cls} extends $fw.StatelessWidget {`,
        `  const ${cls}(this.node, {super.key});`,
        "  final FuseNode node;",
        "  @override",
        `  $fw.Widget build($fw.BuildContext context) => ${call(callee, w.params, (p) => widgetArg(w, p, sub))};`,
        "}",
      ].join("\n"),
    );
    const tag = tagOf(w);
    tags[tag] = cls;
    registrations.push(`  ${q(tag)}: ${cls}.new,`);
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
    `void ${registerFunction}(FuseRuntime runtime) {`,
    "  fuseGeneratedWidgets.forEach(runtime.registerWidget);",
    "}",
    "",
  ];
  return {
    code: [...header, ...adapters, "", ...decoderCode, "", ...encoderCode, ""].join("\n"),
    tags,
  };
}

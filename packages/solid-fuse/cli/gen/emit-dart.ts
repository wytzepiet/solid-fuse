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

const lentCache = new WeakMap<Manifest, Set<string>>();

/**
 * The handle types Dart can hand to JS: those in an output position (a
 * callback argument, a handle's state, method result or stream, a field of
 * a value Dart sends) reachable from what JS uses.
 */
export function lentHandles(m: Manifest): Set<string> {
  const cached = lentCache.get(m);
  if (cached) return cached;
  const lent = new Set<string>();
  const seenIn = new Set<string>();
  const seenOut = new Set<string>();
  const members = new Set<string>();
  const params = (ps: Param[]) => ps.forEach((p) => p.type && walkIn(p.type));
  function handleMembers(id: string) {
    if (members.has(id)) return;
    members.add(id);
    const h = m.types[id] as HandleType;
    h.state?.forEach((f) => walkOut(f.type));
    h.streams?.forEach((f) => walkOut(f.type));
    h.setters?.forEach((st) => walkIn(st.type));
    for (const mt of h.methods ?? []) {
      params(mt.params);
      walkOut(mt.ret);
    }
  }
  function walkIn(r: Ref) {
    switch (r.k) {
      case "fn":
        r.args.forEach((a) => walkOut(a.type));
        walkIn(r.ret);
        return;
      case "list":
      case "set":
      case "iterable":
      case "map":
        if (r.k === "map") walkIn(r.key);
        walkIn(r.of);
        return;
      case "data": {
        if (seenIn.has(r.id)) return;
        seenIn.add(r.id);
        const d = m.types[r.id] as DataType;
        d.variants?.forEach((v) => params(v.params));
        d.shorthands?.forEach((sh) => (sh.kind === "object" ? params(sh.params) : walkIn(sh.type)));
        d.implement?.members.forEach((mb) => walkIn(mb.fn));
        return;
      }
    }
  }
  function walkOut(r: Ref) {
    switch (r.k) {
      case "handle":
        lent.add(r.id);
        handleMembers(r.id);
        return;
      case "list":
      case "set":
      case "iterable":
      case "map":
        if (r.k === "map") walkOut(r.key);
        walkOut(r.of);
        return;
      case "data": {
        if (seenOut.has(r.id)) return;
        seenOut.add(r.id);
        (m.types[r.id] as DataType).fields?.forEach((f) => walkOut(f.type));
        return;
      }
    }
  }
  for (const w of m.widgets) params(w.params);
  for (const id of m.values ?? []) walkIn({ k: "data", id } as Ref);
  for (const id of m.handles) {
    (m.types[id] as HandleType).ctors.forEach((c) => params(c.params));
    handleMembers(id);
  }
  lentCache.set(m, lent);
  return lent;
}

/** Every handle type the bridge carries: the ones JS creates
 *  (`m.handles`) first, then the ones only Dart hands out. */
export function handleIds(m: Manifest): string[] {
  const roots = new Set(m.handles);
  const rest = [...lentHandles(m)].filter((id) => !roots.has(id)).sort();
  return [...m.handles, ...rest];
}

/** Handle id -> node type (the `Handle<K>` brand, and the registered
 *  factory of the ones JS creates). */

export function handleTags(m: Manifest): Map<string, string> {
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const id of handleIds(m)) {
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

/** Whether [ref] is or holds a typed widget slot. */
function typedWidget(ref: Ref): boolean {
  if (ref.k === "widget") return !!ref.as;
  if (ref.k === "list" || ref.k === "set" || ref.k === "iterable" || ref.k === "map") return typedWidget(ref.of);
  return false;
}

export function emitDart(
  m: Manifest,
  options: {
    registerFunction?: string;
    /** Node types of the handles, when [m] is a shaken copy (cli/gen/shake.ts). */
    handleTags?: Map<string, string>;
  } = {},
): DartOutput {
  const registerFunction = options.registerFunction ?? "registerFuseGenerated";
  const hIds = handleIds(m);
  const lent = lentHandles(m);
  const hTags = options.handleTags ?? handleTags(m);
  /** Handle id -> its class (every handle type has one: `.borrow` wraps an
   *  object Dart hands to JS; a created one also has the main constructor). */
  const hCls = new Map(hIds.map((id, i) => [id, `_H${i}_${m.types[id].name}`]));
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
    /** The BuildContext in scope: a widget adapter's `context`. */
    context?: string;
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
      case "supplied":
        if (ref.of === "vsync") return "fuseVsync";
        if (!cx.context) throw new Error("a BuildContext outside a widget adapter");
        return cx.context;
      case "widget":
        if (!ref.as) return `decWidget(${cx.n}, ${src})`;
        if (!cx.context) throw new Error("a typed widget slot outside a widget adapter");
        return `decTyped<${cx.sub(ref.as)}>(${cx.n}, ${src}, ${cx.context})`;
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
      case "bytes":
        return `decBytes<${ref.as}>(${src})`;
      case "map": {
        const r = ref as any;
        const kd = cx.sub(r.keyDart);
        if (ref.entries) {
          return `decEntries<${kd}, ${cx.sub(r.ofDart)}>(${src}, (k) => ${elem(ref.key, "k", kd, cx)}, (e) => ${elem(ref.of, "e", cx.sub(r.ofDart), cx)})`;
        }
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

  /** A JS result Dart takes as it is ([RAW] refs), typed for the callback. */
  function raw(ret: Ref, got: string, cx: Cx): string {
    const nullable = "null" in ret && ret.null;
    if (ret.k === "typeParam") {
      const t = cx.sub(ret.name);
      return `${got} as ${nullable && !t.endsWith("?") ? `${t}?` : t}`;
    }
    if (ret.k === "Object" && !nullable) return `${got}!`;
    return got;
  }

  /**
   * A Dart closure of the callback's type that calls the JS function: the
   * arguments are encoded (a BuildContext stays in Dart), several are spread
   * on the JS side, and a Future callback waits for the JS result.
   */
  function fnExpr(fn: FnRef, src: string, cx: Cx): string {
    // The closure's parameters: positional ones as a0.., optional ones in
    // brackets, named ones by their Dart names in braces.
    const pos = fn.args.flatMap((a, i) => (a.named || a.optional ? [] : [`a${i}`]));
    const opt = fn.args.flatMap((a, i) => (a.optional ? [`a${i}`] : []));
    const named = fn.args.flatMap((a) => (a.named ? [`${a.required ? "required " : ""}${a.name}`] : []));
    const params = [...pos, ...(opt.length ? [`[${opt.join(", ")}]`] : []), ...(named.length ? [`{${named.join(", ")}}`] : [])];
    const value = (a: FnRef["args"][number], v: string) => (a.type.k === "omitted" ? "null" : enc(a.type, v, cx.n));
    const sent = fn.args.flatMap((a, i) => (a.type.k === "supplied" || a.named ? [] : [value(a, `a${i}`)]));
    const namedSent = fn.args.filter((a) => a.named && a.type.k !== "supplied").map((a) => `${q(a.name)}: ${value(a, a.name)}`);
    if (namedSent.length) sent.push(`{${namedSent.join(", ")}}`);
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
        ? raw(fn.ret, got, cx)
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
        ? `async => ${raw(fn.ret, got, cx)}`
        : `async => ${"null" in fn.ret && fn.ret.null ? dec(fn.ret, got, cx) : `fuseReq(${dec(fn.ret, got, cx)}, ${q(cx.prop)}, 'result')`}`;
    }
    return `switch (${read}) {\n        final f? => (${params.join(", ")}) ${body},\n        null => null,\n      }`;
  }

  /** The argument passed for [p], or null to leave it out. */
  function arg(p: Param, owner: string, read: string, cx: Cx): string | null {
    if (!p.type) return p.passNull ? "null" : null;
    if (p.type.k === "supplied") return dec(p.type, "", cx);
    const dart = cx.sub(p.dart!);
    const e = RAW.has(p.type.k) ? (dart === "dynamic" ? read : `(${read} as ${dart.endsWith("?") ? dart : `${dart}?`})`) : dec(p.type, read, { ...cx, prop: p.name });
    if (p.default !== undefined && p.default !== "null") return `${e} ?? ${p.default}`;
    if (mustSupply(p)) return `fuseReq(${e}, ${q(owner)}, ${q(p.name)})`;
    return e;
  }

  /**
   * A call of [callee] with the arguments [argOf] reads. [given] is the map
   * the arguments are read from: a named parameter whose default generated
   * code can't write (`omit`) is passed only when JS gave it, through
   * `Function.apply`, so Dart's own default applies otherwise.
   */
  function call(
    callee: string,
    params: Param[],
    argOf: (p: Param) => string | null,
    given?: { map: string; type: string; dart?: (dart: string) => string },
  ): string {
    const positional: string[] = [];
    const named: string[] = [];
    const omit: [Param, string][] = [];
    for (const p of params) {
      const a = argOf(p);
      if (a === null) continue;
      if (p.omit && p.named) {
        if (given) omit.push([p, a]);
        continue;
      }
      if (p.named) named.push(`${p.name}: ${a}`);
      else positional.push(a);
    }
    const args = [...positional, ...named];
    const plain = args.length <= 1 ? `${callee}(${args.join(", ")})` : `${callee}(\n${args.map((a) => `      ${a},`).join("\n")}\n    )`;
    if (omit.length === 0) return plain;
    const g = given!;
    // Given at all; a non-nullable one, given as something.
    const has = (p: Param) => (p.nullable ? `${g.map}.containsKey(${q(p.name)})` : `${g.map}[${q(p.name)}] != null`);
    const last = callee.slice(callee.lastIndexOf(".") + 1);
    const tear = callee.endsWith(">") || /^[A-Z]/.test(last) ? `${callee}.new` : callee;
    // Typed, so a closure gets its parameter types as in a plain call.
    const typed = (p: Param, a: string) => (p.dart ? `fuseTyped<${(g.dart ?? ((d) => d))(p.dart)}>(${a})` : a);
    const pos: string[] = [];
    const map: string[] = [];
    for (const p of params) {
      if (p.omit && p.named) continue;
      const a = argOf(p);
      if (a === null) continue;
      if (p.named) map.push(`#${p.name}: ${typed(p, a)}`);
      else pos.push(typed(p, a));
    }
    // Given, a non-nullable one has a value.
    for (const [p, a] of omit) map.push(`if (${has(p)}) #${p.name}: ${typed(p, p.nullable ? a : `(${a})!`)}`);
    return `${omit.map(([p]) => has(p)).join(" || ")}\n        ? Function.apply(${tear}, [${pos.join(", ")}], {\n${map.map((e) => `            ${e},`).join("\n")}\n          }) as ${g.type}\n        : ${plain}`;
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
      if (sh.kind === "object") {
        return call(sh.fn, sh.params, (p) => arg(p, t.name, `v[${q(p.name)}]`, { n: "n", prop: p.name, sub: (d) => d }), { map: "v", type: tn });
      }
      return `${sh.fn}(${elem(sh.type, "v", sh.dart, { n: "n", prop: t.name, sub: (d) => d })})`;
    };
    const test = { bool: "v is bool", number: "v is num", list: "v is List" } as const;
    for (const kind of ["bool", "number", "list"] as const) {
      if (short.has(kind)) lines.push(`  if (${test[kind]}) return ${shortCall(kind)};`);
    }
    const consts = t.consts ?? [];
    if (consts.length > 0) {
      // A const map, not a switch: one constant for the compiler however
      // many there are (a switch over all of Icons overflows the AOT type
      // flow analysis), and const values keep icon font shaking working.
      lines.unshift(`const ${name}$consts = <String, ${tn}>{`, ...consts.map((c) => `  ${q(c.name)}: ${c.dart},`), "};", "");
      lines.push("  if (v is String) {");
      lines.push(`    return ${name}$consts[v] ?? ${short.has("string") ? shortCall("string") : `fuseBad(${q(t.name)}, v)`};`);
      lines.push("  }");
    } else if (short.has("string")) {
      lines.push(`  if (v is String) return ${shortCall("string")};`);
    }
    const variants = t.variants ?? [];
    // No tag: the object shorthand's fields.
    if (short.has("object")) lines.push(`  if (v is Map && v[r'$'] == null) return ${shortCall("object")};`);
    if (t.implement) {
      // No tag: an object of functions, JS's own implementation.
      lines.push(`  if (v is Map && v[r'$'] == null) return ${implClass(id)}(v, n);`);
    }
    if (variants.length > 0) {
      lines.push(`  if (v is! Map) return fuseBad(${q(t.name)}, v);`);
      lines.push(`  switch (fuseTag(v, ${q(t.name)})) {`);
      for (const variant of variants) {
        const cls = noQ(variant.class ?? t.dart);
        const callee = variant.name ? `${cls}.${variant.name}` : cls;
        lines.push(`    case ${q(variant.tag)}:`);
        lines.push(`      return ${call(callee, variant.params, (p) => arg(p, variant.tag, `v[${q(p.name)}]`, { n: "n", prop: p.name, sub: (d) => d }), { map: "v", type: cls })};`);
      }
      lines.push("  }");
    }
    lines.push(`  return fuseBad(${q(t.name)}, v);`);
    lines.push("}");
    return lines.join("\n");
  }

  const implCode: string[] = [];
  const implNames = new Map<string, string>();

  /** The subclass that calls JS's implementation of abstract class [id]. */
  function implClass(id: string): string {
    let name = implNames.get(id);
    if (name) return name;
    name = ident("_Js", id);
    implNames.set(id, name);
    const t = m.types[id] as DataType;
    const impl = t.implement!;
    const T = noQ(t.dart);
    const lines = [
      `/// JS's implementation of \`${t.name}\`: each member calls the function of`,
      "/// the same name on the object JS passed.",
      `final class ${name} extends ${T} {`,
    ];
    const inits = impl.members.map((mb) => `_${mb.name} = ${fnExpr(mb.fn, `v[${q(mb.name)}]`, { n: "n", prop: mb.name, sub: (d) => d })}`);
    lines.push(`  ${name}(Map<Object?, Object?> v, FuseNode n)`);
    lines.push(`      : ${[...inits, impl.ctor ? `super.${impl.ctor}()` : "super()"].join(",\n        ")};`);
    for (const mb of impl.members) {
      lines.push("", `  final ${mb.fn.dart}? _${mb.name};`, "", "  @override");
      const call = `fuseImpl(_${mb.name}, ${q(mb.name)})(${mb.params.map((_, i) => `a${i}`).join(", ")})`;
      if (mb.getter) lines.push(`  ${mb.ret} get ${mb.name} => ${call};`);
      else lines.push(`  ${mb.ret} ${mb.name}(${mb.params.map((p, i) => `${p.dart} a${i}`).join(", ")}) => ${call};`);
    }
    lines.push("}");
    implCode.push(lines.join("\n"));
    return name;
  }

  // ── Dart -> JS ──────────────────────────────────────────────────────────

  /** The wire form of [src], a value of [ref]; [n] is the FuseNode in scope
   *  (a handle crosses as a reference registered with its registry). */
  function enc(ref: Ref, src: string, n: string): string {
    const nul = "null" in ref && ref.null ? "?" : "";
    switch (ref.k) {
      case "double":
        return `encDouble(${src})`;
      case "enum":
        return `${src}${nul}.name`;
      case "list":
      case "set":
      case "iterable":
        return `${src}${nul}.map((e) => ${enc(ref.of, "e", n)}).toList()`;
      case "bytes":
        return `encBytes(${src})`;
      case "map": {
        if (ref.entries) return `${src}${nul}.entries.map((e) => [${enc(ref.key, "e.key", n)}, ${enc(ref.of, "e.value", n)}]).toList()`;
        const k = ref.key.k === "enum" ? "k.name" : ref.key.k === "String" ? "k" : "'$k'";
        return `${src}${nul}.map((k, e) => MapEntry(${k}, ${enc(ref.of, "e", n)}))`;
      }
      case "data":
        return `${encoderOf(ref.id)}(${src}, ${n})`;
      case "handle":
        return `${n}.registry.lend<${noQ((m.types[ref.id] as HandleType).dart)}>(${src}, ${q(hTags.get(ref.id)!)}, ${hCls.get(ref.id)}.borrow)`;
      case "dynamic":
      case "Object":
        return `encAny(${src})`;
      default:
        return src;
    }
  }

  function encoderBody(id: string, name: string): string {
    const t = m.types[id] as DataType;
    const lines = [`Map<String, Object?>? ${name}(${noQ(t.dart)}? v, FuseNode n) => v == null`, "    ? null", "    : {"];
    for (const f of t.fields ?? []) lines.push(`        ${q(f.name)}: ${enc(f.type, `v.${f.name}`, "n")},`);
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
    return arg(p, w.component, `node[${q(p.name)}]`, { n: "node", prop: p.name, sub, context: "context" });
  }

  const adapters: string[] = [];
  const registrations: string[] = [];
  const makers: string[] = [];
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
    const made = call(callee, w.params, (p) => widgetArg(w, p, sub), { map: "node.props", type: `${noQ(w.dart)}${typeArgs}`, dart: sub });
    // A typed slot builds its child's widget in place, so this widget
    // rebuilds when a child built that way changes.
    const typed = w.params.some((p) => p.type && w.children?.param !== p.name && typedWidget(p.type));
    const T = `${noQ(w.dart)}${typeArgs}`;
    adapters.push(
      [
        `class ${cls} extends $fw.StatelessWidget {`,
        `  const ${cls}(this.node, {super.key});`,
        "  final FuseNode node;",
        "",
        "  /// The widget itself, built in [context] (a typed slot takes it).",
        `  static ${T} make(FuseNode node, $fw.BuildContext context) => ${made};`,
        "",
        "  @override",
        typed
          ? `  $fw.Widget build($fw.BuildContext context) => FuseTypedSlots(builder: (context) => make(node, context));`
          : `  $fw.Widget build($fw.BuildContext context) => make(node, context);`,
        "}",
      ].join("\n"),
    );
    const tag = tagOf(w);
    tags[tag] = cls;
    registrations.push(`  ${q(tag)}: ${cls}.new,`);
    makers.push(`  ${q(tag)}: ${cls}.make,`);
  });

  // ── handles ─────────────────────────────────────────────────────────────

  const handleCode: string[] = [];
  const handleRegs: string[] = [];
  const borrowRegs: string[] = [];
  const plain: Cx = { n: "node", prop: "", sub: (d) => d };

  /** A value of [dart] decoded from [src]; a non-null one is required. */
  function need(ref: Ref, dart: string, src: string, owner: string, what: string, nullable: boolean): string {
    if (RAW.has(ref.k)) return dart === "dynamic" ? src : `${src} as ${dart}`;
    const e = dec(ref, src, { ...plain, prop: what });
    return nullable ? e : `fuseReq(${e}, ${q(owner)}, ${q(what)})`;
  }

  const roots = new Set(m.handles);
  for (const id of hIds) {
    const h = m.types[id] as HandleType;
    const T = noQ(h.dart);
    const cls = hCls.get(id)!;
    const tag = hTags.get(id)!;
    const make = (c: (typeof h.ctors)[number]) =>
      call(c.name ? `${T}.${c.name}` : T, c.params, (p) => arg(p, h.name, `node[${q(p.name)}]`, { ...plain, prop: p.name }), { map: "node.props", type: T });
    const lines = [`class ${cls} extends FuseGeneratedHandle<${T}> {`];
    if (roots.has(id)) {
      lines.push(`  ${cls}(super.node) : object = _make(node) {`, "    start();", "  }", "");
    }
    if (lent.has(id)) {
      lines.push(`  ${cls}.borrow(super.node, this.object) : super.borrowed() {`, "    start();", "  }");
      borrowRegs.push(`  ${q(tag)}: (node, object) => ${cls}.borrow(node, object as ${T}),`);
    }
    if (roots.has(id)) {
      lines.push("", `  static ${T} _make(FuseNode node) {`);
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
      lines.push("  }");
    }
    lines.push("", "  @override", `  final ${T} object;`);
    if (h.state?.length) {
      lines.push("", "  @override", "  void snapshot(FuseSnapshot put) {");
      for (const f of h.state) lines.push(`    put(${q(f.name)}, () => ${enc(f.type, `object.${f.name}`, "node")});`);
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
        else lines.push(`        return ${enc(mt.ret, got, "node")};`);
      }
      lines.push("    }", "    return super.invoke(name, a);", "  }");
    }
    if (h.streams?.length) {
      lines.push("", "  @override", "  Stream<Object?>? stream(String name) => switch (name) {");
      for (const st of h.streams) lines.push(`        ${q(st.name)} => object.${st.name}.map((e) => ${enc(st.type, "e", "node")}),`);
      lines.push("        _ => null,", "      };");
    }
    // Only a handle JS created is freed; a borrowed object stays Dart's.
    if (h.disposable && roots.has(id)) lines.push("", "  @override", "  void release() => object.dispose();");
    lines.push("}");
    handleCode.push(lines.join("\n"));
    if (roots.has(id)) handleRegs.push(`  ${q(tag)}: ${cls}.new,`);
  }

  // Value types a barrel names: decoders registered by type.
  const valueRegs = (m.values ?? []).map((id) => `  ${noQ((m.types[id] as DataType).dart)}: ${decoderOf(id)},`);

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
    "/// Element tag -> the widget itself, for typed slots.",
    "const fuseGeneratedMakers = <String, FuseWidgetMaker>{",
    ...makers,
    "};",
    "",
    "/// Dart type -> decoder, for hand-written widgets (`node.value<T>(...)`).",
    "final fuseGeneratedDecoders = <Type, FuseDecoder>{",
    ...valueRegs,
    "};",
    "",
    "/// Node type -> handle for an object Dart hands to JS, so hand-written",
    "/// Dart can lend one by its type (`registry.lendAs`).",
    "final fuseGeneratedBorrows = <String, FuseGeneratedHandle Function(FuseNode, Object)>{",
    ...borrowRegs,
    "};",
    "",
    "/// Node type -> handle, for the handles JS creates.",
    "const fuseGeneratedHandles = <String, FuseHandle Function(FuseNode)>{",
    ...handleRegs,
    "};",
    "",
    `void ${registerFunction}(FuseRuntime runtime) {`,
    "  fuseGeneratedWidgets.forEach((type, b) => runtime.registerWidget(type, b, make: fuseGeneratedMakers[type]));",
    "  fuseGeneratedHandles.forEach(runtime.registerHandle);",
    "  fuseGeneratedDecoders.forEach(runtime.registerDecoder);",
    "  fuseGeneratedBorrows.forEach(runtime.registerBorrow);",
    "}",
    "",
  ];
  return {
    code: [...header, ...adapters, "", ...handleCode, "", ...decoderCode, "", ...implCode, "", ...encoderCode, ""].join("\n"),
    tags,
  };
}

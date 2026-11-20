// Everything that is not Dart is produced here, from the manifest alone:
// the TS wrapper module, the agent-facing catalogue (markdown + JSON) and the
// validation view the dev prelude registers. Nothing in this file knows about
// the analyzer or about any particular widget.

// ── manifest shape ──────────────────────────────────────────────────────────

export type MType =
  | { k: "bool" | "int" | "double" | "num" | "string" | "unknown" | "never"; nullable?: boolean }
  | { k: "enum" | "data" | "handle" | "payload"; n: string; nullable?: boolean }
  | { k: "list"; e: MType; nullable?: boolean }
  | { k: "map"; key: MType; v: MType; nullable?: boolean }
  | { k: "widget"; preferredSize?: boolean; nullable?: boolean }
  | { k: "widgets"; nullable?: boolean }
  | { k: "callback"; args: { name: string; type: MType; nullable?: boolean }[]; nullable?: boolean };

export interface MProp {
  type: MType;
  dart: string;
  required?: boolean;
  nullable?: boolean;
  default?: string;
  doc?: string;
}

export interface MWidget {
  tag: string;
  dart: string;
  ctor?: string;
  library: string;
  doc?: string;
  children?: "child" | "children" | "text";
  childrenParam?: string;
  flexProp?: boolean;
  props: Record<string, MProp>;
  omitted?: Record<string, string>;
  notes?: string[];
}

export interface MField {
  type: MType;
  required?: boolean;
  nullable?: boolean;
}

export interface MData {
  dart: string;
  doc?: string;
  nice?: { ts: string; accepts: string[] }[];
  replace?: boolean;
  consts?: string[];
  variants?: { tag: string | null; fields: Record<string, MField>; omitted?: Record<string, string> }[];
}

export interface Manifest {
  manifestVersion: number;
  generator: string;
  unit: string;
  /** Resolved version: pub package version, Flutter version, or a source hash for `app`. */
  version: string;
  register: string;
  libraries?: string[];
  widgets: Record<string, MWidget>;
  skipped?: Record<string, string>;
  enums: Record<string, { values: string[]; doc?: string }>;
  types: Record<string, MData>;
  payloads: Record<string, { dart: string; fields: Record<string, MType> }>;
}

// ── TS ──────────────────────────────────────────────────────────────────────

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const key = (n: string) => (IDENT.test(n) ? n : JSON.stringify(n));

function orNull(ts: string, nullable: boolean | undefined) {
  if (!nullable) return ts;
  return ts.includes("=>") ? `(${ts}) | null` : `${ts} | null`;
}

/** TS type for a manifest type descriptor. */
export function tsType(t: MType): string {
  switch (t.k) {
    case "bool":
      return "boolean";
    case "int":
    case "double":
    case "num":
      return "number";
    case "string":
      return "string";
    case "unknown":
      return "unknown";
    case "never":
      return "never";
    case "enum":
    case "data":
      return t.n;
    case "payload":
      return `${t.n}Out`;
    case "handle":
      return `FuseHandle<${JSON.stringify(t.n)}>`;
    case "list": {
      const e = orNull(tsType(t.e), t.e.nullable);
      return /[ |]/.test(e) ? `(${e})[]` : `${e}[]`;
    }
    case "map":
      return `Partial<Record<${t.key.k === "enum" ? t.key.n : "string"}, ${orNull(tsType(t.v), t.v.nullable)}>>`;
    case "widget":
      return "FuseElement";
    case "widgets":
      return "FuseElement | FuseElement[]";
    case "callback": {
      const arg = (a: { name: string; type: MType; nullable?: boolean }) => `${a.name}: ${orNull(tsType(a.type), a.nullable)}`;
      if (t.args.length === 0) return "() => void";
      if (t.args.length === 1) return `(${arg(t.args[0])}) => void`;
      return `(args: [${t.args.map(arg).join(", ")}]) => void`;
    }
  }
}

function jsdoc(text: string | undefined, indent: string, extra: string[] = []): string {
  const lines = [...(text ? text.replace(/\*\//g, "*\\/").split("\n") : []), ...(text && extra.length ? [""] : []), ...extra];
  if (lines.length === 0) return "";
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return `${indent}/**\n${lines.map((l) => `${indent} * ${l}`.trimEnd()).join("\n")}\n${indent} */\n`;
}

const BASE_TYPES = ["FuseElement", "FuseChildren", "FuseText", "FuseFlex", "FuseHandle", "NativeBaseProps", "NativeColorInput"];

/** The wrapper module an app imports: `~/_generated/<unit>`. */
export function emitTsModule(m: Manifest): { ts: string; perWidgetBytes: Record<string, number>; sharedBytes: number } {
  const widgets: string[] = [];
  const perWidgetBytes: Record<string, number> = {};
  for (const [name, w] of Object.entries(m.widgets)) {
    let b = jsdoc(w.doc, "", [`Flutter: \`${w.dart}${w.ctor ? `.${w.ctor}` : ""}\` (wire tag \`${w.tag}\`)`]);
    b += `export interface ${name}Props extends NativeBaseProps {\n`;
    if (w.children === "text") b += "  children?: FuseText;\n";
    else if (w.children) b += "  children?: FuseChildren;\n";
    if (w.flexProp) {
      b += "  /** solid-fuse layout convention applied when more than one child is given. */\n";
      b += "  flex?: FuseFlex;\n";
    }
    for (const [pn, p] of Object.entries(w.props)) {
      b += jsdoc(p.doc, "  ", p.default !== undefined ? [`@default ${p.default}`] : []);
      b += `  ${key(pn)}${p.required ? "" : "?"}: ${orNull(tsType(p.type), p.nullable)};\n`;
    }
    b += "}\n";
    b += `/** Flutter \`${w.dart}${w.ctor ? `.${w.ctor}` : ""}\`. Props: {@link ${name}Props}. */\n`;
    b += `export const ${name} = /*#__PURE__*/ nativeComponent<${name}Props>(${JSON.stringify(w.tag)});\n`;
    perWidgetBytes[name] = Buffer.byteLength(b);
    widgets.push(b);
  }

  let shared = "// ── enums ──\n";
  for (const [name, e] of Object.entries(m.enums)) {
    shared += jsdoc(e.doc, "");
    shared += `export type ${name} = ${e.values.map((v) => JSON.stringify(v)).join(" | ")};\n`;
  }
  shared += "\n// ── data types (JS -> Dart) ──\n";
  for (const [name, t] of Object.entries(m.types)) {
    const arms: string[] = [];
    for (const n of t.nice ?? []) arms.push(n.ts);
    const consts = (t.consts ?? []).map((c) => JSON.stringify(c));
    for (let i = 0; i < consts.length; i += 8) arms.push(consts.slice(i, i + 8).join(" | "));
    for (const v of t.variants ?? []) {
      const fields: string[] = [];
      if (v.tag != null) fields.push(`$: ${JSON.stringify(v.tag)}`);
      for (const [fn, f] of Object.entries(v.fields)) {
        fields.push(`${key(fn)}${f.required ? "" : "?"}: ${orNull(tsType(f.type), f.nullable)}`);
      }
      arms.push(fields.length ? `{ ${fields.join("; ")} }` : "{}");
    }
    shared += jsdoc(t.doc, "", [`Dart: \`${t.dart}\``]);
    shared += `export type ${name} =\n${(arms.length ? arms : ["never"]).map((a) => `  | ${a}`).join("\n")};\n\n`;
  }
  shared += "// ── callback payloads (Dart -> JS) ──\n";
  for (const [name, p] of Object.entries(m.payloads)) {
    shared += `/** Callback payload derived from Dart \`${p.dart}\`. */\nexport interface ${name}Out {\n`;
    for (const [fn, f] of Object.entries(p.fields)) shared += `  ${key(fn)}: ${orNull(tsType(f), f.nullable)};\n`;
    shared += "}\n\n";
  }

  const body = widgets.join("\n") + "\n" + shared;
  const used = BASE_TYPES.filter((t) => new RegExp(`\\b${t}\\b`).test(body));
  const header =
    `// GENERATED by \`fuse gen\` from ${m.unit}.manifest.json (${m.unit} ${m.version}). Do not edit.\n` +
    `// Regenerate with \`fuse gen\`; change what is generated in fuse.config.ts (native).\n` +
    `import { nativeComponent } from "solid-fuse";\n` +
    (used.length ? `import type { ${used.join(", ")} } from "solid-fuse";\n` : "") +
    "\n";
  return { ts: header + body, perWidgetBytes, sharedBytes: Buffer.byteLength(shared) };
}

// ── validation view (what the dev prelude registers) ────────────────────────

/** The manifest without docs and Dart-only details: all the validator reads. */
export function validationView(m: Manifest) {
  return {
    manifestVersion: m.manifestVersion,
    unit: m.unit,
    widgets: Object.fromEntries(
      Object.entries(m.widgets).map(([n, w]) => [
        n,
        {
          tag: w.tag,
          dart: w.dart,
          children: w.children,
          flexProp: w.flexProp,
          props: Object.fromEntries(
            Object.entries(w.props).map(([pn, p]) => [pn, { type: p.type, required: p.required, nullable: p.nullable }]),
          ),
          omitted: w.omitted,
        },
      ]),
    ),
    enums: Object.fromEntries(Object.entries(m.enums).map(([n, e]) => [n, { values: e.values }])),
    types: Object.fromEntries(
      Object.entries(m.types).map(([n, t]) => [
        n,
        {
          dart: t.dart,
          nice: t.nice,
          consts: t.consts,
          variants: t.variants?.map((v) => ({ tag: v.tag, fields: v.fields })),
        },
      ]),
    ),
  };
}

// ── catalogue ───────────────────────────────────────────────────────────────

function firstSentence(doc: string | undefined): string {
  if (!doc) return "";
  const flat = doc.replace(/\s+/g, " ").trim();
  const m = flat.match(/^(.*?[.!?])(\s|$)/);
  return (m ? m[1] : flat).replace(/\[([^\]]+)\]/g, "`$1`");
}

/** `name*: type = default`; `*` marks required. */
function propSig(name: string, p: MProp): string {
  return `${name}${p.required ? "*" : ""}: ${orNull(tsType(p.type), p.nullable)}${p.default !== undefined ? ` = ${p.default}` : ""}`;
}

function childrenText(w: MWidget): string {
  switch (w.children) {
    case "text":
      return "text";
    case "child":
      return w.flexProp ? "one child (several are laid out by `flex`)" : "one child";
    case "children":
      return "many";
    default:
      return "none";
  }
}

function dataSummary(t: MData): string {
  const parts: string[] = [];
  for (const n of t.nice ?? []) parts.push(n.ts.length > 60 ? "object" : n.ts);
  const consts = t.consts ?? [];
  if (consts.length) {
    parts.push(consts.length <= 6 ? consts.map((c) => `"${c}"`).join(" | ") : `${consts.slice(0, 4).map((c) => `"${c}"`).join(" | ")} | … (${consts.length} constants)`);
  }
  const tags = (t.variants ?? []).map((v) => (v.tag == null ? "{…}" : `{$:"${v.tag}"}`));
  if (tags.length) parts.push(tags.length <= 5 ? tags.join(" | ") : `${tags.slice(0, 4).join(" | ")} | … (${tags.length} variants)`);
  return parts.join(" | ");
}

/** Above this many widgets the markdown catalogue lists names only. */
export const CATALOG_FULL_LIMIT = 60;

/**
 * Markdown index for AGENTS.md / llms.txt: what exists, without the .d.ts.
 * `full` lists every prop signature (about 500 bytes per widget); `index`
 * lists one line per widget (about 100 bytes) and leaves props to
 * `fuse catalog <Widget>`. Default: full up to CATALOG_FULL_LIMIT widgets.
 */
export function emitCatalogMarkdown(manifests: Manifest[], importBase: string, detail?: "full" | "index"): string {
  const total = manifests.reduce((n, m) => n + Object.keys(m.widgets).length, 0);
  if ((detail ?? (total <= CATALOG_FULL_LIMIT ? "full" : "index")) === "index") return emitCatalogIndex(manifests, importBase);
  let out =
    "# Native widgets (generated)\n\n" +
    "<!-- GENERATED by `fuse gen` from src/_generated/*.manifest.json. Do not edit. -->\n\n" +
    "Flutter widgets this app can render from JSX. Each is a typed component with the same props as the Dart constructor.\n" +
    "`*` marks a required prop, `= x` is the Flutter default. Enum props take the Dart enum value name as a string.\n" +
    "Data types (`Color`, `EdgeInsetsGeometry`, …) are summarised at the end of each section; full definitions are in the module.\n" +
    "A widget that is not listed is not available: add it to `native` in `fuse.config.ts` and run `fuse gen` (needs a native rebuild).\n" +
    "`fuse catalog <Widget>` prints one widget with prop docs.\n";
  for (const m of manifests) {
    out += `\n## ${m.unit} ${m.version}\n\n`;
    out += `\`import { ${Object.keys(m.widgets).slice(0, 3).join(", ")}${Object.keys(m.widgets).length > 3 ? ", …" : ""} } from "${importBase}/${m.unit}"\`\n`;
    for (const [name, w] of Object.entries(m.widgets)) {
      out += `\n### ${name}\n\n`;
      const doc = firstSentence(w.doc);
      if (doc) out += `${doc}\n\n`;
      out += `- children: ${childrenText(w)}\n`;
      const props = Object.entries(w.props);
      out += `- props: ${props.length ? props.map(([n, p]) => `\`${propSig(n, p)}\``).join(", ") : "none"}\n`;
      if (w.omitted && Object.keys(w.omitted).length) {
        out += `- not bridged: ${Object.entries(w.omitted).map(([n, why]) => `\`${n}\` (${why})`).join(", ")}\n`;
      }
    }
    if (m.skipped && Object.keys(m.skipped).length) {
      out += `\n### Not generated\n\n`;
      for (const [n, why] of Object.entries(m.skipped)) out += `- ${n}: ${why}\n`;
    }
    const used = usedTypes(m);
    if (used.enums.length) {
      out += `\n### Enums\n\n`;
      for (const n of used.enums) out += `- \`${n}\`: ${m.enums[n].values.map((v) => `"${v}"`).join(" | ")}\n`;
    }
    if (used.types.length) {
      out += `\n### Data types\n\n`;
      for (const n of used.types) out += `- \`${n}\`: ${dataSummary(m.types[n])}\n`;
    }
  }
  return out;
}

function emitCatalogIndex(manifests: Manifest[], importBase: string): string {
  let out =
    "# Native widgets (generated index)\n\n" +
    "<!-- GENERATED by `fuse gen` from src/_generated/*.manifest.json. Do not edit. -->\n\n" +
    "Flutter widgets this app can render from JSX, as typed components with the Dart constructor's props.\n" +
    "This is a name index. For props, defaults and docs run `fuse catalog <Widget>` (or `fuse catalog --json`).\n" +
    "A widget that is not listed is not available: add it to `native` in `fuse.config.ts` and run `fuse gen` (needs a native rebuild).\n";
  for (const m of manifests) {
    out += `\n## ${m.unit} ${m.version} (\`${importBase}/${m.unit}\`)\n\n`;
    for (const [name, w] of Object.entries(m.widgets)) {
      const doc = firstSentence(w.doc);
      out += `- ${name}${doc ? `: ${doc}` : ""}\n`;
    }
    const skipped = Object.keys(m.skipped ?? {});
    if (skipped.length) out += `\nNot generated (builder, sync callback or delegate required): ${skipped.join(", ")}\n`;
  }
  return out;
}

/** Enums and data types referenced directly by widget props (not the full closure). */
function usedTypes(m: Manifest) {
  const enums = new Set<string>();
  const types = new Set<string>();
  const visit = (t: MType) => {
    if (t.k === "enum") enums.add(t.n);
    else if (t.k === "data") types.add(t.n);
    else if (t.k === "list") visit(t.e);
    else if (t.k === "map") visit(t.v);
  };
  for (const w of Object.values(m.widgets)) for (const p of Object.values(w.props)) visit(p.type);
  return { enums: [...enums].sort().filter((n) => m.enums[n]), types: [...types].sort().filter((n) => m.types[n]) };
}

/** Compact machine-readable index (one string per prop). */
export function emitCatalogJson(manifests: Manifest[], importBase: string) {
  return {
    $comment: "GENERATED by `fuse gen`. Prop strings are `type` with `*` = required and `= default`.",
    units: Object.fromEntries(
      manifests.map((m) => [
        m.unit,
        {
          version: m.version,
          import: `${importBase}/${m.unit}`,
          widgets: Object.fromEntries(
            Object.entries(m.widgets).map(([n, w]) => [
              n,
              {
                tag: w.tag,
                doc: firstSentence(w.doc) || undefined,
                children: w.children ?? "none",
                props: Object.fromEntries(
                  Object.entries(w.props).map(([pn, p]) => [
                    pn,
                    `${orNull(tsType(p.type), p.nullable)}${p.required ? "*" : ""}${p.default !== undefined ? ` = ${p.default}` : ""}`,
                  ]),
                ),
                omitted: w.omitted && Object.keys(w.omitted).length ? w.omitted : undefined,
              },
            ]),
          ),
          skipped: m.skipped,
        },
      ]),
    ),
  };
}

/** Full detail for one widget (`fuse catalog <Widget>`). */
export function describeWidget(m: Manifest, name: string): string {
  const w = m.widgets[name];
  let out = `${name}  (${m.unit} ${m.version}, wire tag ${w.tag})\n`;
  out += `import { ${name} } from "~/_generated/${m.unit}"\n\n`;
  if (w.doc) out += `${w.doc}\n\n`;
  out += `children: ${childrenText(w)}\n\nprops:\n`;
  for (const [n, p] of Object.entries(w.props)) {
    out += `  ${propSig(n, p)}\n`;
    const d = firstSentence(p.doc);
    if (d) out += `      ${d}\n`;
  }
  if (w.omitted && Object.keys(w.omitted).length) {
    out += `\nnot bridged:\n`;
    for (const [n, why] of Object.entries(w.omitted)) out += `  ${n}: ${why}\n`;
  }
  const refs = new Set<string>();
  const visit = (t: MType) => {
    if (t.k === "enum" || t.k === "data") refs.add(t.n);
    else if (t.k === "list") visit(t.e);
    else if (t.k === "map") visit(t.v);
  };
  for (const p of Object.values(w.props)) visit(p.type);
  if (refs.size) {
    out += `\ntypes:\n`;
    for (const n of [...refs].sort()) {
      if (m.enums[n]) out += `  ${n}: ${m.enums[n].values.map((v) => `"${v}"`).join(" | ")}\n`;
      else if (m.types[n]) out += `  ${n}: ${dataSummary(m.types[n])}\n`;
    }
  }
  return out;
}

// ── API diff (old manifest vs new) ──────────────────────────────────────────

export function diffManifests(before: Manifest | null, after: Manifest): string[] {
  if (!before) return [];
  const out: string[] = [];
  const u = after.unit;
  for (const name of Object.keys(before.widgets)) {
    if (!after.widgets[name]) {
      out.push(`- ${u}.${name}: widget removed${after.skipped?.[name] ? ` (${after.skipped[name]})` : ""}`);
      continue;
    }
    const a = before.widgets[name].props;
    const b = after.widgets[name].props;
    for (const p of Object.keys(a)) {
      if (!b[p]) {
        const why = after.widgets[name].omitted?.[p];
        out.push(`- ${u}.${name}.${p}: prop removed${why ? ` (${why})` : ""}`);
      } else {
        const ta = orNull(tsType(a[p].type), a[p].nullable);
        const tb = orNull(tsType(b[p].type), b[p].nullable);
        if (ta !== tb) out.push(`~ ${u}.${name}.${p}: type ${ta} -> ${tb}`);
        if (!a[p].required && b[p].required) out.push(`~ ${u}.${name}.${p}: now required`);
        if ((a[p].default ?? null) !== (b[p].default ?? null)) {
          out.push(`~ ${u}.${name}.${p}: default ${a[p].default ?? "none"} -> ${b[p].default ?? "none"}`);
        }
      }
    }
    for (const p of Object.keys(b)) {
      if (!a[p]) out.push(`+ ${u}.${name}.${p}: ${orNull(tsType(b[p].type), b[p].nullable)}${b[p].required ? " (required)" : ""}`);
    }
  }
  for (const name of Object.keys(after.widgets)) {
    if (!before.widgets[name]) out.push(`+ ${u}.${name}: new widget`);
  }
  for (const name of Object.keys(before.enums)) {
    const b = after.enums[name];
    if (!b) continue;
    const gone = before.enums[name].values.filter((v) => !b.values.includes(v));
    if (gone.length) out.push(`- ${u} enum ${name}: removed ${gone.map((v) => `"${v}"`).join(", ")}`);
  }
  return out;
}

import MagicString from "magic-string";
import { parseSync, type Plugin } from "vite";
import type { FuseCompileOptions } from "../src/config";

/**
 * The compile step that runs in front of Solid's JSX compiler.
 *
 * Solid's compiler decides what is reactive and wires it up; it has no
 * extension points, and in universal mode it emits one `createElement` and
 * one `insertNode` call for every element, every time the JSX is evaluated.
 * In solid-fuse each of those is interpreted JavaScript plus an op for Dart.
 * This step takes away the part of that work that never changes, and leaves
 * everything else to Solid's compiler by handing it ordinary JSX:
 *
 * 1. Wrapper components that only forward their props (`View`, `Text`, ...)
 *    are compiled as the element they render, so they cost no component
 *    call and no props object.
 *
 * 2. The constant part of a JSX tree (element types, literal props, literal
 *    text, nesting) becomes a template: a shape Dart receives once and
 *    builds natively from one op. Only elements with something dynamic stay
 *    in the JSX, rewritten to stand for "node i of this instance":
 *
 *      <view padding={8}>
 *        <text fontSize={12}>Total</text>
 *        <text color="red">{total()}</text>
 *      </view>
 *
 *    becomes
 *
 *      (_at$1 =>
 *        <h$view $t={_at$1} $i={0}>
 *          <h$text $t={_at$1} $i={3}>{total()}</h$text>
 *        </h$view>
 *      )(_$instantiate(_tpl$1))
 *
 *    with `_tpl$1` holding the shape. Solid's compiler then treats `{total()}`
 *    as it always does. This file decides only what is provably constant; it
 *    never decides how something dynamic behaves.
 *
 * See "Templates" in src/renderer.ts for the runtime half.
 */

export interface CompileOptions extends FuseCompileOptions {
  /** Module the runtime helpers are imported from. Default `"solid-fuse"`. */
  moduleName?: string;
  /**
   * Collects what the compiled code uses but no longer imports: the element
   * tags components became, and the constants folded into values. `fuse
   * build` keeps the Dart side of those (cli/gen/shake.ts).
   */
  usage?: CompileUsage;
  /**
   * Tables read on every transform, merged under [intrinsics] and
   * [builders]: the generated modules', which `fuse gen` rewrites while the
   * dev server runs.
   */
  tables?: () => CompileTables;
}

export type CompileTables = Pick<FuseCompileOptions, "intrinsics" | "builders">;

export interface CompileUsage {
  tags: Set<string>;
  consts: Set<string>;
  /** Directory of the generated modules, whose own code doesn't count. */
  generated?: string;
}

/**
 * The solid-fuse components that are `props => <tag {...props} />` and
 * nothing more (src/widgets). cli/compile-plugin.test.ts checks each one
 * against its source.
 */
export const FUSE_INTRINSICS: Record<string, string> = {
  View: "view",
  Text: "text",
  Stack: "stack",
  Positioned: "positioned",
  ScrollView: "scrollView",
  TextInput: "textInput",
  RadioGroup: "radioGroup",
  Tooltip: "tooltip",
  Menu: "menu",
  Expandable: "expandable",
};

/** Prefix of the tag of an element that stands for a template node; `hole` in src/renderer.ts reads it. */
const HOLE = "h$";

export function fuseCompilePlugin(options: CompileOptions = {}): Plugin {
  return {
    name: "solid-fuse:compile",
    // In front of Solid's plugin (also "pre"): list this one first.
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?", 1)[0];
      if (!/\.[jt]sx$/.test(file)) return null;
      // The generated modules' own elements are not a use: the bundler
      // tells which of their components are kept.
      const own = options.usage?.generated && file.startsWith(options.usage.generated);
      const t = options.tables?.() ?? {};
      return transformJsx(code, file, {
        ...options,
        intrinsics: { ...t.intrinsics, ...options.intrinsics },
        builders: { ...t.builders, ...options.builders },
        usage: own ? undefined : options.usage,
      });
    },
  };
}

type Node = { type: string; start: number; end: number; [key: string]: any };

interface ElementInfo {
  kind: "element";
  node: Node;
  tag: string;
  /** Literal props, lifted into the shape. */
  props: Record<string, unknown> | null;
  /** The attributes those came from. */
  lifted: Node[];
  /** Has attributes that stay in the JSX. */
  dynamicProps: boolean;
  /** Children are left to Solid's compiler; none are part of the shape. */
  opaqueChildren: boolean;
  children: (ElementInfo | TextInfo | DynamicInfo)[];
  /** Has a child Solid inserts at run time. */
  dynamicChildren: boolean;
  /** Something dynamic in this element or below it. */
  holes: boolean;
  /** Needs a node on the JS side. */
  keep: boolean;
  index: number;
}
interface TextInfo {
  kind: "text";
  node: Node;
  text: string;
  keep: boolean;
  index: number;
}
interface DynamicInfo {
  kind: "dynamic";
  node: Node;
}

export function transformJsx(
  code: string,
  file: string,
  options: CompileOptions = {},
): { code: string; map: any } | null {
  if (!code.includes("<")) return null;
  const parsed = parseSync(file, code, { lang: file.endsWith(".jsx") ? "jsx" : "tsx" });
  // A syntax error is Solid's compiler's to report.
  if (parsed.errors.length > 0) return null;
  const program = parsed.program as unknown as Node;

  const moduleName = options.moduleName ?? "solid-fuse";
  const useTemplates = options.templates !== false;
  const intrinsics: Record<string, Record<string, string>> = {
    "solid-fuse": FUSE_INTRINSICS,
    ...options.intrinsics,
  };

  // Local name -> element tag, for imported wrapper components. A local
  // binding that shadows the import is not detected; `View` and friends are
  // not names that get reused.
  const wrappers = new Map<string, string>();
  for (const statement of program.body as Node[]) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue;
    const table = intrinsics[statement.source.value];
    if (!table) continue;
    for (const spec of statement.specifiers as Node[]) {
      if (spec.type !== "ImportSpecifier" || spec.importKind === "type") continue;
      const imported = spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value;
      if (Object.hasOwn(table, imported)) wrappers.set(spec.local.name, table[imported]);
    }
  }

  // Local name -> builder table and the name it was imported as, for the
  // generated value builders (`EdgeInsets.all(8)`, `Colors.red`).
  const builderTables = options.builders ?? {};
  const builderImports = new Map<string, { table: Record<string, BuilderFold>; imported: string }>();
  for (const statement of program.body as Node[]) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue;
    const table = builderTables[statement.source.value];
    if (!table) continue;
    for (const spec of statement.specifiers as Node[]) {
      if (spec.type !== "ImportSpecifier" || spec.importKind === "type") continue;
      const imported = spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value;
      builderImports.set(spec.local.name, { table, imported });
    }
  }
  const usage = options.usage;
  const fold: Fold | null =
    builderImports.size === 0
      ? null
      : (node, literalOf) => {
          const v = foldBuilder(node, builderImports, literalOf);
          // A constant folds to its name, and its import goes away.
          if (usage && typeof v === "string") usage.consts.add(v);
          return v;
        };

  const ms = new MagicString(code);
  const declarations: string[] = [];
  let changed = false;

  /** The element type a JSX element creates, or null for a component. */
  function tagOf(el: Node): string | null {
    const name = el.openingElement.name;
    if (name.type !== "JSXIdentifier") return null;
    const tag = wrappers.get(name.name) ?? (/^[a-z]/.test(name.name) ? name.name : null);
    if (tag !== null) usage?.tags.add(tag);
    return tag;
  }

  function rename(el: Node, to: string, attributes = "") {
    const opening = el.openingElement.name;
    ms.overwrite(opening.start, opening.end, to + attributes);
    if (el.closingElement) {
      const closing = el.closingElement.name;
      ms.overwrite(closing.start, closing.end, to);
    }
    changed = true;
  }

  // --- Analysis: what is constant ---

  function analyze(el: Node, tag: string): ElementInfo {
    const attributes = el.openingElement.attributes as Node[];
    // `children` as an attribute is a child, placed by Solid's compiler.
    const childrenAttribute = attributes.some(
      (a) => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && a.name.name === "children",
    );
    let props: Record<string, unknown> | null = null;
    const lifted: Node[] = [];
    for (const attribute of attributes) {
      const value = literalAttribute(attribute, fold);
      if (value === NOT_LITERAL) continue;
      (props ??= {})[attribute.name.name] = value;
      lifted.push(attribute);
    }

    const kids = el.children as Node[];
    // Children Solid's compiler creates itself and appends in order (a text
    // literal in braces, text with an entity, a fragment, JSX in braces)
    // cannot be mixed with children that already exist in the template: the
    // positions would not line up. Such an element keeps all its children.
    const opaqueChildren = childrenAttribute || kids.some(isCompilerPlaced);
    const children: ElementInfo["children"] = [];
    let dynamicChildren = opaqueChildren && kids.length > 0;
    for (const kid of kids) {
      if (opaqueChildren) {
        children.push({ kind: "dynamic", node: kid });
      } else if (kid.type === "JSXText") {
        const text = trimText(kid.raw ?? kid.value);
        if (text !== "") children.push({ kind: "text", node: kid, text, keep: false, index: -1 });
      } else if (kid.type === "JSXExpressionContainer" && kid.expression.type === "JSXEmptyExpression") {
        // A comment.
      } else {
        const kidTag = kid.type === "JSXElement" ? tagOf(kid) : null;
        if (kidTag !== null) {
          children.push(analyze(kid, kidTag));
        } else {
          children.push({ kind: "dynamic", node: kid });
          dynamicChildren = true;
        }
      }
    }

    const dynamicProps = attributes.length > lifted.length;
    return {
      kind: "element",
      node: el,
      tag,
      props,
      lifted,
      dynamicProps,
      opaqueChildren,
      children,
      dynamicChildren,
      holes:
        dynamicProps ||
        dynamicChildren ||
        children.some((c) => c.kind === "element" && c.holes),
      keep: false,
      index: -1,
    };
  }

  function isCompilerPlaced(kid: Node): boolean {
    switch (kid.type) {
      case "JSXText":
        return (kid.raw ?? kid.value).includes("&");
      case "JSXExpressionContainer": {
        const type = unwrap(kid.expression).type;
        return type === "Literal" || type === "TemplateLiteral" || type === "JSXElement" || type === "JSXFragment";
      }
      case "JSXElement":
        // A component is inserted at run time. Created in place: an
        // element with a spread, and one that is not a plain tag (`<a:b>`).
        return tagOf(kid) === null ? !isComponentName(kid.openingElement.name) : hasSpread(kid);
      default:
        // JSXFragment, JSXSpreadChild
        return true;
    }
  }

  /** Decide which nodes need a JS node and number the shape; returns its size. */
  function plan(root: ElementInfo): number {
    let size = 0;
    const visit = (info: ElementInfo, isRoot: boolean, parentDynamic: boolean) => {
      info.index = size++;
      info.keep = isRoot || info.holes || parentDynamic;
      for (const child of info.children) {
        if (child.kind === "element") visit(child, false, info.dynamicChildren);
        else if (child.kind === "text") {
          child.index = size++;
          child.keep = info.dynamicChildren;
        }
      }
    };
    visit(root, true, false);
    return size;
  }

  function shapeOf(info: ElementInfo): unknown[] {
    const shape: unknown[] = [info.tag, info.props ?? 0];
    for (const child of info.children) {
      if (child.kind === "element") shape.push(shapeOf(child));
      else if (child.kind === "text") shape.push(child.text);
    }
    return shape;
  }

  // --- Rewriting ---

  /** Replace a range that produces nothing, keeping its line breaks so line numbers hold. */
  function blank(node: Node, replacement = "") {
    const lines = code.slice(node.start, node.end).split("\n").length - 1;
    ms.overwrite(node.start, node.end, replacement + "\n".repeat(lines));
  }

  function emit(info: ElementInfo, instance: string) {
    const el = info.node;
    rename(el, HOLE + info.tag, ` $t={${instance}} $i={${info.index}}`);
    for (const attribute of info.lifted) ms.remove(attribute.start, attribute.end);
    for (const attribute of el.openingElement.attributes as Node[]) {
      if (!info.lifted.includes(attribute)) walk(attribute, el);
    }
    for (const child of info.children) {
      if (child.kind === "dynamic") {
        walk(child.node, el);
      } else if (!child.keep) {
        blank(child.node);
      } else if (child.kind === "text") {
        blank(child.node, `<${HOLE}__text__ $t={${instance}} $i={${child.index}}/>`);
      } else {
        emit(child, instance);
      }
    }
  }

  function template(el: Node, tag: string, parent: Node | null): boolean {
    // With a spread, Solid's compiler merges every attribute into one props
    // source, so the element cannot carry which template node it is: it and
    // its attributes stay as written. Its children are looked at on their own.
    if (hasSpread(el)) return false;
    const root = analyze(el, tag);
    const size = plan(root);
    // A lone element with no literal props has nothing constant but its
    // type: the plain element is already one op.
    if (size === 1 && root.props === null) return false;
    const n = declarations.length + 1;
    declarations.push(`const _tpl$${n} = /*@__PURE__*/ _$template(${JSON.stringify(shapeOf(root))}, ${size});`);
    const instance = `_at$${n}`;
    emit(root, instance);
    // As a JSX child or attribute value, an expression needs braces.
    const braces =
      parent !== null &&
      (parent.type === "JSXElement" || parent.type === "JSXFragment" || parent.type === "JSXAttribute");
    ms.prependRight(el.start, `${braces ? "{" : ""}(${instance} => `);
    ms.appendLeft(el.end, `)(_$instantiate(_tpl$${n}))${braces ? "}" : ""}`);
    return true;
  }

  function walk(node: any, parent: Node | null) {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parent);
      return;
    }
    if (typeof node.type !== "string") return;
    if (node.type === "JSXElement") {
      const tag = tagOf(node);
      if (tag !== null) {
        if (useTemplates && template(node, tag, parent)) return;
        if (tag !== node.openingElement.name.name) rename(node, tag);
      }
      walk(node.openingElement.attributes, node);
      walk(node.children, node);
      return;
    }
    for (const key in node) {
      if (key === "type" || key === "start" || key === "end") continue;
      const value = node[key];
      if (value !== null && typeof value === "object") walk(value, node);
    }
  }

  walk(program.body, null);
  if (!changed) return null;

  if (declarations.length > 0) {
    // On the first line, so that no line of the file moves. The constants go
    // in front of the module's code because a template is used as soon as
    // the JSX around it runs, which can be during module evaluation.
    const directives = (program.body as Node[]).filter(
      (s) => s.type === "ExpressionStatement" && typeof s.directive === "string",
    );
    const header =
      `import { template as _$template, instantiate as _$instantiate } from ${JSON.stringify(moduleName)};` +
      declarations.join("");
    if (directives.length > 0) ms.appendLeft(directives[directives.length - 1].end, header);
    else ms.prepend(header);
  }

  return { code: ms.toString(), map: ms.generateMap({ source: file, hires: "boundary", includeContent: true }) };
}

function hasSpread(el: Node): boolean {
  return (el.openingElement.attributes as Node[]).some((a) => a.type !== "JSXAttribute");
}

function isComponentName(name: Node): boolean {
  return name.type === "JSXMemberExpression" || (name.type === "JSXIdentifier" && !/^[a-z]/.test(name.name));
}

const NOT_LITERAL = Symbol("not literal");

/** The value of an attribute that is a literal Solid's compiler would pass through unchanged. */
function literalAttribute(attribute: Node, fold: Fold | null = null): unknown {
  if (attribute.name.type !== "JSXIdentifier") return NOT_LITERAL;
  const name: string = attribute.name.name;
  if (name === "ref" || name === "children" || name === "__proto__") return NOT_LITERAL;
  const value = attribute.value;
  if (value === null || value === undefined) return true;
  if (value.type === "Literal") {
    // A string attribute; entities are left for the compiler to decode.
    return typeof value.value === "string" && !(value.raw ?? "&").includes("&") ? value.value : NOT_LITERAL;
  }
  if (value.type !== "JSXExpressionContainer") return NOT_LITERAL;
  return literal(value.expression, fold);
}

function unwrap(node: Node): Node {
  while (
    node.type === "ParenthesizedExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression"
  ) {
    node = node.expression;
  }
  return node;
}

/** How a generated builder call folds (cli/gen/emit-ts.ts writes these tables). */
export type BuilderFold = { tag: string; positional: string[] } | { const: string };

/** Folds a builder call or constant into its value, or returns NOT_LITERAL. */
type Fold = (node: Node, literalOf: (n: Node) => unknown) => unknown;

/**
 * `EdgeInsets.all(8)` -> `{ $: "EdgeInsets.all", value: 8 }`, `Colors.red` ->
 * `"Colors.red"`: the same value `$build` in src/generated.ts returns, when
 * every argument is a literal.
 */
function foldBuilder(
  node: Node,
  imports: Map<string, { table: Record<string, BuilderFold>; imported: string }>,
  literalOf: (n: Node) => unknown = () => NOT_LITERAL,
): unknown {
  const keyOf = (callee: Node): { table: Record<string, BuilderFold>; key: string } | null => {
    callee = unwrap(callee);
    if (callee.type === "Identifier") {
      const i = imports.get(callee.name);
      return i ? { table: i.table, key: i.imported } : null;
    }
    if (callee.type === "MemberExpression" && !callee.computed && callee.object.type === "Identifier" && callee.property.type === "Identifier") {
      const i = imports.get(callee.object.name);
      return i ? { table: i.table, key: `${i.imported}.${callee.property.name}` } : null;
    }
    return null;
  };
  if (node.type === "MemberExpression") {
    const k = keyOf(node);
    const entry = k && Object.hasOwn(k.table, k.key) ? k.table[k.key] : null;
    return entry && "const" in entry ? entry.const : NOT_LITERAL;
  }
  if (node.type !== "CallExpression" || node.optional) return NOT_LITERAL;
  const k = keyOf(node.callee);
  const entry = k && Object.hasOwn(k.table, k.key) ? k.table[k.key] : null;
  if (!entry || "const" in entry) return NOT_LITERAL;
  const args = node.arguments as Node[];
  if (args.length > entry.positional.length + 1) return NOT_LITERAL;
  const value: Record<string, unknown> = { $: entry.tag };
  for (let i = 0; i < args.length; i++) {
    if (args[i].type === "SpreadElement") return NOT_LITERAL;
    const v = literalOf(args[i]);
    if (v === NOT_LITERAL) return NOT_LITERAL;
    if (i < entry.positional.length) {
      value[entry.positional[i]] = v;
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(value, v);
    } else {
      return NOT_LITERAL;
    }
  }
  return value;
}

/** The JSON value of an expression made only of literals, or NOT_LITERAL. */
function literal(expression: Node, fold: Fold | null = null): unknown {
  const node = unwrap(expression);
  const inner = (n: Node) => literal(n, fold);
  switch (node.type) {
    case "CallExpression":
    case "MemberExpression":
      return fold ? fold(node, inner) : NOT_LITERAL;
    case "Literal": {
      const value = node.value;
      if (value === null) return node.raw === "null" ? null : NOT_LITERAL;
      return typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))
        ? value
        : NOT_LITERAL;
    }
    case "TemplateLiteral":
      return node.expressions.length === 0 && typeof node.quasis[0].value.cooked === "string"
        ? node.quasis[0].value.cooked
        : NOT_LITERAL;
    case "UnaryExpression": {
      if (node.operator !== "-" && node.operator !== "+") return NOT_LITERAL;
      const value = inner(node.argument);
      if (typeof value !== "number") return NOT_LITERAL;
      return node.operator === "-" ? -value : value;
    }
    case "ArrayExpression": {
      const out: unknown[] = [];
      for (const element of node.elements as (Node | null)[]) {
        if (element === null || element.type === "SpreadElement") return NOT_LITERAL;
        const value = inner(element);
        if (value === NOT_LITERAL) return NOT_LITERAL;
        out.push(value);
      }
      return out;
    }
    case "ObjectExpression": {
      const out: Record<string, unknown> = {};
      for (const property of node.properties as Node[]) {
        if (property.type !== "Property" || property.kind !== "init" || property.computed || property.method) {
          return NOT_LITERAL;
        }
        const key =
          property.key.type === "Identifier"
            ? property.key.name
            : property.key.type === "Literal" && typeof property.key.value === "string"
              ? property.key.value
              : NOT_LITERAL;
        if (typeof key !== "string" || key === "__proto__") return NOT_LITERAL;
        const value = property.shorthand ? NOT_LITERAL : inner(property.value);
        if (value === NOT_LITERAL) return NOT_LITERAL;
        out[key] = value;
      }
      return out;
    }
    default:
      return NOT_LITERAL;
  }
}

/**
 * JSX text as Solid's compiler reads it: lines after the first lose their
 * leading whitespace, blank lines go, the rest is joined with spaces and
 * runs of whitespace collapse.
 */
export function trimText(text: string): string {
  text = text.replace(/\r/g, "");
  if (text.includes("\n")) {
    text = text
      .split("\n")
      .map((line, i) => (i ? line.replace(/^\s*/, "") : line))
      .filter((line) => !/^\s*$/.test(line))
      .join(" ");
  }
  return text.replace(/\s+/g, " ");
}

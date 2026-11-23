/**
 * Tree shaking for the Dart side of `fuse gen`. The TypeScript side is
 * shaken by the bundler; the Dart side registers every adapter by tag, so
 * Dart's own tree shaker can't drop any. `fuse build` asks the bundle what is
 * left and generates the Dart for just that:
 *
 *  - the generated exports the bundler kept (`renderedExports`), looked up
 *    in `uses.json` (what each export stands for),
 *  - the element tags and constants the compile step folded away, whose
 *    imports are gone (`CompileUsage`).
 *
 * Everything those reach (decoders, enums, shorthands, handles Dart hands
 * to JS) follows from the types, as it does for the full output.
 */
import type { CompileUsage } from "../compile-plugin";
import { handleTags, tagOf } from "./emit-dart";
import type { ExportUse } from "./emit-ts";
import type { DataType, Manifest } from "./manifest";

/** What one build of the bundle uses. */
export interface BundleUse extends CompileUsage {
  /** Generated module (`flutter`, `material_ui/Icons`) -> its kept exports. */
  exports: Map<string, Set<string>>;
}

export function newBundleUse(): BundleUse {
  return { tags: new Set(), consts: new Set(), exports: new Map() };
}

/**
 * The manifest cut down to what [use] needs: the widgets and created
 * handles it uses, and the constants it names. The handle tags stay those
 * of the full manifest, which the bundle was built against.
 */
export function shake(
  m: Manifest,
  uses: Record<string, Record<string, ExportUse>>,
  use: BundleUse,
): { manifest: Manifest; handleTags: Map<string, string> } {
  const widgets = new Set<string>();
  const handles = new Set<string>();
  const consts = new Set(use.consts);
  for (const [module, names] of use.exports) {
    const table = uses[module];
    if (!table) continue;
    for (const name of names) {
      const u = table[name];
      if (!u) continue;
      if ("widget" in u) widgets.add(u.widget);
      else if ("handle" in u) handles.add(u.handle);
      else u.consts.forEach((c) => consts.add(c));
    }
  }
  const types: Manifest["types"] = {};
  for (const [id, t] of Object.entries(m.types)) {
    types[id] = t.kind === "data" && t.consts ? ({ ...t, consts: t.consts.filter((c) => consts.has(c.name)) } as DataType) : t;
  }
  return {
    manifest: {
      ...m,
      widgets: m.widgets.filter((w) => widgets.has(w.id) || use.tags.has(tagOf(w))),
      handles: m.handles.filter((id) => handles.has(id)),
      types,
    },
    handleTags: handleTags(m),
  };
}

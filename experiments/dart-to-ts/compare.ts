// Diff the scraped Dart props (out/widgets.generated.json) against the
// hand-written TS wrapper interfaces in packages/solid-fuse/src/widgets/*.tsx.
//
//   bun compare.ts            # after `dart run bin/generate.dart`
//
// Matching is by name: FuseText → TextProps, FuseScrollView → ScrollViewProps.
import ts from "typescript";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const repo = join(import.meta.dir, "../..");
const widgetsDir = join(repo, "packages/solid-fuse/src/widgets");
const scraped: {
  class: string;
  tag: string | null;
  props: Record<string, string>;
  dynamicKeys: string[];
}[] = JSON.parse(readFileSync(join(import.meta.dir, "out/widgets.generated.json"), "utf8"));

// Collect every `interface XProps` with its own (non-inherited) members.
const handWritten = new Map<string, Map<string, string>>();
for (const file of readdirSync(widgetsDir).filter((f) => /\.tsx?$/.test(f))) {
  const src = ts.createSourceFile(file, readFileSync(join(widgetsDir, file), "utf8"), ts.ScriptTarget.Latest, true);
  src.forEachChild((n) => {
    if (ts.isInterfaceDeclaration(n) && n.name.text.endsWith("Props")) {
      const members = new Map<string, string>();
      for (const m of n.members) {
        if (ts.isPropertySignature(m) && m.name) {
          members.set(m.name.getText(src), m.type?.getText(src).replace(/\s+/g, " ") ?? "unknown");
        }
      }
      handWritten.set(n.name.text, members);
    }
  });
}

// Treat 'a' | 'b' and "b" | "a" as the same type.
const norm = (t: string) =>
  t.split("|").map((x) => x.trim().replace(/^'(.*)'$/, '"$1"')).sort().join(" | ");

let totals = { matched: 0, onlyDart: 0, onlyTs: 0 };
for (const w of scraped) {
  const iface = w.class.replace(/^_/, "").replace(/State$/, "").replace(/^Fuse/, "").replace(/Widget$/, "") + "Props";
  const ts_ = handWritten.get(iface);
  console.log(`\n## ${w.class} <${w.tag ?? "?"}> vs ${ts_ ? iface : `${iface} (not found)`}`);
  if (!ts_) continue;
  const dartKeys = new Set(Object.keys(w.props));
  for (const k of dartKeys) {
    if (ts_.has(k)) {
      totals.matched++;
      const a = w.props[k], b = ts_.get(k)!;
      if (norm(a) !== norm(b)) console.log(`  ~ ${k}: dart=${a}  ts=${b}`);
    } else {
      totals.onlyDart++;
      console.log(`  + ${k}: ${w.props[k]}   (read in Dart, missing in TS)`);
    }
  }
  for (const k of ts_.keys()) {
    if (!dartKeys.has(k)) {
      totals.onlyTs++;
      console.log(`  - ${k}: ${ts_.get(k)}   (in TS, not found by scraper)`);
    }
  }
  if (w.dynamicKeys.length) console.log(`  ? ${w.dynamicKeys.length} non-literal key read(s): ${w.dynamicKeys.slice(0, 3).join(", ")}…`);
}
console.log(`\nmatched=${totals.matched} onlyDart=${totals.onlyDart} onlyTs=${totals.onlyTs}`);

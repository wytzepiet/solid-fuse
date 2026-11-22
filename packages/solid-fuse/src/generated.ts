/**
 * Runtime support for the modules `fuse gen` writes. Not for app code.
 */

/**
 * Builds the wire value of a Dart constructor call: `$build("EdgeInsets.only",
 * [], [{ left: 8 }])` is `{ $: "EdgeInsets.only", left: 8 }`. Positional
 * arguments are stored under their Dart parameter names; an object after
 * them holds the named ones. The compile step folds calls with literal
 * arguments into the same value (cli/compile-plugin.ts).
 */
export function $build(tag: string, positional: readonly string[], args: readonly unknown[]): Record<string, unknown> {
  const value: Record<string, unknown> = { $: tag };
  const n = positional.length;
  for (let i = 0; i < n && i < args.length; i++) {
    if (args[i] !== undefined) value[positional[i]] = args[i];
  }
  const named = args[n];
  if (named != null && typeof named === "object") Object.assign(value, named);
  return value;
}

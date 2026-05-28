import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { Plugin, ViteDevServer } from "vite";
import {
  TraceMap,
  originalPositionFor,
  type SourceMapInput,
} from "@jridgewell/trace-mapping";

/**
 * Receives JS errors from the QuickJS runtime via POST /__fuse_error,
 * symbolicates the stack against Vite's module graph (for user code) and
 * the optimized-deps cache on disk (for `node_modules/.vite/deps/*`), and
 * prints to the terminal where `fuse dev` is running.
 *
 * `ssrFixStacktrace` is the obvious API but is a no-op for our HMR-style
 * URLs, so we walk frames manually and chain through nested bundles.
 */
export function fuseDevErrorPlugin(): Plugin {
  const cache = new Map<string, TraceMap | null>();

  return {
    name: "fuse:dev-error",
    configureServer(server) {
      server.middlewares.use("/__fuse_error", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        try {
          const { message, stack, causeStack } = JSON.parse(
            Buffer.concat(chunks).toString(),
          );
          // Prefer the original throw's stack when present — for Solid 2.0's
          // StatusError wrapping, that's the only one pointing at user code.
          const primary = await symbolicate(
            typeof causeStack === "string" && causeStack
              ? causeStack
              : typeof stack === "string"
                ? stack
                : "",
            server,
            cache,
          );
          process.stderr.write(
            `\n\x1b[31m[Fuse JS error]\x1b[0m ${message}\n${primary}\n\n`,
          );
        } catch (e) {
          process.stderr.write(`[Fuse dev-error-plugin] ${e}\n`);
        }
        res.statusCode = 204;
        res.end();
      });
    },
  };
}

const FRAME_RE = /^(\s*at\s+)(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/;

async function symbolicate(
  stack: string,
  server: ViteDevServer,
  cache: Map<string, TraceMap | null>,
): Promise<string> {
  const lines = await Promise.all(
    stack.split("\n").map((l) => symbolicateFrame(l, server, cache)),
  );
  return lines.join("\n");
}

async function symbolicateFrame(
  line: string,
  server: ViteDevServer,
  cache: Map<string, TraceMap | null>,
): Promise<string> {
  const m = FRAME_RE.exec(line);
  if (!m) return line;
  const [, prefix, fnName, url, lineStr, colStr] = m;
  let curUrl = url!;
  let curLine = Number(lineStr);
  let curCol = Number(colStr);
  let curName: string | undefined = fnName;

  for (let i = 0; i < 8; i++) {
    const map = await getMap(curUrl, server, cache);
    if (!map) break;
    const orig = originalPositionFor(map, { line: curLine, column: curCol });
    if (!orig || orig.source == null || orig.line == null) break;
    const nextUrl = resolveSource(curUrl, orig.source);
    // Stop when the source-map points back at itself — Vite's transform of
    // /src/Foo.tsx has `source: "Foo.tsx"` which resolves to /src/Foo.tsx,
    // and re-applying the map at the source position would yield garbage.
    if (nextUrl === curUrl) {
      curLine = orig.line;
      curCol = orig.column ?? 0;
      if (orig.name) curName = orig.name;
      break;
    }
    curUrl = nextUrl;
    curLine = orig.line;
    curCol = orig.column ?? 0;
    if (orig.name) curName = orig.name;
  }

  return `${prefix}${curName ?? "<anonymous>"} (${curUrl}:${curLine}:${curCol})`;
}

async function getMap(
  url: string,
  server: ViteDevServer,
  cache: Map<string, TraceMap | null>,
): Promise<TraceMap | null> {
  if (cache.has(url)) return cache.get(url)!;
  let map: TraceMap | null = null;

  // 1. Vite's module graph — covers `/src/*` and other transformed modules.
  try {
    const mod = await server.moduleGraph.getModuleByUrl(url, false);
    const rawMap = mod?.transformResult?.map;
    if (rawMap) map = new TraceMap(rawMap as unknown as SourceMapInput);
  } catch {
    /* fall through */
  }

  // 2. Filesystem — covers `/node_modules/.vite/deps/*` and `node_modules/*/dist/*`,
  //    which aren't in the module graph. URL maps to a file under projectRoot.
  if (!map) {
    const bare = url.split("?", 1)[0]!;
    if (bare.startsWith("/")) {
      const filePath = resolve(server.config.root, "." + bare + ".map");
      if (existsSync(filePath)) {
        try {
          map = new TraceMap(readFileSync(filePath, "utf8") as SourceMapInput);
        } catch {
          /* ignore */
        }
      }
    }
  }

  cache.set(url, map);
  return map;
}

function resolveSource(fromUrl: string, source: string): string {
  const bare = fromUrl.split("?", 1)[0]!;
  if (/^[a-z]+:\/\//i.test(source) || source.startsWith("/")) return source;
  try {
    return new URL(source, `http://x${bare}`).pathname;
  } catch {
    return source;
  }
}

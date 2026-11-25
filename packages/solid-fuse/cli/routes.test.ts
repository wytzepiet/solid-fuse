import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { emitRoutes, scanRoutes, type FileRoute } from "./routes";

function app(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "fuse-routes-"));
  for (const [file, source] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), source);
  }
  return dir;
}
const screen = "export default () => null;";
const table = (rs: FileRoute[]) => Object.fromEntries(rs.map((r) => [r.key, [r.path, r.in ?? null, ...(r.holder ? ["holds"] : [])]]));

describe("file routes", () => {
  test("addresses follow the files", () => {
    const rs = scanRoutes(
      app({
        "index.tsx": screen,
        "settings.tsx": screen,
        "users/index.tsx": screen,
        "users/[id].tsx": `${screen}\nexport const parse = (p) => ({ id: Number(p.id) });`,
        "users/[id]/posts.tsx": screen,
        "_helpers.tsx": "export const x = 1;",
        "users/_components/card.tsx": "export const x = 1;",
        "users/card.test.tsx": "",
      }),
    );
    expect(table(rs)).toEqual({
      "/index": ["/", null],
      "/settings": ["/settings", null],
      "/users/index": ["/users", null],
      // No users.tsx: users/ isn't held, its pages open on the app's stack.
      "/users/[id]": ["/users/:id", null],
      // [id]/ has no index: [id].tsx doesn't hold it.
      "/users/[id]/posts": ["/users/:id/posts", null],
    });
    expect(rs.find((r) => r.key === "/users/[id]")!.parse).toBe(true);
  });

  test("x.tsx next to x/ with an index holds it, and shares its address", () => {
    const rs = scanRoutes(
      app({
        "index.tsx": screen,
        "share.tsx": `${screen}\nexport const page = (c) => c;`,
        "share/index.tsx": screen,
        "share/contact.tsx": screen,
        "share/deep/more.tsx": screen,
      }),
    );
    expect(table(rs)).toEqual({
      "/index": ["/", null],
      "/share": ["/share", null, "holds"],
      "/share/index": ["/share", "/share"],
      "/share/contact": ["/share/contact", "/share"],
      "/share/deep/more": ["/share/deep/more", "/share"],
    });
    expect(rs.find((r) => r.key === "/share")!.page).toBe(true);
  });

  test("groups stay out of the address; tabs are a holder with stacks under it", () => {
    const rs = scanRoutes(
      app({
        "(tabs).tsx": screen,
        "(tabs)/index.tsx": screen,
        "(tabs)/search.tsx": screen,
        "(tabs)/search/filters.tsx": screen,
        "(tabs)/video/[id].tsx": screen,
        "settings.tsx": screen,
        "about@app.tsx": screen,
        "(tabs)/me@app.tsx": screen,
        "(tabs)/share.tsx": screen,
        "(tabs)/share/index.tsx": screen,
        "(tabs)/contact@share.tsx": screen,
      }),
    );
    expect(table(rs)).toEqual({
      "/(tabs)": ["/", null, "holds"],
      "/(tabs)/index": ["/", "/(tabs)"],
      "/(tabs)/search": ["/search", "/(tabs)"],
      // No search/index: filters opens where search does (and its stack picks the search tab).
      "/(tabs)/search/filters": ["/search/filters", "/(tabs)"],
      "/(tabs)/video/[id]": ["/video/:id", "/(tabs)"],
      "/settings": ["/settings", null],
      "/about@app": ["/about", null],
      "/(tabs)/me@app": ["/me", null],
      "/(tabs)/share": ["/share", "/(tabs)", "holds"],
      "/(tabs)/share/index": ["/share", "/(tabs)/share"],
      "/(tabs)/contact@share": ["/contact", "/(tabs)/share"],
    });
  });

  test("files that don't make an app", () => {
    expect(() => scanRoutes(app({ "a.tsx": screen }))).toThrow("no page at /");
    expect(() => scanRoutes(app({ "index.tsx": "export const x = 1;" }))).toThrow("no default export");
    expect(() => scanRoutes(app({ "index.tsx": screen, "(x)/index.tsx": screen }))).toThrow("all at /");
    expect(() => scanRoutes(app({ "index.tsx": screen, "a.tsx": screen, "a/index.tsx": screen, "a/b.tsx": screen, "c.tsx": screen, "c/index.tsx": screen, "c/b.tsx": screen, "x@b.tsx": screen }))).toThrow("names no page");
    expect(() => scanRoutes(app({ "index.tsx": screen, "a/s.tsx": screen, "a/s/index.tsx": screen, "b/s.tsx": screen, "b/s/index.tsx": screen, "x@s.tsx": screen }))).toThrow("could be");
  });

  test("emits route() values, typed addresses and FileRoutes", () => {
    const rs = scanRoutes(
      app({
        "index.tsx": screen,
        "users/[id].tsx": `${screen}\nexport const parse = (p) => ({ id: Number(p.id) });`,
        "share.tsx": screen,
        "share/index.tsx": screen,
      }),
    );
    const code = emitRoutes(rs, (f) => `../src/app/${f.replace(/\.tsx$/, "")}`, "../src/app");
    expect(code).toContain('import App from "../src/app";');
    expect(code).toContain('const r1 = route({ path: "/share", get component() { return m1.default; } });');
    expect(code).toContain('const r2 = route({ path: "/share", in: r1, get component() { return m2.default; } });');
    expect(code).toContain('route({ path: "/users/:id", get parse() { return m3.parse; }, get component() { return m3.default; } })');
    expect(code).toContain('type Addresses = "/" | "/share" | `/users/${string}`;');
    expect(code).toContain("return <App />;");
    expect(emitRoutes(rs, (f) => f)).toContain("return <Navigator />;");
  });
});

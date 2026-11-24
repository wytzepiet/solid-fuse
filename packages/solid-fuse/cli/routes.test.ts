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
const table = (rs: FileRoute[]) =>
  Object.fromEntries(rs.map((r) => [r.key, [r.path ?? null, r.parent ?? null, ...(r.tabs ? [r.tabs] : []), ...(r.tab ? ["tab"] : [])]]));

describe("file routes", () => {
  test("paths and parents follow the folders", () => {
    const rs = scanRoutes(
      app({
        "index.tsx": screen,
        "settings.tsx": screen,
        "users/index.tsx": screen,
        "users/[id].tsx": `${screen}\nexport const parse = { id: Number };`,
        "users/[id]/posts.tsx": screen,
        "about/team.tsx": screen,
        "_helpers.tsx": "export const x = 1;",
        "users/card.test.tsx": "",
      }),
    );
    expect(table(rs)).toEqual({
      "/": ["/", null],
      "/settings": ["/settings", "/"],
      "/users": ["/users", "/"],
      "/users/[id]": ["/users/:id", "/users"],
      "/users/[id]/posts": ["/users/:id/posts", "/users/[id]"],
      // No index in about/: the route above it.
      "/about/team": ["/about/team", "/"],
    });
    expect(rs.find((r) => r.key === "/users/[id]")!.parse).toBe(true);
  });

  test("a layout holds its folder; tabs are the names it lists", () => {
    const rs = scanRoutes(
      app({
        "index.tsx": screen,
        "share/_layout.tsx": `${screen}\nexport const page = (c) => c;`,
        "share/index.tsx": screen,
        "share/contact.tsx": screen,
        "tabs/_layout.tsx": `${screen}\nexport const tabs = ["feed", "profile"];`,
        "tabs/feed/index.tsx": screen,
        "tabs/feed/post/[id].tsx": screen,
        "tabs/profile.tsx": screen,
        "tabs/video/[id].tsx": screen,
      }),
    );
    expect(table(rs)).toEqual({
      "/": ["/", null],
      "/share/_layout": ["/share", "/"],
      "/share": ["/share", "/share/_layout"],
      "/share/contact": ["/share/contact", "/share/_layout"],
      "/tabs/_layout": ["/tabs", "/", ["/tabs/feed", "/tabs/profile"]],
      "/tabs/feed": ["/tabs/feed", null, "tab"],
      "/tabs/feed/post/[id]": ["/tabs/feed/post/:id", "/tabs/feed"],
      "/tabs/profile": ["/tabs/profile", null, "tab"],
      // Not in a tab: opens in the visible one.
      "/tabs/video/[id]": ["/tabs/video/:id", "/tabs/_layout"],
    });
    expect(rs.find((r) => r.key === "/share/_layout")!.page).toBe(true);
  });

  test("groups stay out of the path", () => {
    const rs = scanRoutes(
      app({
        "(tabs)/_layout.tsx": `${screen}\nexport const tabs = ["home", "me"];`,
        "(tabs)/home.tsx": screen,
        "(tabs)/me.tsx": screen,
        "(auth)/_layout.tsx": screen,
        "(auth)/login.tsx": screen,
        "settings.tsx": screen,
      }),
    );
    expect(table(rs)).toEqual({
      // The tabs open at /.
      "/(tabs)/_layout": ["/", null, ["/(tabs)/home", "/(tabs)/me"]],
      "/(tabs)/home": ["/home", null, "tab"],
      "/(tabs)/me": ["/me", null, "tab"],
      // A stack group with no index has no link of its own.
      "/(auth)/_layout": [null, "/(tabs)/_layout"],
      "/(auth)/login": ["/login", "/(auth)/_layout"],
      "/settings": ["/settings", "/(tabs)/_layout"],
    });
  });

  test("files that don't make an app", () => {
    expect(() => scanRoutes(app({ "a.tsx": screen }))).toThrow("no route at /");
    expect(() => scanRoutes(app({ "index.tsx": "export const x = 1;" }))).toThrow("no default export");
    expect(() => scanRoutes(app({ "index.tsx": screen, "(x)/index.tsx": screen }))).toThrow("all at /");
    expect(() => scanRoutes(app({ "index.tsx": screen, "t/_layout.tsx": `${screen}\nexport const tabs = ["a"];` }))).toThrow('tab "a"');
  });

  test("emits route() values, typed links and Routes", () => {
    const rs = scanRoutes(
      app({
        "index.tsx": screen,
        "users/[id].tsx": `${screen}\nexport const parse = { id: Number };`,
        "t/_layout.tsx": `${screen}\nexport const tabs = ["a"];`,
        "t/a.tsx": screen,
      }),
    );
    const code = emitRoutes(rs, (f) => `../src/app/${f.replace(/\.tsx$/, "")}`);
    expect(code).toContain('import * as m1 from "../src/app/t/_layout";');
    expect(code).toContain('const r2 = route({ path: "/t/a", component: m2.default });');
    expect(code).toContain('const r1 = route({ path: "/t", parent: r0, navigator: tabs(r2), component: m1.default });');
    expect(code).toContain('route({ path: "/users/:id", parent: r0, parse: m3.parse, component: m3.default })');
    expect(code.indexOf("const r2 =")).toBeLessThan(code.indexOf("const r1 ="));
    expect(code).toContain('type Links = "/" | "/t" | "/t/a" | `/users/${string}`;');
    expect(code).toContain("initialPage={r0}");
  });
});

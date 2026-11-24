import { beforeEach, describe, expect, test } from "bun:test";
import { createRoot, flush } from "solid-js";
import { createNavigationController, type NavigationController } from "./navigation-controller";
import { _resetRoutes, linkTo, matchLink, route, tabs } from "./routes";

const view = () => null as any;

function nav(initial?: Parameters<typeof createNavigationController>[0]["initialPage"]) {
  let n!: NavigationController;
  createRoot(() => {
    n = createNavigationController({ initialPage: initial });
  });
  return n;
}
const keys = (n: NavigationController) => n.pages().map((e) => e.route?.key ?? "page");

beforeEach(() => _resetRoutes());

describe("routes", () => {
  test("full paths join the parents'", () => {
    const Users = route({ path: "/users", component: view });
    const User = route({ path: ":id", parent: Users, component: (_: { id: string }) => null as any });
    expect(User.path).toBe("/users/:id");
    expect(linkTo(User, { id: "4 2" })).toBe("/users/4%202");
  });

  test("a link matches static segments before params, and parses", () => {
    const Users = route({ path: "/users", component: view });
    const User = route({ path: ":id", parent: Users, parse: { id: Number }, component: (_: { id: number }) => null as any });
    const Me = route({ path: "me", parent: Users, component: view });
    expect(matchLink("/users/me")?.route).toBe(Me);
    const m = matchLink("/users/42?tab=posts")!;
    expect(m.route).toBe(User);
    expect(m.params).toEqual({ id: 42, tab: "posts" });
    expect(matchLink("app://host/users/7")?.params).toEqual({ id: 7 });
    expect(matchLink("/nope")).toBeUndefined();
  });

  test("push by route goes on this stack, typed params become props", () => {
    let got: unknown;
    const Profile = route({ component: (p: { id: string }) => ((got = p.id), null as any) });
    const n = nav(() => null as any);
    n.push(Profile, { id: "7" });
    flush();
    expect(n.stackDepth()).toBe(2);
    n.pages()[1]!.config.child();
    expect(got).toBe("7");
  });

  test("push goes on top of the parent, opening it first when missing", () => {
    const Feed = route({ path: "/feed", component: view });
    const Post = route({ path: "post/:id", parent: Feed, component: (_: { id: string }) => null as any });
    const n = nav(() => null as any);
    n.push(Post, { id: "1" });
    flush();
    expect(keys(n)).toEqual(["page", "/feed", "/feed/post/:id"]);
    n.push(Post, { id: "2" });
    flush();
    expect(keys(n)).toEqual(["page", "/feed", "/feed/post/:id", "/feed/post/:id"]);
  });

  test("a layout gets its own navigator with its first page; its routes push inside", () => {
    const Share = route({ path: "/share", navigator: "stack", component: view });
    route({ path: "", parent: Share, name: "share-home", component: view });
    const Contact = route({ path: "contact", parent: Share, component: view });
    const n = nav(() => null as any);
    n.push(Share);
    flush();
    const inner = n.pages()[1]!.inner!;
    expect(keys(inner)).toEqual(["/share#index"]);
    inner.push(Contact);
    flush();
    expect(keys(inner)).toEqual(["/share#index", "/share/contact"]);
    // From outside the layout, a child still lands inside it.
    n.push(Contact);
    flush();
    expect(n.stackDepth()).toBe(2);
    expect(inner.stackDepth()).toBe(3);
    // Popping the layout's last page closes the layout.
    inner.popUntil();
    inner.pop("done");
    flush();
    expect(n.stackDepth()).toBe(1);
  });

  test("go builds the stack from the link, under the first page", () => {
    const Home = route({ path: "/", component: view });
    const Share = route({ path: "/share", navigator: "stack", component: view });
    route({ path: "", parent: Share, component: view });
    route({ path: "contact", parent: Share, component: view });
    const Other = route({ path: "/other", component: view });
    const n = nav(Home);
    n.push(Other);
    flush();
    n.go("/share/contact");
    flush();
    expect(keys(n)).toEqual(["/", "/share"]);
    expect(keys(n.pages()[1]!.inner!)).toEqual(["/share#index", "/share/contact"]);
    n.go("/");
    flush();
    expect(keys(n)).toEqual(["/"]);
  });

  test("save and restore", () => {
    const Feed = route({ path: "/feed", component: view });
    const Post = route({ path: ":id", parent: Feed, component: (_: { id: string }) => null as any });
    const Share = route({ path: "/share", navigator: "stack", component: view });
    route({ path: "", parent: Share, component: view });
    const n = nav(() => null as any);
    n.push(Post, { id: "3" });
    n.push(Share);
    n.push(() => null as any); // a closure: not saved, nor what's above it
    flush();
    const saved = n.save();
    expect(saved).toEqual([{ r: null }, { r: "/feed" }, { r: "/feed/:id", p: { id: "3" } }, { r: "/share", i: [{ r: "/share#index" }] }]);
    const m = nav(() => null as any);
    m.restore(JSON.parse(JSON.stringify(saved)));
    flush();
    expect(keys(m)).toEqual(["page", "/feed", "/feed/:id", "/share"]);
    expect(m.pages()[2]!.params).toEqual({ id: "3" });
    expect(keys(m.pages()[3]!.inner!)).toEqual(["/share#index"]);
  });

  test("removing a layout resolves pending pushes inside it", async () => {
    const Share = route({ path: "/share", navigator: "stack", component: view });
    const Pick = route({ parent: Share, name: "pick", component: view });
    const n = nav(() => null as any);
    n.push(Share);
    flush();
    const p = n.pages()[1]!.inner!.push(Pick);
    flush();
    n.pop();
    await expect(p).resolves.toBeNull();
  });

  test("tabs: a stack per tab; pushes go to the right one; links pick the tab", () => {
    const Feed = route({ path: "feed", component: view });
    const Profile = route({ path: "profile", component: view });
    const Main = route({ path: "/", navigator: tabs(Feed, Profile), component: view });
    const Post = route({ path: "post/:id", parent: Feed, component: (_: { id: string }) => null as any });
    const Video = route({ path: "video/:id", parent: Main, component: (_: { id: string }) => null as any });
    expect(Post.path).toBe("/feed/post/:id");
    const n = nav(Main);
    flush();
    const t = n.pages()[0]!.tabs!;
    const [feed, profile] = t.navigators as [NavigationController, NavigationController];
    expect(keys(feed)).toEqual(["/feed"]);
    t.select(1);
    // A shared page opens in the visible tab.
    profile.push(Video, { id: "1" });
    flush();
    expect(keys(profile)).toEqual(["/profile", "/video/:id"]);
    // A page of another tab goes there, and shows it.
    profile.push(Post, { id: "2" });
    flush();
    expect(keys(feed)).toEqual(["/feed", "/feed/post/:id"]);
    expect(t.index()).toBe(0);
    // The visible tab again pops it to its first page.
    t.select(0);
    flush();
    expect(keys(feed)).toEqual(["/feed"]);
    // A link selects the tab and builds its stack.
    n.go("/profile");
    flush();
    expect(t.index()).toBe(1);
    n.go("/feed/post/9");
    flush();
    expect(t.index()).toBe(0);
    expect(keys(feed)).toEqual(["/feed", "/feed/post/:id"]);
    // Saved and back.
    const saved = n.save();
    const m = nav(Main);
    m.restore(saved);
    flush();
    const mt = m.pages()[0]!.tabs!;
    expect(mt.index()).toBe(0);
    expect(keys(mt.navigators[0]!)).toEqual(["/feed", "/feed/post/:id"]);
    // The link to /profile showed just the profile tab's first page.
    expect(keys(mt.navigators[1]!)).toEqual(["/profile"]);
  });
});

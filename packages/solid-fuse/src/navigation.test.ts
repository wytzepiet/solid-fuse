import { beforeEach, describe, expect, test } from "bun:test";
import { createRoot, flush } from "solid-js";
import {
  _inPage,
  _resetNavigation,
  _restoreNavigation,
  createStack,
  saveNavigation,
  useNav,
  usePage,
  type MountedStack,
  type PageEntry,
} from "./navigation";
import { _resetRoutes, addressOf, matchAddress, route, type Route } from "./routes";

const view = () => null as any;
const tick = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  flush();
};

/** Mount a stack of a page (the app's without one), as `<Navigator index>` does. */
function mount(e: PageEntry | undefined, index?: string): MountedStack {
  let s!: MountedStack;
  createRoot(() => {
    s = _inPage(e, () => createStack({ index }));
  });
  return s;
}
const paths = (s: { pages(): PageEntry[] }) => s.pages().map((e) => e.address ?? "inline");

let R: Record<string, Route>;
beforeEach(() => {
  _resetRoutes();
  _resetNavigation();
  const Tabs = route({ path: "/", component: view });
  const Share = route({ path: "/share", component: view });
  R = {
    Tabs,
    Home: route({ path: "/", in: Tabs, component: view }),
    Search: route({ path: "/search", in: Tabs, component: view }),
    Filters: route({ path: "/search/filters", in: Tabs, component: view }),
    Playlist: route({ path: "/search/p/:id", in: Tabs, parse: (p) => ({ id: Number(p.id) }), component: view }),
    Edit: route({ path: "/search/p/:id/edit", in: Tabs, parse: (p) => ({ id: Number(p.id) }), component: view }),
    Video: route({ path: "/video/:id", in: Tabs, parse: (p) => ({ id: Number(p.id) }), component: view }),
    Settings: route({ path: "/settings", component: view }),
    Dms: route({ path: "/dms", component: view }),
    Share,
    ShareStart: route({ path: "/share", in: Share, component: view }),
    Contact: route({ path: "/share/contact", in: Share, component: view }),
  };
});

/** The app with its tabs mounted. */
function app() {
  const root = mount(undefined);
  const tabs = root.pages()[0]!;
  const home = mount(tabs, "/");
  const search = mount(tabs, "/search");
  return { root, tabs, home, search };
}

describe("addresses", () => {
  test("a holder and its first page share an address; the page wins", () => {
    expect(matchAddress("/")?.route).toBe(R.Home);
    expect(matchAddress("/share")?.route).toBe(R.ShareStart);
    expect(matchAddress("/video/7")?.params).toEqual({ id: 7 });
    expect(matchAddress("app://host/search/p/2?x=1")?.params).toEqual({ id: 2, x: "1" });
    expect(addressOf(R.Edit, { id: 4 })).toBe("/search/p/4/edit");
    // Other plain params go in the query, so the address opens the same page.
    expect(addressOf(R.Video, { id: 7, from: "feed", n: 2, f: () => {} } as any)).toBe("/video/7?from=feed&n=2");
    expect(matchAddress("/video/7?from=feed&n=2")?.params).toEqual({ id: 7, from: "feed", n: "2" });
  });

  test("a parse that throws doesn't match: the next page gets a go", () => {
    const num = (p: Record<string, string>) => {
      if (!/^\d+$/.test(p.x!)) throw new Error("not a number");
      return { x: Number(p.x) };
    };
    route({ path: "/u/:x", parse: num, component: () => null as any });
    const ByName = route({ path: "/u/:x", component: () => null as any });
    route({ path: "/n/:x", parse: num, component: () => null as any });
    // Declared later, so it would win a tie; its parse sends ada on.
    const late = route({ path: "/u/:x", parse: num, component: () => null as any });
    expect(matchAddress("/u/12")).toEqual({ route: late, params: { x: 12 } });
    expect(matchAddress("/u/ada")?.route).toBe(ByName);
    expect(matchAddress("/n/ada")).toBeUndefined();
  });
});

describe("where pages open", () => {
  test("the app's stack starts on the page at /, which holds the tabs", () => {
    const { root, home, search } = app();
    expect(paths(root)).toEqual(["/"]);
    expect(root.pages()[0]!.route).toBe(R.Tabs);
    expect(paths(home)).toEqual(["/"]);
    expect(paths(search)).toEqual(["/search"]);
    expect(home.takesBack()).toBe(true);
    expect(search.takesBack()).toBe(false);
  });

  test("a page next to the tabs opens on the tab in front", () => {
    const { home, search } = app();
    useNav().push(R.Video, { id: 1 });
    expect(paths(home)).toEqual(["/", "/video/1"]);
    expect(paths(search)).toEqual(["/search"]);
  });

  test("a page under a tab's first page opens on that tab, and shows it", () => {
    const { home, search } = app();
    useNav().push("/search/filters");
    expect(paths(search)).toEqual(["/search", "/search/filters"]);
    expect(search.takesBack()).toBe(true);
    expect(home.takesBack()).toBe(false);
    // From the search tab, a video stays there.
    const nav = navOf(search.pages()[1]!);
    nav.push(R.Video, { id: 2 });
    expect(paths(search)).toEqual(["/search", "/search/filters", "/video/2"]);
  });

  test("pushing a tab's first page shows that tab", () => {
    const { search } = app();
    useNav().push(R.Search);
    expect(search.takesBack()).toBe(true);
    expect(paths(search)).toEqual(["/search"]);
  });

  test("nothing holds settings: it opens on the app's stack, over the tabs", () => {
    const { root, home } = app();
    useNav().push(R.Settings);
    expect(paths(root)).toEqual(["/", "/settings"]);
    expect(paths(home)).toEqual(["/"]);
  });

  test("a covered tab doesn't take the push: it goes over the cover", () => {
    const { root, home } = app();
    useNav().push(R.Dms);
    const dms = root.pages()[1]!;
    navOf(dms).push(R.Video, { id: 3 });
    expect(paths(root)).toEqual(["/", "/dms", "/video/3"]);
    expect(paths(home)).toEqual(["/"]);
  });

  test("a holder that isn't open opens first; the page waits for its stack to mount", async () => {
    const { root } = app();
    let done = false;
    useNav()
      .push(R.Contact)
      .then(() => (done = true));
    expect(paths(root)).toEqual(["/", "/share"]);
    const share = mount(root.pages()[1]!);
    await tick();
    expect(paths(share)).toEqual(["/share", "/share/contact"]);
    navOf(share.pages()[1]!).pop("picked");
    await tick();
    expect(done).toBe(true);
  });

  test("pop on a stack's first page closes the page holding it", async () => {
    const { root } = app();
    useNav().push(R.Share);
    const share = mount(root.pages()[1]!);
    expect(paths(share)).toEqual(["/share"]);
    navOf(share.pages()[0]!).pop();
    expect(paths(root)).toEqual(["/"]);
    // What it held stays, so it can draw on its way out.
    expect(paths(share)).toEqual(["/share"]);
  });

  test("inline pages go on the stack you're on", async () => {
    const { home } = app();
    let result: unknown;
    navOf(home.pages()[0]!)
      .push(() => null as any)
      .then((r) => (result = r));
    expect(paths(home)).toEqual(["/", "inline"]);
    navOf(home.pages()[1]!).pop(5);
    await tick();
    expect(result).toBe(5);
  });

  test("an explicit stack takes the push as is", () => {
    const { root, home } = app();
    navOf(home.pages()[0]!).app.push(R.Video, { id: 9 });
    expect(paths(root)).toEqual(["/", "/video/9"]);
  });
});

describe("links", () => {
  test("a link opens the pages leading up to it, and resets the stacks on its way", () => {
    const { root, home, search } = app();
    useNav().push(R.Settings);
    useNav().push(R.Video, { id: 1 }); // over settings
    useNav().go("/search/p/42/edit");
    expect(paths(root)).toEqual(["/"]);
    expect(paths(search)).toEqual(["/search", "/search/p/42", "/search/p/42/edit"]);
    expect(search.pages()[2]!.params).toEqual({ id: 42 });
    expect(search.takesBack()).toBe(true);
    // Another tab keeps its pages.
    expect(paths(home)).toEqual(["/"]);
  });

  test("a link into a holder that isn't open waits for its stack", async () => {
    const { root } = app();
    useNav().go("/share/contact");
    expect(paths(root)).toEqual(["/", "/share"]);
    const share = mount(root.pages()[1]!);
    await tick();
    expect(paths(share)).toEqual(["/share", "/share/contact"]);
    // Again: nothing doubles up.
    useNav().go("/share/contact");
    expect(paths(root)).toEqual(["/", "/share"]);
    expect(paths(share)).toEqual(["/share", "/share/contact"]);
  });

  test("a link waits until the stack it needs mounts (logged out)", async () => {
    // The app hasn't drawn its stack yet.
    useNav().go("/video/5");
    await tick();
    const { home } = app();
    await tick();
    expect(paths(home)).toEqual(["/", "/video/5"]);
  });
});

describe("show", () => {
  test("showing the tab in front again pops it to its first page", () => {
    const { tabs, search } = app();
    useNav().push("/search/filters");
    const page = pageOf(tabs);
    page.show("/search");
    expect(paths(search)).toEqual(["/search"]);
    page.show("/");
    expect(page.active()).toBe("/");
  });
});

describe("restore", () => {
  test("the tree comes back as it was", () => {
    const first = app();
    useNav().push("/search/filters");
    useNav().push(R.Settings);
    const saved = saveNavigation();
    expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
    _resetNavigation();
    _restoreNavigation(saved);
    const { root, home, search } = app();
    expect(paths(root)).toEqual(["/", "/settings"]);
    expect(paths(search)).toEqual(["/search", "/search/filters"]);
    expect(paths(home)).toEqual(["/"]);
    expect(search.takesBack()).toBe(true);
    expect(first.root).not.toBe(root);
  });
});

function navOf(e: PageEntry) {
  return _inPage(e, useNav);
}
function pageOf(e: PageEntry) {
  return _inPage(e, usePage);
}

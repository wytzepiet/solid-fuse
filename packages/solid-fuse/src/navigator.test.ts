import { describe, expect, mock, test } from "bun:test";
import { createRoot, flush } from "solid-js";
import {
  createNavigationController,
  type NavigationController,
  type PageConfig,
} from "./navigation-controller";

function page(name?: string): PageConfig {
  return { type: "materialPage", child: () => null, props: { name } };
}

function withController(
  fn: (nav: NavigationController, dispose: () => void) => void | Promise<void>,
) {
  return new Promise<void>((resolve, reject) => {
    createRoot((dispose) => {
      const nav = createNavigationController({ initialPage: page("root") });
      Promise.resolve(fn(nav, dispose)).then(resolve).catch(reject);
    });
  });
}

describe("NavigationController", () => {
  test("pop() on single-entry stack is a no-op", async () => {
    await withController(async (nav) => {
      const warn = mock(() => {});
      const orig = console.warn;
      console.warn = warn;
      try {
        nav.pop("ignored");
        expect(nav.stackDepth()).toBe(1);
        expect(warn).toHaveBeenCalledTimes(1);
      } finally {
        console.warn = orig;
      }
    });
  });

  test("popUntil('missing') is a no-op with warn", async () => {
    await withController(async (nav) => {
      nav.push(page("a"));
      nav.push(page("b"));
      flush();
      expect(nav.stackDepth()).toBe(3);

      const warn = mock(() => {});
      const orig = console.warn;
      console.warn = warn;
      try {
        nav.popUntil("does-not-exist");
        expect(nav.stackDepth()).toBe(3);
        expect(warn).toHaveBeenCalledTimes(1);
      } finally {
        console.warn = orig;
      }
    });
  });

  test("popUntil() with no arg pops to root and resolves dropped with null", async () => {
    await withController(async (nav) => {
      const a = nav.push(page("a"));
      const b = nav.push(page("b"));
      flush();
      nav.popUntil();
      expect(nav.stackDepth()).toBe(1);
      await expect(a).resolves.toBeNull();
      await expect(b).resolves.toBeNull();
    });
  });

  test("push then pop(result) resolves with result", async () => {
    await withController(async (nav) => {
      const p = nav.push<string>(page("a"));
      flush();
      nav.pop("hello");
      await expect(p).resolves.toBe("hello");
    });
  });

  test("push then onDidRemovePage resolves with null", async () => {
    await withController(async (nav) => {
      const p = nav.push(page("a"));
      flush();
      const top = nav.pages()[nav.pages().length - 1]!;
      nav.onDidRemovePage(top.id);
      await expect(p).resolves.toBeNull();
    });
  });

  test("onDidRemovePage(staleId) is a no-op", async () => {
    await withController(async (nav) => {
      expect(() => nav.onDidRemovePage(99999)).not.toThrow();
      expect(nav.stackDepth()).toBe(1);
    });
  });

  test("replaceAll([a,b]) returns 2 promises, old pending resolve null", async () => {
    await withController(async (nav) => {
      const old = nav.push(page("old"));
      flush();
      const promises = nav.replaceAll([page("a"), page("b")]);
      expect(promises).toHaveLength(2);
      await expect(old).resolves.toBeNull();
      expect(nav.stackDepth()).toBe(2);

      flush();
      nav.pop("from-b");
      await expect(promises[1]).resolves.toBe("from-b");
    });
  });

  test("replaceAll([]) is a no-op with warn", async () => {
    await withController(async (nav) => {
      const pending = nav.push(page("a"));
      flush();
      const warn = mock(() => {});
      const orig = console.warn;
      console.warn = warn;
      try {
        const result = nav.replaceAll([]);
        expect(result).toEqual([]);
        expect(nav.stackDepth()).toBe(2);
        expect(warn).toHaveBeenCalledTimes(1);
      } finally {
        console.warn = orig;
      }
      // pending should still be unresolved — settle it so the test exits
      flush();
      nav.pop("settled");
      await expect(pending).resolves.toBe("settled");
    });
  });

  test("owner disposal resolves pending pushes with null", async () => {
    let nav!: NavigationController;
    let dispose!: () => void;
    createRoot((d) => {
      dispose = d;
      nav = createNavigationController({ initialPage: page("root") });
    });
    const a = nav.push(page("a"));
    const b = nav.push(page("b"));
    flush();
    dispose();
    await expect(a).resolves.toBeNull();
    await expect(b).resolves.toBeNull();
  });
});

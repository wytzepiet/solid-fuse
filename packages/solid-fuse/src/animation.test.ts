import { beforeEach, describe, expect, test } from "bun:test";
import { createRoot, createSignal, flush } from "solid-js";
import { createElapsed, createSpring, lerpColor, spring, springCoefficients } from "./animation";

// A frame clock the test drives: frame(ms) runs what was queued.
let queue = new Map<number, (t: number) => void>();
let nextId = 1;
let now = 0;
beforeEach(() => {
  queue = new Map();
  now = 0;
  globalThis.requestAnimationFrame = (cb) => {
    queue.set(nextId, cb);
    return nextId++;
  };
  globalThis.cancelAnimationFrame = (id) => void queue.delete(id);
});
function frame(ms = 1000 / 60) {
  now += ms;
  const run = queue;
  queue = new Map();
  for (const cb of run.values()) cb(now);
  flush();
}
const frames = (n: number, ms?: number) => {
  for (let i = 0; i < n; i++) frame(ms);
};

describe("spring", () => {
  test("the same motion at 60 Hz, 120 Hz and with a dropped frame", () => {
    const step = spring({ duration: 0.5, bounce: 0.3 });
    const run = (dts: number[]) => dts.reduce((s, dt) => step(s, 100, dt) ?? { value: 100, velocity: 0 }, { value: 0, velocity: 0 });
    const at60 = run(Array(15).fill(1 / 60));
    const at120 = run(Array(30).fill(1 / 120));
    const dropped = run([...Array(13).fill(1 / 60), 2 / 60]);
    expect(at120.value).toBeCloseTo(at60.value, 9);
    expect(dropped.value).toBeCloseTo(at60.value, 9);
  });

  test("bounce 0 never overshoots; bounce 0.3 does", () => {
    const peak = (bounce: number) => {
      const step = spring({ bounce });
      let s = { value: 0, velocity: 0 };
      let max = 0;
      for (let i = 0; i < 120; i++) {
        const n = step(s, 1, 1 / 60);
        if (!n) break;
        s = n;
        max = Math.max(max, s.value);
      }
      return max;
    };
    expect(peak(0)).toBeLessThanOrEqual(1);
    expect(peak(0.3)).toBeCloseTo(1 + Math.exp(-Math.PI * 0.7 / Math.sqrt(1 - 0.49)), 2); // damping ratio 0.7
  });

  test("duration and bounce map like SwiftUI's", () => {
    const { stiffness, damping } = springCoefficients({ duration: 0.5, bounce: 0 });
    expect(stiffness).toBeCloseTo((2 * Math.PI / 0.5) ** 2);
    expect(damping).toBeCloseTo(2 * Math.sqrt(stiffness)); // critically damped
  });
});

describe("createSpring", () => {
  test("set moves it there, settles exactly, then stops ticking", async () => {
    await createRoot(async (dispose) => {
      const [x, setX] = createSpring(0);
      const done = setX(100);
      frame();
      expect(x()).toBeGreaterThan(0);
      expect(x()).toBeLessThan(100);
      frames(120);
      expect(await done).toBe("settled");
      expect(x()).toBe(100);
      expect(queue.size).toBe(0);
      dispose();
    });
  });

  test("a new target interrupts and keeps the velocity", async () => {
    await createRoot(async (dispose) => {
      const [x, setX] = createSpring(0);
      const first = setX(100);
      frames(5);
      const before = x();
      const second = setX(0);
      expect(await first).toBe("interrupted");
      frame();
      // Still moving up for a moment: it carried its speed.
      expect(x()).toBeGreaterThan(before);
      frames(120);
      expect(await second).toBe("settled");
      expect(x()).toBe(0);
      dispose();
    });
  });

  test("follows a signal", () => {
    createRoot((dispose) => {
      const [pressed, setPressed] = createSignal(false);
      const [scale] = createSpring(() => (pressed() ? 1.2 : 1));
      flush();
      expect(scale()).toBe(1);
      expect(queue.size).toBe(0);
      setPressed(true);
      flush();
      frames(3);
      expect(scale()).toBeGreaterThan(1);
      frames(120);
      expect(scale()).toBe(1.2);
      dispose();
    });
  });

  test("from: an entrance on mount", () => {
    createRoot((dispose) => {
      const [t] = createSpring(1, { from: 0 });
      expect(t()).toBe(0);
      frames(120);
      expect(t()).toBe(1);
      dispose();
    });
  });

  test("instant jumps", async () => {
    await createRoot(async (dispose) => {
      const [x, setX] = createSpring(0);
      expect(await setX(5, { instant: true })).toBe("settled");
      expect(x()).toBe(5);
      dispose();
    });
  });

  test("disposing its owner stops it", () => {
    createRoot((dispose) => {
      const [, setX] = createSpring(0);
      setX(100);
      dispose();
    });
    expect(queue.size).toBe(0);
  });
});

test("createElapsed counts milliseconds while its owner lives", () => {
  createRoot((dispose) => {
    const elapsed = createElapsed();
    frame(10);
    frames(3, 20);
    expect(elapsed()).toBe(60);
    dispose();
    expect(queue.size).toBe(0);
  });
});

describe("lerpColor", () => {
  test("ends are the colors", () => {
    expect(lerpColor(0, "#ff0000", "#0000ff")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(lerpColor(1, "#ff0000", { r: 0, g: 0, b: 255, a: 0.5 })).toEqual({ r: 0, g: 0, b: 255, a: 0.5 });
  });

  test("the middle of black and white is perceptual gray", () => {
    const mid = lerpColor(0.5, "#000", "#fff");
    expect(mid.r).toBe(mid.g);
    expect(mid.r).toBeGreaterThan(95);
    expect(mid.r).toBeLessThan(105);
  });
});

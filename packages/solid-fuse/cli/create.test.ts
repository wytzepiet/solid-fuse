import { describe, expect, test } from "bun:test";
import { dartName, packageManager, title } from "./create";
import { buildTargetPlatform } from "./runners";

describe("fuse create", () => {
  test("dart package names", () => {
    expect(dartName("my-app")).toBe("my_app");
    expect(dartName("@me/Cool App")).toBe("cool_app");
    expect(dartName("2048")).toBe("app_2048");
  });

  test("titles", () => {
    expect(title("my-app")).toBe("My App");
    expect(title("apps/pole_goals")).toBe("Pole Goals");
  });

  test("package manager from the one that ran us", () => {
    expect(packageManager("pnpm/9.1.0 npm/? node/v22")).toBe("pnpm");
    expect(packageManager("npm/10.8.0 node/v22")).toBe("npm");
    expect(packageManager("bun/1.3.0 npm/? node/v24")).toBe("bun");
  });

  test("the platform a flutter build target is for", () => {
    expect(buildTargetPlatform(["apk", "--release"])).toBe("android");
    expect(buildTargetPlatform(["--release", "ipa"])).toBe("ios");
    expect(buildTargetPlatform(["linux"])).toBe("linux");
    expect(buildTargetPlatform(["web"])).toBeUndefined();
  });
});

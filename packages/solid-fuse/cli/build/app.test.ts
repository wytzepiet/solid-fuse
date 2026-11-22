import { describe, expect, test } from "bun:test";
import { parseBuildArgs } from "./app";

describe("fuse build arguments", () => {
  test("everything goes to flutter build by default", () => {
    expect(parseBuildArgs(["apk", "--release"])).toEqual({
      jsOnly: false,
      flutterArgs: ["apk", "--release"],
    });
  });

  test("--js-only is ours, wherever it appears, and is not passed on", () => {
    expect(parseBuildArgs(["--js-only"])).toEqual({ jsOnly: true, flutterArgs: [] });
    expect(parseBuildArgs(["linux", "--js-only", "--release"])).toEqual({
      jsOnly: true,
      flutterArgs: ["linux", "--release"],
    });
  });
});

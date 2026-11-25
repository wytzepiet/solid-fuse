import { describe, expect, test } from "bun:test";
import { askedMode, isPhysicalMobile, modeArgs, pickDevice, type FlutterDevice } from "./dev-mode";

const iphone: FlutterDevice = { id: "00008130-0004714C3410001C", name: "Wytze's iPhone", targetPlatform: "ios", emulator: false };
const sim: FlutterDevice = { id: "A1B2", name: "iPhone 17 Pro", targetPlatform: "ios", emulator: true };
const pixel: FlutterDevice = { id: "38211FDH", name: "Pixel 9", targetPlatform: "android-arm64", emulator: false };
const linux: FlutterDevice = { id: "linux", name: "Linux", targetPlatform: "linux-x64", emulator: false };

describe("dev mode", () => {
  test("a mode asked for wins", () => {
    expect(askedMode(["-d", "x", "--checked"])).toBe("checked");
    expect(askedMode(["--profile"])).toBe("profile");
    expect(askedMode(["--debug"])).toBe("debug");
    expect(askedMode(["-d", "x"])).toBeNull();
  });

  test("-d picks a device the way flutter matches it", () => {
    const all = [iphone, sim, pixel, linux];
    expect(pickDevice(["-d", iphone.id], all)).toBe(iphone);
    expect(pickDevice(["-d", "pixel"], all)).toBe(pixel);
    expect(pickDevice(["--device-id=linux"], all)).toBe(linux);
    // Both names start with "iphone": flutter would ask.
    expect(pickDevice(["-d", "iphone"], [sim, { ...iphone, name: "iPhone" }])).toBeNull();
    expect(pickDevice([], [pixel])).toBe(pixel);
    expect(pickDevice([], all)).toBeNull();
  });

  test("only a real phone or tablet is compiled by default", () => {
    expect(isPhysicalMobile(iphone)).toBe(true);
    expect(isPhysicalMobile(pixel)).toBe(true);
    expect(isPhysicalMobile(sim)).toBe(false);
    expect(isPhysicalMobile(linux)).toBe(false);
    expect(isPhysicalMobile(null)).toBe(false);
  });

  test("checked is a profile build with the asserts and debug constants", () => {
    const args = modeArgs("checked", ["-d", "x", "--checked"]);
    expect(args).not.toContain("--checked");
    expect(args).toContain("--profile");
    expect(args).toContain("--extra-front-end-options=--enable-asserts,-Ddart.vm.profile=false");
    expect(args).toContain("--extra-gen-snapshot-options=--enable-asserts");
    expect(modeArgs("profile", ["--profile"])).toEqual(["--profile"]);
  });
});

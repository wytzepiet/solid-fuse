import { expect, test } from "bun:test";
import { vmServiceUri } from "./drive";

test("reads the VM service from flutter run's output", () => {
  expect(vmServiceUri("A Dart VM Service on Linux is available at: http://127.0.0.1:37885/0MSdsgRS2DE=/")).toBe(
    "ws://127.0.0.1:37885/0MSdsgRS2DE=/ws",
  );
  expect(vmServiceUri("A Dart VM Service on iPhone 17 is available at: http://127.0.0.1:50300/abc=")).toBe(
    "ws://127.0.0.1:50300/abc=/ws",
  );
  expect(vmServiceUri("Syncing files to device Linux...")).toBeNull();
});

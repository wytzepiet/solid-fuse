// Integration-test entry for the Image widget.
//
// This is NOT app code — it's the JS half of
// examples/polyfill_tests/integration_test/image_test.dart. It runs the REAL
// SolidJS 2.0 renderer inside the QuickJS engine, emits real `_ops` to the Dart
// FuseRuntime, and renders one `<Image>` per source kind so the Dart test can
// assert the resolved Flutter ImageProvider and the prop plumbing.
//
// Built into examples/polyfill_tests/assets/js/image_bundle.js by
// examples/polyfill_tests/tool/build_image_bundle.ts.

import { render, send, View, Text, Image } from "solid-fuse";

// A 1×1 transparent PNG. As a `data:` URI it resolves to a MemoryImage that
// actually decodes and paints in a widget test (no network, no missing file).
const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

// An errorWidget swallows the inevitable load failure for the network / asset /
// file sources (which point at nonexistent targets in the test), so a failed
// load doesn't bubble to FlutterError.onError and fail the test. The `Image`
// widget itself — and its `.image` provider — stay in the tree regardless.
const fallback = () => <Text>broken</Text>;

const App = () => (
  <View flex={{ direction: "vertical" }}>
    {/* http(s):// → NetworkImage */}
    <Image src="https://example.com/n.png" width={10} height={10} errorWidget={fallback()} />

    {/* scheme-less URL forced to network via the `type` override */}
    <Image src="cdn.example.com/o.png" type="network" width={10} height={10} errorWidget={fallback()} />

    {/* relative path → AssetImage */}
    <Image src="assets/img/a.png" width={10} height={10} errorWidget={fallback()} />

    {/* absolute path → FileImage */}
    <Image src="/tmp/f.png" width={10} height={10} errorWidget={fallback()} />

    {/* data: URI → MemoryImage; exercises fit + borderRadius (ClipRRect) */}
    <Image src={PNG_1X1} width={10} height={10} fit="cover" borderRadius={4} />

    {/* data: URI → MemoryImage; exercises the color tint (defaults to srcIn) */}
    <Image src={PNG_1X1} width={10} height={10} color="red" />
  </View>
);

render(App);

// Tell Dart the bundle finished its initial render so it can stop pumping.
send("test:ready", {});

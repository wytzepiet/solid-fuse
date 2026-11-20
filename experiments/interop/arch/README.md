# arch: architecture measurements

Two small spikes backing `../reports/04-architecture.md`. Neither touches the framework.

## size_app: what does a table of every Flutter widget cost?

`tool/gen_tables.mjs` scrapes Flutter's sources for concrete public Widget subclasses and
emits `lib/main_*.dart` variants that pin them through a `Map<String, Function>` of
constructor tear-offs. `tool/gen_adapters.mjs` emits synthetic 12-prop adapters to price
the decode code itself. `tool/build_sizes.sh` builds each variant to a release AOT
snapshot for android-arm64 with `flutter assemble` (engine artifacts only, no Android SDK).

```bash
cd size_app && flutter pub get
node tool/gen_tables.mjs /opt/flutter tool/exclude.txt && node tool/gen_adapters.mjs
tool/build_sizes.sh
```

Result (Flutter 3.50.1, android-arm64 release `app.so`, icon tree shaking off):

| variant | widgets pinned | app.so bytes | gzip -9 bytes |
|---|---:|---:|---:|
| baseline (MaterialApp + Text) | 0 | 4,065,328 | 1,518,760 |
| fuse_like (what today's 9 built-ins pin) | 24 | 6,378,680 | 2,326,751 |
| common60 (60 everyday material widgets) | 60 | 8,157,184 | 2,959,263 |
| widgets (all of the widgets layer) | 293 | 8,220,992 | 2,956,758 |
| widgets_material | 481 | 12,628,496 | 4,464,510 |
| all (widgets + material + cupertino) | 538 | 13,767,424 | 4,844,547 |
| adapters1 (1 synthetic 12-prop adapter) | - | 4,040,768 | 1,487,769 |
| adapters200 (200 of them) | - | 4,624,472 | 1,591,441 |

Adapter code: (4,624,472 - 4,040,768) / 199 = 2,933 bytes per 12-prop adapter, about 245
bytes per decoded prop before compression. The 538 widgets have roughly 14.5 named
constructor parameters each (regex count over 427 of them: 6,189 params, median 9, max 85).

## decode_bench: string-keyed FuseMap reads vs generated decoders

`dart compile exe bin/bench.dart -o /tmp/bench && /tmp/bench` (pure Dart; Color and
EdgeInsets are stand-ins, parse functions are trimmed copies of utils.dart).

Result (x64 Linux, AOT), decoding one 14-prop view-like node:

| variant | ns per decode |
|---|---:|
| A current: FuseMap accessors + lenient parsers (hex colour) | 960 |
| A' same with a named colour | 744 |
| B generated decoder, string keys, canonical wire values | 266 |
| C generated decoder, positional slots | 139 |
| D decode once at setProp, build reads typed fields | 10 |
| E B plus dev-mode schema validation of every prop | 642 |

# 09 — How directly do pub packages translate? 64 packages through the generators

Spike code: `experiments/interop/packages/` (nothing outside that directory and this file was written; no branch was switched, nothing committed). Flutter 3.50.1 / Dart 3.14.0, analyzer 14.7.0, TypeScript 6.0.2, bun, Linux, 4 cores shared with another spike (load average 5 to 9 during the runs).

**Nothing in this report ran on a device or in a Flutter app.** Every claim is one of: the generator's own report, `flutter analyze` on generated Dart, `tsc --strict` on generated and hand-written TS, or my reading of the package's README and source. "Works" below means "generates, analyzes and type-checks, and the constructor call is the one the README makes".

## Answer

The owner's guess is half right. About half of the popular packages need no layer at all, and where a layer is needed it belongs in TS far more often than in Dart.

| | packages | share |
|---|---:|---:|
| **A** usable as generated, README example line for line | 31 | 48 % |
| **B** usable, a thin TS wrapper makes it nice, no new Dart | 13 | 20 % |
| **C** blocked on a framework capability (bridge 05, or a generator rule), then A or B | 14 | 22 % |
| **D** needs hand-written Dart | 5 | 8 % |
| **E** should not be bridged | 1 | 2 % |

- Once the capabilities under C exist, the split becomes **36 as generated, 22 with a TS wrapper, 5 with Dart, 1 not bridged**. Of the 27 packages that then need a hand-written layer, 22 (81 %) need it in TS and 5 (19 %) in Dart.
- The TS layer is small and of one kind: renaming, flattening a nested options object, turning a tagged union into a `src` or a name, `Date` in and out, and wrapping a controller protocol in a promise. Ten wrapper files were written (twelve wrappers): 287 lines in total, 16 to 41 lines each, and only two of them add a node.
- The Dart layer is needed for a short list of reasons that no amount of bridge work removes: a builder whose arguments are live Dart objects, an imperative function that needs a `BuildContext`, a value class whose identity matters, and code that must run in a background isolate. Three such shims were written (plus a fourth for a class C package, for comparison): 52 to 86 lines each, plain Flutter widgets, and the generator picked all four up.
- At parameter level, of 349 omitted constructor parameters and data-class fields, 66 % are recovered by the three bridge capabilities of report 05, 11 % by generator rules, and 22 % are inherently Dart (and nearly all of those are optional customisation hooks, not the main path).
- Plugin (non-UI) packages translate much better than widget packages: 15 of 23 are class A, against 16 of 41 widget packages.

So: **the default layer is TS, shipped with the app or as an npm package. Dart is the escape hatch for about one package in twelve**, and the framework's intended escape hatch (a plain widget with typed constructor parameters in `dart/lib/fuse/`) is the right shape for it.

Two things qualify this. The generators have bugs that hide behind coverage numbers: two of the six most-liked widget packages (`cached_network_image`, `flutter_svg`) crashed the widget generator and a third package (`skeletonizer`) lost its main widget before two small fixes, and a 95 % member count for `flutter_secure_storage` and `permission_handler` covers none of their real API. And class C is large: without report 05's capabilities, 14 of 64 packages (including `fl_chart`, `cached_network_image`, `google_maps_flutter`, `webview_flutter`, `sqflite`) are not usable for their README example.

## Sample

Sources, fetched 2026-11-20 and saved in `packages/sample/`:

- `https://pub.dev/api/search?q=sdk:flutter&sort=like`, pages 1 to 10 (`top_likes.txt`, the 100 most-liked Flutter packages; the API refuses deeper pages with "Search query complexity is above the permitted threshold").
- `https://pub.dev/api/packages/<name>/score` for each candidate (`scores.txt`: like count, 30-day download count, pub points, discontinued flag).

Selection: for each kind listed in the brief, the most-liked package of that kind, plus the widely used alternatives where a kind has two (`pinput` and `pin_code_fields`, `google_maps_flutter` and `flutter_map`, `audioplayers` and `just_audio`). 51 of the 64 are in the top 100 by likes; the other 13 are the leading package of a kind the top 100 does not cover (`flutter_markdown_plus`, which replaces the discontinued `flutter_markdown`, and `skeletonizer`, `qr_flutter`, `mobile_scanner`, `signature`, `flutter_html`, `flutter_map`, `rive`, `chewie`, `confetti`, `dropdown_button2`, `flutter_typeahead`, `sensors_plus`). Not sampled although in the top 100 and of an applicable kind: `animations`, `animate_do`, `flutter_screenutil`, `hive`, `google_sign_in`, `awesome_notifications`, `location`, `flutter_inappwebview`, `showcaseview`, `introduction_screen`, `convex_bottom_bar`, `sliding_up_panel`, `flutter_form_builder`, `getwidget`, `google_mobile_ads`, `in_app_review`, `image_cropper`, `workmanager`, `pdf`, and the Syncfusion packages (commercial licence). The sample is a judgement sample, not a random one.

- 41 UI widget packages, 23 plugin / service packages: 64 run.
- Versions are whatever `flutter pub get` resolved with `any` on Flutter 3.50.1 (one `package_config.json` for all 64, in `packages/host/`).

### Not applicable: JS has its own (not run)

| package | likes | 30-day downloads | what a Fuse app uses instead |
|---|---:|---:|---|
| provider | 11,014 | 1,217,996 | Solid context and signals |
| riverpod / flutter_riverpod | 4,045 / 2,919 | 4,639,160 / 4,490,665 | Solid signals, stores, async primitives |
| bloc / flutter_bloc | 3,224 / 8,089 | 2,520,622 / 2,371,390 | Solid stores and actions |
| get | 15,606 | 810,174 | Solid (state) and solid-fuse navigation |
| go_router | 5,801 | 5,700,185 | solid-fuse navigation |
| get_it | 4,732 | 2,579,971 | ES modules, Solid context |
| dio / http | 8,373 / 8,482 | 5,593,012 / 15,308,197 | `fetch` (polyfilled by solid-fuse) |
| intl | 6,114 | 14,149,221 | `Intl` in JS, or an npm i18n library |
| equatable / freezed | 3,642 / 4,531 | 7,859,695 / 3,068,693 | Plain objects, TS types |

`infinite_scroll_pagination` was run because it is a widget package, and landed in class E for the same reason these are here.

## What was run

Two generator copies, both driven per package in a fresh process so that one package's output cannot depend on another's:

- **Widget generator**: copy of `/home/claude/wt/e2e/packages/solid-fuse/gen` in `packages/gen/`, one `--job` per package with the library `fuse add` would pick (`package:<name>/<name>.dart`; `photo_view` also got `photo_view_gallery.dart`). TS wrappers from the manifest with an unmodified copy of `cli/gen-emit.ts` (`packages/cli/`, `packages/scripts/emit_ts.ts`).
- **Object and plugin-module generator**: copy of `experiments/interop/objects/tool` in `packages/host/tool/`, run on all 23 plugin packages and on 25 widget packages that export controllers or functions.

Changes to the copies (each marked `report 09` in the source):

1. Per-unit timing and a try/catch per unit in `gen/bin/fuse_gen.dart`.
2. **Fix 1**: an enum that the package's entry library does not export crashed the emitter (`Bad state: not importable: RenderingStrategy`). It is now dropped like an unexported class. Without this, `flutter_svg` and `cached_network_image` produce nothing, and an app widget that uses a package enum crashes the `app` unit.
3. **Fix 2**: abstract widget classes with public factory constructors were silently ignored. Without this, `skeletonizer` generates 5 helper widgets and not `Skeletonizer` itself.

The as-is results before the two fixes are kept in `packages/out/widgets-table.asis.md` and `packages/out/widgets-asis/`. Only those three packages changed.

Totals:

| | widget generator | object / module generator |
|---|---|---|
| packages run | 42 (41 UI + `camera`) | 48 |
| crashed | 2 as-is, 0 after fix 1 | 2 (`flutter_slidable`, `rive`: the same unexported-enum bug, not fixed in this copy) |
| constructors emitted / public widget constructors found | 201 / 278 (72 %) | |
| parameters bridged / parameters of emitted constructors | 1,688 / 2,097 (80 %; the denominator includes `key` and deprecated parameters) | |
| public callable members bridged | | 1,813 / 2,272 (80 %) over all 46; 810 / 877 (92 %) over the 23 plugin packages |
| wall time per package | median 34 s, range 25 to 61 s | median 32 s |
| of which analyzer load | median 21 s | |
| of which the unit itself | median 0.2 s | |
| generated Dart | 26,741 lines (5,059 adapter lines; the rest is per-unit codecs) | 23,325 lines |
| generated TS | 19,175 lines, 871 KB (602 KB of it shared value types repeated per unit) | 16,901 lines |
| `flutter analyze` | 42 of 43 files clean (incl. `app`); `flutter_map` has 2 errors | 43 of 46 clean; 5 errors in `flutter_map`, `modal_bottom_sheet`, `pull_to_refresh` |
| `tsc --strict` | 43 of 43 modules clean | 43 of 46 clean; `sqflite` (46 errors), `flutter_map` (4), `confetti` (2) |

Generation time is entirely start-up. A `fuse add` costs 25 to 60 s here regardless of package size, which confirms report 06's first friction point.

## Per-package table

Columns: `class` is my judgement against the README's canonical example (see the note). `widget ctors` is constructors emitted / public widget constructors found; `ctor params` is parameters bridged / total on the emitted constructors. `omitted` counts real omissions (not `key`, not deprecated) on constructors and inside the package's own data classes, by reason: `sync cb` a callback that returns a value synchronously, `builder` a function returning a widget, `nested` a widget, void callback or handle inside a data object, `cb args` a void callback whose arguments cannot be encoded, `unexported` a type the entry library does not export, `opaque` / `abstract` a class with no constructor JS can call, `typed slot` a parameter typed as a specific widget subclass, `future cb` a callback returning a `Future`, `default` a default value the generator cannot re-emit. `ctors skipped` are constructors dropped whole because a required parameter was not bridgeable. `module members` is public callable members bridged / total from the object and module generator. Every omitted parameter with its exact reason is in `packages/out/widgets-stats.json` (`omitted`, `dataOmitted`, `skipped` per package) and `packages/out/modules-stats.json` (`notBridged`).

| package | likes | 30-day downloads | class | gen s (widget / module) | widget ctors | ctor params | omitted params and data fields | ctors skipped | module members | note |
|---|---:|---:|:-:|---:|---:|---:|---|---|---:|---|
| fl_chart | 7210 | 2,448,187 | C (bridge) | 60 / - | 8/8 | 30/53 | sync cb 39, nested 10, opaque 8, builder 1 | - | - | Plain line/bar/pie charts work today (example compiles); custom axis titles (getTitlesWidget), tooltips and touch callbacks do not. Lands in B. |
| table_calendar | 3326 | 786,791 | C (bridge) | 55 / 32 | 1/2 | 40/48 | builder 16, sync cb 7, nested 2, default 1, unexported 1, cb args 1 | builder 1 | 3/3 | Basic setup works; selection and event markers need selectedDayPredicate / eventLoader (sync). DateTime type lost month/day. Lands in B (Date wrapper). Dart alternative written: 52 lines. |
| carousel_slider | 6066 | 1,035,028 | B | 61 / 32 | 2/2 | 8/11 | builder 1, sync cb 1, nested 1 | - | 29/45 | Works as generated; wrapper flattens options and takes slides as children. onPageChanged is nested (bridge 05). |
| cached_network_image | 6989 | 3,960,721 | C (bridge) | 34 / 39 | 1/1 | 24/31 | builder 4, unexported 2 | - | 0/2 | Crashed as-is (fix 1). Image loads; placeholder / errorWidget builders are missing. Lands in A. |
| flutter_svg | 5942 | 6,796,308 | B | 31 / - | 5/7 | 52/88 | builder 12, unexported 5, abstract 3 | unexported 1, binary 1 | - | Crashed as-is (fix 1). SvgPictureAsset / Network / String work; wrapper gives one Svg with src and color. |
| shimmer | 5466 | 1,744,414 | A | 40 / - | 2/2 | 13/15 | none | - | - | Shimmer.fromColors is ShimmerFromColors. |
| skeletonizer | 2377 | 710,234 | A | 34 / - | 23/23 | 119/142 | sync cb 3, builder 2 | - | - | Main widget missing as-is (abstract class with factory constructors, fix 2); with the fix line for line. |
| lottie | 4584 | 2,332,215 | B | 45 / 34 | 6/7 | 98/121 | sync cb 9, builder 8, future cb 6, opaque 3, unexported 2 | binary 1 | 45/48 | Lottie.asset / .network are LottieBuilderAsset / LottieBuilderNetwork; wrapper gives one Lottie with src. Controller-driven playback needs an AnimationController handle (object generator). |
| rive | 1951 | 562,227 | D (builder, unencodable args) | 44 / - | 7/13 | 25/32 | none | abstract 5, opaque 1 | crash | RiveWidgetBuilder's builder receives native File / controller objects; 6 of 13 constructors skipped. 80 lines of Dart. |
| google_maps_flutter | 4630 | 1,185,415 | C (bridge) | 43 / 27 | 1/1 | 44/48 | nested 13, nested 1, opaque 1, abstract 1 | - | 39/45 | Map, camera position and markers work; the controller arrives as a record (no animateCamera), marker onTap is nested, CameraUpdate has only static factories. Lands in B. |
| flutter_map | 2184 | 1,267,821 | C (generator + bridge) | 41 / 40 | 9/17 | 56/70 | cb args 9, sync cb 4, nested 4, unexported 2, default 1, builder 1, stream 1 | opaque 4, typed slot 3, unexported 1 | 166/262 | LatLng is from latlong2 (not exported): no initialCenter, 8 constructors skipped including MarkerLayer; 2 analyze errors in generated Dart. Lands in A or B. |
| webview_flutter | 4534 | 4,267,854 | C (bridge) | 38 / 26 | 1/3 | 2/4 | nested 1 | opaque 1, unexported 1 | 41/55 | WebViewWidget + controller.loadRequest work; NavigationDelegate comes out as {} (nested, Future-returning callbacks), JavaScript channels take a callback. Lands in B. |
| video_player | 3729 | 4,277,600 | B | 40 / 26 | 4/4 | 9/13 | none | - | 30/31 | Controller from the object generator plus the VideoPlayer widget; wrapper composes the aspect-ratio box (1 extra node). |
| chewie | 2358 | 990,067 | C (generator) | 46 / 45 | 6/12 | 11/17 | none | abstract 4, builder 1, unexported 1 | 137/158 | Chewie(controller:) generates, but ChewieController's constructor is dropped: it takes a VideoPlayerController, an object from another package's unit. Lands in B. |
| flutter_markdown_plus | 155 | 1,013,751 | A | 33 / - | 2/2 | 27/49 | builder 8, abstract 6, unexported 6 | - | - | Markdown(data:) and onTapLink work; custom element builders and syntaxes do not (abstract classes: Dart only). |
| flutter_html | 2163 | 880,585 | A | 34 / - | 5/6 | 25/47 | cb args 6, sync cb 5, default 3, unexported 2, nested 2, builder 2 | unexported 1 | - | Html(data:) works. style (default not reproducible) and onLinkTap (unencodable args) are missing, which limits real use. |
| pull_to_refresh | 2835 | 180,252 | B | 33 / 30 | 11/16 | 136/153 | builder 5, future cb 2, sync cb 1 | builder 2, other 2, context 1 | 70/101 | SmartRefresher + RefreshController work by signature; wrapper turns the controller protocol into promises. Generated module Dart has 3 analyze errors (nullable Future). |
| flutter_staggered_grid_view | 4779 | 1,541,833 | A | 33 / - | 6/20 | 38/44 | none | builder 11, nested 2, unexported 1 | - | StaggeredGrid.count with tiles is line for line. 14 constructors skipped, 11 of them for itemBuilder (lazy grids: bridge 05). |
| modal_bottom_sheet | 3595 | 334,962 | D (required BuildContext) | 33 / 33 | 4/5 | 17/20 | none | sync cb 1 | 150/222 | API is showMaterialModalBottomSheet(context:, builder:). 78 lines of Dart make it a declarative widget. |
| fluttertoast | 4138 | 661,800 | A | 39 / 34 | 0/0 | 0/0 | none | - | 10/18 | Fluttertoast.showToast via the module generator. FToast (custom widget toasts) needs a BuildContext. |
| qr_flutter | 2338 | 2,722,613 | A | 34 / - | 2/2 | 28/34 | builder 2 | - | - | QrVersions.auto is the literal -1. errorStateBuilder omitted. |
| mobile_scanner | 2312 | 2,491,997 | A | 34 / 26 | 3/3 | 20/27 | builder 3, cb args 1 | - | 74/79 | MobileScanner(onDetect:) line for line; controller from the object generator. |
| signature | 663 | 378,273 | A | 36 / 36 | 1/1 | 6/7 | none | - | 41/48 | Signature(controller:) plus SignatureController from the object generator; toPngBytes crosses as a number array. |
| flutter_rating_bar | 2530 | 357,089 | C (bridge) | 34 / - | 0/3 | 0/0 | none | builder 2, nested 1 | - | All 3 constructors skipped: RatingWidget holds widgets (nested), the others take itemBuilder(context, index). Lands in A. |
| auto_size_text | 5124 | 1,456,143 | A | 34 / - | 2/2 | 36/40 | none | - | - | Line for line. |
| flutter_slidable | 6148 | 860,284 | C (generator) | 39 / - | 14/14 | 53/71 | typed slot 2, future cb 1, sync cb 1 | - | crash | startActionPane / endActionPane are typed ActionPane?, so a wrapped node is not accepted: nothing to slide to. Lands in A. |
| pin_code_fields | 2391 | 455,144 | A | 40 / - | 8/10 | 130/147 | builder 6, sync cb 4, nested 2, stream 1 | builder 2 | - | MaterialPinField(length:, onCompleted:). Not proven with an example. |
| pinput | 3513 | 626,835 | A | 40 / 35 | 1/2 | 56/63 | builder 3, abstract 1, cb args 1, sync cb 1 | builder 1 | 2/2 | Pinput(onCompleted:) and PinTheme records line for line; validator (sync) omitted. |
| photo_view | 3206 | 1,460,759 | B | 33 / 37 | 5/5 | 71/88 | sync cb 18, builder 7, nested 5 | - | 46/52 | PhotoView(imageProvider: {$: "AssetImage"}) works; wrapper gives src. Gallery builder omitted. |
| confetti | 1645 | 500,484 | B | 33 / 29 | 1/1 | 19/21 | sync cb 1 | - | 11/13 | ConfettiWidget + controller.play(); the generated controller module fails tsc (duplicate identifier), so not proven. |
| badges | 3756 | 421,926 | A | 39 / - | 2/2 | 10/13 | sync cb 1 | - | - | Line for line; Badge.onTap omitted (typed Function()? returning dynamic), wrap in GestureDetector. |
| dropdown_button2 | 1907 | 626,631 | C (generator) | 39 / 31 | 4/4 | 69/82 | builder 5, nested 5, typed slot 4, unexported 2, sync cb 2 | - | 0/0 | items is List<DropdownItem<T>> (typed widget slot): the dropdown is empty. Values are unknown (generics). Lands in B. |
| flutter_typeahead | 2133 | 238,943 | D (builder, unencodable args) | 39 / 39 | 1/3 | 2/3 | none | builder 2 | 33/49 | builder(context, controller, focusNode) and a pull-style suggestionsCallback. 86 lines of Dart. |
| percent_indicator | 2784 | 802,610 | A | 33 / - | 2/2 | 57/61 | sync cb 2 | - | - | Line for line (also run end to end in report 06). |
| smooth_page_indicator | 4131 | 622,160 | B | 32 / - | 4/4 | 23/28 | sync cb 3 | - | - | AnimatedSmoothIndicator works; wrapper picks the effect by name. SmoothPageIndicator needs a PageController handle. |
| flutter_spinkit | 4650 | 525,532 | A | 32 / - | 32/32 | 147/202 | builder 23 | - | - | 32 spinners line for line; itemBuilder omitted on 23 of them. |
| animated_text_kit | 5688 | 158,343 | A | 32 / - | 12/12 | 164/175 | none | - | - | animatedTexts is a tagged array; reads close to the Dart. |
| font_awesome_flutter | 4984 | 1,177,722 | B | 33 / 31 | 1/1 | 13/14 | none | - | 0/0 | FaIcon generates but FontAwesomeIcons.* (2,858 static consts) do not; wrapper needs a generated code-point table (data, not logic). |
| google_fonts | 6489 | 3,579,719 | B | 40 / 38 | 0/0 | 0/0 | none | - | 4/10 | GoogleFonts.getFont(family) via the module generator, async; wrapper returns the family name as a signal. |
| flutter_animate | 4261 | 1,375,165 | B | 33 / 33 | 1/1 | 8/12 | cb args 3, opaque 1, sync cb 1 | - | 19/67 | Animate(effects: [...]) works with tagged records; helpers restore fade()/scale(). The .animate() extension chain has no 1:1 form. |
| infinite_scroll_pagination | 4053 | 515,225 | E | 27 / 32 | 0/22 | 0/0 | nested 2 | nested 20, builder 2 | 53/85 | All 22 constructors skipped (builder delegates, PagingController with sync/async callbacks). Paging state is app logic: do it in JS over the framework's own lazy list. |
| shared_preferences | 10590 | 9,649,964 | A | - / 32 | - | - | - | - | 51/51 | Line for line; synchronous getters become promises. |
| url_launcher | 8193 | 10,165,315 | A | - / 31 | - | - | - | - | 7/7 | Line for line. |
| path_provider | 5573 | 11,068,064 | A | - / 36 | - | - | - | - | 9/9 | Line for line (Directory crosses as a path). |
| image_picker | 7775 | 6,329,948 | A | - / 36 | - | - | - | - | 9/9 | Line for line. |
| file_picker | 4954 | 5,495,782 | A | - / 37 | - | - | - | - | 22/26 | pickFiles works; saveFile(bytes:) does not (binary). |
| permission_handler | 6017 | 4,246,250 | C (generator) | - / 36 | - | - | - | - | 1/1 | Only openAppSettings() is generated: Permission.camera.request() / .status are extension methods on static const instances. Lands in B. |
| geolocator | 6138 | 3,306,228 | A | - / 34 | - | - | - | - | 29/29 | Line for line, including the position stream. |
| connectivity_plus | 4106 | 4,794,362 | A | - / 34 | - | - | - | - | 7/8 | Line for line. |
| device_info_plus | 3043 | 5,075,640 | A | - / 30 | - | - | - | - | 19/20 | Line for line. |
| package_info_plus | 2809 | 7,914,345 | A | - / 30 | - | - | - | - | 5/7 | Line for line. |
| share_plus | 4037 | 5,579,623 | A | - / 34 | - | - | - | - | 6/10 | SharePlus.instance.share(ShareParams(...)). |
| local_auth | 3385 | 2,074,664 | A | - / 30 | - | - | - | - | 6/6 | Line for line. |
| flutter_secure_storage | 4512 | 6,482,177 | C (generator) | - / 27 | - | - | - | - | 5/5 | FlutterSecureStorage is classified as a record (const constructor), so read / write / delete are not generated. One declaration line fixes it. Lands in A. |
| flutter_local_notifications | 7366 | 4,202,617 | C (bridge) | - / 29 | - | - | - | - | 129/140 | initialize + show work; the tap callback (onDidReceiveNotificationResponse) is silently dropped; zonedSchedule needs TZDateTime (unexported). Lands in B. |
| in_app_purchase | 2499 | 879,802 | D (object identity) | - / 33 | - | - | - | - | 9/10 | ProductDetails / PurchaseDetails cross as records, but the store implementations need the original platform subclasses back. Needs a small Dart facade keyed by product id. |
| firebase_core | 4082 | 6,390,840 | A | - / 33 | - | - | - | - | 10/13 | Firebase.initializeApp(options: record). |
| firebase_auth | 4304 | 2,354,285 | A | - / 28 | - | - | - | - | 131/147 | Email/password and authStateChanges work; signInWithCredential (credential has no usable constructor) and verifyPhoneNumber (callbacks) do not. |
| firebase_messaging | 3954 | 4,662,256 | D (imperative delegate) | - / 26 | - | - | - | - | 18/22 | Foreground API works; onBackgroundMessage must be a top-level Dart function run in a background isolate. |
| sqflite | 5579 | 3,800,364 | C (bridge) | - / 26 | - | - | - | - | 83/90 | Generated TS does not compile (a parameter named arguments). openDatabase(onCreate:) and transaction() take async callbacks. Lands in A. |
| camera | 2606 | 1,184,709 | B | 25 / 27 | 1/1 | 2/3 | none | - | 40/43 | availableCameras + CameraController + CameraPreview by signature; needs the same initialise-then-show wrapper as video. Not proven with an example. |
| audioplayers | 3449 | 1,834,825 | B | - / 27 | - | - | - | - | 83/91 | play(UrlSource(url)) cannot be called (Source is an object, UrlSource a record); wrapper uses setSourceUrl + resume. |
| just_audio | 4151 | 1,675,698 | A | - / 27 | - | - | - | - | 114/116 | AudioPlayer().setUrl(...) then play(); 114 of 116 members. |
| sensors_plus | 1041 | 952,658 | A | - / 29 | - | - | - | - | 17/17 | Streams line for line. |

## Classes

Rule used: take the usage example the README leads with and ask whether the generated API can express it. Where the README's first example is a stub that defers to further docs (`fl_chart`), I used the first complete sample. Where a package is usable for its README example but loses something most apps will want, it keeps its class and the note says what is lost.

**A, usable as generated (31).** `shimmer`, `skeletonizer` (after fix 2), `flutter_markdown_plus`, `flutter_html`, `flutter_staggered_grid_view`, `fluttertoast`, `qr_flutter`, `mobile_scanner`, `signature`, `auto_size_text`, `pin_code_fields`, `pinput`, `badges`, `percent_indicator`, `flutter_spinkit`, `animated_text_kit`; `shared_preferences`, `url_launcher`, `path_provider`, `image_picker`, `file_picker`, `geolocator`, `connectivity_plus`, `device_info_plus`, `package_info_plus`, `share_plus`, `local_auth`, `firebase_core`, `firebase_auth`, `just_audio`, `sensors_plus`.

**B, thin TS wrapper, no new Dart (13).** `carousel_slider`, `flutter_svg` (after fix 1), `lottie`, `video_player`, `pull_to_refresh`, `photo_view`, `confetti`, `smooth_page_indicator`, `font_awesome_flutter`, `google_fonts`, `flutter_animate`; `camera`, `audioplayers`.

**C, needs a capability the generator copies lack (14).**

- Bridge capabilities of report 05 (8): `fl_chart` (nested callbacks, sync callbacks, nested builders), `table_calendar` (sync predicates), `cached_network_image` (builders), `google_maps_flutter` (object handed to JS in a callback, nested callbacks), `webview_flutter` (nested and `Future`-returning callbacks, callbacks as method arguments), `flutter_rating_bar` (widgets inside a data object, builder), `flutter_local_notifications` (callback as a method argument), `sqflite` (async callbacks as method arguments).
- Generator rules, no bridge change (5): `flutter_slidable` and `dropdown_button2` (typed widget slots), `permission_handler` (extension methods on static instances), `flutter_secure_storage` (a class with behaviour classified as a record), `chewie` (an object from another package's unit).
- Both (1): `flutter_map` (types from a package the entry library does not export, widgets inside data objects).
- After the capability: 5 land in A (`cached_network_image`, `flutter_rating_bar`, `flutter_slidable`, `flutter_secure_storage`, `sqflite`), 9 in B.

**D, needs hand-written Dart (5).**

| package | kind | Dart written here |
|---|---|---|
| `rive` | builder with unencodable arguments (`RiveLoaded` carries a native `File` and a controller) | `host/lib/fuse/rive_asset.dart`, 80 lines |
| `flutter_typeahead` | builder with unencodable arguments (`controller`, `focusNode` created by the package) plus a pull-style `suggestionsCallback` | `host/lib/fuse/type_ahead.dart`, 86 lines |
| `modal_bottom_sheet` | required `BuildContext`, imperative `show…()` function that takes a builder | `host/lib/fuse/modal_sheet.dart`, 78 lines |
| `in_app_purchase` | a value object whose identity cannot cross: `ProductDetails` / `PurchaseDetails` come out as records, and the store implementations need the original platform subclass back in `buyNonConsumable` / `completePurchase` | not written; a facade keyed by product id, my estimate 60 to 80 lines |
| `firebase_messaging` | imperative delegate: `onBackgroundMessage` takes a top-level Dart function that runs in a background isolate with no JS engine | not written; the foreground API (token, permission, `onMessage` stream) is class A as generated |

No package in the sample fell into D for a platform-view lifecycle or a per-frame callback. The platform-view packages (`google_maps_flutter`, `webview_flutter`, `video_player`, `camera`, `mobile_scanner`) manage their own view inside an ordinary widget, so the generator sees a normal constructor. Per-frame callbacks appear only as optional hooks (`ConfettiWidget.createParticlePath`, `fl_chart` painters, `flutter_animate` `onPlay(controller)`), never on the main path.

**E, should not be bridged (1).** `infinite_scroll_pagination`: every one of its 22 constructors takes a builder delegate, and the package is page-state management around a list. A Fuse app keeps that state in JS.

## Worked examples

All files are under `experiments/interop/packages/ts/`; `tsc -p tsconfig.check.json` (strict) passes with no errors over the 43 generated widget modules, 43 of the 46 generated plugin modules, 10 wrapper files and 20 example files. The examples cover 41 of the 64 packages.

### Class A: line for line (`examples/a/`, `examples/plugins/plugins.ts`)

```tsx
// percent_indicator README: CircularPercentIndicator(radius: 60.0, lineWidth: 5.0, percent: 1.0,
//                             center: new Text("100%"), progressColor: Colors.green)
<CircularPercentIndicator radius={60} lineWidth={5} percent={1} center={<Text>100%</Text>} progressColor="Colors.green" />

// shimmer README: Shimmer.fromColors(baseColor: Colors.red, highlightColor: Colors.yellow, child: Text('Shimmer', ...))
<ShimmerFromColors baseColor="Colors.red" highlightColor="Colors.yellow">
  <Text textAlign="center" fontSize={40} fontWeight="bold">Shimmer</Text>
</ShimmerFromColors>

// mobile_scanner README: MobileScanner(onDetect: (result) { print(result.barcodes.first.rawValue); })
<MobileScanner onDetect={(result) => console.log(result.barcodes[0]?.rawValue)} />
```

```ts
// geolocator README, _determinePosition()
if (!(await Geolocator.isLocationServiceEnabled())) throw new Error("Location services are disabled.");
let permission = await Geolocator.checkPermission();
if (permission === "denied") permission = await Geolocator.requestPermission();
const p = await Geolocator.getCurrentPosition();

// image_picker README: final XFile? image = await picker.pickImage(source: ImageSource.gallery);
const image = await createImagePicker().pickImage({ source: "gallery" });
```

Also in `examples/a/`: `qr_flutter`, `flutter_spinkit`, `flutter_staggered_grid_view`, and in `misc.tsx` `badges`, `auto_size_text`, `pinput`, `skeletonizer`, `flutter_markdown_plus`, `animated_text_kit`. In `plugins.ts`: `shared_preferences`, `url_launcher`, `connectivity_plus`, `package_info_plus`, `local_auth`, `fluttertoast`.

What "line for line" still costs: named constructors become separate components (`ShimmerFromColors`, `LottieBuilderAsset`), static constants on holder classes are not surfaced (`QrVersions.auto` is `-1`, `Icons.settings` is a code point), and every synchronous Dart getter is a promise (`await prefs.getInt("counter")`).

### Class B: before and after (`examples/b/`, `wrappers/`)

`table_calendar` (`wrappers/calendar.tsx`, 41 lines). The generated `DateTime` type lost the optional positional parameters, so `DateTime.utc(2010, 10, 16)` cannot be written at all; dates come back as field records; two-argument callbacks arrive as a tuple.

```tsx
// before
const ms = (y: number, m: number, d: number) =>
  ({ $: "fromMillisecondsSinceEpoch" as const, millisecondsSinceEpoch: Date.UTC(y, m - 1, d), isUtc: true });
<TableCalendar firstDay={ms(2010, 10, 16)} lastDay={ms(2030, 3, 14)} focusedDay={focused()}
  onDaySelected={([, focusedDay]) => setFocused(ms(focusedDay.year, focusedDay.month, focusedDay.day))} />

// after
<Calendar firstDay={new Date(Date.UTC(2010, 9, 16))} lastDay={new Date(Date.UTC(2030, 2, 14))} focusedDay={focused()}
  onDaySelected={(selected, f) => { setSelected(selected); setFocused(f); }} onPageChanged={setFocused} />
```

`carousel_slider` (`wrappers/carousel.tsx`, 24 lines):

```tsx
// before
<CarouselSlider options={{ height: 400, autoPlay: true, autoPlayInterval: 3000 }} items={[1, 2, 3].map((i) => <Slide i={i} />)} />
// after
<Carousel height={400} autoPlay autoPlayInterval={3000}><For each={[1, 2, 3]}>{(i) => <Slide i={i} />}</For></Carousel>
```

`flutter_svg` (`wrappers/svg.tsx`, 20 lines):

```tsx
// before
<SvgPictureAsset assetName="assets/dash.svg" colorFilter={{ $: "mode", color: "Colors.red", blendMode: "srcIn" }} />
<SvgPictureNetwork url="https://site.com/x.svg" width={48} />
// after
<Svg src="assets/dash.svg" color="Colors.red" />
<Svg src="https://site.com/x.svg" width={48} />
```

`pull_to_refresh` (`wrappers/pull-to-refresh.tsx`, 36 lines). The wrapper owns the controller and turns `refreshCompleted()` / `loadNoData()` into promise results:

```tsx
// before
const controller = createRefreshController({ initialRefresh: false });
<SmartRefresher enablePullDown enablePullUp header={<WaterDropHeader />} controller={controller}
  onRefresh={async () => { await reload(); await controller.refreshCompleted(); }}
  onLoading={async () => { await more(); await controller.loadComplete(); }}>...</SmartRefresher>
// after
<PullToRefresh onRefresh={reload} onLoadMore={more}>...</PullToRefresh>
```

`font_awesome_flutter` (`wrappers/fa-icon.tsx`, 16 lines plus a code-point table). This is the worst raw API in the sample:

```tsx
// before: FaIcon(FontAwesomeIcons.gamepad)
<FaIcon icon={{ data: { codePoint: 0xf11b, fontFamily: "FontAwesomeSolid", fontPackage: "font_awesome_flutter" } }} />
// after
<FaIcon name="gamepad" size={24} />
```

Also written: `flutter_animate` (`wrappers/animate.ts`: `effects={[fade({ duration: 500 }), scale()]}` instead of `{ $: "FadeEffect", ... }`), `smooth_page_indicator` (`wrappers/dots.tsx`), `lottie` and `photo_view` (`wrappers/media.tsx`: one `src`), `video_player` (`wrappers/video.tsx`: creates the controller, initialises it and sizes the player), `google_fonts` and `audioplayers` (`wrappers/plugins.ts`).

### Class C: what works and what is missing (`examples/c/needs_bridge.tsx`)

Each missing piece is written as a `@ts-expect-error`, so the file proves both halves: the working part compiles and the missing prop really is absent from the generated types.

```tsx
<CachedNetworkImage imageUrl="http://via.placeholder.com/350x150" fit="cover" />      // works
// @ts-expect-error builder (context, url)
<CachedNetworkImage imageUrl="x" placeholder={<Text>...</Text>} />

<Slidable><Text>Slide me</Text></Slidable>                                             // compiles, nothing to slide to
// @ts-expect-error startActionPane is typed `ActionPane?`
<Slidable startActionPane={<Pane />}><Text>Slide me</Text></Slidable>

<GoogleMap mapType="hybrid" initialCameraPosition={{ target: { latitude: 37.43, longitude: -122.09 }, zoom: 14.5 }}
  onMapCreated={(controller) => {
    // @ts-expect-error the controller arrives as a record of getters, not a handle
    controller.animateCamera({});
  }} />
```

The file also covers `fl_chart` (a plain line chart compiles; `touchCallback` and `getTitlesWidget` do not), `flutter_map` (`initialCenter` missing), `dropdown_button2` (`items` missing) and `qr_flutter`'s error builder.

### Class D: the Dart, and proof that the generator picks it up

Four plain Flutter widgets in `packages/host/lib/fuse/`. None imports solid-fuse. The widget generator was run on them as the `app` unit (`out/widgets/app.job.json`): **4 of 4 widgets, 36 of 40 parameters** (the 4 are `key`), 100 lines of generated adapter, and `flutter analyze` reports no errors on either the hand-written or the generated Dart.

| file | lines | what it replaces | generated props |
|---|---:|---|---|
| `type_ahead.dart` | 86 | `TypeAheadField(suggestionsCallback:, builder:, itemBuilder:, onSelected:)` | `suggestions: string[]`, `query`, `onSearch(text)`, `onSelected(index)`, `labelText`, `hintText`, `autofocus`, `debounceDuration`, `emptyText` |
| `rive_asset.dart` | 80 | `RiveWidgetBuilder(fileLoader:, builder: (context, state) => switch (state) {...})` | `src`, `artboard`, `stateMachine`, `fit: Fit`, `alignment`, `useFlutterRenderer`, `placeholder: FuseElement`, `onLoaded`, `onFailed(message)` |
| `modal_sheet.dart` | 78 | `showMaterialModalBottomSheet(context:, builder:)` | `open: boolean`, `sheet: FuseElement`, `children`, `onClosed`, `expand`, `enableDrag`, `isDismissible`, `backgroundColor`, `barrierColor` |
| `selectable_calendar.dart` | 52 | `TableCalendar(selectedDayPredicate:, eventLoader:)` (a class C package, done the Dart way for comparison) | `firstDayMs`, `lastDayMs`, `focusedDayMs`, `selectedDayMs`, `eventDaysMs: number[]`, `calendarFormat`, `onDaySelected(ms)`, `onPageChanged(ms)`, `onFormatChanged` |

The pattern in all four is the same: turn a pull or imperative API into pushed props. The core of `type_ahead.dart`:

```dart
Future<List<String>> _suggest(String search) {
  _search = search;
  if (widget.onSearch == null) return Future.value(widget.suggestions);
  _pending?.complete(const []);
  final c = _pending = Completer<List<String>>();
  widget.onSearch!(search);          // JS answers by setting the `suggestions` prop
  return c.future;                   // completed in didUpdateWidget
}
```

Used from TS (`examples/d/type_ahead.tsx`, `examples/d/rive_and_sheet.tsx`, both type-check against the generated `~/_generated/app`):

```tsx
<TypeAhead labelText="City" query={query()} suggestions={cities().map((c) => `${c.name}, ${c.country}`)}
  onSearch={async (s) => { setCities(await findCities(s)); setQuery(s); }} onSelected={(i) => props.onCity(cities()[i])} />
<RiveAsset src="assets/vehicles.riv" fit="cover" stateMachine="bumpy" placeholder={<Text>Loading...</Text>} />
<ModalSheet open={open()} onClosed={() => setOpen(false)} sheet={<View height={300}>...</View>}>...</ModalSheet>
```

One generator finding from this exercise: an app widget that uses a package's enum (`Fit` from rive, `CalendarFormat` from table_calendar) loses that parameter (crashes, before fix 1) unless the package's library is also listed in the `app` unit. The job in `out/widgets/app.job.json` lists both libraries with an `include` filter; `fuse gen` should do this automatically from the widget file's imports.

The shims lose things. `TypeAhead` only suggests strings and renders them as `ListTile`s; `RiveAsset` exposes no state-machine inputs or data binding; `ModalSheet` supports one sheet style. Each further capability is more Dart, and that is the real cost of class D: not the first 80 lines but the curation.

## Recurring reasons, ranked

Across the 42 widget-generator runs: 349 omitted constructor parameters and data-class fields, plus 77 constructors skipped whole. Ranked by the number of packages affected:

| # | reason | packages | occurrences | what removes it |
|---:|---|---:|---:|---|
| 1 | callback that returns a value synchronously (`selectedDayPredicate`, `getTooltipItems`, `validator`, `onPercentValue`) | 19 | 104 | Deadline-bounded sync call (05, problem B). Where it is called per item per build (calendar days, chart points) a Dart shim or a declarative record is cheaper. |
| 2 | builder with encodable or no arguments (`placeholder(context, url)`, `itemBuilder(context, index)`, `errorBuilder`) | 19 | 98 | "Builder as slot" for context-only builders (a generator rule), synchronous or windowed builder for indexed ones (05). |
| 3 | builder with unencodable arguments (`frameBuilder(context, child, composition)`, `imageBuilder(context, ImageProvider)`, typeahead's `builder`) | 13 | 35 | Hand-written Dart. Nearly always optional. |
| 4 | widget, void callback or handle nested inside a data object (`CarouselOptions.onPageChanged`, `Marker.onTap`, `RatingWidget.full`, `NavigationDelegate.*`) | 13 | 69 | Recursive prop encoding (05, problem A). 22 of the 69 are `infinite_scroll_pagination` delegates. |
| 5 | type the package's entry library does not export (`LatLng` from latlong2, `BaseCacheManager`, `http.Client`, vector_graphics enums) | 11 | 28 | Generator rule: import the declaring library, or list it in config. Crashed the generator when the type was an enum. |
| 6 | opaque or abstract class with no constructor JS can call (`LottieComposition`, rive `File` / `Artboard`, `CameraUpdate`, `MarkdownElementBuilder`) | 11 | 39 | Static-factory rule for some (`CameraUpdate.newLatLng`), object handles for others, Dart for user-subclassed ones. |
| 7 | void callback whose arguments cannot be encoded (`onMapCreated(controller)`, `onLinkTap(url, attributes, element)`) | 6 | 21 | Objects passed from Dart to JS in a callback (07: "not built"); the rest Dart. |
| 8 | parameter typed as a specific widget subclass (`ActionPane?`, `List<DropdownItem<T>>`, `Text`) | 3 | 9 | Generator rule: build the child's adapter inline instead of wrapping the node. Few packages, but it empties them. |
| 9 | callback returning a `Future` (`confirmDismiss`, `onRefresh`-style) | 3 | 9 | `_functionCallAsync` (05, already on `slivers`). |
| 10 | default value the generator cannot re-emit (`const {}`) | 3 | 5 | Generator fix. Drops `Html.style`. |
| 11 | binary data, streams, `BuildContext`, key | 6 | 9 | Binary transport; the rest are rare. |

And from the object / module generator (46 runs, 459 members not bridged, most of them platform-interface plumbing that an allow-list would remove), the ones that hit real API:

| reason | where it bit |
|---|---|
| extension methods are invisible | `permission_handler`: the entire API (`Permission.camera.request()`, `.status`, `.isGranted`) |
| a class with a const constructor and methods is taken for a record | `flutter_secure_storage`: `read` / `write` / `delete` not generated while the report says 5 of 5 |
| callback as a method argument | `flutter_local_notifications.initialize(onDidReceiveNotificationResponse:)` (silently dropped, optional), `webview_flutter.addJavaScriptChannel`, `sqflite.transaction`, `openDatabase(onCreate:)`, `firebase_auth.verifyPhoneNumber` |
| a record that should be an object, or the reverse | `audioplayers` (`play(Source)` wants an object, `UrlSource` is a record), `in_app_purchase` (`ProductDetails` loses its platform subclass) |
| object from another unit | `chewie` (`ChewieController(videoPlayerController:)`) |
| static factories on an abstract class | `google_maps_flutter` (`CameraUpdate`), `firebase_auth` credentials |
| TS emitter bugs | `sqflite` (a Dart parameter named `arguments`), `confetti` and `flutter_map` (an enum and a generated `…State` interface with the same name) |
| Dart emitter bugs | `pull_to_refresh` (`Future<void>?` awaited as non-null), `modal_bottom_sheet` (`FutureOr`), `flutter_map` (default regenerated as a const constructor that does not exist) |

### The few capabilities that move the most packages

1. **Recursive prop encoding (05 A) plus `Future` callbacks and callbacks as method arguments.** Unblocks `webview_flutter`, `google_maps_flutter` (markers), `flutter_rating_bar`, `flutter_local_notifications`, `sqflite`, half of `fl_chart`, and removes the caveat from `carousel_slider`, `firebase_auth`, `photo_view`. About 8 packages change class or lose a caveat.
2. **Builders with encodable arguments** (static slot for context-only builders, sync or windowed builder for indexed ones). Unblocks `cached_network_image`, `flutter_rating_bar`, the lazy constructors of `flutter_staggered_grid_view`, and restores the placeholder and error hooks of `flutter_svg`, `qr_flutter`, `mobile_scanner`, `pinput`, `flutter_spinkit`. 19 packages touched.
3. **Sync-return callbacks (05 B, deadline-bounded).** Unblocks `table_calendar` and the rest of `fl_chart`; restores validators and predicates in 17 more. It is the most frequent reason but mostly on optional hooks, and for per-item predicates it is the capability I would trust least: 42 calendar days times two predicates is 84 synchronous calls per build, 4 to 6 ms at report 05's debug-build figure of 43 to 68 µs per call.
4. **Three generator rules that need no bridge work**: typed widget slots (`flutter_slidable`, `dropdown_button2`), importing types from libraries the package does not export (`flutter_map`, and no more crashes), and extension methods plus static const instances (`permission_handler`). 4 packages change class.
5. **An object / record declaration in config** (one line per class): `flutter_secure_storage`, `audioplayers`, and cross-unit objects for `chewie`.

None of these moves a package out of D. The D reasons (a builder handed live Dart objects, an imperative function over `BuildContext`, object identity, a background isolate) are not bridge limits. What would shrink D is a small library of generic shims: a declarative host for `show…(context:, builder:)` functions would cover every modal, dialog and bottom-sheet package with one widget.

## TS or Dart

Counting packages, across the 64:

| what the package needs | now | once the C capabilities exist |
|---|---:|---:|
| nothing (generated API is the README API) | 31 | 36 |
| a TS wrapper: prop reshaping, defaults, renaming, small composition | 13 | 22 |
| a framework capability first | 14 | 0 |
| hand-written Dart | 5 | 5 |
| not bridged | 1 | 1 |

Counting omitted parameters and fields (349): 232 (66 %) are recovered by report 05's capabilities (103 sync callbacks, 76 builders with encodable or no arguments, 44 nested widgets / void callbacks / handles, 9 `Future` callbacks), 39 (11 %) by generator rules, and 78 (22 %) are inherently Dart (33 builders and 21 callbacks with unencodable arguments, 24 opaque or abstract classes). These three figures depend on capabilities the generator copies do not implement; they are counts of reasons, not of things that were made to work.

What the TS layer does, over the wrappers written:

| kind of translation | wrappers |
|---|---|
| rename, flatten a nested options object, give a constructor family one name | carousel, svg, lottie, photo, dots |
| value conversion (`Date`, colour to `ColorFilter`, name to tagged record or code point) | calendar, svg, animate, dots, fa-icon |
| unpack tuple callback arguments | calendar |
| hide a controller protocol behind promises or signals | pull-to-refresh, video, plugins (`createPlayer`, `useGoogleFont`) |
| compose two generated widgets | video (one extra node) |

None of it needs information that exists only on the Dart side. That is the test for "fits TS": the wrapper is a pure function of its props to one native node's props. It also means the wrapper can ship over the air and is type-checked against the generated props, so a package upgrade breaks it at compile time (report 06's `badges` demonstration).

What inherently needs Dart, and why:

1. **The package hands you an object that must stay in Dart** (rive's loaded file, typeahead's text controller, a purchase's platform details). JS can be told about it, but cannot be the one to hold it.
2. **The API is a function over `BuildContext`** (`showMaterialModalBottomSheet`, `FToast.init(context)`, `ChewieController.of(context)`). A generated module has no context; a widget does.
3. **The package calls you back many times per frame or per layout and needs an answer immediately** (`CustomPainter`-style hooks, per-day predicates). A synchronous bridge makes these possible; data in, logic in Dart makes them fast.
4. **Code that runs where there is no JS engine** (background isolates).
5. **Curation that changes semantics**, not shape: turning pull into push, or events into state. This is the part of the "nice API" that cannot be a TS wrapper, and it is where the 50 to 90 lines go.

### Per-render work of each TS wrapper

For the parallel overhead spike. "Remapped" means a prop whose value the wrapper computes; forwarded props go through `omit(props, ...)` and a spread. None of this was measured here.

| wrapper | lines | native nodes | extra nodes | props remapped per update | other per-render work |
|---|---:|---:|---:|---|---|
| `calendar.tsx` (`Calendar`) | 41 | 1 | 0 | up to 6 `Date` props, each to a 3-field object | `omit` over 9 keys + spread of about 30 forwarded props; 3 callbacks wrapped once, each call allocates 1 to 3 `Date`s |
| `carousel.tsx` (`Carousel`) | 24 | 1 | 0 | 1 (`options` rebuilt as one object from up to 23 flat props when any changes) | `omit` over 3 keys; children forwarded as the `items` prop |
| `svg.tsx` (`Svg`) | 20 | 1 | 0 | 2 (`src` renamed, `color` to a 3-field `ColorFilter`) | component chosen once from `src` (not reactive to a change of kind); `omit` + spread of about 10 props |
| `animate.ts` (`fade()`, ...) | 17 | 0 | 0 | none (no component) | 1 object spread per effect, the same allocation the raw API needs |
| `dots.tsx` (`Dots`) | 38 | 1 | 0 | 3 + 1 `effect` object of 6 fields from 6 flat props | no spread; every prop listed explicitly |
| `media.tsx` (`Lottie`, `Photo`) | 23 | 1 each | 0 | 1 each (`src` to a name or a 2-field record) | 1 regexp test; `omit` + spread |
| `fa-icon.tsx` (`FaIcon`) | 16 | 1 | 0 | 1 (table lookup) | `omit` + spread of 12 props |
| `pull-to-refresh.tsx` | 36 | 1 widget + 1 handle | 1 (default header slot) | 2 booleans | controller created once; each pull is 1 callback into JS and 1 RPC back |
| `video.tsx` (`Video`) | 35 | 1 widget + 1 handle | 1 (`View` for the aspect ratio) | 1 (ratio derived from the controller's mirrored `value`) | the mirrored `VideoPlayerValue` record is pushed on every position tick while playing; the ratio is recomputed on each push |
| `plugins.ts` | 37 | 0 | 0 | none | `useGoogleFont`: 1 bridge call per family, cached; `createPlayer().play`: 2 bridge calls instead of 1 |

Two patterns to watch in that spike: `omit` plus spread on a wide generated component (`TableCalendar` has 40 props, `Pinput` 56), and wrappers that rebuild a nested object from flat props, which resend the whole object when one field changes. `Dots` shows the alternative: no spread, explicit props, at the cost of exposing fewer of them.

## Packages shipping their own curated wrapper

The data supports a "Fuse library on npm that wraps a pub package" as generated bindings plus a thin TS layer, with a Dart file only for class D.

- **What such a package contains.** For classes A and B: a `fuse-packages` entry naming the pub dependency, the generated manifest and adapters, and `index.tsx` with the wrapper (20 to 40 lines here). For class D: one plain widget file like the four above, generated the same way. That is the existing packaging model in `extending/packaging.mdx` with the hand-written Dart replaced by generated Dart.
- **One open problem from report 06 blocks pre-generation**: Dart adapters are emitted from the analyzer, not from the manifest, and each unit carries its own copy of the shared codecs (602 KB of 871 KB of generated TS in this sample is shared value types repeated per unit). A library would either ship adapters generated against one Flutter version, or the app regenerates them at `fuse add` time from the library's config (`library`, `include`, declarations). The second is safer and costs the same 30 s.
- **What an agent can do in one sitting.** This spike is a fair measurement: one agent, one session, 64 packages generated and judged, 9 wrappers, 4 Dart shims and 20 example files, all type-checked. Per package the loop was: read the README example, read the generated props, write the example, see what is awkward, write the wrapper, run `tsc`. That was a few minutes for a class A or B package. The Dart shims took longer (reading the package's source for exact signatures) but all four analyzed clean on the first run. So a curated wrapper for a class A or B package is well within one sitting, tests on a device excluded; a class D package is one sitting for a first cut that covers the README example and nothing more.
- **What makes agents effective here** is exactly what `fuse add` already prints: the list of omitted parameters with reasons. Every class B wrapper and every class C verdict in this report started from that list. The catalogue should also list, per package, constructors skipped whole and callable members not bridged, because the two worst results (`permission_handler`, `flutter_secure_storage`) show nothing in the omitted list at all.
- **A curated layer is worth shipping for a minority.** 31 packages need nothing. For the 13 in B, the wrapper is small enough that an app can own it; a shared npm package pays off for the ones with data tables (`font_awesome_flutter`'s 2,858 icons) or protocol logic (`pull_to_refresh`, `video_player`), and for class D, where the Dart is the expensive part.

## Where the generated API is bad

- **Silent holes.** Coverage numbers do not show a missing main entry point: `Skeletonizer` (as-is), `Permission.*.request()`, `FlutterSecureStorage.read/write`, `Slidable.startActionPane`, `DropdownButton2.items`, `initialize(onDidReceiveNotificationResponse:)`. A check that the README's first identifier exists in the output would have caught most of them.
- **`DateTime`** has no usable form except the epoch constructor (optional positional parameters are dropped), and comes back as eight separate fields. The object generator's string codec for `DateTime` is not in the widget generator copy.
- **Constants on holder classes** (`FontAwesomeIcons`, `Icons`, `QrVersions`, `PhotoViewComputedScale`) are not generated. For icon packages that is the whole API.
- **Objects passed to JS in callbacks** arrive as meaningless records (`onMapCreated(controller)` gets a record of the controller's getters).
- **Named constructors** read badly (`LottieBuilderAsset`, `SvgPictureNetwork`, `PhotoViewGalleryBuilderCtor`).
- **`unknown`** where Dart has `dynamic` or a generic (`PhotoView.minScale`, `DropdownButton2.onChanged`).
- **Two generators, two handle types.** A controller from the object generator type-checks as a widget prop only because `FuseHandle<T>` is structurally loose; any handle is accepted anywhere.
- **Widgets that inspect their child's type** (`SmartRefresher` looks for a `ScrollView`, `Slidable` for an `ActionPane`, `TabBar`-style parents) receive a `FuseNodeWidget` wrapper instead. Typed slots are the visible case; the invisible ones only show at runtime.

## Not verified

- Nothing ran in a Flutter app, on a device, or through QuickJS. No widget was rendered, no plugin called, no wrapper executed. The classes are judgements from signatures and READMEs.
- Class C verdicts ("lands in A or B") assume report 05's nested refs, `Future` callbacks and deadline-bounded synchronous calls, and for five packages generator rules that do not exist. None of that was implemented in the copies used here.
- 23 packages have no example file and were judged from the generated signatures and the README alone: class A `pin_code_fields`, `signature`, `flutter_html`, `path_provider`, `file_picker`, `device_info_plus`, `share_plus`, `firebase_core`, `firebase_auth`, `just_audio`, `sensors_plus`; class B `camera`, `confetti`; class C `chewie`, `webview_flutter`, `flutter_rating_bar`, `permission_handler`, `flutter_secure_storage`, `flutter_local_notifications`, `sqflite`; class D `in_app_purchase`, `firebase_messaging`; class E `infinite_scroll_pagination`.
- The widget generator and the object generator are separate trees with separate support libraries and different tag conventions. Passing an object-generator handle to a widget-generator adapter type-checks; whether the adapter finds the Dart object was not run.
- Platform setup (permissions, `Info.plist`, Gradle, API keys for maps, Firebase options) is outside all of this.
- The `in_app_purchase` and `firebase_messaging` Dart was estimated, not written.
- Per-render cost of the wrappers is described, not measured.
- The pub.dev figures are one day's snapshot; the like ranking only reaches 100 packages through the API.
- `flutter_slidable` and `rive` were not run through the object generator (it crashed on the unexported-enum bug, which I fixed only in the widget generator copy).
- `experiments/interop/packages/` contains about 20 MB of generated output and logs, kept so the tables can be checked. It is not meant to be committed as is.

## How to rerun

```bash
cd experiments/interop/packages
./run.sh          # pub get, both generators over every package (about 35 min on 4 busy cores), TS emit, tables, tsc, flutter analyze
./run.sh check    # only: TS emit, tables, tsc --strict, flutter analyze on what is already generated (about 1 min)

# one package
scripts/gen_widgets.sh shimmer shimmer.dart                  # -> manifests/, host/lib/_generated/, out/widgets/
scripts/gen_module.sh url_launcher url_launcher.dart         # -> host/ts/generated/, host/lib/generated/, host/out/
bun scripts/emit_ts.ts                                       # manifests -> ts/generated/*.ts
python3 -I scripts/show.py shimmer                           # constructors, omitted parameters, skipped constructors
python3 -I scripts/props.py shimmer ShimmerFromColors        # compact view of a generated TS interface
(cd ts && tsc -p tsconfig.check.json)                        # strict; excludes the 3 generated modules that do not compile
```

Layout:

```
packages/
  sample/                 pub.dev API responses: top_likes.txt, scores.txt, cands.txt
  classification.tsv      package, kind, class, sub-reason, note (the judgement column of the table)
  gen/                    widget generator copy (fix 1, fix 2, per-unit timing)
  cli/gen-emit.ts         manifest -> TS emitter, unmodified copy
  host/                   Flutter package depending on all 64; tool/ = object + module generator copy
    lib/fuse/*.dart       the four hand-written escape-hatch widgets
    lib/_generated/       GENERATED widget adapters      lib/generated/   GENERATED handles and modules
    ts/generated/         GENERATED plugin modules       out/*.report.json  per-package member reports
  manifests/              GENERATED <unit>.manifest.json
  ts/generated/           GENERATED widget wrapper modules
  ts/wrappers/            the ten hand-written TS wrapper files
  ts/examples/{a,b,c,d,plugins}/   README examples, by class
  out/                    package-table.md, widgets-table.md (+ .asis), modules-table.md, *-stats.json,
                          analyze-*.txt, widgets/<pkg>.{job.json,summary.json,log,time}, modules/<pkg>.{log,time}
  scripts/                gen_widgets.sh, gen_module.sh, emit_ts.ts, stats.py, module_stats.py, table.py, show.py, props.py, readme.py
```

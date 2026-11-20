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

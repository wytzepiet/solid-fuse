// Hand-written escape hatch for rive 0.14 (class D: builder with unencodable arguments).
// The package's entry point is `RiveWidgetBuilder(fileLoader:, builder: (context, state) => ...)`,
// where `state` carries a native `File` and a `RiveWidgetController`. Neither can cross to JS,
// so the builder is closed over here and the choices are exposed as plain values.
import 'package:flutter/widgets.dart';
import 'package:rive/rive.dart';

class RiveAsset extends StatefulWidget {
  const RiveAsset({
    super.key,
    required this.src,
    this.artboard,
    this.stateMachine,
    this.fit = Fit.contain,
    this.alignment = Alignment.center,
    this.useFlutterRenderer = false,
    this.placeholder,
    this.onLoaded,
    this.onFailed,
  });

  /// An asset path or an http(s) URL of a .riv file.
  final String src;
  final String? artboard;
  final String? stateMachine;
  final Fit fit;
  final Alignment alignment;
  final bool useFlutterRenderer;

  /// Shown while loading and when loading fails.
  final Widget? placeholder;
  final VoidCallback? onLoaded;
  final ValueChanged<String>? onFailed;

  @override
  State<RiveAsset> createState() => _RiveAssetState();
}

class _RiveAssetState extends State<RiveAsset> {
  late FileLoader _loader = _makeLoader();

  FileLoader _makeLoader() {
    final factory = widget.useFlutterRenderer ? Factory.flutter : Factory.rive;
    return widget.src.startsWith('http')
        ? FileLoader.fromUrl(widget.src, riveFactory: factory)
        : FileLoader.fromAsset(widget.src, riveFactory: factory);
  }

  @override
  void didUpdateWidget(RiveAsset old) {
    super.didUpdateWidget(old);
    if (old.src != widget.src || old.useFlutterRenderer != widget.useFlutterRenderer) {
      _loader.dispose();
      _loader = _makeLoader();
    }
  }

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final artboard = widget.artboard;
    final stateMachine = widget.stateMachine;
    return RiveWidgetBuilder(
      fileLoader: _loader,
      artboardSelector: artboard == null ? const ArtboardDefault() : ArtboardNamed(artboard),
      stateMachineSelector: stateMachine == null ? const StateMachineDefault() : StateMachineNamed(stateMachine),
      onLoaded: (_) => widget.onLoaded?.call(),
      onFailed: (error, _) => widget.onFailed?.call('$error'),
      builder: (context, state) => switch (state) {
        RiveLoaded() => RiveWidget(controller: state.controller, fit: widget.fit, alignment: widget.alignment),
        RiveLoading() || RiveFailed() => widget.placeholder ?? const SizedBox.shrink(),
      },
    );
  }
}

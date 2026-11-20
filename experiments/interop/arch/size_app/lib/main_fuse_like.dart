import 'package:flutter/material.dart';

// Approximates what solid_fuse's 9 built-in builders already pin today
// (view, text, icon, gestureDetector, navigator, scrollView, stack, positioned,
// textField + focusNode/scrollController/materialPage handles).
@pragma('vm:entry-point')
final Map<String, Function> table = <String, Function>{
  'Flex': Flex.new, 'Padding': Padding.new, 'Align': Align.new, 'ClipRRect': ClipRRect.new,
  'ClipRect': ClipRect.new, 'DecoratedBox': DecoratedBox.new, 'AspectRatio': AspectRatio.new,
  'SizedBox': SizedBox.new, 'ConstrainedBox': ConstrainedBox.new, 'Opacity': Opacity.new,
  'Transform': Transform.new, 'IgnorePointer': IgnorePointer.new, 'Visibility': Visibility.new,
  'Flexible': Flexible.new, 'Text': Text.new, 'Icon': Icon.new, 'GestureDetector': GestureDetector.new,
  'Navigator': Navigator.new, 'SingleChildScrollView': SingleChildScrollView.new, 'Stack': Stack.new,
  'Positioned': Positioned.new, 'TextField': TextField.new, 'MaterialPage': MaterialPage<void>.new,
  'Material': Material.new,
};

void main() {
  final f = table[String.fromEnvironment('W', defaultValue: 'Text')];
  runApp(MaterialApp(home: Scaffold(body: Center(child: Text('${f.runtimeType} ${table.length}')))));
}

// Part 2/3: generate Dart adapters + .d.ts for a list of widget classes.
//
//   dart run tool/generate.dart --name flutter --widgets Text,Container,ListView.builder
//   dart run tool/generate.dart --name fl_chart --lib package:fl_chart/fl_chart.dart=fl_chart --all-from package:fl_chart/fl_chart.dart
//
// Flags: --no-overrides (pure derived codecs), --docs none|first|full,
//        --max-consts N (cap for static-const namespaces such as Icons).
import 'dart:convert';
import 'dart:io';

import 'src/classify.dart';
import 'src/gen.dart';
import 'src/overrides.dart';
import 'src/world.dart';

const defaultWidgets = [
  'Text', 'Container', 'Padding', 'GestureDetector', 'Opacity', 'Icon',
  'ElevatedButton', 'ElevatedButton.icon', 'ListTile', 'Switch', 'Slider', 'AppBar', 'Scaffold',
  'SliverAppBar', 'CupertinoButton', 'CupertinoButton.filled', 'AnimatedContainer', 'Wrap',
  // extra probes for the awkward cases
  'Column', 'Stack', 'Image.network', 'Image.asset', 'ListView', 'ListView.builder',
  'TextField', 'DropdownButton', 'Checkbox', 'Radio', 'CustomScrollView', 'BottomNavigationBar',
  'Text.rich', 'CircularProgressIndicator', 'Card', 'Tooltip',
];

Future<void> main(List<String> args) async {
  var name = 'flutter';
  var widgets = defaultWidgets;
  final extra = <(String, String)>[];
  String? allFrom;
  var useOverrides = true;
  var docs = 'first';
  var maxConsts = 400;
  for (var i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
        name = args[++i];
      case '--widgets':
        widgets = args[++i].split(',');
      case '--lib':
        final parts = args[++i].split('=');
        extra.add((parts[0], parts[1]));
      case '--all-from':
        allFrom = args[++i];
      case '--no-overrides':
        useOverrides = false;
      case '--docs':
        docs = args[++i];
      case '--max-consts':
        maxConsts = int.parse(args[++i]);
    }
  }
  final sw = Stopwatch()..start();
  final w = await World.load('.', extraLibs: extra);
  final c = Classifier(w, maxConsts: maxConsts, codecTypes: useOverrides ? {for (final o in defaultOverrides) o.type} : const {});
  final g = Generator(w, c, overrides: useOverrides ? defaultOverrides : const [], docs: docs, tagPrefix: name == 'flutter' ? 'gen_' : '${name}_');
  if (allFrom != null) {
    final classes = w.widgetsOf(allFrom)..sort((a, b) => a.name!.compareTo(b.name!));
    widgets = [
      for (final k in classes)
        // only classes declared by that package
        if (k.library.uri.toString().startsWith(allFrom.substring(0, allFrom.indexOf('/'))))
          for (final ctor in k.constructors.where((x) => x.isPublic && !x.metadata.hasDeprecated))
            (ctor.name == null || ctor.name == 'new') ? k.name! : '${k.name}.${ctor.name}',
    ];
  }
  for (final spec in widgets) {
    g.addWidget(spec, libUri: allFrom);
  }
  final out = g.finish(name);
  if (!useOverrides && !name.endsWith('_derived')) name = '${name}_derived';
  File('lib/generated/$name.g.dart').writeAsStringSync(out.dart);
  File('ts/generated/$name.d.ts').writeAsStringSync(out.ts);
  final ok = g.reports.where((r) => r.skipped == null).toList();
  final summary = {
    'name': name,
    'overrides': useOverrides,
    'widgetsRequested': g.reports.length,
    'widgetsEmitted': ok.length,
    'paramsTotal': ok.fold<int>(0, (a, r) => a + r.params),
    'paramsEmitted': ok.fold<int>(0, (a, r) => a + r.emitted),
    'dartBytes': out.dart.length,
    'dartLines': '\n'.allMatches(out.dart).length,
    'dartAdapterLines': ok.fold<int>(0, (a, r) => a + r.dartLines),
    'dartCodecLines': out.codecLines,
    'tsBytes': out.ts.length,
    'tsWidgetBytes': ok.fold<int>(0, (a, r) => a + r.tsBytes),
    'tsSharedBytes': out.tsSharedBytes,
    'decoders': g.decoderCount,
    'encoders': g.encoderCount,
    'enums': g.enumCount,
    'data': g.dataStats(),
    'warnings': g.warnings.toSet().toList(),
    'widgets': [for (final r in g.reports) r.toJson()],
  };
  File('out/$name.report.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(summary));
  stderr.writeln('$name: ${ok.length}/${g.reports.length} widgets, '
      '${summary['paramsEmitted']}/${summary['paramsTotal']} params, '
      '${summary['dartLines']} lines Dart (${summary['dartAdapterLines']} adapters + ${summary['dartCodecLines']} codecs), '
      '${out.ts.length} bytes d.ts, ${g.decoderCount} decoders, ${g.encoderCount} encoders, ${g.enumCount} enums, '
      '${sw.elapsedMilliseconds}ms');
  for (final r in g.reports.where((r) => r.skipped != null)) {
    stderr.writeln('  SKIPPED ${r.component}: ${r.skipped}');
  }
}

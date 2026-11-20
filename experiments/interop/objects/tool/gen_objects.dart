// Part 3: generate Dart handles + TS factories for the classes listed in a
// declaration file.
//
//   dart run tool/gen_objects.dart [fuse.objects.json]
//
// Output: lib/generated/<name>.g.dart, ts/generated/<name>.ts, out/<name>.report.json
import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';

import 'src/classify.dart';
import 'src/gen.dart';
import 'src/objects.dart';
import 'src/overrides.dart';
import 'src/world.dart';

Future<void> main(List<String> args) async {
  final declPath = args.isEmpty ? 'fuse.objects.json' : args.first;
  final decl = jsonDecode(File(declPath).readAsStringSync()) as Map<String, dynamic>;
  final name = decl['name'] as String? ?? 'objects';
  final libs = (decl['libs'] as Map<String, dynamic>? ?? {}).entries.map((e) => (e.key, e.value as String)).toList();
  final sw = Stopwatch()..start();
  final w = await World.load('.', extraLibs: libs);
  final c = Classifier(w,
      codecTypes: {for (final o in defaultOverrides) o.type},
      encTypes: {for (final o in defaultOverrides) if (o.encode != null) o.type});
  final g = Generator(w, c, docs: decl['docs'] as String? ?? 'first', tagPrefix: 'gen_');
  final objs = (decl['objects'] as Map<String, dynamic>);
  final om = ObjectModeler(w, c, objectNames: objs.keys.toSet());
  final oe = ObjectEmitter(g, om, tagPrefix: decl['tagPrefix'] as String? ?? 'gen_');

  final els = <String, ClassElement>{};
  for (final n in objs.keys) {
    Element? el;
    for (final e in w.entries) {
      el = e.element.exportNamespace.get2(n);
      if (el != null) break;
    }
    if (el is! ClassElement) {
      stderr.writeln('  NOT FOUND: $n');
      continue;
    }
    els[n] = el;
    oe.declare(el);
  }
  for (final e in els.entries) {
    final t = w.ts.instantiateInterfaceToBounds(element: e.value, nullabilitySuffix: NullabilitySuffix.none);
    oe.emit(t, ObjDecl.fromJson(e.key, (objs[e.key] as Map).cast<String, dynamic>()));
  }
  final out = g.finishObjects(name, objects: oe, package: 'fuse_objects_spike');
  File('lib/generated/$name.g.dart').writeAsStringSync(out.dart);
  File('ts/generated/$name.ts').writeAsStringSync(out.ts);
  final report = {
    'name': name,
    'objects': oe.reports,
    'dartLines': '\n'.allMatches(out.dart).length,
    'codecLines': out.codecLines,
    'tsLines': '\n'.allMatches(out.ts).length,
    'decoders': g.decoderCount,
    'encoders': g.encoderCount,
    'warnings': g.warnings.toSet().toList(),
  };
  File('out/$name.report.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(report));
  stderr.writeln('$name: ${oe.reports.length} objects, ${report['dartLines']} lines Dart (${out.codecLines} codecs), ${report['tsLines']} lines TS, ${sw.elapsedMilliseconds}ms');
  for (final r in oe.reports) {
    stderr.writeln('  ${r['class']}: ctors ${r['ctors']}, methods ${(r['methods'] as List).length}/${r['methodsTotal']}, '
        'readable ${(r['readable'] as List).length}/${r['gettersTotal']}, setters ${(r['setters'] as List).length}/${r['settersTotal']}, '
        'mirrored ${r['mirrored']}, streams ${r['streams']}, ${r['dartLines']} Dart / ${r['tsLines']} TS lines');
  }
  for (final x in g.warnings.toSet()) {
    stderr.writeln('  warning: $x');
  }
}

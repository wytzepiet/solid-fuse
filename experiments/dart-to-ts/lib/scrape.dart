/// Baseline experiment: statically scrape solid-fuse Dart widget builders for
/// the props they read off `FuseNode`, and infer a TS type for each one.
///
/// Parse-only (no type resolution), so it runs on the plain Dart SDK without
/// resolving `package:flutter`. That's the point of the baseline: see how much
/// we get from syntax alone before reaching for annotations or a schema.
library;

import 'dart:io';

import 'package:analyzer/dart/analysis/features.dart';
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

/// FuseNode accessor → TS type (names refer to `packages/solid-fuse/src/types.ts`).
const accessorTypes = <String, String>{
  'string': 'string',
  'double': 'number',
  'int': 'number',
  'bool': 'boolean',
  'color': 'ColorInput',
  'edgeInsets': 'EdgeInsetsInput',
  'borderRadius': 'BorderRadiusInput',
  'border': 'BorderInput',
  'boxShadows': 'ShadowInput | ShadowInput[]',
  'gradient': 'GradientInput',
  'decorationImage': 'DecorationImageInput',
  'boxDecoration': 'BoxDecorationInput',
  'offset': '{ x: number; y: number }',
  'alignment': 'AlignmentString',
  'blendMode': 'BlendModeString',
  'clipBehavior': 'ClipString',
  'fontWeight': 'FontWeight',
  'map': 'Record<string, unknown>',
  'list': 'unknown[]',
  'callback': '(value?: unknown) => void',
  'widget': 'JSX.Element',
  'handle': 'unknown',
};

class Prop {
  Prop(this.name, this.accessor);
  final String name;
  final String accessor;

  /// String literals the builder compares this prop against (enum candidates).
  final Set<String> literals = {};

  String get tsType {
    if (accessor == 'string' && literals.isNotEmpty) {
      return (literals.toList()..sort()).map((l) => "'$l'").join(' | ');
    }
    return accessorTypes[accessor] ?? 'unknown';
  }
}

class WidgetInfo {
  WidgetInfo(this.className, this.file);
  final String className;
  final String file;
  String? tag;
  final Map<String, Prop> props = {};

  /// Accessor calls whose key isn't a string literal — the scraper can't name
  /// these (e.g. `node.callback(name)` inside a loop over event names).
  final List<String> dynamicKeys = [];
}

/// Scrapes every `class X` in [files] that reads from a FuseNode.
List<WidgetInfo> scrapeWidgets(Iterable<File> files) {
  final out = <WidgetInfo>[];
  for (final f in files) {
    final unit = parseFile(
      path: f.absolute.path,
      featureSet: FeatureSet.latestLanguageVersion(),
    ).unit;
    final helpers = _stringLiteralHelpers(unit);
    for (final decl in unit.declarations.whereType<ClassDeclaration>()) {
      final info = WidgetInfo(decl.namePart.typeName.lexeme, f.path);
      decl.accept(_PropVisitor(info, helpers));
      if (info.props.isNotEmpty || info.dynamicKeys.isNotEmpty) out.add(info);
    }
  }
  return out;
}

/// Reads `runtime.registerWidget('tag', Class.new)` calls → {Class: tag}.
Map<String, String> scrapeRegistrations(File file) {
  final unit = parseFile(
    path: file.absolute.path,
    featureSet: FeatureSet.latestLanguageVersion(),
  ).unit;
  final tags = <String, String>{};
  unit.accept(_RegisterVisitor(tags));
  return tags;
}

class _RegisterVisitor extends RecursiveAstVisitor<void> {
  _RegisterVisitor(this.tags);
  final Map<String, String> tags;

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.methodName.name == 'registerWidget') {
      final args = node.argumentList.arguments;
      if (args.length == 2 && args[0] is SimpleStringLiteral) {
        final tag = (args[0] as SimpleStringLiteral).value;
        final ctor = args[1].toSource().replaceAll(RegExp(r'\.new$'), '');
        tags[ctor] = tag;
      }
    }
    super.visitMethodInvocation(node);
  }
}

/// Top-level/private functions in the file that switch on string literals,
/// e.g. `_parseTextAlign(String? v) => switch (v) { 'left' => ..., }`.
/// Returns {functionName: literals}.
Map<String, Set<String>> _stringLiteralHelpers(CompilationUnit unit) {
  final result = <String, Set<String>>{};
  void collect(String name, AstNode body) {
    final lits = <String>{};
    body.accept(_CaseLiteralCollector(lits));
    if (lits.isNotEmpty) result[name] = lits;
  }

  for (final d in unit.declarations) {
    if (d is FunctionDeclaration) collect(d.name.lexeme, d);
    if (d is ClassDeclaration) {
      final body = d.body;
      if (body is BlockClassBody) {
        for (final m in body.members.whereType<MethodDeclaration>()) {
          collect(m.name.lexeme, m);
        }
      }
    }
  }
  return result;
}

class _CaseLiteralCollector extends RecursiveAstVisitor<void> {
  _CaseLiteralCollector(this.out);
  final Set<String> out;

  @override
  void visitConstantPattern(ConstantPattern node) {
    final e = node.expression;
    if (e is SimpleStringLiteral) out.add(e.value);
    super.visitConstantPattern(node);
  }

  @override
  void visitSwitchCase(SwitchCase node) {
    final e = node.expression;
    if (e is SimpleStringLiteral) out.add(e.value);
    super.visitSwitchCase(node);
  }
}

class _PropVisitor extends RecursiveAstVisitor<void> {
  _PropVisitor(this.info, this.helpers);
  final WidgetInfo info;
  final Map<String, Set<String>> helpers;

  bool _isNodeTarget(Expression? t) {
    if (t == null) return false;
    final s = t.toSource();
    return s == 'node' || s.endsWith('.node');
  }

  Prop _prop(String name, String accessor) =>
      info.props.putIfAbsent(name, () => Prop(name, accessor));

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final accessor = node.methodName.name;
    if (_isNodeTarget(node.target) && accessorTypes.containsKey(accessor)) {
      final args = node.argumentList.arguments;
      if (args.isNotEmpty && args.first is SimpleStringLiteral) {
        final prop = _prop((args.first as SimpleStringLiteral).value, accessor);
        _collectLiterals(node, prop);
      } else if (args.isNotEmpty) {
        info.dynamicKeys.add(node.toSource());
      }
    }
    super.visitMethodInvocation(node);
  }

  /// `node.props['key']` (optionally `as bool?`).
  @override
  void visitIndexExpression(IndexExpression node) {
    final t = node.target;
    final idx = node.index;
    if (t is PrefixedIdentifier &&
        t.identifier.name == 'props' &&
        t.prefix.name == 'node' &&
        idx is SimpleStringLiteral) {
      final parent = node.parent;
      var accessor = 'unknown';
      if (parent is AsExpression) {
        final ty = parent.type.toSource().replaceAll('?', '');
        accessor = switch (ty) {
          'bool' => 'bool',
          'String' => 'string',
          'num' || 'double' || 'int' => 'double',
          _ => 'unknown',
        };
      }
      _prop(idx.value, accessor);
    }
    super.visitIndexExpression(node);
  }

  /// Enum inference for string props: `node.string('x') == 'lit'`, and
  /// `helper(node.string('x'))` where helper switches on string literals.
  void _collectLiterals(MethodInvocation call, Prop prop) {
    if (prop.accessor != 'string') return;
    final parent = call.parent;
    if (parent is BinaryExpression) {
      final other = parent.leftOperand == call
          ? parent.rightOperand
          : parent.leftOperand;
      if (other is SimpleStringLiteral) prop.literals.add(other.value);
    }
    if (parent is ArgumentList) {
      final fn = parent.parent;
      if (fn is MethodInvocation) {
        prop.literals.addAll(helpers[fn.methodName.name] ?? const {});
      }
    }
    if (parent is SwitchExpression || parent is SwitchStatement) {
      parent!.accept(_CaseLiteralCollector(prop.literals));
    }
  }
}

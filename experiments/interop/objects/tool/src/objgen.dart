// Emitter for the "object" kind: one Dart FuseHandle subclass + one TS
// factory per class with identity. Shares the codec machinery of gen.dart
// (dec/enc/ts/tsOut) so records and enums cross by exactly the same rules as
// widget props.
part of 'gen.dart';

class MirrorDecl {
  MirrorDecl({this.guard, this.seed});
  final String? guard; // Dart expression over `o` (the wrapped object)
  final String? seed; // constructor parameter the JS signal starts from
}

/// One entry of the declaration file (fuse.objects.json).
class ObjDecl {
  ObjDecl(this.name);
  final String name;
  Map<String, MirrorDecl>? mirror; // null = default rule
  Set<String> exclude = {};
  Set<String>? methods; // allow-list; null = every method the rules can bridge
  Set<String>? ctors; // null = all usable
  bool wrapOnly = false; // never constructed from JS (ScrollPosition)

  static ObjDecl fromJson(String name, Map<String, dynamic> j) {
    final d = ObjDecl(name);
    final m = j['mirror'];
    if (m is List) {
      d.mirror = {for (final n in m) n as String: MirrorDecl()};
    } else if (m is Map) {
      d.mirror = {
        for (final e in m.entries)
          e.key as String: MirrorDecl(guard: (e.value as Map?)?['guard'] as String?, seed: (e.value as Map?)?['seed'] as String?)
      };
    }
    d.exclude = {...?(j['exclude'] as List?)?.cast<String>()};
    d.methods = (j['methods'] as List?)?.cast<String>().toSet();
    d.ctors = (j['ctors'] as List?)?.cast<String>().toSet();
    d.wrapOnly = j['wrapOnly'] == true;
    return d;
  }
}

const _tsReserved = {
  'default', 'function', 'in', 'new', 'delete', 'class', 'var', 'let', 'const', 'switch', 'case', 'for', 'if',
  'else', 'do', 'while', 'return', 'this', 'typeof', 'void', 'with', 'yield', 'enum', 'export', 'import', 'super',
  'null', 'true', 'false', 'try', 'catch', 'finally', 'throw', 'break', 'continue', 'instanceof', 'extends',
  'opts', 'o', 'm',
};

String _tsId(String n) => _tsReserved.contains(n) ? '${n}_' : n;
String _cap(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

/// How one callable (constructor, method, function) crosses: Dart argument
/// list decoded from a map, TS parameter list packed into that map.
class Shape {
  final dartPos = <String>[];
  final dartNamed = <String>[];
  final tsPos = <String>[];
  final tsNamed = <String>[];
  final packPos = <String>[];
  var namedRequired = false;
  var namedNeedsRef = <String>[];
  final dropped = <String, String>{};
  final kept = <String>[];
  String? fail;

  String get dartArgs => [...dartPos, ...dartNamed].join(', ');

  String tsParams({String? optsType}) {
    final ps = [...tsPos];
    if (tsNamed.isNotEmpty) {
      final t = optsType ?? '{ ${tsNamed.join('; ')} }';
      ps.add(namedRequired ? 'opts: $t' : 'opts?: $t');
    }
    return ps.join(', ');
  }

  String get tsOptsLiteral => '{ ${tsNamed.join('; ')} }';

  /// JS expression building the wire map.
  String get tsPack {
    final parts = [...packPos];
    if (tsNamed.isNotEmpty) {
      parts.add('...opts');
      for (final n in namedNeedsRef) {
        parts.add('${_tsProp(n)}: objRef(opts${namedRequired ? '' : '?'}.${_tsId(n) == n ? n : '["$n"]'})');
      }
    }
    return parts.isEmpty ? '{}' : '{ ${parts.join(', ')} }';
  }

  static String _tsProp(String n) => RegExp(r'^[A-Za-z_$][A-Za-z0-9_$]*$').hasMatch(n) ? n : '"$n"';
}

class ObjectEmitter {
  ObjectEmitter(this.g, this.om, {this.tagPrefix = 'gen_'});
  final Generator g;
  final ObjectModeler om;
  final String tagPrefix;

  final dart = StringBuffer();
  final ts = StringBuffer();
  final registrations = <String>[];
  final reports = <Map<String, Object?>>[];
  final _set = <InterfaceElement, String>{}; // generated object classes -> TS name

  World get w => g.w;

  void declare(InterfaceElement el) => _set[el] = el.name!;

  String tag(InterfaceElement el) => '$tagPrefix${el.name}';

  /// TS brand names: the class and every supertype, so a handle is accepted
  /// wherever a supertype is expected (AnimationController as Animation).
  List<String> brands(InterfaceType t) => [
        t.element.name!,
        for (final s in t.allSupertypes)
          if (!s.isDartCoreObject && s.element.isPublic && s.element.name != 'Diagnosticable') s.element.name!
      ];

  /// An object-typed *argument* is accepted when some generated class is a
  /// subtype of it.
  bool argObjectOk(DartType t) {
    final nn = w.ts.promoteToNonNull(t);
    if (nn is! InterfaceType) return false;
    return _set.keys.any((e) => e == nn.element || e.allSupertypes.any((s) => s.element == nn.element));
  }

  /// An object-typed *result* is adoptable when its static type is generated.
  InterfaceElement? retObject(DartType? t) {
    if (t == null) return null;
    final nn = w.ts.promoteToNonNull(t);
    if (nn is! InterfaceType) return null;
    return _set.containsKey(nn.element) ? nn.element : null;
  }

  // ── callable shape ───────────────────────────────────────────────────────

  Shape shape(List<ParamM> params, String owner, String src,
      {bool ctor = false, String Function(ParamM p)? objectExpr, String objTsType = 'FuseObject'}) {
    final s = Shape();
    var cut = false;
    for (final p in params) {
      final name = p.name;
      final from = "$src['$name']";
      String? expr;
      String? tsT;
      var needsRef = false;
      String? drop;
      if (p.el.metadata.hasDeprecated) {
        drop = 'deprecated';
      } else if (cut && p.el.isOptionalPositional) {
        drop = 'after a dropped optional positional';
      } else if (p.kind == 'data') {
        expr = g.argExpr(P(p.el, p.type, p.cls!), from, owner);
        if (expr == null) drop = 'default value not reproducible';
        tsT = g.ts(p.type);
      } else if (p.kind == 'object' && argObjectOk(p.type)) {
        final tn = g.tc(g.nn(p.type));
        expr = objectExpr != null ? objectExpr(p) : 'fuseObjArg<$tn>(node, $from)';
        if (p.mustSupply) {
          expr = "fuseReq($expr, '$owner', '$name')";
        } else if (!p.nullable) {
          drop = 'object with non-null default';
        }
        tsT = '$objTsType<"${g.nn(p.type).element!.name}">';
        needsRef = true;
      } else if (p.kind == 'object') {
        drop = 'object type ${p.type.getDisplayString()} is not a generated object';
      } else if (p.kind == 'callback' && ctor) {
        final cb = p.cls!.cb!;
        final real = <(int, CbArg)>[];
        for (var i = 0; i < cb.args.length; i++) {
          if (cb.args[i].enc.kind != 'context') real.add((i, cb.args[i]));
        }
        final argList = [for (var i = 0; i < cb.args.length; i++) 'a$i'].join(', ');
        final payload = real.isEmpty
            ? ''
            : real.length == 1
                ? ', ${g.enc(real[0].$2.type, real[0].$2.enc, 'a${real[0].$1}')}'
                : ', [${real.map((r) => g.enc(r.$2.type, r.$2.enc, 'a${r.$1}')).join(', ')}]';
        // Lazy: function props arrive as setProp ops *after* create.
        expr = "($argList) { if ($from == true) node.callFunction(node.id, '$name'$payload); }";
        tsT = g._tsCallback(cb);
      } else if (p.kind == 'env-vsync' && ctor) {
        expr = 'this';
      } else if (ctor && p.cls?.family == 'callback' && p.cls!.cb!.ret == 'void' && !p.el.metadata.hasDeprecated) {
        // A void callback JS cannot receive (its arguments do not encode, e.g.
        // ScrollController.onAttach(ScrollPosition)) is still a signal that
        // state may have changed without a Listenable notification.
        final n = p.cls!.cb!.type.formalParameters.where((x) => x.isPositional).length;
        expr = '(${[for (var i = 0; i < n; i++) '_a$i'].join(', ')}) => refreshSoon()';
        s.dropped[name] = 'not exposed to JS (${p.why ?? p.kind}); wired to a state refresh';
      } else {
        drop = '${p.kind}${p.why == null ? '' : ' (${p.why})'}';
      }

      if (drop != null) {
        if (p.mustSupply) {
          s.fail = '$name: $drop';
          return s;
        }
        s.dropped[name] = drop;
        if (p.el.isRequired) {
          if (p.el.isPositional) {
            s.dartPos.add('null');
          } else {
            s.dartNamed.add('$name: null');
          }
        } else if (p.el.isOptionalPositional) {
          cut = true;
        }
        continue;
      }
      if (p.el.isPositional) {
        s.dartPos.add(expr!);
      } else {
        s.dartNamed.add('$name: ${expr!}');
      }
      if (tsT == null) continue; // environmental
      s.kept.add(name);
      final cls = p.cls;
      final loose = cls != null && (cls.family == 'dynamic' || cls.family == 'generic') && cls.coll == null;
      final optional = !p.mustSupply && !(loose && p.el.isRequired);
      var full = tsT;
      if (p.nullable && !loose) full = tsT.contains('=>') ? '($tsT) | null' : '$tsT | null';
      if (p.el.isPositional) {
        final id = _tsId(name);
        s.tsPos.add('$id${optional ? '?' : ''}: $full');
        s.packPos.add(needsRef
            ? '${Shape._tsProp(name)}: objRef($id)'
            : id == name
                ? name
                : '${Shape._tsProp(name)}: $id');
      } else {
        s.tsNamed.add('${Shape._tsProp(name)}${optional ? '?' : ''}: $full');
        if (!optional) s.namedRequired = true;
        if (needsRef) s.namedNeedsRef.add(name);
      }
    }
    return s;
  }

  /// TS type of an encoded result.
  String tsRet(RetM r) {
    switch (r.kind) {
      case 'void':
        return 'void';
      case 'value':
        final t = r.value!;
        final s = g.tsOut(t, r.enc!);
        return g.nullable(t) && r.enc!.kind != 'generic' ? '$s | null' : s;
    }
    return 'unknown';
  }

  // ── one object ───────────────────────────────────────────────────────────

  void emit(InterfaceType t, ObjDecl decl) {
    final o = om.model(t);
    final el = t.element;
    final name = el.name!;
    final cls = 'Gen${name}Handle';
    final tagName = tag(el);
    final tn = g.tc(t);
    final rep = <String, Object?>{'class': name, 'tag': tagName};
    reports.add(rep);
    final droppedMembers = <String, String>{};
    bool wanted(String n) => !decl.exclude.contains(n);

    // constructors
    final ctors = <(CtorM, Shape)>[];
    final ctorDropped = <String, String>{};
    if (!decl.wrapOnly) {
      for (final k in o.ctors) {
        if (decl.ctors != null && !decl.ctors!.contains(k.name.isEmpty ? 'new' : k.name)) continue;
        final s = shape(k.params, '$name${k.name.isEmpty ? '' : '.${k.name}'}', 'p', ctor: true);
        if (s.fail != null) {
          droppedMembers['constructor ${k.name.isEmpty ? name : '$name.${k.name}'}'] = s.fail!;
          continue;
        }
        s.dropped.forEach((n, why) => ctorDropped['${k.name.isEmpty ? '' : '${k.name}.'}$n'] = why);
        ctors.add((k, s));
      }
    }
    final needsVsync = ctors.any((c) => c.$1.params.any((p) => p.kind == 'env-vsync'));

    // methods
    final methods = <(MethodM, Shape)>[];
    final streamMethods = <(MethodM, Shape)>[];
    for (final m in o.methods) {
      if (!wanted(m.name) || (decl.methods != null && !decl.methods!.contains(m.name))) {
        droppedMembers['${m.name}()'] = 'excluded by declaration';
        continue;
      }
      if (!m.ok) {
        droppedMembers['${m.name}()'] = m.blocker!;
        continue;
      }
      if (m.ret.kind == 'object' && retObject(m.ret.value) == null) {
        droppedMembers['${m.name}()'] = 'returns ${m.ret.value!.getDisplayString()}, not a generated object';
        continue;
      }
      if (const {'node', 'dispose'}.contains(m.name)) {
        droppedMembers['${m.name}()'] = 'name collides with the handle API';
        continue;
      }
      final s = shape(m.params, '$name.${m.name}', 'a');
      if (s.fail != null) {
        droppedMembers['${m.name}()'] = s.fail!;
        continue;
      }
      s.dropped.forEach((n, why) => droppedMembers['${m.name}($n)'] = why);
      (m.ret.kind == 'stream' ? streamMethods : methods).add((m, s));
    }

    // The generic accessors are `get` / `set` unless the class has its own.
    final getName = o.methods.any((m) => m.name == 'get') ? 'getProperty' : 'get';
    final setName = o.methods.any((m) => m.name == 'set') ? 'setProperty' : 'set';

    // getters
    final readable = <GetterM>[];
    final objGetters = <GetterM>[];
    final streams = <GetterM>[];
    for (final gt in o.getters) {
      if (!wanted(gt.name)) continue;
      switch (gt.ret.kind) {
        case 'value':
          readable.add(gt);
        case 'object':
          if (retObject(gt.ret.value) != null && !methods.any((m) => m.$1.name == gt.name)) {
            objGetters.add(gt);
          } else {
            droppedMembers[gt.name] = 'returns ${gt.el.returnType.getDisplayString()}, not a generated object';
          }
        case 'stream':
          streams.add(gt);
        default:
          droppedMembers[gt.name] = gt.ret.why ?? 'unbridgeable';
      }
    }
    final setters = [
      for (final st in o.setters)
        if (wanted(st.name) && st.param.kind == 'data') st
    ];
    for (final st in o.setters) {
      if (wanted(st.name) && st.param.kind != 'data') droppedMembers['${st.name}='] = '${st.param.kind} ${st.param.why ?? ''}'.trim();
    }

    // mirrors
    final mirrorDecl = decl.mirror ?? {if (o.valueListenableOf != null) 'value': MirrorDecl()};
    final mirrors = <(GetterM, MirrorDecl)>[];
    for (final e in mirrorDecl.entries) {
      final gt = readable.where((x) => x.name == e.key && !x.ret.isAsync).firstOrNull;
      if (gt == null) {
        g.warnings.add('$name: cannot mirror "${e.key}" (not a synchronous value getter)');
        continue;
      }
      mirrors.add((gt, e.value));
    }
    final memberNames = {...methods.map((m) => m.$1.name), ...streamMethods.map((m) => m.$1.name)};
    for (final m in mirrors) {
      if (memberNames.contains(m.$1.name)) g.warnings.add('$name: mirrored getter "${m.$1.name}" collides with a method');
    }

    // ── Dart ───────────────────────────────────────────────────────────────
    final d = StringBuffer();
    d.writeln('/// GENERATED handle for [${g.ref(el)}].');
    if (droppedMembers.isNotEmpty || ctorDropped.isNotEmpty) {
      d.writeln('///');
      d.writeln('/// Not bridged: ${[
        ...ctorDropped.entries.map((e) => 'ctor `${e.key}` (${e.value})'),
        ...droppedMembers.entries.map((e) => '`${e.key}` (${e.value})')
      ].join(', ')}.');
    }
    d.writeln('class $cls extends FuseObjectHandle<$tn>${needsVsync ? ' with FuseTickerProvider<$tn>' : ''} {');
    if (ctors.isNotEmpty) {
      d.writeln('  $cls(super.node) {');
      d.writeln('    final p = node.props;');
      String call((CtorM, Shape) c) => '${g.ref(el)}${t.typeArguments.isEmpty ? '' : '<${t.typeArguments.map(g.tc).join(', ')}>'}${c.$1.name.isEmpty ? '' : '.${c.$1.name}'}(${c.$2.dartArgs})';
      if (ctors.length == 1) {
        d.writeln('    object = ${call(ctors.first)};');
      } else {
        d.writeln("    object = switch (p[r'\$ctor']) {");
        final dflt = ctors.where((c) => c.$1.name.isEmpty).firstOrNull ?? ctors.first;
        for (final c in ctors) {
          if (c == dflt) continue;
          d.writeln("      '${c.$1.name}' => ${call(c)},");
        }
        d.writeln('      _ => ${call(dflt)},');
        d.writeln('    };');
      }
      d.writeln('    _init();');
      d.writeln('  }');
      d.writeln();
    }
    d.writeln('  /// Wraps an object created on the Dart side (returned from a method or getter).');
    d.writeln("  $cls.wrap(super.node, this.object) : super(borrowed: node.props[r'\$borrowed'] == true) {");
    d.writeln('    _init();');
    d.writeln('  }');
    d.writeln();
    d.writeln('  @override');
    d.writeln('  late final $tn object;');
    d.writeln();
    for (final m in mirrors) {
      d.writeln('  Object? _s${_cap(m.$1.name)} = _unset;');
    }
    if (mirrors.isNotEmpty) d.writeln();
    d.writeln('  void _init() {');
    if (mirrors.isNotEmpty) {
      if (o.listenable) d.writeln('    object.addListener(refresh);');
      if (o.hasStatus) d.writeln('    object.addStatusListener(_onStatus);');
      d.writeln('    scheduleInitialPush(refresh);');
    }
    d.writeln('  }');
    d.writeln();
    if (mirrors.isNotEmpty && o.hasStatus) {
      d.writeln('  void _onStatus(Object? _) => refresh();');
      d.writeln();
    }
    d.writeln('  @override');
    d.writeln('  void refresh() => pushState(_collect());');
    d.writeln();
    d.writeln('  /// Reads the mirrored getters and returns the ones that changed since the last push.');
    d.writeln('  Map<String, Object?> _collect() {');
    d.writeln('    final patch = <String, Object?>{};');
    if (mirrors.isNotEmpty) d.writeln('    final o = object;');
    for (final m in mirrors) {
      final gt = m.$1;
      final n = gt.name;
      final e = gt.ret.enc!;
      final encoded = g.enc(gt.ret.value!, e, 'v');
      final byEncoded = e.kind == 'coll' || e.kind == 'map' || e.kind == 'generic';
      final body = byEncoded
          ? "final v = o.$n; final e = $encoded; if (!fuseSame(e, _s${_cap(n)})) { _s${_cap(n)} = e; patch['$n'] = e; }"
          : "final v = o.$n; if (v != _s${_cap(n)}) { _s${_cap(n)} = v; patch['$n'] = $encoded; }";
      if (m.$2.guard != null) {
        d.writeln('    if (${m.$2.guard}) { $body }');
      } else {
        // General rule: a getter that throws (asserts "exactly one client",
        // "not attached yet") is simply not readable right now.
        d.writeln('    try { $body } catch (_) {}');
      }
    }
    d.writeln('    return patch;');
    d.writeln('  }');
    d.writeln();
    d.writeln('  @override');
    d.writeln('  Map<String, Object?> snapshot() {');
    for (final m in mirrors) {
      d.writeln('    _s${_cap(m.$1.name)} = _unset;');
    }
    d.writeln('    return _collect();');
    d.writeln('  }');
    d.writeln();
    d.writeln('  @override');
    d.writeln('  Future<dynamic> call(String method, dynamic value) => fuseGuard(() async {');
    d.writeln('        final a = fuseArgs(value);');
    d.writeln('        try {');
    d.writeln('          switch (method) {');
    for (final (m, s) in methods) {
      d.writeln("            case '${m.name}':");
      final inv = 'object.${m.name}(${s.dartArgs})';
      final r = m.ret;
      final awaited = r.isAsync ? 'await fuseAwait($inv)' : inv;
      switch (r.kind) {
        case 'void':
          d.writeln('              $awaited;');
          d.writeln('              return null;');
        case 'object':
          d.writeln("              return adopt($awaited, '${tag(retObject(r.value)!)}', owned: true);");
        default:
          final enc = g.enc(r.value!, r.enc!, 'r');
          if (enc == 'r') {
            d.writeln('              return $awaited;');
          } else {
            d.writeln('              final r = $awaited;');
            d.writeln('              return $enc;');
          }
      }
    }
    if (readable.isNotEmpty || objGetters.isNotEmpty) {
      d.writeln("            case r'\$get':");
      d.writeln("              switch (a['name']) {");
      for (final gt in readable) {
        final src = gt.ret.isAsync ? '(await object.${gt.name})' : 'object.${gt.name}';
        final enc = g.enc(gt.ret.value!, gt.ret.enc!, 'r');
        d.writeln("                case '${gt.name}':");
        if (enc == 'r') {
          d.writeln('                  return $src;');
        } else {
          d.writeln('                  final r = $src;');
          d.writeln('                  return $enc;');
        }
      }
      for (final gt in objGetters) {
        d.writeln("                case '${gt.name}':");
        d.writeln("                  return adopt(object.${gt.name}, '${tag(retObject(gt.ret.value)!)}');");
      }
      d.writeln('              }');
    }
    if (setters.isNotEmpty) {
      d.writeln("            case r'\$set':");
      d.writeln("              switch (a['name']) {");
      for (final st in setters) {
        final p = st.param;
        var e = g.dec(p.type, "a['value']");
        if (!p.nullable && !(p.cls!.family == 'dynamic' || p.cls!.family == 'generic')) e = "fuseReq($e, '$name', '${st.name}')";
        d.writeln("                case '${st.name}':");
        d.writeln('                  object.${st.name} = $e;');
        d.writeln('                  return null;');
      }
      d.writeln('              }');
    }
    if (streams.isNotEmpty || streamMethods.isNotEmpty) {
      d.writeln("            case r'\$listen':");
      d.writeln("              switch (a['name']) {");
      for (final gt in streams) {
        d.writeln("                case '${gt.name}':");
        d.writeln("                  listen('${gt.name}', () => object.${gt.name}, (e) => ${g.enc(gt.ret.value!, gt.ret.enc!, 'e')});");
        d.writeln('                  return null;');
      }
      for (final (m, s) in streamMethods) {
        d.writeln("                case '${m.name}':");
        d.writeln("                  listen('${m.name}', () => object.${m.name}(${s.dartArgs}), (e) => ${g.enc(m.ret.value!, m.ret.enc!, 'e')});");
        d.writeln('                  return null;');
      }
      d.writeln('              }');
      d.writeln("            case r'\$cancel':");
      d.writeln("              cancel(a['name'] as String);");
      d.writeln('              return null;');
    }
    d.writeln('          }');
    d.writeln("          return fuseUnknown('$name', a['name'] == null ? method : '\$method \${a['name']}');");
    d.writeln('        } finally {');
    d.writeln('          // State may change without a notification (stop(), setters).');
    d.writeln('          if (!isDisposed) refresh();');
    d.writeln('        }');
    d.writeln('      });');
    d.writeln();
    d.writeln('  @override');
    d.writeln('  void disposeObject() {');
    if (mirrors.isNotEmpty && o.listenable) d.writeln('    object.removeListener(refresh);');
    if (mirrors.isNotEmpty && o.hasStatus) d.writeln('    object.removeStatusListener(_onStatus);');
    if (o.hasDispose) d.writeln('    object.dispose();');
    if (needsVsync) d.writeln('    disposeTickers();');
    d.writeln('  }');
    d.writeln('}');
    dart.writeln(d);
    if (ctors.isNotEmpty) registrations.add("  runtime.registerHandle('$tagName', $cls.new);");
    registrations.add("  fuseWrapFactories['$tagName'] = (node, object) => $cls.wrap(node, object as $tn);");

    // ── TS ─────────────────────────────────────────────────────────────────
    final x = StringBuffer();
    String doc(String? raw, String indent, {List<String> extra = const []}) =>
        g.docs == 'none' ? '' : g._jsdoc(g._docText(raw), indent, extra: extra);
    String valueTs(GetterM gt) => tsRet(gt.ret);

    if (readable.isNotEmpty) {
      x.writeln('/** Values `$name.$getName(name)` can read on demand (one async round trip each). */');
      x.writeln('export interface ${name}State {');
      for (final gt in readable) {
        x.write(doc(gt.el.documentationComment ?? gt.el.variable.documentationComment, '  '));
        x.writeln('  ${gt.name}: ${valueTs(gt)};');
      }
      x.writeln('}');
    }
    if (setters.isNotEmpty) {
      x.writeln('/** Properties `$name.$setName(name, value)` can assign. */');
      x.writeln('export interface ${name}Writable {');
      for (final st in setters) {
        final p = st.param;
        x.writeln('  ${st.name}: ${g.ts(p.type)}${p.nullable ? ' | null' : ''};');
      }
      x.writeln('}');
    }
    final tsBrands = brands(t).toSet().map((b) => '"$b"').join(' | ');
    x.write(doc(el.documentationComment, '', extra: ['Dart: `${t.getDisplayString()}`, node type `$tagName`.']));
    x.writeln('export type $name = Handle<"$tagName"> & FuseObject<$tsBrands> & {');
    String mirrorTs((GetterM, MirrorDecl) m) => valueTs(m.$1);
    bool primitiveTs(String s) => s == 'number' || s == 'boolean' || s == 'string';
    for (final m in mirrors) {
      final vt = mirrorTs(m);
      x.write(doc(m.$1.el.documentationComment ?? m.$1.el.variable.documentationComment, '  ',
          extra: ['Mirrored: a signal kept current by pushes from Dart.']));
      x.writeln('  readonly ${m.$1.name}: () => ${primitiveTs(vt) ? vt : (vt.contains('|') || vt.contains('=>')) ? '$vt | undefined' : '$vt | undefined'};');
    }
    String retTs(MethodM m) => m.ret.kind == 'object' ? _set[retObject(m.ret.value)!]! + (g.nullable(m.ret.value!) ? ' | null' : '') : tsRet(m.ret);
    for (final (m, s) in methods) {
      x.write(doc(m.el.documentationComment, '  '));
      x.writeln('  ${m.name}(${s.tsParams()}): Promise<${retTs(m)}>;');
    }
    for (final gt in objGetters) {
      x.write(doc(gt.el.documentationComment ?? gt.el.variable.documentationComment, '  ',
          extra: ['Borrowed: owned by this object, released with it.']));
      x.writeln('  ${gt.name}(): Promise<${_set[retObject(gt.ret.value)!]}${g.nullable(gt.ret.value!) ? ' | null' : ''}>;');
    }
    for (final gt in streams) {
      x.write(doc(gt.el.documentationComment ?? gt.el.variable.documentationComment, '  '));
      x.writeln('  ${gt.name}: FuseStream<${tsRet(RetM('value', value: gt.ret.value, enc: gt.ret.enc))}>;');
    }
    for (final (m, s) in streamMethods) {
      x.write(doc(m.el.documentationComment, '  '));
      x.writeln('  ${m.name}(${s.tsParams()}): FuseStream<${tsRet(RetM('value', value: m.ret.value, enc: m.ret.enc))}>;');
    }
    if (readable.isNotEmpty) x.writeln('  $getName<K extends keyof ${name}State>(name: K): Promise<${name}State[K]>;');
    if (setters.isNotEmpty) x.writeln('  $setName<K extends keyof ${name}Writable>(name: K, value: ${name}Writable[K]): Promise<void>;');
    x.writeln('  dispose(): void;');
    x.writeln('};');
    x.writeln();

    // bind: shared by create* and adopt*
    final seedFields = [for (final m in mirrors) '${m.$1.name}?: ${mirrorTs(m)}'];
    x.writeln('function bind$name(o: ObjectRuntime<"$tagName">${mirrors.isEmpty ? '' : ', seed: { ${seedFields.join('; ')} }'}): $name {');
    for (final m in mirrors) {
      final n = m.$1.name;
      final vt = mirrorTs(m);
      final dflt = vt == 'number' ? ' ?? 0' : vt == 'boolean' ? ' ?? false' : vt == 'string' ? ' ?? ""' : '';
      x.writeln('  const [$n, set${_cap(n)}] = createSignal<${primitiveTs(vt) ? vt : '$vt | undefined'}>(seed.$n$dflt);');
    }
    if (mirrors.isNotEmpty) x.writeln('  o.mirror({ ${mirrors.map((m) => '${m.$1.name}: set${_cap(m.$1.name)}').join(', ')} });');
    x.writeln('  return {');
    x.writeln('    node: o.node,');
    for (final m in mirrors) {
      x.writeln('    ${m.$1.name},');
    }
    for (final (m, s) in methods) {
      final timeout = m.ret.isAsync ? ', 0' : '';
      var call = 'o.invoke("${m.name}", ${s.tsPack}$timeout)';
      if (m.ret.kind == 'object') {
        final rn = _set[retObject(m.ret.value)!]!;
        call = '$call.then((r) => (r == null ? null : adopt$rn(r)))${g.nullable(m.ret.value!) ? '' : ' as Promise<$rn>'}';
      }
      final argNames = [
        ...s.tsPos.map((p) => p.split(RegExp(r'\??:')).first),
        if (s.tsNamed.isNotEmpty) 'opts'
      ].join(', ');
      x.writeln('    ${m.name}: ($argNames) => $call,');
    }
    for (final gt in objGetters) {
      final rn = _set[retObject(gt.ret.value)!]!;
      x.writeln('    ${gt.name}: () => o.get("${gt.name}").then((r) => (r == null ? null : adopt$rn(r)))${g.nullable(gt.ret.value!) ? '' : ' as Promise<$rn>'},');
    }
    for (final gt in streams) {
      x.writeln('    ${gt.name}: o.stream("${gt.name}"),');
    }
    for (final (m, s) in streamMethods) {
      final argNames = [
        ...s.tsPos.map((p) => p.split(RegExp(r'\??:')).first),
        if (s.tsNamed.isNotEmpty) 'opts'
      ].join(', ');
      x.writeln('    ${m.name}: ($argNames) => o.stream("${m.name}", ${s.tsPack}),');
    }
    if (readable.isNotEmpty) x.writeln('    $getName: o.get,');
    if (setters.isNotEmpty) x.writeln('    $setName: o.set,');
    x.writeln('    dispose: o.dispose,');
    x.writeln('  };');
    x.writeln('}');
    x.writeln();

    // factories
    for (final (k, s) in ctors) {
      final fn = 'create$name${_cap(k.name)}';
      final optsName = '$name${_cap(k.name)}Options';
      if (s.tsNamed.isNotEmpty) {
        x.writeln('export interface $optsName {');
        for (final p in k.params) {
          final line = s.tsNamed.where((l) => l.startsWith('${p.name}:') || l.startsWith('${p.name}?:')).firstOrNull;
          if (line == null) continue;
          final dflt = p.el.hasDefaultValue ? g.tsDefault(p.el) : null;
          x.write(doc(g._paramDoc(p.el, t), '  ', extra: [if (dflt != null) '@default $dflt']));
          x.writeln('  $line;');
        }
        x.writeln('}');
      }
      // seeds
      final seeds = <String>[];
      for (final m in mirrors) {
        final n = m.$1.name;
        final vt = mirrorTs(m);
        if (!primitiveTs(vt)) continue;
        final cand = m.$2.seed != null ? [m.$2.seed!] : [n, 'initial${_cap(n)}'];
        final p = k.params.where((p) => cand.contains(p.name) && s.kept.contains(p.name) && p.kind == 'data').firstOrNull;
        if (p == null) continue;
        if (g.ts(p.type) != vt) continue;
        final acc = p.el.isPositional ? _tsId(p.name) : 'opts${s.namedRequired ? '' : '?'}.${p.name}';
        final lit = p.el.hasDefaultValue ? g.tsDefault(p.el) : null;
        final litOk = lit != null && !lit.startsWith('Dart');
        seeds.add('$n: $acc${litOk ? ' ?? $lit' : ''}');
      }
      x.write(doc(k.el.documentationComment ?? el.documentationComment, '',
          extra: ['Creates a Dart `$name${k.name.isEmpty ? '' : '.${k.name}'}`. Disposed with the reactive owner it is created under, or by `dispose()`.']));
      final params = s.tsParams(optsType: optsName);
      final dfltOpts = s.tsNamed.isNotEmpty && !s.namedRequired && s.tsPos.isEmpty;
      x.writeln('export function $fn(${dfltOpts ? params.replaceFirst('opts?: $optsName', 'opts: $optsName = {}') : params}): $name {');
      final ctorTag = ctors.length > 1 && k.name.isNotEmpty ? ['\$ctor: "${k.name}"'] : <String>[];
      var pack = s.tsPack;
      if (ctorTag.isNotEmpty) pack = pack == '{}' ? '{ ${ctorTag.first} }' : '{ ${ctorTag.first}, ${pack.substring(2)}';
      x.writeln('  return bind$name(createObject("$tagName", $pack)${mirrors.isEmpty ? '' : ', { ${seeds.join(', ')} }'});');
      x.writeln('}');
      x.writeln();
    }
    x.writeln('/** Wraps a `$name` that Dart created and handed over (a method result or a getter). */');
    x.writeln('export function adopt$name(ref: ObjectRef): $name {');
    x.writeln('  return bind$name(adoptObject("$tagName", ref)${mirrors.isEmpty ? '' : ', ref.state ?? {}'});');
    x.writeln('}');
    x.writeln();
    ts.write(x);

    rep.addAll({
      'push': o.push,
      'ctors': [for (final c in ctors) c.$1.name.isEmpty ? 'new' : c.$1.name],
      'ctorParamsKept': ctors.fold<int>(0, (a, c) => a + c.$2.kept.length),
      'ctorParamsEnv': ctors.fold<int>(0, (a, c) => a + c.$1.params.where((p) => p.kind.startsWith('env')).length),
      'ctorDropped': ctorDropped,
      'methods': [for (final m in methods) m.$1.name],
      'methodsTotal': o.methods.length,
      'streams': [...streams.map((s) => s.name), ...streamMethods.map((m) => m.$1.name)],
      'readable': [for (final r in readable) r.name],
      'gettersTotal': o.getters.length,
      'objectGetters': [for (final r in objGetters) r.name],
      'setters': [for (final s in setters) s.name],
      'settersTotal': o.setters.length,
      'mirrored': [for (final m in mirrors) m.$1.name],
      'dropped': droppedMembers,
      'dartLines': '\n'.allMatches(d.toString()).length,
      'tsLines': '\n'.allMatches(x.toString()).length,
    });
  }
}

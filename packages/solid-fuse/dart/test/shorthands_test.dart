import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/shorthands.dart';

void main() {
  group('colorHex (CSS semantics — alpha last)', () {
    test('#RRGGBB is opaque', () {
      expect(colorHex('#FF0000').toARGB32(), 0xFFFF0000);
    });

    test('#RGB expands and is opaque', () {
      expect(colorHex('#F00').toARGB32(), 0xFFFF0000);
    });

    test('#RRGGBBAA puts the trailing alpha first', () {
      // red at 50% → 0x80 alpha. NOT 0xAARRGGBB (#80FF0000 would be the old bug).
      expect(colorHex('#FF000080').toARGB32(), 0x80FF0000);
    });

    test('#RGBA expands each nibble, alpha last', () {
      // #F008 → R=FF, G=00, B=00, A=88
      expect(colorHex('#F008').toARGB32(), 0x88FF0000);
    });

    test('white hairline #FFFFFF14 is faint white, not yellow', () {
      // The reported bug: parsed as 0xFFFFFF14 (opaque yellow) under AARRGGBB.
      expect(colorHex('#FFFFFF14').toARGB32(), 0x14FFFFFF);
    });

    test('{ r, g, b, a } is colorRgb', () {
      expect(colorRgb(r: 255, g: 0, b: 0, a: 0.5).toARGB32(), const Color.fromRGBO(255, 0, 0, 0.5).toARGB32());
    });

    test('{ horizontal, top } sides: own value, else the axis, else 0', () {
      expect(edgeInsetsSides(horizontal: 16, top: 8), const EdgeInsets.fromLTRB(16, 8, 16, 0));
    });
  });
}

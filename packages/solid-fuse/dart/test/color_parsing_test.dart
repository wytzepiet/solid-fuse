import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:solid_fuse/src/utils.dart';

void main() {
  group('parseColor hex (CSS semantics — alpha last)', () {
    test('#RRGGBB is opaque', () {
      expect(parseColor('#FF0000')?.toARGB32(), 0xFFFF0000);
    });

    test('#RGB expands and is opaque', () {
      expect(parseColor('#F00')?.toARGB32(), 0xFFFF0000);
    });

    test('#RRGGBBAA puts the trailing alpha first', () {
      // red at 50% → 0x80 alpha. NOT 0xAARRGGBB (#80FF0000 would be the old bug).
      expect(parseColor('#FF000080')?.toARGB32(), 0x80FF0000);
    });

    test('#RGBA expands each nibble, alpha last', () {
      // #F008 → R=FF, G=00, B=00, A=88
      expect(parseColor('#F008')?.toARGB32(), 0x88FF0000);
    });

    test('white hairline #FFFFFF14 is faint white, not yellow', () {
      // The reported bug: parsed as 0xFFFFFF14 (opaque yellow) under AARRGGBB.
      expect(parseColor('#FFFFFF14')?.toARGB32(), 0x14FFFFFF);
    });

    test('{r,g,b,a} object form is unchanged', () {
      expect(
        parseColor({'r': 255, 'g': 0, 'b': 0, 'a': 0.5})?.toARGB32(),
        const Color.fromRGBO(255, 0, 0, 0.5).toARGB32(),
      );
    });
  });
}

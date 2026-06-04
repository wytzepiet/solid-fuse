import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../node.dart';

class FuseImage extends StatelessWidget {
  const FuseImage(this.node);

  final FuseNode node;

  @override
  Widget build(BuildContext context) {
    final src = node.string('src');
    if (src == null || src.isEmpty) return const SizedBox.shrink();

    final provider = _resolveProvider(src, node.string('type'));
    final isNetwork = provider is NetworkImage;

    final color = node.color('color');
    final placeholder = node.widget('placeholder');
    final errorWidget = node.widget('errorWidget');

    Widget image = Image(
      image: provider,
      width: node.double('width'),
      height: node.double('height'),
      fit: node.boxFit('fit'),
      alignment: node.alignment('alignment') ?? Alignment.center,
      repeat: node.imageRepeat('repeat'),
      color: color,
      colorBlendMode:
          color != null ? (node.blendMode('colorBlendMode') ?? BlendMode.srcIn) : null,
      semanticLabel: node.string('semanticLabel'),
      errorBuilder: errorWidget == null
          ? null
          : (context, error, stackTrace) => errorWidget,
      // Only network images expose real loading progress; a placeholder for an
      // asset would flash, so wire `loadingBuilder` to network sources only.
      loadingBuilder: (placeholder == null || !isNetwork)
          ? null
          : (context, child, progress) =>
              progress == null ? child : placeholder,
    );

    final borderRadius = node.borderRadius('borderRadius');
    if (borderRadius != null) {
      image = ClipRRect(borderRadius: borderRadius, child: image);
    }

    return image;
  }
}

/// Maps a `src` string (and optional explicit `type`) to an [ImageProvider].
///
/// Auto-detection: `data:` → memory, `http(s)://` or `//` → network, `file://`
/// or an absolute path (`/…`) → file, otherwise a bundled asset. A scheme-less
/// network URL or bare base64 can be forced with `type`. An absolute path is
/// never a valid Flutter asset key, so it resolves to a file.
ImageProvider _resolveProvider(String src, String? type) {
  if (type == 'memory' || (type == null && src.startsWith('data:'))) {
    return MemoryImage(_decodeBytes(src));
  }
  if (type == 'network' ||
      (type == null &&
          (src.startsWith('http://') ||
              src.startsWith('https://') ||
              src.startsWith('//')))) {
    return NetworkImage(src);
  }
  if (type == 'file' ||
      (type == null && (src.startsWith('file://') || src.startsWith('/')))) {
    return FileImage(File(_stripFileScheme(src)));
  }
  return AssetImage(src);
}

/// Decodes a `data:` URI or a bare base64 string into bytes for [MemoryImage].
Uint8List _decodeBytes(String src) {
  final comma = src.startsWith('data:') ? src.indexOf(',') : -1;
  final payload = comma >= 0 ? src.substring(comma + 1) : src;
  return base64Decode(payload);
}

String _stripFileScheme(String src) =>
    src.startsWith('file://') ? Uri.parse(src).toFilePath() : src;

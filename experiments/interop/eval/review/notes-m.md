Runtime semantics of this API (treat as ground truth):
- Every component is the Flutter widget of the same name with the same parameters; ordinary Flutter layout and painting rules apply exactly (unbounded constraints, Expanded/Flexible/Spacer only inside Row/Column/Flex, Positioned only inside Stack, ListView inside Column needs Expanded or shrinkWrap, a Stack clips overflowing children unless clipBehavior="none", a Container with decoration clips its child only if clipBehavior is set, Material buttons with onPressed={null} are disabled and dimmed, GestureDetector default behavior is deferToChild, implicit animations animate when props change, etc.).
- JSX children map to `child` / `children`. `Scaffold`'s `body` is given as JSX children (there is no `body` prop). If a single-child widget is given several JSX children they are laid out as a vertical Flex (min size, cross-axis start) in its place.
- `ImageNetwork` is `Image.network`; `TransformRotate` / `TransformTranslate` are `Transform.rotate` / `Transform.translate`.
- Colors: names, "Colors.x" constants and #hex (CSS order, alpha last).
- Duration numbers are milliseconds.

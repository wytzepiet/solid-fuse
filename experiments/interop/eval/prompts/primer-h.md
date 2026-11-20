1. The layout container is `<View>`; there are no Row/Column components. Lay out children with the `flex` prop: `<View flex={{ direction: "horizontal", gap: 8, align: "center", justify: "spaceBetween" }}>` (direction defaults to "vertical"; `align` is the cross axis, `justify` the main axis, `expand: true` fills the main axis).
2. A child takes the remaining space of a flex parent with `grow={1}` on its own `<View>` (optionally `fit="loose"`).
3. `<View>` also takes: padding, margin, width, height, minWidth/maxWidth/minHeight/maxHeight, aspectRatio, alignment ("center", "topLeft", "bottomRight", ...), opacity, visible, ignorePointer, clipBehavior ("antiAlias"), `transform={{ rotate, scale, translateX, translateY }}` (rotate in radians).
4. padding/margin are a number (all sides), `{ horizontal, vertical }`, or `{ top, left, right, bottom }`.
5. Backgrounds go in `decoration`: `decoration={{ color: "white", borderRadius: 12, border: { width: 1, color: "#E0E0E0" }, shadow: [{ blurRadius: 8, color: "#0002", offsetY: 2 }], gradient: { type: "linear", colors: [...], begin: "topLeft", end: "bottomRight" }, shape: "circle" }}`; borderRadius may be `{ topLeft, topRight, bottomLeft, bottomRight }`.
6. Colors are names ("red", "white", "grey", "transparent", ...), CSS hex "#RGB" / "#RRGGBB" / "#RRGGBBAA", or `{ r, g, b, a }`.
7. `<Text>` has its style props flattened onto the element: `<Text fontSize={18} fontWeight="bold" color="#333" maxLines={2} overflow="ellipsis" textAlign="center">hi</Text>`; fontWeight is 100..900 or "regular" | "medium" | "semiBold" | "bold".
8. A `<Text>` may contain `<TextSpan>` runs and other elements as children; non-span children flow inline with the text and wrap with it.
9. `<Icon data={star} size={24} color="amber" />` with `import { star } from "solid-fuse/icons/material"` (Flutter's icon names, camelCase).
10. `<Image src="https://..." width={80} height={80} fit="cover" borderRadius={8} />`; `<ScrollView>` scrolls its children (scrollDirection, padding, flex).
11. `<Stack alignment="center">` layers its children; `<Positioned top left right bottom width height>` places one child inside a Stack.
12. `<GestureDetector onTap={...} onPanUpdate={(e) => ...}>` uses Flutter's callback names; details are flat: e.x, e.y, e.localX, e.localY, e.dx, e.dy (delta), e.vx, e.vy (velocity).
13. `<TextField value={v()} placeholder="Email" obscureText keyboardType="email" onChanged={(text) => ...} decoration={{ border: "outline", labelText: "Email" }} />`.
14. There are no Button, Switch, Slider or animated widgets: compose them from View, GestureDetector and signals.
15. Every prop is reactive; children are ordinary JSX children; every element that has children accepts `flex`.

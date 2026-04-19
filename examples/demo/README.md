# solid-fuse demo

Playground app that exercises solid-fuse widgets. Home screen lists each demo
screen; tap one to push it onto the navigator.

## First-time setup

The Flutter app needs platform directories for whichever target you want to
run. Inside `dart/`, initialize the ones you need:

```bash
cd dart
flutter create . --platforms=ios,macos,android
```

## Run

From `examples/demo/`:

```bash
bun run dev
```

That runs `fuse dev` which links workspace packages, boots Vite, and starts
`flutter run` wired to the dev server. Saving a `.tsx` file hot-reloads the JS
tree; saving a `.dart` file hot-reloads Flutter.

## Adding a screen

1. Drop a new file in `src/screens/my-widget.tsx` exporting a component that
   returns a `<materialPage>`.
2. Add a `<MenuItem>` in `src/screens/home.tsx` that pushes it via
   `nav.push(() => <MyScreen />)`.

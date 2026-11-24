# {{title}}

A [solid-fuse](https://github.com/wytzepiet/solid-fuse) app: SolidJS that renders native Flutter widgets.

```bash
{{run}} dev              # Vite + flutter run, with hot reload
{{run}} dev --headless   # no screen (cloud, CI): the Linux app on a virtual display
{{run}} build apk        # JS bundle + `flutter build apk`
```

The app starts in `src/index.tsx`. Its screens are the files in `src/app/`: each file is a route (`src/app/settings.tsx` opens at `/settings`). `dart/` is the Flutter project that hosts it.

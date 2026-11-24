import { render } from "solid-fuse";
import { FileRoutes } from "#fuse/routes";

// The app root is JS: Dart only runs `FuseView`. The pages are the files
// in src/app (`#fuse/routes`); `FileRoutes` draws src/app.tsx around them.
render(() => <FileRoutes />);

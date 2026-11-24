import { render } from "solid-fuse";
import { FileRoutes } from "#fuse/routes";

// The pages are the files in src/app; FileRoutes draws src/app.tsx around them.
render(() => <FileRoutes />);

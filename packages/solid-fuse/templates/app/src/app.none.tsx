import { App, Navigator } from "solid-fuse";

// Holds src/app/: the app's own stack, which starts at src/app/index.tsx.
export default function Root() {
  return (
    <App title="{{title}}">
      <Navigator />
    </App>
  );
}

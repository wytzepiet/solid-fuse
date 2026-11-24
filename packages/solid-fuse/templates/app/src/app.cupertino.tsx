import { CupertinoApp } from "@solid-fuse/cupertino";
import { Navigator } from "solid-fuse";

// Holds src/app/: the app's own stack, which starts at src/app/index.tsx.
export default function App() {
  return (
    <CupertinoApp title="{{title}}">
      <Navigator />
    </CupertinoApp>
  );
}

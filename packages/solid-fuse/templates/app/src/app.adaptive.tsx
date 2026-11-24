import { AdaptiveApp } from "@solid-fuse/adaptive";
import { Navigator } from "solid-fuse";

// Holds src/app/: the app's own stack, which starts at src/app/index.tsx.
export default function App() {
  return (
    <AdaptiveApp title="{{title}}" theme={{ seedColor: "#2563eb" }} themeMode="system">
      <Navigator />
    </AdaptiveApp>
  );
}

import { MaterialApp } from "@solid-fuse/material";
import { Navigator } from "solid-fuse";

// Holds src/app/: the app's own stack, which starts at src/app/index.tsx.
export default function App() {
  return (
    <MaterialApp title="{{title}}" theme={{ seedColor: "#2563eb" }} themeMode="system">
      <Navigator />
    </MaterialApp>
  );
}

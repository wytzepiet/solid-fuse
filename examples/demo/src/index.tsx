import { MaterialApp } from "@solid-fuse/material";
import { Navigator, render } from "solid-fuse";
import { HomeScreen } from "./screens/home";

// The app root is JS: Dart only runs `FuseView`. Pages pushed as bare
// components become Material pages.
const App = () => (
  <MaterialApp title="solid-fuse demo" theme={{ seedColor: "#2563eb" }} themeMode="light">
    <Navigator initialPage={() => <HomeScreen />} />
  </MaterialApp>
);

render(App);

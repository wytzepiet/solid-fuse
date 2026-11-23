import { AdaptiveApp } from "@solid-fuse/adaptive";
import { Navigator, render } from "solid-fuse";
import { HomeScreen } from "./screens/home";
import { platform } from "./platform";

// The app root is JS: Dart only runs `FuseView`. Pages pushed as bare
// components become Material pages. `platform` flips the whole app between
// Android and iOS (the adaptive screen has the toggle).
const App = () => (
  <AdaptiveApp title="solid-fuse demo" theme={{ seedColor: "#2563eb" }} themeMode="light" platform={platform()}>
    <Navigator initialPage={() => <HomeScreen />} />
  </AdaptiveApp>
);

render(App);

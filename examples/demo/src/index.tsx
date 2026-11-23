import { AdaptiveApp } from "@solid-fuse/adaptive";
import { createHeroineController } from "@solid-fuse/heroine";
import { Navigator, render } from "solid-fuse";
import { HomeScreen } from "./screens/home";
import { platform } from "./platform";

// The app root is JS: Dart only runs `FuseView`. Pages pushed as bare
// components become Material pages. `platform` flips the whole app between
// Android and iOS (the adaptive screen has the toggle).
// The heroine screen's tiles fly because its controller observes the Navigator.
const App = () => {
  const heroine = createHeroineController();
  return (
    <AdaptiveApp title="solid-fuse demo" theme={{ seedColor: "#2563eb" }} themeMode="light" platform={platform()}>
      <Navigator initialPage={() => <HomeScreen />} observers={[heroine]} />
    </AdaptiveApp>
  );
};

render(App);

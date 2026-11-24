import { AdaptiveApp } from "@solid-fuse/adaptive";
import { createHeroineController } from "@solid-fuse/heroine";
import { render } from "solid-fuse";
import { Routes } from "#fuse/routes";
import { platform } from "./platform";

// The app root is JS: Dart only runs `FuseView`. The routes are the files
// in src/app (`#fuse/routes`). Pages pushed as bare
// components become Material pages. `platform` flips the whole app between
// Android and iOS (the adaptive screen has the toggle).
// The heroine screen's tiles fly because its controller observes the Navigator.
const App = () => {
  const heroine = createHeroineController();
  return (
    <AdaptiveApp title="solid-fuse demo" theme={{ seedColor: "#2563eb" }} themeMode="light" platform={platform()}>
      <Routes observers={[heroine]} />
    </AdaptiveApp>
  );
};

render(App);

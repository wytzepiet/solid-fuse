import { AdaptiveApp } from "@solid-fuse/adaptive";
import { createHeroineController } from "@solid-fuse/heroine";
import { Navigator } from "solid-fuse";
import { platform } from "./platform";

// Holds src/app/: the app's own stack, starting at app/index.tsx. Pages
// pushed as bare components become Material pages. `platform` flips the
// whole app between Android and iOS (the adaptive screen has the toggle).
// The heroine screen's tiles fly because its controller observes the stack.
export default function App() {
  const heroine = createHeroineController();
  return (
    <AdaptiveApp title="solid-fuse demo" theme={{ seedColor: "#2563eb" }} themeMode="light" platform={platform()}>
      <Navigator observers={[heroine]} />
    </AdaptiveApp>
  );
}

import { Navigator, render } from "solid-fuse";
import { HomeScreen } from "./screens/home";
import { installBench } from "./bench";

// Dev-only: register the bridge-benchmark handlers (Dart drives them on launch).
installBench();

const App = () => <Navigator initialPage={() => <HomeScreen />} />;

render(App);

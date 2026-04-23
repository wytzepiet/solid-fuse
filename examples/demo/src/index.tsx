import { Navigator, render } from "solid-fuse";
import { HomeScreen } from "./screens/home";

const App = () => <Navigator initialPage={() => <HomeScreen />} />;

render(App);

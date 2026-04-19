import { render, Navigator } from "solid-fuse";
import { HomeScreen } from "./screens/home";

const App = () => <Navigator defaultPage={() => <HomeScreen />} />;

render(App);

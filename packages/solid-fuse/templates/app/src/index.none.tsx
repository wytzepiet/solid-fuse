import { App, render } from "solid-fuse";
import { Routes } from "#fuse/routes";

// The routes are the files in src/app: src/app/index.tsx is the first page.
render(() => (
  <App title="{{title}}">
    <Routes />
  </App>
));

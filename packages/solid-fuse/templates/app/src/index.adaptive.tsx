import { AdaptiveApp } from "@solid-fuse/adaptive";
import { render } from "solid-fuse";
import { Routes } from "#fuse/routes";

// The routes are the files in src/app: src/app/index.tsx is the first page.
render(() => (
  <AdaptiveApp title="{{title}}" theme={{ seedColor: "#2563eb" }} themeMode="system">
    <Routes />
  </AdaptiveApp>
));

import { MaterialApp } from "@solid-fuse/material";
import { render } from "solid-fuse";
import { Routes } from "#fuse/routes";

// The routes are the files in src/app: src/app/index.tsx is the first page.
render(() => (
  <MaterialApp title="{{title}}" theme={{ seedColor: "#2563eb" }} themeMode="system">
    <Routes />
  </MaterialApp>
));

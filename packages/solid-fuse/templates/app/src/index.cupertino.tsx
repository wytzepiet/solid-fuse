import { CupertinoApp } from "@solid-fuse/cupertino";
import { render } from "solid-fuse";
import { Routes } from "#fuse/routes";

// The routes are the files in src/app: src/app/index.tsx is the first page.
render(() => (
  <CupertinoApp title="{{title}}">
    <Routes />
  </CupertinoApp>
));

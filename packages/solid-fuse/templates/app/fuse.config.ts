import { defineConfig } from "solid-fuse/config";

export default defineConfig({
  // `fuse dev` and `fuse build` add a platform's folder (dart/android/...)
  // when it's missing. Commit it: then it's yours to edit.
  platforms: {{platforms}},
  org: "{{org}}",
});

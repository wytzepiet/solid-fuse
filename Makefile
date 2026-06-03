# Maintainer tasks. Contributors don't need these — the vendored fjs
# (lib/src/fjs) is checked in; clone and build like any monorepo.
# See notes/vendoring-fjs.md.

FJS_PREFIX := packages/solid-fuse/dart/lib/src/fjs
FJS_REMOTE := https://github.com/wytzepiet/fjs.git
FJS_BRANCH := solid-fuse

.PHONY: sync-fjs push-fjs

## Pull the latest fjs (solid-fuse branch) into the vendored copy.
## After this, check whether fjs changed its platform build glue and port any
## change into the root ios/macos/android/linux/windows shims (see notes).
sync-fjs:
	git subtree pull --prefix=$(FJS_PREFIX) $(FJS_REMOTE) $(FJS_BRANCH) --squash

## Push edits made to the vendored copy back to the fjs solid-fuse branch.
## Prefer editing in the fjs repo directly; this is for the rare in-tree fix.
push-fjs:
	git subtree push --prefix=$(FJS_PREFIX) $(FJS_REMOTE) $(FJS_BRANCH)

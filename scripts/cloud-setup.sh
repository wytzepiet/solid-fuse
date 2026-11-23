#!/bin/bash
# solid-fuse cloud setup: Linux desktop toolchain, Flutter, a warm shared Rust cache,
# and what `fuse dev --headless` / `fuse drive` use (Xvfb, dbus, a keyring, Marionette's CLI).
set -euo pipefail
FLUTTER_URL=https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.50.1-stable.tar.xz
export CARGO_TARGET_DIR=/opt/cargo-target
cat > /etc/profile.d/solid-fuse.sh <<'ENV'
export PATH=/opt/flutter/bin:$HOME/.pub-cache/bin:$PATH
export CARGO_TARGET_DIR=/opt/cargo-target
ENV
grep -q solid-fuse.sh /root/.bashrc 2>/dev/null || echo '. /etc/profile.d/solid-fuse.sh' >> /root/.bashrc
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libgtk-3-dev xvfb dbus gnome-keyring libsecret-1-dev mesa-utils clang cmake ninja-build pkg-config >/dev/null
if [ ! -x /opt/flutter/bin/flutter ]; then
  (curl -sSL "$FLUTTER_URL" | tar -xJ -C /opt && git config --global --add safe.directory /opt/flutter \
    && /opt/flutter/bin/flutter --disable-analytics >/dev/null && /opt/flutter/bin/flutter precache --linux >/dev/null \
    && /opt/flutter/bin/dart pub global activate marionette_cli >/dev/null) &
  FLUTTER_PID=$!
fi
if [ -d solid-fuse ]; then
  (cd solid-fuse && bun install >/dev/null)
  LIBFJS=solid-fuse/packages/solid-fuse/dart/lib/src/fjs/libfjs
  # Same command cargokit runs for `flutter test -d linux` (debug) and `flutter build linux --release`.
  # Run both at once: the release link (LTO, one codegen unit) is single-threaded.
  cargo build -q -p fjs --manifest-path $LIBFJS/Cargo.toml --target x86_64-unknown-linux-gnu &
  DEV_PID=$!
  cargo build -q -p fjs --manifest-path $LIBFJS/Cargo.toml --target x86_64-unknown-linux-gnu --release
  wait "$DEV_PID"
fi
if [ -n "${FLUTTER_PID:-}" ]; then wait "$FLUTTER_PID"; fi

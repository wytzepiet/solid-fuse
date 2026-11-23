import { spawn, spawnSync, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * A display and a session bus for running a Linux desktop app with no
 * screen (`fuse dev --headless`): Xvfb, a private dbus session, and an
 * unlocked keyring when gnome-keyring is installed (flutter_secure_storage
 * needs one). Everything is stopped by [stop].
 */
export interface Headless {
  env: NodeJS.ProcessEnv;
  stop(): void;
}

function has(cmd: string): boolean {
  return spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" }).status === 0;
}

function freeDisplay(): number {
  for (let n = 99; n < 199; n++) {
    if (!existsSync(`/tmp/.X11-unix/X${n}`) && !existsSync(`/tmp/.X${n}-lock`)) return n;
  }
  throw new Error("No free X display between :99 and :198.");
}

async function waitFor(check: () => boolean, what: string, ms = 10_000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}.`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** A line a process prints on stdout. */
function firstLine(child: ChildProcess, what: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = "";
    child.stdout!.on("data", (d: Buffer) => {
      out += d.toString();
      const nl = out.indexOf("\n");
      if (nl >= 0) resolve(out.slice(0, nl).trim());
    });
    child.on("exit", (code) => reject(new Error(`${what} exited (${code}).`)));
  });
}

export async function startHeadless(stateDir: string): Promise<Headless> {
  if (process.platform !== "linux") {
    throw new Error("--headless runs the Linux desktop app, so it needs Linux.");
  }
  const missing = ["Xvfb", "dbus-daemon"].filter((c) => !has(c));
  if (missing.length) {
    throw new Error(
      `--headless needs ${missing.join(" and ")}. On Debian or Ubuntu: apt-get install xvfb dbus`,
    );
  }

  const children: ChildProcess[] = [];
  const stop = () => {
    for (const c of children.reverse()) if (c.exitCode === null) c.kill();
  };
  process.on("exit", stop);

  try {
    const display = freeDisplay();
    const xvfb = spawn("Xvfb", [`:${display}`, "-screen", "0", "1920x1080x24", "-nolisten", "tcp"], {
      stdio: "ignore",
    });
    children.push(xvfb);
    await waitFor(() => existsSync(`/tmp/.X11-unix/X${display}`), "Xvfb");

    const dbus = spawn("dbus-daemon", ["--session", "--nofork", "--print-address=1"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    children.push(dbus);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DISPLAY: `:${display}`,
      DBUS_SESSION_BUS_ADDRESS: await firstLine(dbus, "dbus-daemon"),
      // No accessibility bus here; stops GTK warning about it.
      NO_AT_BRIDGE: "1",
    };

    if (has("gnome-keyring-daemon")) {
      // The app's own keyring, kept in [stateDir] so what the app stores
      // survives restarts, and apart from any keyring of the machine's user.
      // It needs a password to be created; this one only unlocks it.
      mkdirSync(stateDir, { recursive: true });
      const keyring = spawn("gnome-keyring-daemon", ["--unlock", "--components=secrets", "--foreground"], {
        env: { ...env, XDG_DATA_HOME: stateDir },
        stdio: ["pipe", "ignore", "ignore"],
      });
      keyring.stdin!.end("fuse");
      children.push(keyring);
    }

    return { env, stop };
  } catch (e) {
    stop();
    throw e;
  }
}

/**
 * Add the Linux runner when the app has none (`flutter create` for just that
 * platform), and nothing else `flutter create` would change.
 */
export function ensureLinuxRunner(dartRoot: string) {
  if (existsSync(join(dartRoot, "linux"))) return;
  console.log("No linux/ runner yet: adding one with `flutter create --platforms=linux .`");
  const hadTest = existsSync(join(dartRoot, "test"));
  const analysis = join(dartRoot, "analysis_options.yaml");
  const analysisBefore = existsSync(analysis) ? readFileSync(analysis, "utf-8") : null;
  const r = spawnSync("flutter", ["create", "--platforms=linux", "."], { cwd: dartRoot, stdio: "ignore" });
  if (r.status !== 0) throw new Error("`flutter create --platforms=linux .` failed.");
  if (!hadTest) rmSync(join(dartRoot, "test"), { recursive: true, force: true });
  // It also rewrites analysis_options.yaml; that's the app's own.
  if (analysisBefore !== null) writeFileSync(analysis, analysisBefore);
}

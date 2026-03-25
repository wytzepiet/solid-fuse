import { spawn, spawnSync } from "child_process";
import { defineCommand } from "citty";
import { findProjectRoot, detectLanIp, detectPackageManager, pmExec } from "./utils";
import { runLink } from "./link";

const DEV_PORT = 24680;

export const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Start Vite dev server + Flutter run with hot reload",
  },
  run: async ({ rawArgs }) => {
    const projectRoot = findProjectRoot();

    // Step 1: fuse link
    await runLink(projectRoot, { pubGet: false });

    const pm = detectPackageManager(projectRoot);
    const exec = pmExec(pm);

    // Step 2: Everything in rawArgs is a flutter passthrough arg (citty strips the subcommand)
    const flutterArgs = rawArgs;

    // Step 3: If --release or --profile, build JS bundle instead of dev server
    const isRelease = flutterArgs.includes("--release") || flutterArgs.includes("--profile");

    if (isRelease) {
      console.log("\nBuilding JS bundle (release/profile mode)...");
      const vite = spawnSync(exec.cmd, [...exec.args, "vite", "build"], {
        cwd: projectRoot,
        stdio: "inherit",
      });
      if (vite.status !== 0) {
        console.error("Vite build failed");
        process.exit(vite.status ?? 1);
      }

      const flutter = spawn("flutter", ["run", ...flutterArgs], {
        cwd: projectRoot,
        stdio: "inherit",
      });
      flutter.on("close", (code) => process.exit(code ?? 0));
      return;
    }

    // Step 4: Start Vite dev server and wait for it to be ready
    const host = detectLanIp();
    console.log(`\nUsing host: ${host}, port: ${DEV_PORT}, package manager: ${pm}`);
    console.log("Starting Vite dev server...");

    const vite = spawn(exec.cmd, [...exec.args, "vite", "--host", "--port", String(DEV_PORT)], {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "inherit"],
    });

    // Wait for Vite to print its "ready" message
    await new Promise<void>((resolve, reject) => {
      vite.stdout!.on("data", (data: Buffer) => {
        const text = data.toString();
        process.stdout.write(text);
        if (text.includes("ready in")) {
          resolve();
        }
      });
      vite.on("close", (code) => {
        if (code !== 0) reject(new Error(`Vite exited with code ${code}`));
      });
    });

    // Step 5: Start flutter run
    let cleaning = false;
    const cleanup = () => {
      if (cleaning) return;
      cleaning = true;
      vite.kill();
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Pipe remaining Vite output to stdout
    vite.stdout!.on("data", (data: Buffer) => process.stdout.write(data));

    const allFlutterArgs = [
      "run",
      `--dart-define=FUSE_HOST=${host}`,
      `--dart-define=FUSE_PORT=${DEV_PORT}`,
      ...flutterArgs,
    ];
    console.log(`Running: flutter ${allFlutterArgs.join(" ")}`);

    const flutter = spawnSync("flutter", allFlutterArgs, {
      cwd: projectRoot,
      stdio: "inherit",
    });

    cleanup();
    process.exit(flutter.status ?? 0);
  },
});

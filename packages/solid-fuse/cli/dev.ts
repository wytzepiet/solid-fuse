import { spawn, spawnSync } from "child_process";
import { createServer, build as viteBuild, mergeConfig } from "vite";
import { defineCommand } from "citty";
import { findProjectRoot, detectLanIp } from "./utils";
import { loadFuseConfig, buildViteConfig } from "./config";
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

    // Step 2: Load fuse config
    const fuseConfig = await loadFuseConfig(projectRoot);
    const viteConfig = buildViteConfig(projectRoot, fuseConfig);

    // Step 3: Everything in rawArgs is a flutter passthrough arg (citty strips the subcommand)
    const flutterArgs = rawArgs;

    // Step 4: If --release or --profile, build JS bundle instead of dev server
    const isRelease = flutterArgs.includes("--release") || flutterArgs.includes("--profile");

    if (isRelease) {
      console.log("\nBuilding JS bundle (release/profile mode)...");
      await viteBuild(viteConfig);

      const flutter = spawn("flutter", ["run", ...flutterArgs], {
        cwd: projectRoot,
        stdio: "inherit",
      });
      flutter.on("close", (code) => process.exit(code ?? 0));
      return;
    }

    // Step 5: Start Vite dev server
    const host = detectLanIp();
    console.log(`\nUsing host: ${host}, port: ${DEV_PORT}`);
    console.log("Starting Vite dev server...");

    const server = await createServer(
      mergeConfig(viteConfig, {
        server: { host: true, port: DEV_PORT },
      })
    );
    await server.listen();
    server.printUrls();

    // Step 6: Start flutter run
    let cleaning = false;
    const cleanup = () => {
      if (cleaning) return;
      cleaning = true;
      server.close();
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

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

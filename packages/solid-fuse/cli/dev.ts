import { spawn, spawnSync } from "child_process";
import http from "http";
import { createServer, build as viteBuild, mergeConfig, type ViteDevServer } from "vite";
import { defineCommand } from "citty";
import { findProjectRoot, getDartRoot, detectLanIp } from "./utils";
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
    const dartRoot = getDartRoot(projectRoot, fuseConfig);
    const viteConfig = buildViteConfig(projectRoot, fuseConfig);

    // Step 3: Everything in rawArgs is a flutter passthrough arg (citty strips the subcommand)
    const flutterArgs = rawArgs;

    // Step 4: If --release or --profile, build JS bundle instead of dev server
    const isRelease = flutterArgs.includes("--release") || flutterArgs.includes("--profile");

    if (isRelease) {
      console.log("\nBuilding JS bundle (release/profile mode)...");
      await viteBuild(viteConfig);

      const flutter = spawn("flutter", ["run", ...flutterArgs], {
        cwd: dartRoot,
        stdio: "inherit",
      });
      flutter.on("close", (code) => process.exit(code ?? 0));
      return;
    }

    // Step 5: Start Vite dev server
    const host = detectLanIp();

    // Let Vite pick the first free port at/above DEV_PORT (it increments when
    // one is taken). We read back the actual port so the Flutter app dials the
    // server we really bound to, not a stale one held by another `fuse dev`.
    const serverConfig = mergeConfig(viteConfig, {
      server: { host: true, port: DEV_PORT },
    });

    function getBoundPort(server: ViteDevServer): number {
      const addr = server.httpServer?.address();
      if (addr && typeof addr === "object") return addr.port;
      return DEV_PORT;
    }

    async function startVite(strictPort?: number): Promise<ViteDevServer> {
      const server = await createServer(
        strictPort
          ? mergeConfig(serverConfig, { server: { port: strictPort, strictPort: true } })
          : serverConfig,
      );
      await server.listen();
      return server;
    }

    console.log("Starting Vite dev server...");
    let viteServer = await startVite();
    const devPort = getBoundPort(viteServer);
    console.log(`Vite started on ${host}:${devPort}.`);
    if (devPort !== DEV_PORT) {
      console.log(
        `(Port ${DEV_PORT} was in use — using ${devPort} instead. ` +
          `Another \`fuse dev\` may already be running.)`,
      );
    }

    // Step 6: Start flutter run with piped stdin so we can intercept R (hot restart)
    let cleaning = false;
    const cleanup = () => {
      if (cleaning) return;
      cleaning = true;
      viteServer.close();
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    const allFlutterArgs = [
      "run",
      `--dart-define=FUSE_HOST=${host}`,
      `--dart-define=FUSE_PORT=${devPort}`,
      ...flutterArgs,
    ];
    console.log(`Running: flutter ${allFlutterArgs.join(" ")}`);

    const flutter = spawn("flutter", allFlutterArgs, {
      cwd: dartRoot,
      stdio: ["pipe", "inherit", "inherit"],
    });

    flutter.on("close", (code) => {
      cleanup();
      process.exit(code ?? 0);
    });

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", async (key: Buffer) => {
        const char = key.toString();

        if (char === "\x03") {
          // Ctrl+C
          flutter.stdin!.write("q\n");
          return;
        }

        if (char === "R") {
          console.log("\nRestarting Vite dev server...");
          if (viteServer.httpServer instanceof http.Server) {
            viteServer.httpServer.closeAllConnections();
          }
          await viteServer.close();
          // Re-bind to the same port the app is already dialing.
          viteServer = await startVite(devPort);
          console.log("Vite restarted.");
        }

        flutter.stdin!.write(`${char}\n`);
      });
    }
  },
});

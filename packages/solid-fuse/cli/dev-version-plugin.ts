import type { Plugin } from "vite";

/**
 * What the dev server has told the app to run: a version that moves with
 * every HMR update or reload Vite sends, and with every server start.
 *
 * An app that lost its connection (the phone slept, left the network, the
 * server restarted) asks `GET /__fuse_version` when it comes back. The same
 * version means it missed nothing and only reconnects; another means it
 * reloads. Each change is also sent over the HMR socket (`fuse:version`), in
 * order after the message it counts, so the app always knows which version
 * it holds.
 */
export function fuseDevVersionPlugin(): Plugin {
  const start = Date.now().toString(36);
  let n = 0;
  const version = () => `${start}.${n}`;

  return {
    name: "fuse:dev-version",
    configureServer(server) {
      server.middlewares.use("/__fuse_version", (_req, res) => {
        res.setHeader("content-type", "text/plain");
        res.setHeader("cache-control", "no-store");
        res.end(version());
      });

      const ws = server.ws;
      const send = ws.send.bind(ws) as (...args: unknown[]) => void;
      ws.send = ((...args: unknown[]) => {
        send(...args);
        const payload = args[0];
        const type = typeof payload === "object" && payload ? (payload as { type?: string }).type : undefined;
        if (type === "update" || type === "full-reload") {
          n++;
          send({ type: "custom", event: "fuse:version", data: version() });
        }
      }) as typeof ws.send;
    },
  };
}

// Vendors the SolidJS 2.0 docs into the repo so they ship in dist/docs/solid-2.0/
// alongside our own docs (see post-build.ts). Run manually when Solid updates:
//
//   bun run sync-solid-docs
//
// The vendored copy is committed, so `bun run build` stays offline-capable and you
// get a clean git diff whenever upstream changes. Keep this a faithful mirror — don't
// edit the fetched files.

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const REPO = "solidjs/solid";
const REF = "next";
const SRC_PATH = "documentation/solid-2.0";
const OUT_DIR = "vendor/solid-2.0-docs";

type ContentEntry = { name: string; type: string; download_url: string | null };

const headers: Record<string, string> = { "User-Agent": "solid-fuse-sync-docs" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function fetchJson(url: string) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  return res.json();
}

const listing: ContentEntry[] = await fetchJson(
  `https://api.github.com/repos/${REPO}/contents/${SRC_PATH}?ref=${REF}`,
);
const docs = listing.filter((e) => e.type === "file" && e.name.endsWith(".md"));

// Rebuild from scratch so files removed upstream don't linger in the mirror.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

for (const doc of docs) {
  const res = await fetch(doc.download_url!, { headers });
  if (!res.ok) throw new Error(`GET ${doc.download_url} → ${res.status} ${res.statusText}`);
  writeFileSync(join(OUT_DIR, doc.name), await res.text());
}

console.log(
  `Synced ${docs.length} Solid 2.0 docs from ${REPO}@${REF}/${SRC_PATH} → ${OUT_DIR}/`,
);

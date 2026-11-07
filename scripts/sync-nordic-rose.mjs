#!/usr/bin/env node
// Vendors the Nordic Rose design system into a project: copies tokens, styles, shared components and lib
// files from a nordic-rose checkout into this project. Deploys never need access to the private repo,
// because the copied files are committed in the project.
//
//   node scripts/sync-nordic-rose.mjs                    uses $NORDIC_ROSE_DIR, else ../nordic-rose, else clones with `gh`
//   node scripts/sync-nordic-rose.mjs --from ../nordic-rose
//   node scripts/sync-nordic-rose.mjs --check            exit 1 if the project differs from Nordic Rose (needs the source)
//   node scripts/sync-nordic-rose.mjs --verify           exit 1 if a vendored file was edited since the last sync. Needs no
//                                                        access to the private repo: it checks the hashes recorded in
//                                                        .nordic-rose-sync.json (use this in CI)
//   node scripts/sync-nordic-rose.mjs --from <repo> --to templates/astro-starter   (used by nordic-rose itself)
//
// Synced files are Nordic Rose-owned: edit them in nordic-rose, then sync. Project-owned files are never touched
// (Layout, Header, Footer, src/styles/global.css, src/data/site.ts, package.json, ...).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const REPO = "mendozaivanka/nordic-rose";
const args = process.argv.slice(2);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const check = args.includes("--check");
const to = resolve(opt("to") ?? ".");

// [path in nordic-rose, path in the project]. Directories are mirrored (files removed upstream are removed here).
const MAP = [
  ["tokens/tokens.ts", "src/data/tokens.ts"],
  ["tokens/gen-tokens.ts", "scripts/gen-tokens.ts"],
  ["styles/nordic-rose.css", "src/styles/nordic-rose.css"],
  ["components/ui", "src/components/ui"],
  ["components/ThemeMenu.tsx", "src/components/ThemeMenu.tsx"],
  ["components/ContrastSwitch.tsx", "src/components/ContrastSwitch.tsx"],
  ["components/RoseMark.tsx", "src/components/RoseMark.tsx"],
  ["components/RoseDemo.tsx", "src/components/RoseDemo.tsx"],
  ["lib/utils.ts", "src/lib/utils.ts"],
  ["lib/theme.ts", "src/lib/theme.ts"],
  ["lib/contrast.ts", "src/lib/contrast.ts"],
  ["lib/toast.ts", "src/lib/toast.ts"],
  ["pages/nordic-rose.astro", "src/pages/nordic-rose.astro"],
  ["scripts/sync-nordic-rose.mjs", "scripts/sync-nordic-rose.mjs"],
];

const STAMP = join(to, ".nordic-rose-sync.json");
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const listFiles = (p) =>
  statSync(p).isDirectory() ? readdirSync(p, { recursive: true }).filter((f) => statSync(join(p, f)).isFile()).sort() : [""];

if (args.includes("--verify")) {
  if (!existsSync(STAMP)) throw new Error("no .nordic-rose-sync.json: run a sync first");
  const { commit, files: recorded } = JSON.parse(readFileSync(STAMP, "utf8"));
  if (!recorded) throw new Error(".nordic-rose-sync.json has no file hashes: re-run the sync with a current script");
  const present = MAP.flatMap(([, dest]) => (existsSync(join(to, dest)) ? listFiles(join(to, dest)).map((f) => join(dest, f)) : []));
  let bad = 0;
  for (const f of Object.keys(recorded)) {
    if (!existsSync(join(to, f))) { bad++; console.log(`missing   ${f}`); }
    else if (sha(join(to, f)) !== recorded[f]) { bad++; console.log(`edited    ${f}`); }
  }
  for (const f of present.filter((f) => !(f in recorded))) { bad++; console.log(`extra     ${f}`); }
  console.log(bad ? `${bad} vendored file(s) differ from Nordic Rose ${commit}. Change them in nordic-rose, then sync.` : `Vendored files match Nordic Rose ${commit}.`);
  process.exit(bad ? 1 : 0);
}

let from = opt("from") ?? process.env.NORDIC_ROSE_DIR;
let cleanup;
if (!from) {
  const sibling = resolve(to, "../nordic-rose");
  if (existsSync(join(sibling, "tokens/tokens.ts"))) from = sibling;
  else {
    const tmp = mkdtempSync(join(tmpdir(), "nordic-rose-"));
    console.log(`No local nordic-rose found; cloning ${REPO} with gh (needs \`gh auth login\`)...`);
    execFileSync("gh", ["repo", "clone", REPO, tmp, "--", "--depth", "1"], { stdio: "inherit" });
    from = tmp;
    cleanup = tmp;
  }
}
from = resolve(from);
if (!existsSync(join(from, "tokens/tokens.ts"))) throw new Error(`${from} does not look like nordic-rose`);

const files = listFiles;

let changed = 0;
for (const [src, dest] of MAP) {
  const s = join(from, src);
  const d = join(to, dest);
  if (!existsSync(s)) throw new Error(`missing upstream: ${src}`);
  const upstream = files(s);
  const local = existsSync(d) ? files(d) : [];
  for (const f of upstream) {
    const sf = join(s, f);
    const df = join(d, f);
    if (existsSync(df) && readFileSync(sf).equals(readFileSync(df))) continue;
    changed++;
    console.log(`${check ? "differs" : "update "}  ${join(dest, f)}`);
    if (!check) {
      mkdirSync(dirname(df), { recursive: true });
      cpSync(sf, df);
    }
  }
  for (const f of local.filter((f) => !upstream.includes(f))) {
    changed++;
    console.log(`${check ? "extra  " : "remove "}  ${join(dest, f)}`);
    if (!check) rmSync(join(d, f));
  }
}

if (!check && !args.includes("--no-stamp")) {
  let commit = "unknown";
  try {
    commit = execFileSync("git", ["-C", from, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {}
  const hashes = Object.fromEntries(
    MAP.flatMap(([, dest]) => listFiles(join(to, dest)).map((f) => [join(dest, f), sha(join(to, dest, f))])),
  );
  writeFileSync(STAMP, JSON.stringify({ source: REPO, commit, files: hashes }, null, 2) + "\n");
}
if (cleanup) rmSync(cleanup, { recursive: true, force: true });
console.log(changed ? `${changed} file(s) ${check ? "out of sync" : "synced"}.` : "Already in sync with Nordic Rose.");
if (check && changed) process.exit(1);

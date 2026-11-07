// Publishes dist/ to the gh-pages branch of this repo's origin. GitHub Pages serves that branch.
// Run through `npm run deploy`, which rebuilds the data and the site first.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dist = path.join(root, "dist");
if (!existsSync(path.join(dist, "index.html")) || !existsSync(path.join(dist, "data", "course.json"))) {
  console.error("dist/ is missing the site or its data. Run `npm run deploy`, not this script directly.");
  process.exit(1);
}
const git = (args, cwd) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
const remote = git(["remote", "get-url", "origin"], root);
const rev = git(["rev-parse", "--short", "HEAD"], root);

const tmp = mkdtempSync(path.join(tmpdir(), "jlpt-pages-"));
try {
  cpSync(dist, tmp, { recursive: true });
  writeFileSync(path.join(tmp, ".nojekyll"), ""); // keep Astro's _astro/ folder
  git(["init", "-q", "-b", "gh-pages"], tmp);
  git(["add", "-A"], tmp);
  git(["-c", "user.name=" + git(["config", "user.name"], root), "-c", "user.email=" + git(["config", "user.email"], root), "commit", "-q", "-m", `Deploy ${rev}`], tmp);
  git(["push", "-q", "-f", remote, "gh-pages"], tmp);
  console.log(`Deployed ${rev} to gh-pages`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

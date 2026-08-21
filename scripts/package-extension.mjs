// Packages the built dist/ into a zip for Chrome Web Store upload using the
// system `zip` command (available on macOS/Linux).
import { mkdir, readFile, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";

const distDir = join(process.cwd(), "dist");
const outDir = process.cwd();

const manifestRaw = await readFile(join(distDir, "manifest.json"), "utf8");
const version = JSON.parse(manifestRaw).version ?? "0.1.0";
const outName = `${basename(process.cwd())}-${version}.zip`;
const outPath = join(outDir, outName);

await mkdir(outDir, { recursive: true });
await rm(outPath, { force: true });

// zip -r outPath .  (run from dist so paths are relative)
execFileSync("zip", ["-r", outPath, "."], { cwd: distDir, stdio: "inherit" });
console.log(`packaged -> ${outName}`);

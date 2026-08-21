import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = resolve(root, "store-assets");

const targets = [
  { html: "icon-128.html", out: "opencodego-pacer-icon-128.png", width: 128, height: 128 },
  { html: "store-preview.html", out: "opencodego-pacer-screenshot-640x400.png", width: 640, height: 400 },
  { html: "promo-small.html", out: "opencodego-pacer-promo-small-440x280.png", width: 440, height: 280 },
  { html: "promo-marquee.html", out: "opencodego-pacer-promo-marquee-1400x560.png", width: 1400, height: 560 },
];

function ensurePlaywright() {
  const check = spawnSync("npx", ["playwright", "--version"], { stdio: "pipe" });
  if (check.status !== 0) {
    console.log("Installing Playwright Chromium…");
    const install = spawnSync("npx", ["playwright", "install", "chromium"], {
      stdio: "inherit",
    });
    if (install.status !== 0) {
      throw new Error("Failed to install Playwright Chromium");
    }
  }
}

async function renderAll() {
  ensurePlaywright();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  for (const target of targets) {
    const page = await browser.newPage({
      viewport: { width: target.width, height: target.height },
      deviceScaleFactor: 1,
    });
    const fileUrl = pathToFileURL(resolve(assetsDir, target.html)).href;
    await page.goto(fileUrl, { waitUntil: "load" });
    const outPath = resolve(assetsDir, target.out);
    mkdirSync(dirname(outPath), { recursive: true });
    await page.screenshot({ path: outPath, type: "png" });
    await page.close();
    console.log(`Wrote ${outPath}`);
  }

  await browser.close();
}

await renderAll();

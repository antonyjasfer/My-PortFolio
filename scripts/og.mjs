// Renders public/og.png (1200x630) from scripts/og/og.html with Playwright.
// Playwright is a dev tool here, not a dependency: if it is not installed,
// the committed og.png is kept and the build carries on.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch {
  try { ({ chromium } = require(require.resolve("playwright", { paths: [process.env.NODE_PATH || "", "/usr/lib/node_modules", "/usr/local/lib/node_modules"] }))); } catch {
    console.log("og: Playwright not found, keeping the existing public/og.png");
    process.exit(0);
  }
}

const page = new URL("./og/og.html", import.meta.url).href;
const out = fileURLToPath(new URL("../public/og.png", import.meta.url));
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await tab.goto(page);
await tab.evaluate(() => document.fonts.ready);
await tab.screenshot({ path: out, type: "png" });
await browser.close();
console.log("og: wrote public/og.png");

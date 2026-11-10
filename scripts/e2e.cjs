// Behaviour checks for the review-focus items in docs/PLAN.md.
// Uses the Playwright that is preinstalled in the dev environment (not a
// package dependency). Run against a preview build:
//   npm run build && npx vite preview --port 4173 &  node scripts/e2e.cjs
const { chromium } = require("playwright");
const URL = process.env.E2E_URL || "http://127.0.0.1:4173/";
const GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${extra ? "  (" + extra + ")" : ""}`); if (!ok) failed++; };

async function open(browser, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opts });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  return { page, errors };
}
const tourTop = (page) => page.evaluate(() => {
  const st = document.querySelector(".pin-spacer") || document.querySelector("#tour");
  return st.getBoundingClientRect().top + scrollY;
});
const activePanel = (page) => page.evaluate(() => [...document.querySelectorAll(".tour-panel")].findIndex((p) => !p.inert));

(async () => {
  const browser = await chromium.launch({ args: GL });

  // 1. loads with no console errors, intro completes, graph canvas sized
  {
    const { page, errors } = await open(browser);
    check("no console errors on load", errors.length === 0, errors.join(" | "));
    check("intro finished", await page.evaluate(() => document.documentElement.classList.contains("intro-done")));
    check("hero headline visible", await page.locator(".hero-title").isVisible());

    // 2. tour: scrolling to step 3 activates panel 3 and the counter agrees
    const top = await tourTop(page);
    await page.evaluate((y) => scrollTo(0, y + innerHeight * 2.6), top);
    await page.waitForTimeout(1200);
    check("tour step follows scroll", (await activePanel(page)) === 2, "active=" + (await activePanel(page)));
    check("counter matches step", (await page.textContent("#tour-count")) === "3 of 6");

    // 3. resize mid-tour (review focus 2): active panel still matches progress
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(900);
    const top2 = await tourTop(page);
    await page.evaluate((y) => scrollTo(0, y + innerHeight * 2.6), top2);
    await page.waitForTimeout(1200);
    check("tour survives resize 1440 -> 390", (await activePanel(page)) === 2, "active=" + (await activePanel(page)));
    check("no horizontal overflow at 390", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    // 4. keyboard (review focus 3): focus moves with the active panel, never strands on <body>
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(900);
    const top3 = await tourTop(page);
    await page.evaluate((y) => scrollTo(0, y + innerHeight * 0.5), top3);
    await page.waitForTimeout(900);
    await page.focus(".tour-panel:not([inert]) a");
    await page.evaluate((y) => scrollTo(0, y + innerHeight * 1.6), top3);
    await page.waitForTimeout(1200);
    const where = await page.evaluate(() => {
      const a = document.activeElement;
      return a && a.closest(".tour-panel") ? [...document.querySelectorAll(".tour-panel")].indexOf(a.closest(".tour-panel")) : a.tagName;
    });
    check("focused tour link follows the active panel", where === 1, "focus=" + where);

    // 5. dialog: opens from the list, Escape closes and returns focus
    await page.evaluate(() => scrollTo(0, document.querySelector("#plist").getBoundingClientRect().top + scrollY - 200));
    await page.waitForTimeout(600);
    await page.click("#plist li:first-child button");
    check("dialog opens with focus on Close", await page.evaluate(() => document.activeElement.id === "dClose"));
    await page.keyboard.press("Escape");
    check("Escape closes and returns focus", await page.evaluate(() => document.querySelector("#detail").hidden && document.activeElement.closest("#plist") !== null));
    check("still no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 6. reduced motion: no Lenis, no pin, panels static and all reachable
  {
    const { page, errors } = await open(browser, { reducedMotion: "reduce" });
    const s = await page.evaluate(() => ({
      lenis: document.documentElement.classList.contains("lenis"),
      pin: !!document.querySelector(".pin-spacer"),
      staticTour: document.querySelector(".tour").classList.contains("static"),
      inert: [...document.querySelectorAll(".tour-panel")].some((p) => p.inert),
      heroVisible: getComputedStyle(document.querySelector(".hero-title")).visibility === "visible",
    }));
    check("reduced motion: no Lenis", !s.lenis);
    check("reduced motion: no pinning", !s.pin);
    check("reduced motion: tour is a static list, all panels reachable", s.staticTour && !s.inert);
    check("reduced motion: hero visible immediately", s.heroVisible);
    check("reduced motion: no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 7. WebGL context lost (review focus 5): fallback SVG replaces the canvas
  {
    const { page, errors } = await open(browser);
    await page.evaluate(() => document.querySelector("#graph").getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext());
    await page.waitForTimeout(600);
    const s = await page.evaluate(() => ({ nogl: document.documentElement.classList.contains("nogl"), fb: !document.querySelector("#graph-fallback").hidden }));
    check("context loss swaps in the fallback SVG", s.nogl && s.fb);
    check("context loss: no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 8. no WebGL at all: fallback shows, page works
  {
    const b2 = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
    const { page, errors } = await open(b2);
    const fb = await page.evaluate(() => !document.querySelector("#graph-fallback").hidden);
    check("no-WebGL browser shows the fallback SVG", fb);
    check("no-WebGL: no console errors", errors.length === 0, errors.join(" | "));
    await b2.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
})();

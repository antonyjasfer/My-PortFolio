// Behaviour checks for the review-focus items in docs/PLAN.md.
// Uses the Playwright that is preinstalled in the dev environment (not a
// package dependency). Run against a preview build:
//   npm run build && npx vite preview --port 4173 &  node scripts/e2e.cjs
const { chromium } = require("playwright");
const URL = process.env.E2E_URL || "http://127.0.0.1:4173/?e2e";
const GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${extra ? "  (" + extra + ")" : ""}`); if (!ok) failed++; };

async function open(browser, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opts });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-done"), null, { timeout: 8000 });
  await page.waitForTimeout(800);   // let the lazy graph attach
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

    // 5. project list: a list item opens the project view; Esc returns focus to it
    await page.evaluate(() => scrollTo(0, document.querySelector("#plist").getBoundingClientRect().top + scrollY - 200));
    await page.waitForTimeout(600);
    await page.click("#plist li:first-child button");
    await page.waitForTimeout(600);
    check("list: opens the project view with focus on its heading", await page.evaluate(() => !document.querySelector("#project-view").hidden && document.activeElement.id === "pv-title"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    check("list: Esc closes and returns focus to the list item", await page.evaluate(() => document.querySelector("#project-view").hidden && document.activeElement.closest("#plist") !== null));
    check("still no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 5b. research explorable: the slider and the coupling toggle change the interval
  {
    const { page, errors } = await open(browser);
    await page.evaluate(() => document.querySelector("#rx").scrollIntoView());
    await page.waitForTimeout(600);
    const lower = () => page.evaluate(() => Number(document.querySelector("#rx").dataset.lower));
    const l0 = await lower();
    await page.focus("#rx-eps");
    for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");   // keyboard, +0.5
    const l1 = await lower();
    check("research: raising ε lowers the low end of the interval", l1 < l0, `${l0} -> ${l1}`);
    await page.click("#rx-couple");
    const l2 = await lower();
    check("research: independent budgets widen the interval further", l2 < l1, `${l1} -> ${l2}`);
    await page.waitForTimeout(400);
    const v = await page.textContent("#rx-verdict");
    check("research: verdict reads the same numbers", v.includes(l2.toFixed(2)), v);
    await page.click("[data-rx-step=next]");
    const msg = await page.evaluate(() => [...document.querySelectorAll(".rx-msg")].filter((t) => t.textContent).length);
    check("research: a step shows the observation messages", msg === 4, `labels=${msg}`);
    check("research: no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 5c. project route: opens from the timeline, Esc returns to the same place with focus restored
  {
    const { page, errors } = await open(browser);
    await page.evaluate(() => scrollTo(0, document.querySelector("#path").getBoundingClientRect().top + scrollY));
    await page.waitForTimeout(900);
    const y0 = await page.evaluate(() => Math.round(scrollY));
    await page.click("#pathlist li:nth-child(3) .entry-links a");
    await page.waitForTimeout(700);
    const opened = await page.evaluate(() => ({ hash: location.hash, visible: !document.querySelector("#project-view").hidden, title: document.querySelector("#pv-title").textContent, focus: document.activeElement.id, inert: document.querySelector("main").inert }));
    check("route: timeline link opens #/project/visca", opened.hash === "#/project/visca" && opened.visible && opened.title === "VISCA BARCA", JSON.stringify(opened));
    check("route: focus moves to the heading and the page behind is inert", opened.focus === "pv-title" && opened.inert);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    const closed = await page.evaluate(() => ({ hash: location.hash, y: Math.round(scrollY), focus: document.activeElement.textContent, hidden: document.querySelector("#project-view").hidden }));
    check("route: Esc closes and restores the scroll position", closed.hidden && closed.hash === "" && Math.abs(closed.y - y0) < 4, `y0=${y0} ${JSON.stringify(closed)}`);
    check("route: focus returns to the link that opened it", /VISCA/.test(closed.focus), closed.focus);
    check("route: no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 5d. deep link on first load, then Back leaves the route
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(URL.replace("/?", "/?") + "#/project/arbiter", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => !document.querySelector("#project-view").hidden && document.querySelector("#pv-title").textContent);
    check("route: deep link opens the project on first load", t === "Arbiter", String(t));
    await page.click("#pv-back");
    await page.waitForTimeout(500);
    check("route: Back closes a deep-linked project", await page.evaluate(() => document.querySelector("#project-view").hidden && location.hash === ""));
    check("route: deep link has no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 5d2. browser Back/Forward through project routes
  {
    const { page, errors } = await open(browser);
    await page.evaluate(() => scrollTo(0, document.querySelector("#plist").getBoundingClientRect().top + scrollY - 200));
    await page.click("#plist li:first-child button");
    const shown = () => page.evaluate(() => !document.querySelector("#project-view").hidden);
    await page.waitForFunction(() => !document.querySelector("#project-view").hidden);
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("#project-view").hidden, null, { timeout: 3000 }).catch(() => {});
    check("history: Back closes the project", !(await shown()));
    await page.goForward();
    await page.waitForFunction(() => !document.querySelector("#project-view").hidden, null, { timeout: 3000 }).catch(() => {});
    check("history: Forward reopens it", await shown());
    await page.evaluate(() => { location.hash = "#/project/nexus"; });
    await page.waitForFunction(() => document.querySelector("#pv-title").textContent === "NEXUS", null, { timeout: 3000 }).catch(() => {});
    check("history: changing the hash switches project", (await page.textContent("#pv-title")) === "NEXUS");
    await page.mouse.click(5, 5);   // focus falls to <body>
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    check("history: Esc still closes after clicking empty space", !(await shown()));
    check("history: no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 5e. idle rendering must not stall scrolling: after the graph goes idle, a scroll still drives the tour
  {
    const { page } = await open(browser);
    await page.waitForTimeout(2500);                       // let the scene drop to its idle frame rate
    const top = await tourTop(page);
    await page.evaluate((y) => scrollTo(0, y + innerHeight * 4.6), top);
    await page.waitForTimeout(900);
    check("idle: a scroll after idling still updates the tour", (await activePanel(page)) === 4, "active=" + (await activePanel(page)));
    await page.close();
  }

  // 5f. about: the photo loads; contact shows only real links
  {
    const { page } = await open(browser);
    await page.evaluate(() => document.querySelector("#about").scrollIntoView());
    await page.waitForTimeout(800);
    const photo = await page.evaluate(() => { const i = document.querySelector("#portrait img"); return i && i.complete && i.naturalWidth > 0; });
    check("about: headshot loads", photo);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll("#contact-links a")].map((a) => a.getAttribute("href")));
    check("contact: only real links, no TODO", hrefs.length >= 1 && hrefs.every((h) => h.startsWith("https://") || h.startsWith("mailto:")) && !hrefs.some((h) => /TODO/i.test(h)), hrefs.join(","));
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
    await page.evaluate(() => document.querySelector("#rx").scrollIntoView());
    await page.click("[data-rx-step=next]"); await page.click("[data-rx-step=next]");
    const rx = await page.evaluate(() => ({ dots: [...document.querySelectorAll(".rx-particle")].every((d) => d.getAttribute("opacity") === "0"), step: document.querySelector("#rx-step-label").textContent }));
    check("reduced motion: research has no moving particles, steps still work", rx.dots && /Step 2 of 2/.test(rx.step), JSON.stringify(rx));
    check("reduced motion: no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 7. WebGL context lost (review focus 5): fallback SVG replaces the canvas
  {
    const { page, errors } = await open(browser);
    await page.waitForFunction(() => window.__graph, null, { timeout: 8000 });
    await page.evaluate(() => window.__graph.loseContext());
    await page.waitForFunction(() => document.documentElement.classList.contains("nogl"), null, { timeout: 5000 }).catch(() => {});
    const s = await page.evaluate(() => ({ nogl: document.documentElement.classList.contains("nogl"), fb: !document.querySelector("#graph-fallback").hidden }));
    check("context loss swaps in the fallback SVG", s.nogl && s.fb);
    check("context loss: no console errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // 8. no WebGL at all: fallback shows, page works
  {
    // --disable-webgl only affects documents, not workers, so also remove
    // OffscreenCanvas transfer: the page then takes its main-thread path.
    const b2 = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
    const ctx = await b2.newContext();
    await ctx.addInitScript(() => { delete HTMLCanvasElement.prototype.transferControlToOffscreen; });
    const { page, errors } = await open(ctx);
    const fb = await page.evaluate(() => !document.querySelector("#graph-fallback").hidden);
    check("no-WebGL browser shows the fallback SVG", fb);
    await page.evaluate(() => scrollTo(0, document.querySelector("#plist").getBoundingClientRect().top + scrollY - 200));
    await page.click("#plist li:first-child button");
    await page.waitForFunction(() => !document.querySelector("#project-view").hidden, null, { timeout: 3000 }).catch(() => {});
    check("no-WebGL: projects still open", await page.evaluate(() => !document.querySelector("#project-view").hidden));
    check("no-WebGL: no console errors", errors.length === 0, errors.join(" | "));
    await b2.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
})();

# Portfolio foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the v1 single-file prototype as a Vite + vanilla-JS site whose 3D skill graph assembles on load, reacts to scroll, and carries a pinned project tour, while staying readable with reduced motion and without WebGL.

**Architecture:** Plain ES modules. `src/data` holds verified content, `src/scene` owns everything three.js (pure graph and layout functions, plus a scene object with a small imperative API), and `src/motion` owns Lenis, GSAP timelines and pointer effects. One `gsap.ticker` callback drives Lenis, ScrollTrigger and the WebGL render, so there is exactly one rAF loop. `main.js` wires them together and is the only file that knows about all three.

**Tech stack:** Vite 8 (dev only), three 0.187, gsap 3.15 (ScrollTrigger, SplitText, CustomEase, all in the free `gsap` package), lenis 1.3. Tests use `node --test`, so no extra dependency.

**Spec:** the user's brief (Prompt 1) plus `legacy/index.html` (v1). The design direction below is the agreed interpretation.

---

## 1. Design direction

### What the site is for
A recruiter, research supervisor or hackathon teammate should learn in under a minute who Antony is (an AI & Data Science student at Amrita), what he has built (projects connected to the skills they use), and that every claim links to code. The graph is the evidence. The tone matches v1's tagline: *AI systems that show their evidence before they ask to be trusted.*

### Palette (kept from v1, with AA fixes)
| Token | Hex | Role |
|---|---|---|
| `--paper` | `#EEF1F5` | page ground, cool not cream |
| `--paper-2` | `#E2E7EE` | inset surfaces (demo, pinned project panel) |
| `--ink` | `#16213E` | text, project nodes, primary buttons (14.0:1 on paper) |
| `--slate` | `#5B6B82` | secondary text on paper only (4.79:1) |
| `--slate-strong` | `#4E5D73` | **new:** secondary text on paper-2 (5.39:1; slate there is only 4.37) |
| `--saffron` | `#E8A317` | messages, particles, highlights. **Never text on paper** (1.91:1). Fine on ink (7.33:1) |
| `--signal` | `#D7263D` | non-text "flag" marks |
| `--signal-text` | `#B5172C` | **new:** signal used as text (5.93:1; signal itself is 4.38) |

Focus ring: `--saffron` alone fails 3:1 on paper, so the focus style is a 2px ink outline with a 4px saffron halo outside it (`box-shadow`). It reads as saffron, and the ink edge carries the contrast.

### Type
Bricolage Grotesque (display, variable `opsz` 12–96 and `wght`) and IBM Plex Sans (body). A fluid scale with ratio about 1.25 on mobile and 1.333 on desktop, built with `clamp()`, steps `--step--1` … `--step-6`. The hero name is the largest object on the page and is set tight (`-0.035em`, `opsz 96`). Sentence case everywhere: no eyebrow labels and no all-caps.

### Layout
```
desktop (hero)                         desktop (projects, pinned)
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│ Antony                Work Res … │   │                                  │
│                 ·  ·   graph     │   │   graph, camera on node    ┌────┐│
│            ·  ●──●──·            │   │        ●━━━━●               │proj││
│ Antony          ·  ●             │   │                             │text││
│ Selva Jasfer                     │   │   progress: 2 / 6           └────┘│
│ I build AI systems that show …   │   └──────────────────────────────────┘
└──────────────────────────────────┘
```
Hero text is left-aligned at the bottom left, and the graph is offset right (as in v1). Content panels sit in a right-hand column of `min(560px,44vw)` on desktop and go full width on mobile. Panels are not identical cards. The pinned project panel is a flat `paper-2` slab with an ink rule on its left edge. Other sections are plain text on the gridded paper with no box, and the detail dialog keeps v1's hard 8px ink offset shadow. Radii vary by role (18px panels, 999px chips, 0 for the pinned slab).

### Signature motion: "the message carries you"
v1's saffron message particles become the site's single motion motif. **Every movement of attention travels along a real edge of the graph.**
- **Load:** nodes fly in from a scattered cloud into the force layout, then edges draw from each project outward. The first particles leave as the hero headline settles, so text and graph form one sequence.
- **Scroll:** in the pinned project tour, the camera does not cut from project to project. It travels the route *project → shared skill → next project*, with a bright saffron "courier" particle leading it along the same edges. The route shows a real relationship (for example Arbiter → LLM agents → LedgerGuard). If two featured projects share no skill, the route goes through the graph centre.
- **Elsewhere:** section focus changes (v1's `data-focus`) dim and undim nodes, and the courier runs to the newly focused node.

There is nothing else ambient: no fade-up on every section and no hover lift on every list item.

### Anti-trope check (reviewed against the brief)
- No dark mode with neon: the ground is cool paper.
- No uniform cards: three distinct surface treatments (see Layout).
- No eyebrows, no `01 / 02` numbering. The only counter is the pinned tour's "2 of 6", which is a real sequence.
- No `→` glyphs appended to links, no middle-dot meta strings, no monospace data labels.
- *Changed after review:* my first draft wiped a full-screen ink curtain between sections. That is a common agency trope and it hides the graph, so wipes are now applied to section **content** (`clip-path: inset()` revealed top-down as each section enters), not to the viewport.

---

## Revision 2: changes from the planner and architect reviews

Both reviewers flagged the same structural problems. This section **overrides** anything below that conflicts with it.

| # | Flag | Change |
|---|---|---|
| R1 | Lazy-loading three conflicts with an intro that needs the scene (both, blocking) | Lazy loading moves from Task 9 to Task 6. `main.js` starts `import('./scene/scene.js')` at boot and uses a `NullScene` with the same API until it resolves (and permanently if WebGL fails). The text timeline plays at once; the scene's assembly tween is added to the master timeline when the scene arrives, at `max(now, intro label "graph")`. |
| R2 | The ticker sat in `lenis.js` and reached into the scene (both) | `main.js` owns the only `gsap.ticker.add`. It calls `lenis?.raf(time*1000)` and then `scene.render(Math.min(deltaMs/1000, .05))` (deltaMs is the ticker callback's 2nd argument). Lenis uses `autoRaf:false`. `lenis.js` only creates Lenis and wires `ScrollTrigger.update`. |
| R3 | No single owner of focus (architect, blocking) | New `src/state/focus.js`: layers ranked `dialog > chip > tour > section`. Each source sets or clears only its own layer, and the top layer is pushed to `scene.setFocus({ids, aimId}\|null)`. This replaces `focusProject/focusSkill/projectsOnly/clear`. |
| R4 | SceneAPI gaps (architect) | New contract below: adds `resize`, `setSpeed`, `onLost`; `onPick` returns an unsubscribe; `setTour(fromId,toId,t)` caches the curve internally, so motion never imports routing. |
| R5 | Pure modules separated from three.js (architect, planner) | `src/scene/{graph,layout,route,assembly}.js` stay in `src/scene/` because the brief fixes that structure, but they are pure (no three import) and shared by the scene, `scripts/render-fallback.mjs` and the tests. The fallback script also writes `src/scene/layout.json`, so the 260-iteration loop never runs on the main thread. A test asserts that `layout.json` equals `layoutForce()` output, so it cannot drift. |
| R6 | `autoAlpha` hides tour links from keyboard users (planner, blocking) | Tour panels tween `opacity` and `xPercent` only. The inactive panels get `inert` (removed from the tab order on purpose). The active panel's link stays reachable. On `focusin` of an inactive panel (possible through screen-reader navigation) the page scrolls to that step, and it skips if the step is already active. |
| R7 | Reduced motion not covered (planner, blocking) | `scene.render` draws only when dirty. With `opts.reduced`, focus changes snap and every setter calls `invalidate()`. `initTour({reduced:true})` does nothing, so panels show as a static stack. `scrollIntoView` replaces `lenis.scrollTo` when Lenis is null. |
| R8 | No Playwright harness (planner, blocking) | Screenshots use the Playwright MCP. The review-focus assertions live in `scripts/e2e.cjs`, which uses the **preinstalled** Playwright (not a package dependency) and runs against `vite preview`. Each task's verify step names the assertion it adds. |
| R9 | Task 5 too large; per-instance opacity is a shader risk (planner) | Task 5 splits into 5a (render, pause, context loss, picking) and 5b (assembly, tour). Nodes stay one `Mesh` each, as in v1 (about 60 draw calls, fine), which avoids `onBeforeCompile`. Only the particles are instanced. Assembly delay and edge-reveal maths live in `src/scene/assembly.js` with unit tests. |
| R10 | "No hard-coded motion" broken by the plan's own numbers (planner) | The rule is narrowed: **durations and easings** come only from CSS tokens. Choreography offsets live in one exported `CHOREO` table per motion module, and staggers use `--stagger-line` and `--stagger-node`. |
| R11 | Routing through a "graph centre" that is not a node (planner) | `routeBetween` returns `null` when there is no path; then `setTour` curves through the world origin. Test: two projects with no shared skill but a shared neighbour project route as `p,s,p,s,p` (length 5). |
| R12 | LCP and fonts (planner) | The headline is visible in CSS before any JS runs (masks apply only after the split succeeds), so LCP is not gated on fonts. Fonts are self-hosted latin woff2 subsets (OFL) in `public/fonts`, with `<link rel=preload>` for the two display and body files and `font-display:swap`. |
| R13 | Resize order (architect) | One debounced (150ms) resize handler in `main.js`: `scene.resize()`, then `ScrollTrigger.refresh()`. `ScrollTrigger.config({ignoreMobileResize:true})`. SplitText uses `autoSplit:true` with `onSplit` returning the tween. |
| R14 | `dispose` scope (architect) | `dispose()` removes the visibility, IntersectionObserver, pointer and context listeners, disposes geometries, materials and the renderer, and makes the API inert. It is wired to `import.meta.hot.dispose`. |
| R15 | Smaller items | `parseTokens` lives in a pure `src/motion/token-parse.js`. The regex uses `\b`. `legacy/index.html` is archival and kept out of the build (it loads three from a CDN import map). `setShift` is applied to the world group *after* the rig rotates it. In the SVG, labels use `font-family: "IBM Plex Sans", system-ui, sans-serif`, accepting the fallback font when shown as `<img>`. |

### SceneAPI (revision 2)
```
setFocus({ids:Set<string>, aimId?:string} | null)
setAssembly(t: 0..1)              // 0 scattered, 1 laid out
setSpeed(k: 0..1)                 // particle speed multiplier (intro ramp)
setTour(fromId, toId, t) | setTour(null)
setShift(x, y)
resize()                          // reads canvas client size, DPR ≤ 2
render(dt)                        // no-op unless dirty or animating, and not paused
invalidate()
onPick(cb) -> unsubscribe
onLost(cb)                        // context lost; main.js swaps to fallback + NullScene
dispose()
```

---

## Global constraints
- Runtime deps: exactly `three`, `gsap`, `lenis`. Dev deps: `vite` only. Ask before adding anything else.
- Content: only claims verified against `github.com/antonyjasfer/<repo>` READMEs (checked 2026-11-10). Unverifiable items are stated as status ("in progress"), never as achievements.
- One rAF: `gsap.ticker` is the only frame loop. No `requestAnimationFrame` calls elsewhere.
- `prefers-reduced-motion: reduce` means no Lenis, no pinning, no SplitText animation and a static graph (rendered on demand only). All content stays readable and in normal flow.
- DPR capped at 2. Particle count is 150 on desktop and 40 when `(max-width: 860px)` or `(pointer: coarse)`.
- Rendering pauses when `document.hidden` or when the canvas is not intersecting the viewport.
- No-WebGL fallback: `public/graph-fallback.svg`, generated from the same layout code by `npm run fallback`.
- Motion tokens live in `tokens.css` as CSS custom properties. JS reads them through `src/motion/tokens.js`, and no duration or ease is hard-coded in JS.
- Targets: Lighthouse mobile Performance ≥ 85, Accessibility ≥ 95.

## Review focus (failure modes no task test would naturally hit)
1. **Fonts arrive after SplitText splits.** Lines split against fallback-font metrics break wrongly. *Test (Task 6):* the intro waits on `document.fonts.ready` (with a 1500ms cap) before calling `SplitText.create`.
2. **Window resized while the tour is pinned.** Pin offsets go stale. *Test (Task 7):* a Playwright check resizes from 1440 to 390 mid-tour and asserts the active panel index still matches scroll progress (`ScrollTrigger.refresh` on debounced resize).
3. **Keyboard user tabs into the pinned tour.** Focus lands on an off-screen panel. *Test (Task 7):* each tour panel's link on `focus` scrolls Lenis to that step, and Playwright asserts the panel is visible after Tab.
4. **Reduced motion toggled at runtime.** *Test (Task 8):* the `matchMedia` change listener reloads motion setup (`location.reload()` is acceptable and simple), and is checked by emulating media in Playwright.
5. **WebGL context lost** (mobile GPUs under memory pressure). *Test (Task 5):* on `webglcontextlost` the scene stops the ticker callback and the fallback SVG is shown (forced with `WEBGL_lose_context` in Playwright).

---

## File structure
```
index.html                 new shell: semantic sections, no inline JS data
legacy/index.html          v1 prototype, moved unchanged
public/graph-fallback.svg  generated
scripts/render-fallback.mjs
src/main.js                boot and wiring only
src/data/projects.js       export const PROJECTS (verified, + featured flag)
src/data/path.js           export const PATH
src/scene/graph.js         buildGraph(projects) -> {nodes, edges, adj, byId}   (pure)
src/scene/layout.js        layoutForce(graph, {seed, iterations}) -> void (sets n.p as {x,y,z}) (pure, no three)
src/scene/route.js         routeBetween(graph, fromId, toId) -> nodeId[]        (pure)
src/scene/assembly.js      scatter(graph, seed) -> start positions; lerp helpers (pure)
src/scene/particles.js     createParticles(THREE, graph, count) -> {mesh, update(dt, opacityOf), courier}
src/scene/camera.js        createRig(camera, world) -> {aimAt(p), travel(points, t), update(dt)}
src/scene/labels.js        createLabels(container, nodes) -> {update(camera, size)}
src/scene/scene.js         createScene(canvas, graph, opts) -> SceneAPI (below)
src/motion/tokens.js       readTokens() -> {dur:{...}, ease:{...}} (registers CustomEase)
src/motion/lenis.js        initSmoothScroll({reduced}) -> Lenis|null; single ticker
src/motion/intro.js        playIntro({scene, hero, tokens, reduced}) -> gsap.core.Timeline
src/motion/text.js         splitLines(el) -> SplitText
src/motion/tour.js         initTour({scene, section, steps, tokens}) -> ScrollTrigger
src/motion/sections.js     initSectionFocus(scene) (IntersectionObserver), initWipes(tokens)
src/motion/pointer.js      initMagnetic(selector), initCursor() (fine pointer + no reduced motion only)
src/ui/projects-list.js    chips, list, detail dialog (ported from v1)
src/ui/research-demo.js    v1 toy demo, ported
src/styles/tokens.css, base.css, sections.css
tests/*.test.js            node --test
```

**SceneAPI** (the contract `main.js` and `src/motion/*` rely on):
```
focusProject(id) · focusSkill(name) · projectsOnly() · clear()
setAssembly(t: 0..1)            // 0 = scattered, 1 = laid out; edges draw over t∈[.55,1]
setTour(route: string[], t: 0..1) // camera + courier along route; null route = free orbit
setShift(x, y)                  // world offset for left/right composition
render(dt)                      // called from gsap.ticker; no-op while paused
invalidate()                    // request one frame (reduced motion / idle)
setPaused(bool) · onPick(cb) · dispose()
```

---

## Tasks

### Task 1: Scaffold Vite, move the prototype, data modules
**Files:** create `package.json`, `vite.config.js`, `index.html`, `src/data/projects.js`, `src/data/path.js`, `tests/data.test.js`; move `index.html` to `legacy/index.html`.
- [ ] `git mv index.html legacy/index.html`, then `npm init` and `npm i three gsap lenis` and `npm i -D vite`. Scripts: `dev`, `build`, `preview`, `test` (`node --test tests/`), `fallback`.
- [ ] Test `tests/data.test.js`: every project has `id,t,w,repo,d,s,k[]`; ids are unique; exactly 6 have `featured:true`; every `repo` is a repo name from the verified list; and no project string matches `/award|winner|won|users|\d+%/i` unless the phrase is in an allowlist of README-verified numbers (`203 tests`, `23 stands`, `70B`).
- [ ] Port `window.PROJECTS` and `window.PATH` to ES exports. Apply the verified wording changes: Arbiter's GitHub Actions checks become future tense ("will run"), because the repo is at Phase 3 (agreements); VOTE "built to WCAG 2.1 AA" becomes "targets WCAG 2.1 AA". Featured: `arbiter, visca, ledgerguard, legallens, nexus, lumina`.
- [ ] `npm test` passes, then `npm run build` passes on the empty shell. Commit `chore: scaffold vite, move v1 to legacy/, port data`.

### Task 2: Tokens and base styles
**Files:** `src/styles/tokens.css`, `base.css`, `sections.css`, `src/motion/tokens.js`, `tests/tokens.test.js`.
- [ ] tokens.css defines the palette above, the type steps `--step--1..--step-6` with `clamp()`, spacing `--space-3xs..--space-3xl` (fluid), radii by role, and motion tokens: `--dur-instant:120ms --dur-quick:240ms --dur-base:480ms --dur-slow:900ms --dur-epic:1600ms`, `--ease-out:cubic-bezier(.2,.8,.2,1) --ease-in-out:cubic-bezier(.65,0,.35,1) --ease-travel:cubic-bezier(.45,.05,.2,1)`. Reduced motion sets every `--dur-*` to `0ms`.
- [ ] Test: `parseTokens(cssText)` (exported from tokens.js) returns durations in seconds and easings as 4-number arrays for the sample above.
- [ ] `readTokens()` reads `getComputedStyle(document.documentElement)` and registers `CustomEase.create("out", ".2,.8,.2,1")` and so on. Commit `feat(styles): tokens, type scale, motion tokens`.

### Task 3: Pure graph modules
**Files:** `src/scene/graph.js`, `layout.js`, `route.js`, `assembly.js`, `tests/graph.test.js`.
- [ ] Tests: `buildGraph` gives one node per project plus one per unique skill, and one edge per project–skill pair. `layoutForce` with seed 7 is deterministic (the same positions twice) and centred (mean ≈ 0, ±1e-6). `routeBetween('arbiter','ledgerguard')` returns `['arbiter','s:LLM agents','ledgerguard']` or another shortest route through a shared skill node. A route between projects with no shared skill has length ≥ 3 and contains only connected hops. `scatter` puts every node at radius ≥ 12.
- [ ] Implement: port v1's sphere seeding and the 260-iteration force loop using plain `{x,y,z}` math (no three), so node can run it. `routeBetween` is BFS over `adj`. Commit `feat(scene): pure graph, layout, routing`.

### Task 4: Fallback SVG
**Files:** `scripts/render-fallback.mjs`, `public/graph-fallback.svg`.
- [ ] Script: build and lay out the graph, project with a fixed y-rotation of 0.4 rad (v1's start), and write an SVG (ink project dots r=9, slate skill dots r=4, edges `#5B6B82` at 0.35 opacity, project labels in IBM Plex Sans) with `role="img"` and a `<title>`.
- [ ] Run `npm run fallback` and check the file exists and is under 40 KB. Commit `feat: static fallback svg of the skill graph`.

### Task 5: Scene (port v1 graph to modules)
**Files:** `src/scene/particles.js`, `camera.js`, `labels.js`, `scene.js`.
- [ ] Port v1 behaviour: node meshes, edge `LineSegments` with per-vertex alpha, InstancedMesh messages, hover/pick with tooltip, drag rotate, focus/aim, labels. Project nodes become an InstancedMesh too (a single draw call) with per-instance colour/opacity through `instanceColor` plus an opacity attribute.
- [ ] Assembly: `setAssembly(t)` lerps each node from `scatter` to its layout position with per-node delay `(i/n)*.35`, eased out. Edges reveal by growing each segment's end vertex from A toward B over `t∈[.55,1]`.
- [ ] Tour: `setTour(route,t)` builds a `CatmullRomCurve3` through the route's node positions (in world space), puts the courier at `curve.getPointAt(t)`, and aims the camera at it (the rig lerps rotation, as in v1's `aim` code).
- [ ] Pause: `setPaused` is driven by `visibilitychange` and an IntersectionObserver on the canvas. `webglcontextlost` swaps in the fallback.
- [ ] Verify: `npm run dev`, Playwright screenshot at 1440×900 shows the assembled graph; zero console errors. Commit `feat(scene): modular three.js skill graph with assembly and tour`.

### Task 6: Smooth scroll, ticker, hero intro
**Files:** `src/motion/lenis.js`, `text.js`, `intro.js`, `src/main.js`.
- [ ] `initSmoothScroll`: `lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => { lenis?.raf(t*1000); scene.render(gsap.ticker.deltaRatio()/60) })`; `gsap.ticker.lagSmoothing(0)`. With reduced motion it returns null and the ticker only calls `scene.render`.
- [ ] Intro timeline (labels in seconds, all durations from tokens): `0` scene `setAssembly` 0→1 over `--dur-epic`; `0.25` headline lines rise from `yPercent:110` inside masks (SplitText `type:"lines", mask:"lines"`), stagger 0.08; `0.9` lede and meta fade/translate in (`--dur-base`); `1.2` particles' global speed ramps 0→1; `1.4` hint dot scales in. Wait on `document.fonts.ready` with a 1500ms cap. With reduced motion, `progress(1)` happens immediately.
- [ ] Verify with Playwright screenshots at 0.3s and 2.5s (assembling vs assembled). Commit `feat(motion): lenis, single ticker, choreographed hero intro`.

### Task 7: Pinned project tour, section focus, wipes
**Files:** `src/motion/tour.js`, `sections.js`, `index.html` (tour markup), `src/styles/sections.css`.
- [ ] Tour: `#work-tour` is pinned for `(steps.length)*100%` with `scrub: true`. Step `i` covers progress `[i/n,(i+1)/n]`. Within a step, the first 40% is travel (`scene.setTour(route(prev→cur), local/0.4)`) and the rest is dwell. Panels are `xPercent: 30→0, autoAlpha 0→1` in step with arrival, and the previous panel leaves `xPercent: 0→-20`. A counter shows "n of 6". Panel links get `focus` handlers that `lenis.scrollTo` the step start (Review focus 3). `ScrollTrigger.refresh` runs on debounced resize (Review focus 2).
- [ ] Below the tour, the full filterable list is ported from v1 (`src/ui/projects-list.js`).
- [ ] Section focus: v1's IntersectionObserver mapping (`data-focus` → `focusProject/projectsOnly/clear`) plus `setShift`.
- [ ] Wipes: each `.section-body` goes from `clip-path: inset(0 0 100% 0)` to `inset(0 0 0% 0)`, scrubbed from `top 85%` to `top 45%`. Not applied with reduced motion.
- [ ] Verify Playwright screenshots of the projects tour at step 1 and step 3 on desktop and mobile. Commit `feat(motion): pinned project tour, section focus, clip-path wipes`.

### Task 8: Pointer effects and remaining sections
**Files:** `src/motion/pointer.js`, `src/ui/research-demo.js`, `index.html`.
- [ ] Magnetic: elements matching `[data-magnetic]` (nav links, primary buttons) follow the pointer by up to 0.3× offset, clamped to 10px, using `gsap.quickTo` (`--dur-quick`, ease out), and return on leave. Only with `(hover:hover) and (pointer:fine)`.
- [ ] Cursor: a 10px saffron dot plus a 36px ink ring (`mix-blend` off for contrast). The ring grows over `a, button, [data-magnetic]`. Only with a fine pointer and no reduced motion. The native cursor stays visible (no `cursor:none`), so the effect is additive.
- [ ] Research section ports v1's text and toy demo. About, Path (rendered from PATH) and Contact get minimal placeholder content marked for Prompt 2.
- [ ] Commit `feat: magnetic links, desktop cursor, research and placeholder sections`.

### Task 9: Performance and accessibility pass
- [ ] three is loaded with a dynamic `import()` after the hero text paints, so LCP is the headline and not blocked by the WebGL bundle. Vite `manualChunks` puts `three` in its own chunk.
- [ ] Fonts: Google Fonts with `display=swap`, preconnect, and only the weights used.
- [ ] A11y: skip link; every interactive element is reachable and has a visible focus ring; the canvas is `aria-hidden` (the list is the accessible equivalent); the dialog returns focus to its opener (v1 behaviour); the nav uses `aria-current`; and a `matchMedia('(prefers-reduced-motion: reduce)')` change listener reloads the page (Review focus 4).
- [ ] Lighthouse (Chrome DevTools MCP) on `vite preview`, mobile and desktop. Record the scores in the final report and fix until Perf ≥ 85 and A11y ≥ 95 on mobile, or report honestly why not.
- [ ] Commit `perf/a11y: lazy three chunk, focus, reduced motion`.

### Task 10: Verification and review
- [ ] `npm test`, `npm run build` (record the gzip sizes), Playwright screenshots of hero, projects and research at 1440×900 and 390×844 into `docs/screenshots/`, and console messages are empty.
- [ ] `ecc:code-reviewer` on the full diff, fixing every blocking issue. Commit.

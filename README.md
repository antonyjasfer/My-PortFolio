# My-PortFolio

Portfolio of Antony Selva Jasfer: a 3D skill graph of projects and the tools
they use, built with Vite, vanilla JS, three.js, GSAP and Lenis.

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (node --test)
npm run build      # production build into dist/
npm run fallback   # regenerate src/scene/layout.json + public/graph-fallback.svg after editing projects
```

`npm run e2e` runs behaviour checks against `vite preview` on port 4173. It
uses a globally installed Playwright, which is not a dependency of this project.

- `docs/PLAN.md`: design direction, architecture and the plan this was built from
- `legacy/index.html`: the v1 single-file prototype, kept for reference (not built)
- Project facts live in `src/data/projects.js` and are checked against each repo's README

## Testing on a real phone

The lab numbers come from Chromium's software GL (SwiftShader). A real phone has a GPU, so measure there too.

1. Put the phone and the computer on the same Wi-Fi.
2. Build and serve the production bundle on your network:
   ```bash
   npm run build && npx vite preview --host
   ```
   Vite prints a `Network:` URL such as `http://192.168.1.20:4173/`. Open it on the phone.
   For live editing use `npm run dev -- --host` instead (port 5173). Dev mode is not representative for performance.
3. Profile from the computer with Chrome remote debugging (Android):
   - On the phone: Settings > About phone > tap Build number 7 times, then Developer options > USB debugging on. Connect by USB.
   - On the computer: open `chrome://inspect/#devices`, find the tab, click **inspect**, then use the Performance panel or the Lighthouse panel.
4. Or run Lighthouse from the computer against the phone-sized lab profile:
   ```bash
   npx lighthouse http://192.168.1.20:4173/ --view
   ```
   That still runs on the computer's CPU with mobile throttling. Only the remote-debugging route measures the phone itself.

The graph picks a quality tier (high, medium or low) from the device; add `?e2e` to the URL to expose the test hook used by `npm run e2e`.

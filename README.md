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

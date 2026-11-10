import { defineConfig } from "vite";
import { TITLE, DESCRIPTION, headTags, robotsTxt, sitemapXml, staticContent, esc } from "./scripts/seo.mjs";

// Head tags, JSON-LD, robots.txt and sitemap.xml come from src/data/site.js,
// so the domain (BASE_URL) and profile links change in one place.
const seo = () => ({
  name: "portfolio-seo",
  transformIndexHtml(html) {
    return staticContent(html)
      .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(TITLE)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${esc(DESCRIPTION)}">`)
      .replace("</head>", () => `${headTags()}\n</head>`);
  },
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt() });
    this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml() });
  },
});

export default defineConfig({
  plugins: [seo()],
  build: {
    // three.js lives in the graph worker (~140 kB gzip), loaded after the
    // hero paints, so its size is expected and not a startup cost.
    chunkSizeWarningLimit: 600,
  },
  preview: { port: 4173, strictPort: true },
});

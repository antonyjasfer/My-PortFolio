// Build-time SEO: head tags, JSON-LD, robots.txt and sitemap.xml, all from
// src/data/site.js. Used by the Vite plugin in vite.config.js; no runtime cost.
import { SITE, BASE_URL, sameAs } from "../src/data/site.js";
import { PROJECTS } from "../src/data/projects.js";

export const TITLE = `${SITE.name}: AI systems that show their evidence`;
export const DESCRIPTION =
  `${SITE.name}, B.Tech AI and Data Science student at ${SITE.university}: ` +
  `robust belief propagation research and ${PROJECTS.length} projects with code.`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const abs = (path) => new URL(path, BASE_URL.endsWith("/") ? BASE_URL : BASE_URL + "/").href;

/** schema.org Person. Only facts from site.js; affiliation, not alumniOf (still studying). */
export function personSchema() {
  const skills = [...new Set(PROJECTS.flatMap((p) => p.k))].slice(0, 12);
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.fullName,
    alternateName: SITE.name,
    url: abs("/"),
    image: abs(SITE.photo),
    description: `B.Tech ${SITE.degree.replace("B.Tech ", "")} student at ${SITE.university}, ${SITE.campus}.`,
    affiliation: { "@type": "CollegeOrUniversity", name: SITE.university },
    knowsAbout: skills,
  };
  const same = sameAs();
  if (same.length) person.sameAs = same;
  return person;
}

/** <head> tags injected into index.html at build and dev time. */
export function headTags() {
  const og = abs("/og.png");
  const tags = [
    ["link", { rel: "canonical", href: abs("/") }],
    ["meta", { property: "og:type", content: "profile" }],
    ["meta", { property: "og:title", content: TITLE }],
    ["meta", { property: "og:description", content: DESCRIPTION }],
    ["meta", { property: "og:url", content: abs("/") }],
    ["meta", { property: "og:image", content: og }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    ["meta", { property: "og:image:alt", content: `${SITE.name}, with a graph of projects and the skills they use` }],
    ["meta", { property: "profile:first_name", content: "Antony" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:title", content: TITLE }],
    ["meta", { name: "twitter:description", content: DESCRIPTION }],
    ["meta", { name: "twitter:image", content: og }],
  ];
  const html = tags.map(([t, a]) => `<${t} ${Object.entries(a).map(([k, v]) => `${k}="${esc(v)}"`).join(" ")}>`).join("\n");
  const ld = JSON.stringify(personSchema()).replace(/</g, "\\u003c");
  return `${html}\n<script type="application/ld+json">${ld}</script>`;
}

export const robotsTxt = () => `User-agent: *\nAllow: /\n\nSitemap: ${abs("/sitemap.xml")}\n`;

/** One page today; project routes are hash fragments, which sitemaps do not list. */
export const sitemapXml = (lastmod = new Date().toISOString().slice(0, 10)) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url><loc>${abs("/")}</loc><lastmod>${lastmod}</lastmod></url>\n</urlset>\n`;

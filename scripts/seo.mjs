// Build-time SEO: head tags, JSON-LD, robots.txt and sitemap.xml, all from
// src/data/site.js. Used by the Vite plugin in vite.config.js; no runtime cost.
import { SITE, BASE_URL, sameAs, contactLinks } from "../src/data/site.js";
import { PROJECTS } from "../src/data/projects.js";

export const TITLE = `${SITE.name}: AI systems that show their evidence`;
export const DESCRIPTION =
  `${SITE.name}, B.Tech AI and Data Science student at ${SITE.university}: ` +
  `robust belief propagation research and ${PROJECTS.length} projects with code.`;

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const abs = (path) => new URL(path, BASE_URL.endsWith("/") ? BASE_URL : BASE_URL + "/").href;

/** schema.org Person. Only facts from site.js; affiliation, not alumniOf (still studying). */
export function personSchema() {
  // research and project topics (all backed by projects on the page), not tool names
  const topics = ["Probabilistic graphical models", "Belief propagation", "Vision-language models", "LLM agents", "Retrieval-augmented generation", "Machine learning"];
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.fullName,
    alternateName: SITE.name,
    url: abs("/"),
    image: abs(SITE.photo),
    description: `B.Tech ${SITE.degree.replace("B.Tech ", "")} student at ${SITE.university}, ${SITE.campus}.`,
    affiliation: { "@type": "CollegeOrUniversity", name: SITE.university },
    knowsAbout: topics,
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
    ["meta", { property: "og:site_name", content: SITE.name }],
    ["meta", { property: "og:locale", content: "en_US" }],
    ["meta", { property: "og:title", content: TITLE }],
    ["meta", { property: "og:description", content: DESCRIPTION }],
    ["meta", { property: "og:url", content: abs("/") }],
    ["meta", { property: "og:image", content: og }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    ["meta", { property: "og:image:alt", content: `${SITE.name}, with a graph of projects and the skills they use` }],
    ["meta", { property: "profile:first_name", content: "Antony" }],
    ["meta", { property: "profile:last_name", content: "Selva Jasfer" }],
    ["meta", { property: "profile:username", content: SITE.github.split("/").pop() }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:title", content: TITLE }],
    ["meta", { name: "twitter:description", content: DESCRIPTION }],
    ["meta", { name: "twitter:image", content: og }],
    ["meta", { name: "twitter:image:alt", content: `${SITE.name}, with a graph of projects and the skills they use` }],
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

// ---- static content: present in the HTML before any script runs ----
export const ABOUT_LEDE =
  `I'm Antony, a B.Tech student in Artificial Intelligence and Data Science at ${SITE.university}, ${SITE.campus}. ` +
  "I like building AI systems that have to show their working: a contract reader that points to the clause behind each answer, " +
  "a payment flow designed to release money only after the work is checked, a belief score that comes with a range instead of one number. " +
  "Most of these started at hackathons, and the code for every project on this page is public.";

export const ABOUT_FACTS = [
  ["Studying", `${SITE.degree} at ${SITE.university}, ${SITE.campus}`],
  ["Researching", "Robust belief propagation for catching hallucinated claims in vision-language models. Paper in progress."],
  ["Building", `${PROJECTS.length} projects on this page, each linked to its code`],
  ["Code", `<a href="${esc(SITE.github)}">${esc(SITE.github.replace("https://", ""))}</a>`],
];

/** Replaces the empty containers in index.html with real content. */
export function staticContent(html) {
  const facts = ABOUT_FACTS.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k === "Code" ? v : esc(v)}</dd>`).join("");
  const links = contactLinks().map((l, i) =>
    `<li><a class="btn${i ? " ghost" : ""}" data-magnetic href="${esc(l.href)}"${l.kind !== "email" ? ` aria-label="${esc(l.label)} profile"` : ""}>${esc(l.kind === "email" ? `Email ${l.label}` : l.label)}</a></li>`).join("");
  const projects = PROJECTS.map((p) =>
    `<li><a href="https://github.com/antonyjasfer/${esc(p.repo)}">${esc(p.t)}</a>: ${esc(p.d)}</li>`).join("");
  // function replacers: a "$" in content must never be read as a replacement pattern
  return html
    .replace('<p class="about-lede" id="about-lede"></p>', () => `<p class="about-lede" id="about-lede">${esc(ABOUT_LEDE)}</p>`)
    .replace('<dl class="about-facts" id="about-facts"></dl>', () => `<dl class="about-facts" id="about-facts">${facts}</dl>`)
    .replace('<ul class="contact-links" id="contact-links"></ul>', () => `<ul class="contact-links" id="contact-links">${links}</ul>`)
    .replace('<div class="tour" id="tour">', () => `<noscript><ul class="noscript-projects">${projects}</ul></noscript>\n    <div class="tour" id="tour">`);
}

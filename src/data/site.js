// Personal details. Values set to "TODO" are not known yet: the page shows a
// neutral fallback (nothing broken, nothing invented) until they are filled in.

export const TODO = "TODO";

export const SITE = {
  fullName: "A. Antony Selva Jasfer",
  name: "Antony Selva Jasfer",          // display name
  initials: "AJ",                        // monogram if the photo cannot load
  degree: "B.Tech Artificial Intelligence & Data Science",
  university: "Amrita Vishwa Vidyapeetham",
  campus: "Nagercoil campus",
  github: "https://github.com/antonyjasfer",
  linkedin: TODO,                        // TODO: full LinkedIn profile URL
  email: TODO,                           // TODO: email address
  showEmail: TODO,                       // TODO: true to show the email on the page, false to keep it off
  photo: "/me.jpg",                      // plus /me-400.webp and /me-720.webp
};

/** Prompt 3 sets the real domain. Used for canonical, Open Graph and the sitemap. */
export const BASE_URL = "https://BASE_URL.example";

export const isSet = (v) => (typeof v === "string" ? v.trim() !== "" && v !== TODO : v != null);

const isHttpUrl = (v) => isSet(v) && /^https:\/\/[^\s]+$/.test(v);
const isEmail = (v) => isSet(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Contact links that are safe to render. A TODO or malformed value never
 * becomes an href; the email appears only when showEmail is exactly true.
 * @returns {{label:string, href:string, kind:string}[]}
 */
export function contactLinks(site = SITE) {
  const out = [];
  if (isHttpUrl(site.github)) out.push({ kind: "github", label: "GitHub", href: site.github });
  if (isHttpUrl(site.linkedin)) out.push({ kind: "linkedin", label: "LinkedIn", href: site.linkedin });
  if (site.showEmail === true && isEmail(site.email)) out.push({ kind: "email", label: site.email, href: `mailto:${site.email}` });
  return out;
}

/** Profile URLs for structured data (sameAs); only real values. */
export const sameAs = (site = SITE) => [site.github, site.linkedin].filter(isHttpUrl);

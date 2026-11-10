import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE, contactLinks, sameAs, isSet, TODO } from "../src/data/site.js";

test("TODO values never render as links", () => {
  const links = contactLinks(SITE);
  for (const l of links) assert.ok(!l.href.includes(TODO), l.href);
  assert.deepEqual(links.map((l) => l.kind), ["github"], "only GitHub is known today");
});

test("email shows only when showEmail is exactly true and the address is valid", () => {
  const base = { github: "https://github.com/x", linkedin: TODO };
  assert.equal(contactLinks({ ...base, email: "a@b.co", showEmail: TODO }).length, 1);
  assert.equal(contactLinks({ ...base, email: "a@b.co", showEmail: "true" }).length, 1);
  assert.equal(contactLinks({ ...base, email: "not-an-email", showEmail: true }).length, 1);
  const withEmail = contactLinks({ ...base, email: "a@b.co", showEmail: true });
  assert.equal(withEmail.at(-1).href, "mailto:a@b.co");
});

test("LinkedIn appears once it is a real https URL", () => {
  assert.equal(contactLinks({ ...SITE, linkedin: "https://www.linkedin.com/in/someone" }).length, 2);
  assert.equal(contactLinks({ ...SITE, linkedin: "linkedin.com/in/someone" }).length, 1, "no scheme, no link");
});

test("sameAs lists only real profiles", () => {
  assert.deepEqual(sameAs(SITE), ["https://github.com/antonyjasfer"]);
});

test("the facts the brief fixes are exact", () => {
  assert.equal(SITE.fullName, "A. Antony Selva Jasfer");
  assert.equal(SITE.name, "Antony Selva Jasfer");
  assert.equal(SITE.github, "https://github.com/antonyjasfer");
  assert.ok(!isSet(SITE.linkedin) && !isSet(SITE.email));
});

// Contact: only links that exist (see contactLinks in src/data/site.js), and
// the closing motion: as the section comes in, the graph settles and every
// message slows down and gathers on one node.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initContact({ getScene, reduced }) {
  // The links are written into the HTML at build time from contactLinks() (scripts/seo.mjs).
  // Reduced motion: no scrubbed motion, just the settled state while in view.
  if (reduced) {
    const io = new IntersectionObserver(([en]) => getScene().setSettle(en.isIntersecting ? 1 : 0), { threshold: 0.4 });
    io.observe(document.querySelector("#contact"));
    return () => io.disconnect();
  }
  const st = ScrollTrigger.create({
    trigger: "#contact", start: "top 85%", end: "center 55%", scrub: true,
    onUpdate: (self) => getScene().setSettle(self.progress),
    onLeaveBack: () => getScene().setSettle(0),
  });
  return () => st.kill();
}

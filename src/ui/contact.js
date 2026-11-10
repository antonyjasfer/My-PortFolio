// Contact: only links that exist (see contactLinks in src/data/site.js), and
// the closing motion: as the section comes in, the graph settles and every
// message slows down and gathers on one node.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { contactLinks } from "../data/site.js";

gsap.registerPlugin(ScrollTrigger);

export function initContact({ getScene, reduced }) {
  const ul = document.querySelector("#contact-links");
  contactLinks().forEach((l, i) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = l.href;
    a.className = i === 0 ? "btn" : "btn ghost";
    a.dataset.magnetic = "";
    a.textContent = l.kind === "email" ? `Email ${l.label}` : l.label;
    if (l.kind !== "email") a.setAttribute("aria-label", `${l.label} profile`);
    li.appendChild(a);
    ul.appendChild(li);
  });

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

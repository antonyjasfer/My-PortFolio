// Path: timeline entries from src/data/path.js. A vertical line draws as you
// scroll (ScrollTrigger scrub) and each entry lands as the line reaches it.
// Text never fades: only the dot and the date move, so every entry stays
// readable at any scroll position and with reduced motion.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// The line's leading edge sits at this viewport height; entries land there.
export const LINE_FRONT = "top 72%";

export function initPath(path, { reduced } = {}) {
  const list = document.querySelector("#pathlist");
  for (const [when, what, detail, ids] of path) {
    const li = document.createElement("li");
    li.innerHTML = "<span class='dot' aria-hidden='true'></span><time></time><div class='entry'><b></b><span></span><span class='entry-links'></span></div>";
    li.querySelector("time").textContent = when;
    li.querySelector("b").textContent = what;
    li.querySelector(".entry > span").textContent = detail;
    const names = what.split(" and ");
    const links = li.querySelector(".entry-links");
    ids.forEach((id, i) => {
      const a = document.createElement("a");
      a.href = `#/project/${id}`;
      a.dataset.projectLink = id;
      a.textContent = ids.length > 1 ? `About ${names[i] || id}` : `About ${what}`;
      links.appendChild(a);
    });
    list.appendChild(li);
  }

  const items = [...list.children];
  if (reduced) { items.forEach((li) => li.classList.add("landed")); return () => {}; }

  const draw = gsap.fromTo(".timeline-fill", { scaleY: 0 }, {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: "#timeline", start: LINE_FRONT, end: "bottom 72%", scrub: true },
  });
  const triggers = items.map((li) => ScrollTrigger.create({
    trigger: li, start: LINE_FRONT,
    onEnter: () => li.classList.add("landed"),
    onLeaveBack: () => li.classList.remove("landed"),
  }));
  return () => { draw.scrollTrigger?.kill(); triggers.forEach((t) => t.kill()); };
}

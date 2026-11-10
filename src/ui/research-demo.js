// v1's toy belief-interval demo, ported unchanged in behaviour. The numbers
// are illustrative only (the page says so); this gets a real demo in Prompt 2.
const NS = "http://www.w3.org/2000/svg";

export function initResearchDemo() {
  const $ = (s) => document.querySelector(s);
  const tree = $("#tree");
  if (!tree) return;
  const tn = [[160, 22], [90, 72], [230, 72], [50, 125], [130, 125], [190, 125], [270, 125]];
  const te = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  const el = (name, attrs) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); tree.appendChild(e); return e; };
  te.forEach(([a, b]) => el("line", { x1: tn[a][0], y1: tn[a][1], x2: tn[b][0], y2: tn[b][1], stroke: "#5B6B82", "stroke-width": 1.5 }));
  const circ = tn.map(([x, y], i) => el("circle", { cx: x, cy: y, r: i ? 11 : 15, fill: i ? "#5B6B82" : "#16213E" }));
  el("text", { x: 182, y: 26, "font-size": 12, fill: "#16213E", "font-family": "IBM Plex Sans, system-ui, sans-serif" }).textContent = "claim: there is a dog";
  el("text", { x: 8, y: 148, "font-size": 10, fill: "#4E5D73", "font-family": "IBM Plex Sans, system-ui, sans-serif" }).textContent = "leaves: visual evidence (red = corrupted)";

  const eps = $("#eps"), couple = $("#couple"), band = $("#band"), out = $("#epsOut"), verdict = $("#verdict");
  function upd() {
    const e = +eps.value, c = couple.checked, mid = 0.72;
    const half = Math.min(0.5, e * (c ? 1.5 : 4.2));
    const lo = Math.max(0, mid - half), hi = Math.min(1, mid + half);
    out.textContent = e.toFixed(2);
    band.style.transform = `translateX(${lo * 100}%) scaleX(${hi - lo})`;
    verdict.classList.toggle("flag", lo < 0.5);
    verdict.textContent = `Belief in the claim: ${Math.round(lo * 100)}% to ${Math.round(hi * 100)}%. ` + (lo < 0.5 ? "Flag it for review." : "Keep it.");
    circ.slice(3).forEach((cc, i) => cc.setAttribute("fill", e > 0 && (c ? i === 1 : true) ? "#D7263D" : "#5B6B82"));
  }
  eps.addEventListener("input", upd);
  couple.addEventListener("change", upd);
  upd();
}

export function initPath(path) {
  const pl = document.querySelector("#pathlist");
  for (const [d, t, s] of path) {
    const li = document.createElement("li");
    li.innerHTML = "<span class='when'></span><div><b></b><span></span></div>";
    li.querySelector(".when").textContent = d;
    li.querySelector("b").textContent = t;
    li.querySelector("div span").textContent = s;
    pl.appendChild(li);
  }
}

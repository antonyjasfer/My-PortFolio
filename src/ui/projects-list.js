// Skill chips, the full project list and the project detail dialog (ported
// from v1). Talks to the graph only through the focus store.
import { repoUrl } from "../data/projects.js";
import { neighbourhood, skillId } from "../scene/graph.js";

const $ = (s) => document.querySelector(s);

export function initProjectsList({ projects, graph, focus }) {
  const plist = $("#plist"), chips = $("#chips"), det = $("#detail");
  let opener = null;

  const focusProject = (id) => ({ ids: neighbourhood(graph, id), aimId: id });

  for (const p of projects) {
    const li = document.createElement("li");
    li.dataset.k = p.k.join("|");
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-haspopup", "dialog");
    b.innerHTML = `<span class="pt"></span><span class="pw"></span><span class="open" aria-hidden="true">Open</span>`;
    b.querySelector(".pt").textContent = p.t;
    b.querySelector(".pw").textContent = p.w;
    b.addEventListener("click", () => open(p.id, b));
    // hover preview borrows the dialog layer only while no dialog is open
    b.addEventListener("pointerenter", () => { if (det.hidden) focus.set("dialog", focusProject(p.id)); });
    b.addEventListener("pointerleave", () => { if (det.hidden) focus.release("dialog"); });
    li.appendChild(b);
    plist.appendChild(li);
  }

  const counts = {};
  projects.forEach((p) => p.k.forEach((k) => (counts[k] = (counts[k] || 0) + 1)));
  const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
  for (const k of ["All", ...top]) {
    const c = document.createElement("button");
    c.type = "button"; c.className = "chip"; c.textContent = k;
    c.setAttribute("aria-pressed", String(k === "All"));
    c.addEventListener("click", () => selectChip(k === "All" ? null : k));
    chips.appendChild(c);
  }

  function selectChip(k) {
    chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === (k || "All"))));
    plist.querySelectorAll("li").forEach((li) => (li.hidden = !!k && !li.dataset.k.split("|").includes(k)));
    if (k && graph.byId[skillId(k)]) focus.set("chip", { ids: neighbourhood(graph, skillId(k)) });
    else focus.release("chip");
  }

  function open(id, from) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    opener = from || document.activeElement;
    $("#dTitle").textContent = p.t;
    $("#dWhere").textContent = p.w;
    $("#dDesc").textContent = p.d;
    $("#dStatus").textContent = p.s;
    const st = $("#dStack"); st.replaceChildren();
    p.k.forEach((k) => { const s = document.createElement("span"); s.textContent = k; st.appendChild(s); });
    const L = $("#dLinks"); L.replaceChildren();
    const a = document.createElement("a"); a.href = repoUrl(p); a.textContent = "Code on GitHub"; L.appendChild(a);
    if (p.live) { const b = document.createElement("a"); b.href = p.live; b.textContent = "Live site"; L.appendChild(b); }
    det.hidden = false;
    void det.offsetWidth; // flush styles so the .open transition runs from the hidden state
    det.classList.add("open");
    focus.set("dialog", focusProject(id));
    $("#dClose").focus({ preventScroll: true });
  }
  function close() {
    det.classList.remove("open");
    det.hidden = true;
    focus.release("dialog");
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }
  $("#dClose").addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !det.hidden) close(); });

  return { open, selectChip, isOpen: () => !det.hidden };
}

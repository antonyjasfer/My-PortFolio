// Skill chips and the full project list. Selecting a project opens its
// detail view (#/project/<id>); hovering previews it in the graph.
import { neighbourhood, skillId } from "../scene/graph.js";

const $ = (s) => document.querySelector(s);

/**
 * @param {{projects:any[], graph:any, focus:any, openProject:(id:string, from:Element)=>void, isOpen:()=>boolean}} o
 */
export function initProjectsList({ projects, graph, focus, openProject, isOpen }) {
  const plist = $("#plist"), chips = $("#chips");
  const preview = (id) => ({ ids: neighbourhood(graph, id), aimId: id });

  for (const p of projects) {
    const li = document.createElement("li");
    li.dataset.k = p.k.join("|");
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<span class="pt"></span><span class="pw"></span><span class="open" aria-hidden="true">Details</span>`;
    b.querySelector(".pt").textContent = p.t;
    b.querySelector(".pw").textContent = p.w;
    b.addEventListener("click", () => openProject(p.id, b.querySelector(".pt")));
    // hover preview borrows the dialog layer only while no project is open
    b.addEventListener("pointerenter", () => { if (!isOpen()) focus.set("dialog", preview(p.id)); });
    b.addEventListener("pointerleave", () => { if (!isOpen()) focus.release("dialog"); });
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
    const shown = plist.querySelectorAll("li:not([hidden])").length;
    $("#plist-status").textContent = k ? `${shown} projects use ${k}` : `All ${shown} projects shown`;
    if (k && graph.byId[skillId(k)]) focus.set("chip", { ids: neighbourhood(graph, skillId(k)) });
    else focus.release("chip");
  }

  return { selectChip };
}

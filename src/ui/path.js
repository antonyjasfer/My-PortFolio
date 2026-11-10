// Timeline entries from src/data/path.js.
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

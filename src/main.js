// Entry. Styles load with the page; the app (gsap, Lenis, DOM setup) is
// imported only after the browser has painted once, so the hero text is on
// screen without waiting for any script. The one-shot rAF below is a boot
// scheduler, not a render loop: gsap.ticker (in app.js) is the only loop.
import "./styles/base.css";
import "./styles/sections.css";

const afterFirstPaint = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

afterFirstPaint().then(() => import("./app.js"));

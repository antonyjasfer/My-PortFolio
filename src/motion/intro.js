import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

// Offsets (seconds) of each beat in the hero sequence. Durations and easings
// come from the CSS tokens; only the choreography lives here.
// The lede and meta are Static on purpose: they are on screen at first paint
// (they are the LCP candidates), so only the headline and the graph move.
export const CHOREO = {
  particles: 1.1,   // messages start once edges have mostly drawn
  hint: 1.15,       // decoration, fade only
};

/**
 * The hero intro: headline lines rise out of their masks while the graph
 * assembles behind them, as one timeline. The scene may load after the text
 * starts, so the graph is driven through a proxy that attachScene() binds.
 *
 * @returns {{ready: Promise<void>, attachScene(scene): void}}
 */
export function playIntro({ hero, tokens, reduced }) {
  const proxy = { assembly: reduced ? 1 : 0, speed: reduced ? 0.3 : 0 };
  let scene = null, tl = null;
  const sync = () => { if (scene) { scene.setAssembly(proxy.assembly); scene.setSpeed(proxy.speed); } };

  const title = hero.querySelector(".hero-title");
  const hint = hero.querySelector(".hint");

  if (reduced) {
    document.documentElement.classList.add("intro-done");
    return { ready: Promise.resolve(), attachScene(s) { scene = s; sync(); } };
  }

  const { dur, stagger, ease } = tokens;
  // No webfont wait: the headline's lines are explicit block spans, so the
  // split cannot change when Bricolage swaps in.
  const ready = Promise.resolve().then(() => {
    const split = SplitText.create(title, { type: "lines", mask: "lines", linesClass: "hl" });
    tl = gsap.timeline({
      defaults: { ease: ease.out },
      onComplete() { split.revert(); document.documentElement.classList.add("intro-done"); },
    });
    tl.set(title, { autoAlpha: 1 }, 0)
      .from(split.lines, { yPercent: 112, duration: dur.slow, stagger: stagger.line }, 0)
      // graph assembly runs on the same clock; its per-node easing is in assembly.js
      .to(proxy, { assembly: 1, duration: dur.epic, ease: "none", onUpdate: sync }, 0)
      .to(proxy, { speed: 1, duration: dur.slow, ease: ease["in-out"], onUpdate: sync }, CHOREO.particles)
      .fromTo(hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur.quick }, CHOREO.hint);
  });

  return {
    ready,
    attachScene(s) {
      scene = s;
      // Normal case: the scene arrives while the timeline runs (or before it
      // starts) and simply follows the proxy. If three.js arrived after the
      // text finished, play the assembly on its own instead of popping in.
      if (tl && tl.progress() === 1) {
        proxy.assembly = 0; proxy.speed = 0;
        gsap.timeline()
          .to(proxy, { assembly: 1, duration: dur.slow, ease: "none", onUpdate: sync }, 0)
          .to(proxy, { speed: 1, duration: dur.base, ease: ease["in-out"], onUpdate: sync }, dur.slow * 0.7);
      }
      sync();
    },
  };
}

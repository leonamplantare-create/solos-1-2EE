(function () {
  "use strict";
  function init() {
    const nav = document.getElementById("sidenav");
    const btn = document.getElementById("menuBtn");
    if (btn && nav) {
      btn.addEventListener("click", () => nav.classList.toggle("open"));
      nav.addEventListener("click", (e) => { if (e.target.closest("a")) nav.classList.remove("open"); });
    }
    if (window.renderMathInElement) {
      window.renderMathInElement(document.querySelector("main"), {
        delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
        ignoredClasses: ["result-panel"],
        throwOnError: false
      });
    }
    if (!nav || !("IntersectionObserver" in window)) return;
    const links = Array.from(nav.querySelectorAll("a[href^='#']"));
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          links.forEach(a => a.classList.remove("active"));
          const a = map.get(en.target.id);
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
  }
  window.addEventListener("DOMContentLoaded", init);
})();

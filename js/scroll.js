// ─── Scroll UI: reveal-on-scroll, chapter nav highlighting, reading progress ─

import { readProgress, chapterNav, chapterLinks, chapterSections, backTop } from "./dom.js";

// Sections count as "current" once their top passes this line below the masthead
const ACTIVE_LINE = 160;

function setupReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) return;

  // Opt the page into hidden-until-visible styles only once JS is ready to reveal them
  document.documentElement.classList.add("js-reveal");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  targets.forEach((el) => observer.observe(el));
}

function setActiveChapter(id) {
  chapterLinks.forEach((link) => {
    const active = link.getAttribute("href") === `#${id}`;
    if (active === link.classList.contains("is-active")) return;
    link.classList.toggle("is-active", active);
    // On narrow screens the chapter nav scrolls sideways; keep the active link in view
    if (active && chapterNav.scrollWidth > chapterNav.clientWidth) {
      chapterNav.scrollTo({ left: link.offsetLeft - 16, behavior: "smooth" });
    }
  });
}

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  readProgress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;

  let current = chapterSections[0];
  chapterSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= ACTIVE_LINE) current = section;
  });
  // At the very bottom, the last chapter wins even if it's short
  if (max > 0 && scrollY >= max - 4) current = chapterSections[chapterSections.length - 1];
  if (current) setActiveChapter(current.id);
}

export function initScrollUI() {
  setupReveal();

  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  addEventListener("resize", onScroll);

  // Highlight the clicked chapter straight away rather than waiting for the scroll to settle
  chapterLinks.forEach((link) => {
    link.addEventListener("click", () => setActiveChapter(link.getAttribute("href").slice(1)));
  });

  backTop.addEventListener("click", (e) => {
    e.preventDefault();
    scrollTo({ top: 0, behavior: "smooth" });
  });

  onScroll();
}

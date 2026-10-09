/* Deck runtime: figures, math, page numbers, scripted builds, Reveal setup. */
(function () {
  "use strict";
  const slides = document.querySelector(".reveal .slides");

  // ?clean previews the final look (drafted text in the normal colour, to-dos hidden); see theme.css.
  if (new URLSearchParams(location.search).has("clean")) document.documentElement.classList.add("clean-view");

  // Draw figures and typeset math before Reveal measures anything.
  Figures.drawAll();
  renderMathInElement(slides, {
    delimiters: [{ left: "\\(", right: "\\)", display: false }],
    throwOnError: false,
  });

  // Page numbers (the title slide is unnumbered).
  slides.querySelectorAll(":scope > section").forEach((s, i) => {
    if (s.hasAttribute("data-nonum")) return;
    const d = document.createElement("div");
    d.className = "pgnum";
    d.textContent = i;
    s.appendChild(d);
  });

  // Scripted builds: an invisible fragment with data-act="fold:#id" (or
  // "someclass:#id") drives a figure state. In PowerPoint each state is its own
  // slide joined by a Morph transition.
  function run(f, on, instant) {
    const [act, sel] = f.dataset.act.split(":");
    const target = document.querySelector(sel);
    if (!target) return;
    if (act === "fold" && target._fold) target._fold(on, instant);
    else target.classList.toggle(act, on);
  }
  const sync = (slide) =>
    slide && slide.querySelectorAll(".fragment.trigger").forEach((f) => run(f, f.classList.contains("visible"), true));

  // Captions follow the concatenated comparison reel without requiring slide advances.
  slides.querySelectorAll('video[data-captions]').forEach((video) => {
    const captions = JSON.parse(video.dataset.captions);
    const target = document.getElementById(video.dataset.captionTarget);
    const update = () => {
      const caption = captions.filter(c => c.start <= video.currentTime).pop() || captions[0];
      if (target && caption) target.textContent = caption.text;
    };
    video.addEventListener('timeupdate', update);
    video.addEventListener('loadedmetadata', update);
    update();
  });
  Reveal.on('slidechanged', (e) => {
    e.currentSlide.querySelectorAll('video[data-reset-on-enter]').forEach(video => { video.currentTime = 0; });
  });

  // LatentHOI examples start when their containing build is shown, and pause when hidden. A fade-out build is on
  // screen until it is .visible (it fades out then), so it hides a video only once visible.
  function syncLatentHOIVideos() {
    slides.querySelectorAll('section[id^="lh-"] video').forEach((video) => {
      const showing = video.closest("section") === Reveal.getCurrentSlide()
        && !video.closest(".fragment:not(.fade-out):not(.visible), .fragment.fade-out.visible");
      if (showing && !Reveal.isPrintView()) video.play().catch(() => {});
      else video.pause();
    });
  }

  // Context lines (implicit-structure slide): in a .tokrow, each context word (.ca / .cb) is joined to the token whose
  // meaning it decides (.ha / .hb); arcs go above the row, or below it with .below. Drawn from layout offsets (not
  // screen boxes), so Reveal's scaling does not matter; a row is drawn once its slide is laid out.
  const SVGNS = "http://www.w3.org/2000/svg";
  function drawContextLinks(root) {
    (root || slides).querySelectorAll(".tokrow:not([data-linked])").forEach((row) => {
      const tgt = row.querySelector(".tokc.ha, .tokc.hb");
      const srcs = [...row.querySelectorAll(".tokc.ca, .tokc.cb")];
      if (!tgt || !srcs.length || !tgt.offsetWidth) return;
      const col = getComputedStyle(tgt).backgroundColor;
      const tx = tgt.offsetLeft + tgt.offsetWidth / 2, ty = tgt.offsetTop - 2;
      let arcs = "", heads = "";
      srcs.forEach((s, k) => {
        // one arc per context word, above the row; the heads spread along the top of the token they point to
        const sx = s.offsetLeft + s.offsetWidth / 2, sy = s.offsetTop - 2;
        const x1 = tx + (k - (srcs.length - 1) / 2) * 10, h = 12 + (x1 - sx) * 0.07;
        arcs += `M${sx} ${sy} C ${sx} ${sy - h}, ${x1} ${ty - h}, ${x1} ${ty - 6} `;
        heads += `M${x1 - 4.5} ${ty - 8} L${x1} ${ty} L${x1 + 4.5} ${ty - 8} Z `;
      });
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("class", "ctx-links");
      svg.setAttribute("width", row.offsetWidth);
      svg.setAttribute("height", row.offsetHeight);
      svg.innerHTML = `<path d="${arcs}" style="stroke:${col}"/><path d="${heads}" style="fill:${col};stroke:none"/>`;
      row.appendChild(svg);
      row.dataset.linked = "1";
    });
  }
  // Context lines in a sentence (memory-lookup slide, 2026-10-08): each .cw word is joined to the sentence's .tok
  // ("bug") by an arc above the line, in the sense's colour, drawn into the sentence's .ctx-arcs build.
  function drawSentenceLinks(root) {
    (root || slides).querySelectorAll(".mm-sent[data-links]:not([data-linked])").forEach((p) => {
      const tgt = p.querySelector(".tok"), box = p.querySelector(".ctx-arcs");
      const srcs = [...p.querySelectorAll(".cw")];
      if (!tgt || !box || !srcs.length || !tgt.offsetWidth) return;
      const col = getComputedStyle(p).getPropertyValue(p.dataset.links === "ca" ? "--teal" : "--terra").trim();
      const tx = tgt.offsetLeft + tgt.offsetWidth / 2, ty = tgt.offsetTop;
      let arcs = "", heads = "";
      srcs.forEach((s, k) => {
        const sx = s.offsetLeft + s.offsetWidth / 2, sy = s.offsetTop;
        const x1 = tx + (k - (srcs.length - 1) / 2) * 10, h = 12 + (x1 - sx) * 0.07;
        arcs += `M${sx} ${sy} C ${sx} ${sy - h}, ${x1} ${ty - h}, ${x1} ${ty - 6} `;
        heads += `M${x1 - 4.5} ${ty - 8} L${x1} ${ty} L${x1 + 4.5} ${ty - 8} Z `;
      });
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("class", "ctx-links");
      svg.setAttribute("width", p.offsetWidth);
      svg.setAttribute("height", p.offsetHeight);
      svg.innerHTML = `<path d="${arcs}" style="stroke:${col}"/><path d="${heads}" style="fill:${col};stroke:none"/>`;
      box.appendChild(svg);
      p.dataset.linked = "1";
    });
  }
  document.fonts.ready.then(() => drawSentenceLinks(Reveal.isReady() ? Reveal.getCurrentSlide() : null));
  Reveal.on("ready", (e) => drawSentenceLinks(Reveal.isPrintView() ? null : e.currentSlide));
  Reveal.on("slidechanged", (e) => document.fonts.ready.then(() => drawSentenceLinks(e.currentSlide)));
  document.fonts.ready.then(() => drawContextLinks(Reveal.isReady() ? Reveal.getCurrentSlide() : null));
  Reveal.on("ready", (e) => drawContextLinks(Reveal.isPrintView() ? null : e.currentSlide));
  Reveal.on("slidechanged", (e) => document.fonts.ready.then(() => drawContextLinks(e.currentSlide)));

  Reveal.on("fragmentshown", (e) => e.fragments.forEach((f) => f.dataset.act && run(f, true, false)));
  Reveal.on("fragmenthidden", (e) => e.fragments.forEach((f) => f.dataset.act && run(f, false, false)));
  Reveal.on("fragmentshown", syncLatentHOIVideos);
  Reveal.on("fragmenthidden", syncLatentHOIVideos);
  Reveal.on("slidechanged", syncLatentHOIVideos);
  Reveal.on("ready", syncLatentHOIVideos);
  Reveal.on("slidechanged", (e) => sync(e.currentSlide));
  Reveal.on("ready", (e) => {
    if (Reveal.isPrintView()) slides.querySelectorAll("section").forEach(sync);
    else sync(e.currentSlide);
  });

  Reveal.initialize({
    width: 1280,
    height: 720,
    margin: 0.035,
    minScale: 0.2,
    maxScale: 4,
    center: false,
    hash: true,
    controls: false,
    progress: false,
    slideNumber: false,
    transition: "fade",
    transitionSpeed: "default",
    backgroundTransition: "none",
    autoAnimateDuration: 0.9,
    autoAnimateEasing: "cubic-bezier(.22,.7,.2,1)",
    pdfSeparateFragments: false,
    plugins: [RevealNotes],
  });
})();

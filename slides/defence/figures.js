/* Procedural figures for the defence deck.
 *
 * Every figure is drawn into <svg data-fig="name"> from fixed coordinates and a
 * seeded RNG, so the output is deterministic and can be exported shape-by-shape
 * to PowerPoint (circle, line, path, rect, text only — no filters).
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const C = {
    ink: "#14213d", text: "#2b3342", muted: "#667085", faint: "#98a2b3", rule: "#e4e7ec",
    panel: "#f6f7f9", grey: "#aab3be", greyL: "#c9d0d8",
    teal: "#1c7c8c", teal2: "#6fb0bb", tealT: "#e4f1f3",
    terra: "#b4502f", terra2: "#dc9a80", terraT: "#fbece6",
  };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function rng(seed) { // mulberry32
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(R) {
    let u = 0, v = 0;
    while (!u) u = R();
    while (!v) v = R();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  const f1 = (v) => Math.round(v * 10) / 10;

  /* ------------------------------------------------------------------ */
  /* Title: noise → structure (each node is reached by a denoising path) */
  function hero(svg) {
    const R = rng(11);
    const nodes = [[392, 78], [318, 160], [462, 168], [262, 256], [376, 262], [482, 276], [318, 358], [436, 370], [384, 452]];
    const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8]];
    const gNoise = el("g", {}, svg), gTrail = el("g", {}, svg), gEdge = el("g", {}, svg), gNode = el("g", {}, svg);
    for (let i = 0; i < 110; i++) {
      const x = 14 + R() * 200, y = 40 + R() * 450;
      el("circle", { cx: f1(x), cy: f1(y), r: f1(1.1 + R() * 2.1), fill: C.grey, opacity: f1(0.18 + R() * 0.42) }, gNoise);
    }
    nodes.forEach(([nx, ny]) => {
      const sx = 40 + R() * 150, sy = 70 + R() * 400;
      const cx = (sx + nx) / 2 + (R() - 0.5) * 70, cy = (sy + ny) / 2 + (R() - 0.5) * 140;
      const K = 9;
      for (let j = 0; j < K; j++) {
        const t = j / K;
        const bx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * nx;
        const by = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ny;
        const amp = (1 - t) * 16;
        el("circle", {
          cx: f1(bx + (R() - 0.5) * amp), cy: f1(by + (R() - 0.5) * amp), r: f1(1.3 + 2.6 * t),
          fill: mix(C.grey, C.teal, t), opacity: f1(0.22 + 0.6 * t),
        }, gTrail);
      }
    });
    edges.forEach(([a, b]) => el("line", {
      x1: nodes[a][0], y1: nodes[a][1], x2: nodes[b][0], y2: nodes[b][1],
      stroke: C.teal2, "stroke-width": 2.2, "stroke-linecap": "round",
    }, gEdge));
    nodes.forEach(([x, y], i) => el("circle", {
      cx: x, cy: y, r: 11, fill: i % 3 === 0 ? C.teal : "#fff", stroke: C.teal, "stroke-width": 2.6,
    }, gNode));
  }

  /* ------------------------------------------------------------------ */
  /* Generative modeling: data points, and new samples from the density  */
  const MIX = [
    { mx: 92, my: 112, sx: 34, sy: 16, a: -28, w: 0.42 },
    { mx: 198, my: 64, sx: 30, sy: 14, a: 16, w: 0.33 },
    { mx: 214, my: 140, sx: 19, sy: 12, a: -6, w: 0.25 },
  ];
  function sampleMix(R) {
    let u = R(), k = 0;
    while (k < MIX.length - 1 && u > MIX[k].w) { u -= MIX[k].w; k++; }
    const m = MIX[k], gx = gauss(R) * m.sx, gy = gauss(R) * m.sy, a = (m.a * Math.PI) / 180;
    return [m.mx + gx * Math.cos(a) - gy * Math.sin(a), m.my + gx * Math.sin(a) + gy * Math.cos(a), k];
  }
  function inBox([x, y]) { return x > 10 && x < 290 && y > 10 && y < 180; }
  function points(seed, n) {
    const R = rng(seed), out = [];
    while (out.length < n) { const p = sampleMix(R); if (inBox(p)) out.push(p); }
    return out;
  }
  function panelBg(svg) { el("rect", { x: 0, y: 0, width: 300, height: 190, rx: 12, fill: C.panel }, svg); }
  function density(svg, faint) {
    const g = el("g", {}, svg);
    MIX.forEach((m, c) => {
      [2.3, 1.55, 0.85].forEach((k, i) => el("ellipse", {
        class: `comp k${c}`, cx: m.mx, cy: m.my, rx: f1(k * m.sx), ry: f1(k * m.sy), transform: `rotate(${m.a} ${m.mx} ${m.my})`,
        fill: C.teal, "fill-opacity": (faint ? 0.5 : 1) * [0.07, 0.1, 0.16][i],
        stroke: C.teal, "stroke-opacity": (faint ? 0.18 : 0.38), "stroke-width": 1.1,
      }, g));
    });
  }
  function genData(svg) {
    panelBg(svg);
    points(3, 72).forEach(([x, y]) => el("circle", { cx: f1(x), cy: f1(y), r: 3.3, fill: C.ink, "fill-opacity": 0.78 }, svg));
  }
  function genSamples(svg) {
    panelBg(svg); density(svg, true);
    points(3, 72).forEach(([x, y]) => el("circle", { cx: f1(x), cy: f1(y), r: 2.4, fill: C.greyL }, svg));
    // new samples, tagged by mixture component so a condition c can select one mode
    points(29, 14).forEach(([x, y, k]) => el("circle", {
      cx: f1(x), cy: f1(y), r: 5, fill: C.teal, stroke: "#fff", "stroke-width": 1.8, class: `comp k${k}`,
    }, svg));
  }

  /* ------------------------------------------------------------------ */
  /* Protein: a residue chain that folds into a sheet (scripted morph)    */
  const AA = "MKTAYIAKQRQISFVKSHFSR";
  function protein(svg, folded) {
    const n = AA.length, W = 7;
    const flat = [], fold = [];
    // Folded state: three wobbly strands (a small β-sheet), slightly rotated.
    const rot = (-9 * Math.PI) / 180, cx0 = 274, cy0 = 140;
    for (let i = 0; i < n; i++) {
      flat.push([44 + i * 23, 140 + 9 * Math.sin(i * 0.85)]);
      const s = Math.floor(i / W), p = s % 2 === 0 ? i % W : W - 1 - (i % W);
      const x = 168 + p * 35 + (s === 1 ? 9 : 0), y = 72 + s * 66 + 7 * Math.sin(p * 1.15 + s * 2.1);
      fold.push([
        cx0 + (x - cx0) * Math.cos(rot) - (y - cy0) * Math.sin(rot),
        cy0 + (x - cx0) * Math.sin(rot) + (y - cy0) * Math.cos(rot),
      ]);
    }
    const idx = (s, p) => s * W + (s % 2 === 0 ? p : W - 1 - p);
    const pairs = [];
    for (let s = 0; s < 2; s++) for (let p = 0; p < W; p++) {
      const a = idx(s, p), b = idx(s + 1, p);
      if (Math.abs(a - b) > 1) pairs.push([a, b]);
    }
    const hi = [idx(0, 2), idx(1, 2)];

    const gC = el("g", { opacity: 0 }, svg);
    const contacts = pairs.map(() => el("line", { stroke: C.teal, "stroke-width": 1.5, "stroke-dasharray": "3 3" }, gC));
    const hiLine = el("line", { stroke: C.ink, "stroke-width": 2.2 }, gC);
    const back = el("path", { fill: "none", stroke: C.greyL, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    const beads = [];
    for (let i = 0; i < n; i++) {
      const g = el("g", {}, svg);
      const isHi = hi.includes(i);
      el("circle", { r: 9.5, fill: isHi ? C.ink : mix(C.teal2, C.teal, i / (n - 1)), stroke: "#fff", "stroke-width": 2 }, g);
      const t = el("text", { y: 3.6, "text-anchor": "middle", style: "font-size:9.5px;font-weight:650;fill:#fff" }, g);
      t.textContent = AA[i];
      beads.push(g);
    }
    const lab = el("text", { x: 274, y: 270, "text-anchor": "middle", style: "font-size:13px" }, svg);

    function catmull(pts) {
      let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
      }
      return d;
    }
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let T = 0, raf = 0;
    function render(t) {
      T = t;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const ti = ease(Math.min(1, Math.max(0, (t - i * 0.018) / (1 - (n - 1) * 0.018))));
        const x = flat[i][0] + (fold[i][0] - flat[i][0]) * ti, y = flat[i][1] + (fold[i][1] - flat[i][1]) * ti;
        pts.push([x, y]);
        beads[i].setAttribute("transform", `translate(${f1(x)} ${f1(y)})`);
      }
      back.setAttribute("d", catmull(pts));
      pairs.forEach(([a, b], k) => {
        const L = contacts[k];
        L.setAttribute("x1", f1(pts[a][0])); L.setAttribute("y1", f1(pts[a][1]));
        L.setAttribute("x2", f1(pts[b][0])); L.setAttribute("y2", f1(pts[b][1]));
      });
      hiLine.setAttribute("x1", f1(pts[hi[0]][0])); hiLine.setAttribute("y1", f1(pts[hi[0]][1]));
      hiLine.setAttribute("x2", f1(pts[hi[1]][0])); hiLine.setAttribute("y2", f1(pts[hi[1]][1]));
      gC.setAttribute("opacity", f1(Math.max(0, (t - 0.75) / 0.25)));
      lab.textContent = t < 0.5 ? "a sequence of amino acids …" : "… folds into a 3-D structure: far-apart residues end up in contact";
      lab.setAttribute("opacity", f1(Math.abs(t - 0.5) * 2));
    }
    if (folded) {
      render(1);
      lab.remove();
      svg.setAttribute("viewBox", "121 37 304 190");
      return;
    }
    render(0);
    svg._fold = function (on, instant) {
      cancelAnimationFrame(raf);
      const to = on ? 1 : 0;
      if (instant) return render(to);
      const from = T, dur = 1700 * Math.abs(to - from) + 1, t0 = performance.now();
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur);
        render(from + (to - from) * u);
        if (u < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
  }

  const FIGS = {
    hero, genData, genSamples, protein, proteinFolded: (s) => protein(s, true),
  };
  window.Figures = {
    drawAll() {
      document.querySelectorAll("svg[data-fig]").forEach((svg) => {
        const f = FIGS[svg.dataset.fig];
        if (f && !svg.dataset.drawn) { f(svg); svg.dataset.drawn = "1"; }
        else if (!f) console.warn("unknown figure", svg.dataset.fig);
      });
    },
  };
})();

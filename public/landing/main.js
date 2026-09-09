/* =============================================================================
   LINQ — main.js

   Everything on this page is hung off the scrollbar. Nothing runs on a clock,
   so every set piece plays forward as you scroll down and backwards as you
   scroll up, at exactly the speed you move.

     §1  nav        progress rule, active link, purple inversion
     §2  the plane  the cursor on a mouse; a hold-and-drag cursor on touch
     §3  colour-in  words fill with colour as the plane crosses them, and empty
                    the same way they filled when it leaves
     §4  stamps     the flag grid leans away from the plane
     §5  scenes     pinned set pieces (stamps / rates / steps) and a scrubbed
                    reveal on every other section

   The page remains fully readable with JS disabled.
   ============================================================================= */
(function () {
  "use strict";

  // A previous visit to this route may still have handlers and ScrollTriggers
  // attached. Take them down before doing anything else.
  if (window.__linqLanding) { try { window.__linqLanding.destroy(); } catch (e) {} }

  var bound = [];
  /* Records every window/document listener so destroy() can remove it. Same
     signature as addEventListener, with the target in front. */
  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    bound.push([target, type, fn, opts]);
  }

  var instance = {
    destroy: function () {
      bound.forEach(function (b) {
        try { b[0].removeEventListener(b[1], b[2], b[3]); } catch (e) {}
      });
      bound.length = 0;
      if (window.ScrollTrigger) {
        ScrollTrigger.getAll().forEach(function (t) { t.kill(true); });
      }
      if (window.gsap) gsap.globalTimeline.clear();
      var root = document.documentElement;
      root.classList.remove("plane-is-cursor", "plane-is-dragging");
      if (window.__linqLanding === instance) window.__linqLanding = null;
    },
  };
  window.__linqLanding = instance;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".nav__progress");

  /* =========================================================================
     SMOOTH SCROLL for in-page anchors
     CSS `scroll-behavior: smooth` is deliberately NOT used: it fights
     ScrollTrigger's pinning (§5). The easing lives here instead.
     ========================================================================= */
  function scrollToTarget(target) {
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      if (!href || href === "#") { if (href === "#") e.preventDefault(); return; }
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      scrollToTarget(target);
    });
  });

  /* =========================================================================
     §1 NAV
     ========================================================================= */
  function initNavScroll() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    if (progress) {
      var setX = gsap.quickSetter(progress, "scaleX");
      ScrollTrigger.create({
        start: 0, end: "max",
        onUpdate: function (self) { setX(self.progress); },
        onRefresh: function (self) { setX(self.progress); },
      });
    }
    document.querySelectorAll(".nav__links a").forEach(function (link) {
      var sec = document.querySelector(link.getAttribute("href"));
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: "top center", end: "bottom center",
        onToggle: function (self) { link.classList.toggle("is-active", self.isActive); },
      });
    });
    var rates = document.querySelector("#rates");
    if (rates && header) {
      ScrollTrigger.create({
        trigger: rates, start: "top top", end: "bottom top",
        onToggle: function (self) { header.classList.toggle("is-inverted", self.isActive); },
      });
    }
  }

  /* =========================================================================
     §2 THE PLANE

     Mouse: the plane IS the cursor. The native arrow is hidden and the plane's
     nose sits on the pointer, trailing it with a short ease so it flies rather
     than snaps. It never rotates — one fixed pose.

     Touch (§9): there is no cursor to be, so the plane is summoned. HOLD a
     finger still for a moment and it appears under it and follows the finger
     exactly like the desktop cursor; LIFT and it is gone. A normal scroll flick
     never summons it, and while it is out the page does not scroll from the
     drag itself — the only way to move the page is to carry the plane into the
     band at the top or bottom of the screen, which pulls the page along
     deliberately, the way dragging to the edge of a list does.
     ========================================================================= */

  // The plane SVG is 1310x881 and its nose is the far top-right corner, so that
  // corner is the cursor hotspot: xPercent -100 puts the tip on the pointer.
  var NOSE_X = -100;
  var NOSE_Y = -2;

  var CURSOR_LAG = 0.18;           // ease time behind the pointer; bigger = more glide
  var CURSOR_HOVER_SCALE = 1.22;   // over links / buttons

  var HOLD_MS = 190;    // how long a finger must sit still to summon the plane
  var HOLD_SLOP = 12;   // px of movement inside that window that still counts as still
  var EDGE_BAND = 0.18; // fraction of the screen at top/bottom that pulls the page
  var EDGE_RATE = 22;   // px per frame at the very edge

  var sweepAt = null;   // set by §3 — lets the plane colour what it flies over
  var globePaint = null; // set by the globe — same, for its cells
  var stampAt = null;    // set by §4 — same, for the flag grid

  function initPlane() {
    if (!window.gsap) return;

    var layer = document.querySelector(".plane-layer");
    var planePos = document.querySelector(".plane-pos");
    var planeDepth = document.querySelector(".plane-depth");
    if (!layer || !planePos || !planeDepth) return;

    var mm = gsap.matchMedia();
    mm.add({
      cursor: "(pointer: fine) and (prefers-reduced-motion: no-preference)",
      touch: "(pointer: coarse) and (prefers-reduced-motion: no-preference)",
      reduced: "(prefers-reduced-motion: reduce)",
    }, function (ctx) {
      if (ctx.conditions.cursor) return cursorMode();
      if (ctx.conditions.touch) return touchMode();
      return function () {};
    });

    /* --- mouse: the plane is the cursor ------------------------------------ */
    function cursorMode() {
      document.documentElement.classList.add("plane-is-cursor");
      layer.classList.add("plane-layer--cursor");

      var toX = gsap.quickTo(planePos, "x", { duration: CURSOR_LAG, ease: "power3" });
      var toY = gsap.quickTo(planePos, "y", { duration: CURSOR_LAG, ease: "power3" });
      gsap.set(planePos, {
        x: window.innerWidth * 0.6, y: window.innerHeight * 0.4,
        rotation: 0, xPercent: NOSE_X, yPercent: NOSE_Y,
      });
      gsap.set(planeDepth, { scale: 1 });

      var shown = false;
      function onMove(e) {
        if (!shown) { shown = true; layer.classList.add("is-visible"); }
        toX(e.clientX);
        toY(e.clientY);
      }
      // The pointer leaving the window has to take the plane with it, or it
      // hangs frozen at the edge looking broken.
      function onLeave() { layer.classList.remove("is-visible"); shown = false; }
      function onEnter() { layer.classList.add("is-visible"); shown = true; }

      // Grow a little over anything clickable — the only cursor feedback left
      // once the native arrow is gone.
      var INTERACTIVE = "a, button, .btn, [role='button'], input, textarea, select, summary";
      function onOver(e) {
        var hit = e.target.closest && e.target.closest(INTERACTIVE);
        gsap.to(planeDepth, {
          scale: hit ? CURSOR_HOVER_SCALE : 1,
          duration: 0.25, ease: "power2.out", overwrite: true,
        });
      }

      on(window, "pointermove", onMove, { passive: true });
      on(document, "pointerover", onOver, { passive: true });
      on(document, "mouseleave", onLeave);
      on(document, "mouseenter", onEnter);

      return function () {
        document.documentElement.classList.remove("plane-is-cursor");
        layer.classList.remove("plane-layer--cursor", "is-visible");
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("mouseleave", onLeave);
        document.removeEventListener("mouseenter", onEnter);
        gsap.killTweensOf([planePos, planeDepth]);
        gsap.set([planePos, planeDepth], { clearProps: "transform" });
      };
    }

    /* --- touch: hold to summon, drag to fly, lift to dismiss (§9) ---------- */
    function touchMode() {
      layer.classList.add("plane-layer--cursor");

      var toX = gsap.quickTo(planePos, "x", { duration: 0.1, ease: "power3" });
      var toY = gsap.quickTo(planePos, "y", { duration: 0.1, ease: "power3" });
      gsap.set(planeDepth, { scale: 1 });

      var timer = null, active = false, raf = 0;
      var downX = 0, downY = 0, fx = 0, fy = 0, edgeV = 0;

      function show(x, y) {
        active = true;
        gsap.killTweensOf(planePos);
        gsap.set(planePos, { x: x, y: y, rotation: 0, xPercent: NOSE_X, yPercent: NOSE_Y });
        layer.classList.add("is-visible");
        // A small kick on arrival so it reads as summoned, not as always there.
        gsap.fromTo(planeDepth, { scale: 0.6 }, { scale: 1, duration: 0.28, ease: "back.out(2.6)" });
        document.documentElement.classList.add("plane-is-dragging");
        loop();
      }
      function hide() {
        active = false;
        clearTimeout(timer); timer = null;
        cancelAnimationFrame(raf); raf = 0; edgeV = 0;
        layer.classList.remove("is-visible");
        document.documentElement.classList.remove("plane-is-dragging");
      }

      // The page only moves when the plane is carried into the top or bottom
      // band — a deliberate pull, never a by-product of the drag.
      function loop() {
        raf = requestAnimationFrame(loop);
        var h = window.innerHeight, band = h * EDGE_BAND;
        if (fy < band) edgeV = -EDGE_RATE * (1 - fy / band);
        else if (fy > h - band) edgeV = EDGE_RATE * (1 - (h - fy) / band);
        else edgeV = 0;
        if (edgeV) window.scrollBy(0, edgeV);
        if (sweepAt) sweepAt(fx, fy);
        if (globePaint) globePaint(fx, fy);
        if (stampAt) stampAt(fx, fy);
      }

      function onStart(e) {
        if (e.touches.length !== 1) return;
        var t = e.touches[0];
        downX = fx = t.clientX; downY = fy = t.clientY;
        clearTimeout(timer);
        timer = setTimeout(function () { show(downX, downY); }, HOLD_MS);
      }
      function onMove(e) {
        var t = e.touches[0];
        if (!t) return;
        fx = t.clientX; fy = t.clientY;
        if (active) {
          // Non-passive on purpose: this is what stops the finger from
          // scrolling the page while the plane is out.
          e.preventDefault();
          toX(fx); toY(fy);
          return;
        }
        // Moved before the hold matured — that was a scroll, not a summons.
        if (Math.abs(fx - downX) > HOLD_SLOP || Math.abs(fy - downY) > HOLD_SLOP) {
          clearTimeout(timer); timer = null;
        }
      }
      function onEnd() { if (active) hide(); else { clearTimeout(timer); timer = null; } }

      on(window, "touchstart", onStart, { passive: true });
      on(window, "touchmove", onMove, { passive: false });
      on(window, "touchend", onEnd, { passive: true });
      on(window, "touchcancel", onEnd, { passive: true });

      return function () {
        hide();
        layer.classList.remove("plane-layer--cursor");
        window.removeEventListener("touchstart", onStart);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
        window.removeEventListener("touchcancel", onEnd);
        gsap.killTweensOf([planePos, planeDepth]);
        gsap.set([planePos, planeDepth], { clearProps: "transform" });
      };
    }
  }

  /* =========================================================================
     §3 COLOUR-IN (§5 + §6 of the brief)

     Every word in the copy gets its own span at boot. Colour does not snap on:
     it WIPES across the word left to right, and when the word is left alone the
     same wipe runs backwards and the colour drains out the way it came in. That
     is one paused tween per word played forward and reversed — identical motion
     in both directions by construction, not by a second animation that
     approximates it.

     Same effect everywhere: the mouse paints by hovering, a finger paints by
     tapping a line, and the summoned plane (§2) paints whatever it flies over.
     ========================================================================= */

  // Bright on the dark scenes; deep on the purple one, where the type is ink.
  var LIT_ON_DARK = ["#8A4FFF", "#BEA4FF", "#4DA2FF", "#2DD4BF", "#F0B90B",
                     "#F7931A", "#FF7A85", "#9945FF", "#00E5A0"];
  var LIT_ON_PURPLE = ["#2B0A5E", "#0B3D91", "#0B5132", "#7A3E00", "#7A0B2E",
                       "#111827", "#4C1D95"];

  var COLOUR_TARGETS = [
    ".hero__title", ".hero__sub", ".scene__title", ".scene__body", ".scene__handle",
    ".chain-list__name", ".chain-list__ticker", ".step__num", ".step__name",
    ".step__desc", ".socials__title", ".footer__title", ".footer__tech",
  ].join(", ");

  var WIPE_IN = 0.42;    // seconds for the colour to cross a word
  var WIPE_HOLD = 800;   // ms it stays full before draining back out

  function initColourIn() {
    if (reduced) return;

    // Wrap words without disturbing markup: walk TEXT NODES only, so <br>,
    // nested spans and entities all survive untouched.
    var blocks = [];
    document.querySelectorAll(COLOUR_TARGETS).forEach(function (el) {
      if (el.closest(".nav") || el.dataset.split === "1") return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var nodes = [], node;
      while ((node = walker.nextNode())) if (node.nodeValue.trim()) nodes.push(node);
      nodes.forEach(function (n) {
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (!tok.trim()) { frag.appendChild(document.createTextNode(tok)); return; }
          var s = document.createElement("span");
          s.className = "w";
          s.textContent = tok;
          frag.appendChild(s);
        });
        n.parentNode.replaceChild(frag, n);
      });
      el.dataset.split = "1";
      if (el.querySelector(".w")) blocks.push(el);
    });
    if (!blocks.length) return;

    function paletteFor(el) {
      return el.closest(".scene--rates") ? LIT_ON_PURPLE : LIT_ON_DARK;
    }
    var lastColour = "";
    function pick(pal) {
      var c = pal[(Math.random() * pal.length) | 0];
      if (c === lastColour) c = pal[(pal.indexOf(c) + 1) % pal.length];
      lastColour = c;
      return c;
    }

    // ONE tween per word, built once and kept. Playing it fills the word;
    // reversing it empties the word along the identical path (§6).
    function tweenFor(w) {
      if (w._tw) return w._tw;
      w._tw = gsap.fromTo(w, { "--wp": "100%" }, {
        "--wp": "0%", duration: WIPE_IN, ease: "power2.out", paused: true,
        onReverseComplete: function () { w.classList.remove("is-flow"); },
      });
      return w._tw;
    }
    function wipe(w, pal, delay) {
      var tw = tweenFor(w);
      // Only recolour a word that has finished draining, so a word being
      // repainted mid-wipe does not flicker through two colours.
      if (!w.classList.contains("is-flow")) w.style.setProperty("--wc", pick(pal));
      w.classList.add("is-flow");
      clearTimeout(w._in); clearTimeout(w._out);
      w._in = setTimeout(function () { tw.play(); }, delay || 0);
      w._out = setTimeout(function () { tw.reverse(); }, (delay || 0) + WIPE_HOLD);
    }

    /* --- mouse: paint by sweeping ------------------------------------------ */
    on(document, "pointerover", function (e) {
      if (e.pointerType === "touch") return;
      var w = e.target.closest && e.target.closest(".w");
      if (!w) return;
      wipe(w, paletteFor(w), 0);
    }, { passive: true });

    /* --- the plane in hand: paint whatever it flies over (§2 touch mode) ---- */
    var lastSweep = null;
    sweepAt = function (x, y) {
      var el = document.elementFromPoint(x, y);
      var w = el && el.closest && el.closest(".w");
      if (!w || w === lastSweep) { if (!w) lastSweep = null; return; }
      lastSweep = w;
      wipe(w, paletteFor(w), 0);
    };

    /* --- finger: tap a LINE and the colour runs through it ------------------
       One line per tap, not the whole block, so it stays something you play
       with. Lines are grouped by measured top edge — the only thing that
       survives arbitrary wrapping. */
    function lineAt(block, clientY) {
      var all = Array.prototype.slice.call(block.querySelectorAll(".w"));
      var rows = {};
      all.forEach(function (w) {
        var key = Math.round(w.getBoundingClientRect().top);
        (rows[key] = rows[key] || []).push(w);
      });
      var keys = Object.keys(rows).map(Number);
      if (!keys.length) return all;
      var best = keys[0];
      keys.forEach(function (k) { if (Math.abs(k - clientY) < Math.abs(best - clientY)) best = k; });
      return rows[best];
    }
    blocks.forEach(function (b) {
      b.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse") return;   // the mouse already has the sweep
        var pal = paletteFor(b);
        lineAt(b, e.clientY).forEach(function (w, i) { wipe(w, pal, i * 55); });
      }, { passive: true });
    });
  }

  /* =========================================================================
     §4 FLAG HOVER — the stamps react to the plane going past

     Each stamp leans and shifts by how close the pointer is and which side it
     is on, so sweeping the plane across the grid pushes a wave through it.
     Written as CSS custom properties rather than tweens: the transition on
     .stamp does the settling, so there is one write per stamp per frame.
     ========================================================================= */
  var STAMP_RADIUS = 190;   // px — how far the influence reaches
  var STAMP_SHIFT = 16;     // px — how far a stamp is pushed at point blank
  var STAMP_LEAN = 12;      // deg — how far it tips
  var STAMP_POP = 1.14;     // scale at point blank

  function initStampHover() {
    if (reduced) return;
    var grid = document.querySelector(".stamps");
    if (!grid) return;
    var stamps = Array.prototype.slice.call(grid.querySelectorAll(".stamp:not(.stamp--empty)"));
    if (!stamps.length) return;

    // Cache the boxes — reading them per pointermove would lay out the page 19
    // times a frame.
    var boxes = [];
    function measure() {
      boxes = stamps.map(function (s) {
        var r = s.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      });
    }
    measure();

    // The tilt is written to the IMAGE inside each stamp, never the stamp
    // itself — the stamp is what GSAP animates when the grid lands.
    var faces = stamps.map(function (s) { return s.querySelector("img") || s; });

    var queued = false, px = 0, py = 0;
    function apply() {
      queued = false;
      for (var i = 0; i < stamps.length; i++) {
        var dx = px - boxes[i].cx, dy = py - boxes[i].cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var s = stamps[i], f = faces[i];
        if (dist > STAMP_RADIUS) {
          if (s._near) {
            s._near = false;
            s.classList.remove("is-near");
            f.style.setProperty("--dx", "0px");
            f.style.setProperty("--dy", "0px");
            f.style.setProperty("--lean", "0deg");
            f.style.setProperty("--pop", "1");
          }
          continue;
        }
        if (!s._near) { s._near = true; s.classList.add("is-near"); }
        var fall = 1 - dist / STAMP_RADIUS; // 1 at the centre, 0 at the edge
        var k = fall * fall;                // bias the effect toward close range
        var ux = dist ? dx / dist : 0, uy = dist ? dy / dist : 0;
        // push AWAY from the pointer, and tip toward the side it is on
        f.style.setProperty("--dx", (-ux * STAMP_SHIFT * k).toFixed(2) + "px");
        f.style.setProperty("--dy", (-uy * STAMP_SHIFT * k).toFixed(2) + "px");
        f.style.setProperty("--lean", (ux * STAMP_LEAN * k).toFixed(2) + "deg");
        f.style.setProperty("--pop", (1 + (STAMP_POP - 1) * k).toFixed(3));
      }
    }

    var lastMeasure = 0;
    function at(x, y) {
      px = x; py = y;
      // On touch this is the only path in, and the grid may have scrolled since
      // the boxes were cached — so re-measure, but no more than ~8 times a
      // second, not once a frame.
      var now = performance.now();
      if (now - lastMeasure > 120) { lastMeasure = now; measure(); }
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }
    if (window.matchMedia("(pointer: fine)").matches) {
      on(window, "pointermove", function (e) { at(e.clientX, e.clientY); },
        { passive: true });
    }
    // and the plane being carried on a touch screen pushes the grid the same
    // way the cursor does (3)
    stampAt = at;

    // The grid moves under a pinned scene, so the cached boxes go stale as you
    // scroll. Re-measuring costs a forced layout over 19 elements, so it only
    // happens on a fine pointer, where something is genuinely tracking the grid
    // frame by frame. On touch nothing is hovering during a scroll — the plane
    // has to be summoned first — so the measure is deferred to the moment it
    // is, in at() below. Doing this on every touch scroll frame was the jank.
    if (window.matchMedia("(pointer: fine)").matches) {
      on(window, "scroll", function () {
        if (!queued) { queued = true; requestAnimationFrame(function () { measure(); apply(); }); }
      }, { passive: true });
    }
    on(window, "resize", measure);
    if (window.ScrollTrigger) ScrollTrigger.addEventListener("refresh", measure);
  }


  /* =========================================================================
     THE HERO GLOBE

     An equirectangular earth map sampled into braille cells: each character is
     a 2x4 grid of dots, so a 40-row canvas carries 320 rows of actual detail.
     The land/sea decision comes from the specular map (oceans are bright in it,
     land is dark), dithered through a Bayer matrix so coastlines break up into
     dots instead of stepping.

     The cursor paints it the way it paints words (§3), with one difference: a
     single lit cell under a 96px plane would look like a bug, so cells light in
     GROUPS. Every cell inside a small radius lights together, and the colour
     only changes when the group timer runs out — so sliding the plane across
     lays down a run of one colour, then a run of the next.
     ========================================================================= */
  var GLOBE = {
    rows: 40,
    rowsMobile: 26,
    lineHeight: 14,
    lineHeightMobile: 12,
    fontAspect: 0.6,
    zoom: 1.05,          // + = further out
    rotation: 0.02,      // radians per frame
    fps: 20,
    land: "#8A4FFF",     // the continents are ours
    sea: "#2C2440",
    texture: "/landing/assets/source/earth-specular.jpg",
  };
  var GLOBE_GROUP_MS = 420;    // how long one colour keeps being handed out
  var GLOBE_LIT_MS = 1500;     // how long a cell takes to bleed back
  var GLOBE_RADIUS = 2.4;      // cells lit either side of the pointer

  function initGlobe() {
    var host = document.querySelector(".globe");
    if (!host) return;

    var narrow = window.matchMedia("(max-width: 768px)").matches;
    var rows = narrow ? GLOBE.rowsMobile : GLOBE.rows;
    var lineH = narrow ? GLOBE.lineHeightMobile : GLOBE.lineHeight;
    var cols = Math.round(rows / GLOBE.fontAspect);
    var W = cols * 2, H = rows * 4;
    var frameDelay = 1000 / GLOBE.fps;

    // ordered dither, and the bit each dot of a braille cell owns
    var bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    var dotBits = [1, 8, 2, 16, 4, 32, 64, 128];
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    var out = document.createElement("canvas");
    host.appendChild(out);

    var img = new Image();
    img.src = GLOBE.texture;
    img.onload = function () {
      var src = document.createElement("canvas");
      var sctx = src.getContext("2d", { willReadFrequently: true });
      src.width = img.width; src.height = img.height;
      sctx.drawImage(img, 0, 0);
      var px = sctx.getImageData(0, 0, src.width, src.height).data;

      var ctx = out.getContext("2d");
      var charW = (rows * lineH) / cols;
      out.width = Math.round(cols * charW);
      out.height = rows * lineH;
      ctx.font = lineH + "px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      /* --- what the cursor has painted ---------------------------------- */
      var heat = {};              // "r:c" -> { col: [r,g,b], t: ms }
      var groupColour = null, groupAt = -1e9;
      function rgb(hex) {
        return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
      }
      var PALETTE = LIT_ON_DARK.map(rgb);
      var lastPick = -1;
      function nextColour(now) {
        if (now - groupAt < GLOBE_GROUP_MS && groupColour) return groupColour;
        var i = (Math.random() * PALETTE.length) | 0;
        if (i === lastPick) i = (i + 1) % PALETTE.length;
        lastPick = i;
        groupColour = PALETTE[i];
        groupAt = now;
        return groupColour;
      }
      function paint(clientX, clientY) {
        var b = out.getBoundingClientRect();
        if (!b.width || !b.height) return;
        if (clientX < b.left || clientX > b.right || clientY < b.top || clientY > b.bottom) return;
        var cx = ((clientX - b.left) / b.width) * cols;
        var cy = ((clientY - b.top) / b.height) * rows;
        var now = performance.now();
        var col = nextColour(now);
        var r0 = Math.floor(cy - GLOBE_RADIUS), r1 = Math.ceil(cy + GLOBE_RADIUS);
        var c0 = Math.floor(cx - GLOBE_RADIUS), c1 = Math.ceil(cx + GLOBE_RADIUS);
        for (var r = r0; r <= r1; r++) {
          for (var c = c0; c <= c1; c++) {
            if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
            var dr = r + 0.5 - cy, dc = c + 0.5 - cx;
            if (dr * dr + dc * dc > GLOBE_RADIUS * GLOBE_RADIUS) continue;
            heat[r + ":" + c] = { col: col, t: now };
          }
        }
      }
      if (!reduced) {
        on(window, "pointermove", function (e) { paint(e.clientX, e.clientY); }, { passive: true });
        // the summoned plane on touch paints it too (§2)
        globePaint = paint;
      }

      var baseLand = rgb(GLOBE.land), baseSea = rgb(GLOBE.sea);
      function colourFor(key, isLand, now) {
        var h = heat[key];
        var base = isLand ? baseLand : baseSea;
        if (!h) return "rgb(" + base[0] + "," + base[1] + "," + base[2] + ")";
        var age = (now - h.t) / GLOBE_LIT_MS;
        if (age >= 1) { delete heat[key]; return "rgb(" + base[0] + "," + base[1] + "," + base[2] + ")"; }
        // bleed back toward the base the same way the words do
        var k = 1 - age;
        return "rgb(" + Math.round(base[0] + (h.col[0] - base[0]) * k) + "," +
                        Math.round(base[1] + (h.col[1] - base[1]) * k) + "," +
                        Math.round(base[2] + (h.col[2] - base[2]) * k) + ")";
      }

      function sample(u, v) {
        var x = clamp(Math.floor(u * src.width), 0, src.width - 1);
        var y = clamp(Math.floor(v * src.height), 0, src.height - 1);
        return px[(y * src.width + x) * 4] / 255;
      }

      var rot = 0, last = 0;
      function render() {
        var now = performance.now();
        ctx.clearRect(0, 0, out.width, out.height);
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var code = 10240;         // U+2800, the empty braille cell
            var landScore = 0, onSphere = false;
            for (var dy = 0; dy < 4; dy++) {
              for (var dx = 0; dx < 2; dx++) {
                var x = c * 2 + dx, y = r * 4 + dy;
                var nx = (x / (W - 1) * 2 - 1) * GLOBE.zoom;
                var ny = -((y / (H - 1) * 2 - 1) * GLOBE.zoom);
                var d2 = nx * nx + ny * ny;
                if (d2 > 1) continue;             // off the sphere
                onSphere = true;
                var nz = Math.sqrt(1 - d2);
                var u = (Math.atan2(nx, nz) + rot) / (Math.PI * 2);
                u -= Math.floor(u);
                var v = 0.5 - Math.asin(ny) / Math.PI;
                var bright = sample(u, v);
                // the specular map is bright over water, so land is the dark end
                var isLand = Math.max(0, Math.min(1, 2.5 - bright * 5));
                if (isLand + bright * 0.1 > bayer[(y % 4) * 4 + (x % 4)] / 16) {
                  code |= dotBits[dy * 2 + dx];
                }
                landScore += isLand;
              }
            }
            if (!onSphere) continue;
            ctx.fillStyle = colourFor(r + ":" + c, landScore > 0, now);
            ctx.fillText(String.fromCharCode(code), c * charW + charW / 2,
                         r * lineH + lineH / 2);
          }
        }
        if (!reduced) rot += GLOBE.rotation;
      }

      if (reduced) { render(); return; }        // one still frame, no clock
      (function loop(t) {
        requestAnimationFrame(loop);
        if (t - last < frameDelay) return;
        last = t;
        render();
      })(0);
    };
  }

  /* A star field for the hero, generated once so it never repeats a build. */
  function initStars() {
    var el = document.querySelector(".hero__stars");
    if (!el) return;
    var n = 90, out = [];
    for (var i = 0; i < n; i++) {
      out.push("radial-gradient(1px at " + (Math.random() * 100).toFixed(2) + "% " +
               (Math.random() * 100).toFixed(2) + "%, rgba(255,255,255," +
               (0.35 + Math.random() * 0.5).toFixed(2) + "), transparent)");
    }
    el.style.backgroundImage = out.join(",");
  }

  /* =========================================================================
     §5 SCENES

     Pinned scenes (the three with set pieces) hold at the top of the viewport
     for the length of their animation, which is also what centres them: each
     is exactly one screen tall. The animation is scrubbed across the pin, so
     the page stops, the animation plays at the speed you scroll, and scrolling
     back plays it in reverse.

     Every OTHER section gets a scrubbed reveal instead — same principle, no
     pause, so nothing on the page is untouched by the scrollbar (§3 of brief).
     ========================================================================= */

  // How long each hold lasts, in screens of scroll.
  var HOLD = { receive: 1.1, links: 1.2, chains: 1.3, steps: 1.4, rates: 2.6 };

  var COARSE = window.matchMedia("(pointer: coarse)").matches;

  function pinnedScene(el, holdScreens) {
    return {
      trigger: el,
      start: "top top",
      end: "+=" + (holdScreens * 100) + "%",
      pin: true,
      pinSpacing: true,
      // pinType stays on the default. Pinning by transform was tried and made
      // the jolt worse, not better.
      //
      // The jolt is the SCRUB LAG. A scrub of 0.6 means the animation is still
      // catching up to the scrollbar when the pin lets go, so the last of the
      // catch-up plays out after the scene has already been handed back to the
      // page — which is a lurch. On touch there is no cursor precision to
      // smooth for anyway, so the scrub is locked hard to the scroll and there
      // is nothing left over at the boundary. anticipatePin pins a frame EARLY,
      // which is its own small jump, so it is mouse-only too.
      anticipatePin: COARSE ? 0 : 1,
      scrub: COARSE ? true : 0.6,
      invalidateOnRefresh: true,
    };
  }

  // Each scene arrives differently, so the page does not feel like one
  // transition applied eight times. All of them are scrubbed from the moment
  // the scene's top enters the screen to the moment it reaches the top, so the
  // approach IS the scroll and reverses with it.
  var APPROACH = {
    receive: { y: 70, opacity: 0.25 },                    // rises into place
    "payment-links": { x: -70, opacity: 0.2 },            // slides in off the left
    chains: { scale: 0.9, opacity: 0.15 },                // opens up out of nothing
    rates: { y: -60, opacity: 0.3, scale: 1.06 },         // drops in, settling down
    "how-it-works": { y: 60, rotationX: 12, opacity: 0.2 },// tips up to face you
  };
  // In one column the copy already runs edge to edge, so a sideways approach
  // starts it off the screen — it reads as text that has been cut in half
  // rather than text arriving. Narrow screens get the vertical version.
  var APPROACH_NARROW = { "payment-links": { y: 60, opacity: 0.2 } };

  function leadIn(el) {
    if (reduced) return;
    var inner = el.querySelector(".scene__inner");
    if (!inner) return;
    var narrow = window.matchMedia("(max-width: 768px)").matches;
    var from = (narrow && APPROACH_NARROW[el.id]) ||
               APPROACH[el.id] || { y: 70, opacity: 0.25 };
    var to = { x: 0, y: 0, scale: 1, rotationX: 0, opacity: 1, ease: "none" };
    gsap.fromTo(inner, from, Object.assign(to, {
      scrollTrigger: {
        trigger: el, start: "top bottom", end: "top top",
        scrub: 0.5, invalidateOnRefresh: true,
      },
    }));
  }

  /* --- 5.0b THE WHEEL (§8) ------------------------------------------------
     The same picker the rates headline uses, wrapped round the big line and
     the small line of any section that has both. Scrolling rolls one into the
     other with a detent between them, and rolls back on the way up. Neither is
     ever hidden behind the other: whichever is not centred sits at the edge of
     the window, dimmed and still readable. That is the whole point — the two
     used to be stacked in the same place, which is what looked broken.

     Built at runtime so the markup on disk stays plain readable copy. --------- */

  // Ease WITHIN each unit so the wheel dwells on an item and then flicks to the
  // next. That dwell-and-flick is the click, and because it is a pure function
  // of scroll position the whole thing reverses for free.
  function pickerPos(t) {
    var i = Math.floor(t), f = t - i;
    var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    return i + e;
  }

  function makeWheel(scene, selectors) {
    var items = [];
    selectors.forEach(function (sel) {
      var el = scene.querySelector(sel);
      if (el) items.push(el);
    });
    if (items.length < 2) return null;

    var host = items[0].parentNode;
    var wheel = document.createElement("div");
    wheel.className = "wheel";
    var list = document.createElement("div");
    list.className = "wheel__list";
    wheel.appendChild(list);
    host.insertBefore(wheel, items[0]);
    var slots = items.map(function (el) {
      var slot = document.createElement("div");
      slot.className = "wheel__item";
      slot.appendChild(el);
      list.appendChild(slot);
      return slot;
    });

    var centres = [], winH = 0;
    function measure() {
      // Slots keep their own heights; the window is sized off the tallest one
      // plus enough of the next to keep it legible at the edge.
      var hs = slots.map(function (s) { return s.offsetHeight; });
      centres = slots.map(function (s, i) { return s.offsetTop + hs[i] / 2; });
      var sorted = hs.slice().sort(function (a, b) { return b - a; });
      winH = Math.round(sorted[0] + (sorted[1] || 0) * 0.52);
      // On a short screen the tallest item alone can be most of the scene, and
      // whatever sits under the wheel then gets cropped by the pin. Cap the
      // window at a share of the room the scene actually has.
      var box = scene.clientHeight -
        parseFloat(getComputedStyle(scene).paddingTop || 0) -
        parseFloat(getComputedStyle(scene).paddingBottom || 0);
      if (box > 0) winH = Math.min(winH, Math.round(box * 0.66));
      wheel.style.height = winH + "px";
      // Slots are laid out inside an absolutely positioned list, so give the
      // stack the gap the original margins used to provide.
      set(lastT);
    }

    var lastT = 0;
    function set(t) {
      lastT = t;
      if (!centres.length) return;
      var pos = pickerPos(Math.max(0, Math.min(t, slots.length - 1)));
      var i = Math.floor(pos), f = pos - i;
      var a = centres[i], b = centres[Math.min(i + 1, centres.length - 1)];
      var centre = a + (b - a) * f;
      gsap.set(list, { y: winH / 2 - centre });
      for (var k = 0; k < slots.length; k++) {
        var d = Math.abs(k - pos);
        gsap.set(slots[k], {
          opacity: Math.max(0.22, 1 - d * 0.62),
          scale: 1 - Math.min(d, 1) * 0.06,
        });
      }
    }

    measure();
    if (window.ScrollTrigger) ScrollTrigger.addEventListener("refresh", measure);
    on(window, "resize", measure);
    return { set: set, n: slots.length, measure: measure };
  }

  /* --- 5.0 Every un-pinned section (§3 of brief) --------------------------
     Content rises into place on the way in and settles back out on the way up.
     Scrubbed, so it is the scrollbar driving it, same as everything else. ---- */
  function initSceneReveals() {
    if (!window.ScrollTrigger || reduced) return;

    [
      ["#socials", [".socials__title", ".social"]],
      ["#footer", [".footer__brand", ".footer__cta-block > *", ".footer__copyright"]],
    ].forEach(function (spec) {
      var scene = document.querySelector(spec[0]);
      if (!scene) return;
      var els = [];
      spec[1].forEach(function (sel) { els = els.concat(gsap.utils.toArray(sel, scene)); });
      if (!els.length) return;
      gsap.fromTo(els,
        { y: 54, opacity: 0 },
        {
          y: 0, opacity: 1, ease: "power2.out",
          stagger: { each: 0.06, from: "start" },
          scrollTrigger: {
            trigger: scene, start: "top 88%", end: "top 38%",
            scrub: 0.6, invalidateOnRefresh: true,
          },
        });
    });

    // The hero is already on screen at load, so it gets an exit instead of an
    // entrance: it lifts and dims as you leave, and comes back if you return.
    var hero = document.querySelector("#hero");
    if (hero) {
      gsap.to(gsap.utils.toArray(".hero__title, .hero__sub", hero), {
        y: -90, opacity: 0, ease: "none",
        stagger: { each: 0.08 },
        scrollTrigger: {
          trigger: hero, start: "top top", end: "bottom top",
          scrub: 0.6, invalidateOnRefresh: true,
        },
      });
    }

    // The footer plane drifts in on the last stretch of the page.
    var fp = document.querySelector(".footer__plane");
    if (fp) {
      gsap.fromTo(fp, { y: 120, opacity: 0.2 }, {
        y: 0, opacity: 1, ease: "none",
        scrollTrigger: {
          trigger: "#footer", start: "top bottom", end: "bottom bottom",
          scrub: 0.7, invalidateOnRefresh: true,
        },
      });
    }
  }

  /* --- 5.1 Flag stamps — they stamp down as you scroll and un-stamp if you
     scroll back up. Each lands over its own slice of the hold. -------------- */
  function initStamps() {
    if (!window.ScrollTrigger) return;
    var scene = document.querySelector("#receive");
    var grid = document.querySelector(".stamps");
    if (!scene || !grid) return;
    var stamps = gsap.utils.toArray(".stamp:not(.stamp--empty)", grid);
    if (!stamps.length) return;

    if (reduced) { gsap.set(stamps, { opacity: 1 }); return; }

    // The headline and the paragraph share a wheel (§8): the big line rolls up
    // and the small one rolls into its place while the flags land.
    var wheel = makeWheel(scene, [".scene__title", ".scene__body"]);

    leadIn(scene);
    var tl = gsap.timeline({ scrollTrigger: pinnedScene(scene, HOLD.receive) });
    tl.fromTo(".receive__copy",
      { y: 30, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.18, ease: "power2.out" }, 0);
    if (wheel) {
      var rw = { t: 0 };
      wheel.set(0);
      tl.to(rw, {
        t: wheel.n - 1, duration: 0.56, ease: "none",
        onUpdate: function () { wheel.set(rw.t); },
      }, 0.24);
    }
    // Drops from above at 1.55x and lands hard. `back.out` gives the recoil in
    // the same tween, so it survives being scrubbed backwards.
    tl.fromTo(stamps,
      { opacity: 0, scale: 1.55, yPercent: -22 },
      {
        opacity: 1, scale: 1, yPercent: 0,
        duration: 0.34, ease: "back.out(2.4)",
        stagger: { each: 0.035, from: "start" },
      }, 0.08);
  }

  /* --- 5.1b Payments — the big line and the two small ones share a wheel (§8).
     Pinned like the other set pieces, because a wheel you have to read needs
     the page to stop while it clicks over; un-pinned it rolls past the top of
     the screen before the last line is legible. ---------------------------- */
  function initLinksScene() {
    if (!window.ScrollTrigger) return;
    var scene = document.querySelector("#payment-links");
    if (!scene || reduced) return;
    var wheel = makeWheel(scene, [".scene__title", ".scene__body", ".scene__handle"]);

    leadIn(scene);
    var tl = gsap.timeline({ scrollTrigger: pinnedScene(scene, HOLD.links) });
    // the receipt slides in off the right edge it is cropped by
    tl.fromTo(".links__screen",
      { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22, ease: "power2.out" }, 0);
    if (wheel) {
      var bt = { t: 0 };
      wheel.set(0);
      tl.to(bt, {
        t: wheel.n - 1, duration: 0.62, ease: "none",
        onUpdate: function () { wheel.set(bt.t); },
      }, 0.2);
    }
  }

  /* --- 5.1c Coins — the same beat as the purple climax, in the page's own
     black: the section pulses once, then the roster is dealt out row by row as
     you scroll, and rolls back up if you scroll back. ----------------------- */
  function initChainsScene() {
    if (!window.ScrollTrigger) return;
    var scene = document.querySelector("#chains");
    if (!scene) return;
    var rows = gsap.utils.toArray(".chain-list li", scene);
    var coins = gsap.utils.toArray(".cc", scene);
    if (!rows.length) return;

    if (reduced) return;

    var pulse = document.createElement("span");
    pulse.className = "rates__pulse chains__pulse";
    pulse.setAttribute("aria-hidden", "true");
    scene.prepend(pulse);

    leadIn(scene);
    var tl = gsap.timeline({ scrollTrigger: pinnedScene(scene, HOLD.chains) });
    // the beat, out of the middle of the screen
    tl.fromTo(pulse, { scale: 0.02, opacity: 0.9 },
                     { scale: 1.1, opacity: 0, duration: 0.12, ease: "power2.out" }, 0);
    tl.fromTo(".chains__copy > h2",
      { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.14, ease: "power3.out" }, 0.04);
    // dealt out, one row at a time
    tl.fromTo(rows,
      { x: -40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.16, ease: "power2.out",
        stagger: { each: 0.055, from: "start" } }, 0.12);
    if (coins.length) {
      tl.fromTo(coins,
        { scale: 0.4, opacity: 0, rotation: -25 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.2, ease: "back.out(2)",
          stagger: 0.05 }, 0.34);
    }
  }

  /* --- 5.2 Steps — purple runs the rule, and each step is only drawn once the
     glow has reached it. Nothing is visible before its own moment. ---------- */
  function initStepsRail() {
    if (!window.ScrollTrigger) return;
    var scene = document.querySelector("#how-it-works");
    var steps = document.querySelector(".steps");
    if (!scene || !steps) return;
    var items = gsap.utils.toArray(".step", steps);
    if (!items.length) return;

    var fill = document.createElement("span");
    fill.className = "steps__fill";
    fill.setAttribute("aria-hidden", "true");
    steps.prepend(fill);

    if (reduced) { items.forEach(function (s) { s.classList.add("is-reached"); }); return; }

    var vertical = window.matchMedia("(max-width: 768px)").matches;
    gsap.set(fill, vertical ? { scaleY: 0, scaleX: 1 } : { scaleX: 0, scaleY: 1 });
    gsap.set(items, { opacity: 0, y: 26 });

    leadIn(scene);
    var tl = gsap.timeline({ scrollTrigger: pinnedScene(scene, HOLD.steps) });
    tl.fromTo(".steps__title",
      { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.14, ease: "power2.out" }, 0);
    tl.to(fill, { scaleX: 1, scaleY: 1, duration: 0.72, ease: "none" }, 0.14);
    items.forEach(function (step, i) {
      var at = 0.16 + (i / items.length) * 0.66;
      tl.to(step, { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }, at);
      // It arrives the colour of the glow that brought it in and only then
      // cools to the page's own ink — so the handover from the rule to the step
      // is one continuous piece of colour rather than two separate events.
      tl.fromTo(step.querySelector(".step__name"),
        { color: "#8A4FFF" }, { color: "#F4F1EC", duration: 0.30, ease: "power1.out" }, at + 0.04);
      tl.fromTo(step.querySelector(".step__desc"),
        { color: "#8A4FFF" }, { color: "#8C8A86", duration: 0.32, ease: "power1.out" }, at + 0.06);
      tl.call(function () { step.classList.add("is-reached"); }, null, at);
      // scrubbing back has to take the lit state off again
      tl.call(function () { step.classList.remove("is-reached"); }, null, at - 0.001);
    });
  }

  /* --- 5.3 Rates: the purple climax, the picker and the rail --------------
     Pinned, so the pulse is dead centre of the screen and the scene fills it.
     Scrubbed, so the pulse, the wash, the type, the picker wheel and every
     card on the rail all run backwards when you scroll back up. ------------- */

  // The rates headline runs the same wheel (pickerPos above), except its items
  // are all one line of the same size, so it can use a fixed item height.
  function initRatesReveal() {
    if (!window.ScrollTrigger) return;
    var scene = document.querySelector("#rates");
    if (!scene) return;

    var copy = scene.querySelector(".rates__copy");
    var name = scene.querySelector(".rates__title");
    var picker = scene.querySelector(".picker");
    var pickList = scene.querySelector(".picker__list");
    var pickItems = gsap.utils.toArray(".picker__item", scene);
    var rail = scene.querySelector(".rail");
    var track = scene.querySelector(".rail__track");
    var cards = gsap.utils.toArray(".rail__card", scene);
    var pillsL = scene.querySelector(".rail__pills--left");
    var pillsR = scene.querySelector(".rail__pills--right");

    if (reduced) {
      scene.classList.add("is-open");
      if (rail) rail.classList.add("is-open");
      return;
    }

    var wash = document.createElement("span");
    wash.className = "rates__wash";
    wash.setAttribute("aria-hidden", "true");
    var pulse = document.createElement("span");
    pulse.className = "rates__pulse";
    pulse.setAttribute("aria-hidden", "true");
    scene.prepend(wash, pulse);
    scene.classList.add("is-armed");

    /* --- the picker wheel -------------------------------------------------- */
    var itemH = 0;
    function measurePicker() {
      if (!pickItems.length) return;
      itemH = pickItems[0].offsetHeight || 0;
      if (picker && itemH) picker.style.setProperty("--pi-h", itemH + "px");
    }
    function setPicker(t) {
      if (!pickList || !itemH) return;
      var pos = pickerPos(t);
      gsap.set(pickList, { y: -pos * itemH });
      for (var i = 0; i < pickItems.length; i++) {
        var d = Math.abs(i - pos);
        gsap.set(pickItems[i], {
          opacity: Math.max(0, 1 - d * 0.85),
          scale: 1 - Math.min(d, 1) * 0.16,
        });
      }
    }

    /* --- rail geometry ----------------------------------------------------
       The wire runs the full width UNDER the copy — no gap in it any more, so
       nothing vanishes and every card is readable the whole way across. The
       copy lifts out of the way when the rail starts (step 5 below), which is
       what opens the room for it.

       Measured from layout offsets, not getBoundingClientRect: the lead-in has
       the scene translated while this runs and a rect would bake that in. */
    var railW = 0, spacing = 0, cardW = 0, railAt = 0, lift = 0;
    function offsetWithin(el, ancestor) {
      var x = 0, y = 0, n = el;
      while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x: x, y: y };
    }

    function measure() {
      measurePicker();
      if (!rail || !cards.length) return;
      var narrow = window.matchMedia("(max-width: 768px)").matches;
      railW = rail.getBoundingClientRect().width;
      cardW = cards[0].getBoundingClientRect().width || 152;
      // One detent of the wheel moves the rail exactly one card along, so the
      // spacing is also the step size.
      spacing = cardW + (narrow ? 54 : 108);

      var wireY = parseFloat(getComputedStyle(rail).getPropertyValue("--wire-y")) || 64;
      // How far the copy has to rise for a full card to clear it. The card
      // hangs from the wire, so it needs its own height plus a margin below the
      // lifted copy.
      var cardH = cards[0].getBoundingClientRect().height || 196;
      var o = offsetWithin(copy, scene);
      var room = scene.offsetHeight - (o.y + copy.offsetHeight);
      var need = cardH + (narrow ? 56 : 72);
      // Always at least a visible nudge: the copy stepping up is the cue that
      // the rail is starting, so it has to read as motion even when the scene
      // already had the room.
      lift = Math.max(narrow ? 44 : 76, Math.round(need - room + (narrow ? 24 : 40)));

      // the wire sits just under the copy, in the room the lift opens up
      var wire = o.y + copy.offsetHeight - lift + (narrow ? 56 : 72);
      rail.style.top = (wire - wireY) + "px";
      [pillsL, pillsR].forEach(function (el) { if (el) el.style.top = wire + "px"; });
      placeCards(railAt);
    }

    /* --- the pills --------------------------------------------------------
       Not scrubbed. A pill is an impact: it pops, bounces off and goes. Fired
       by a card CROSSING a zone in either direction, so scrolling back up sets
       them off again on the way past. */
    function pop(layer, text, side) {
      if (!layer || !text) return;
      var el = document.createElement("span");
      el.className = "rail__pill rail__pill--" + side;
      el.textContent = text;
      layer.appendChild(el);
      var tl = gsap.timeline({ onComplete: function () { el.remove(); } });
      if (side === "left") {
        tl.fromTo(el, { scale: 0.3, opacity: 0, y: 14 },
                      { scale: 1, opacity: 1, y: 0, duration: 0.22, ease: "back.out(3.4)" })
          .to(el, { y: -30, x: -18, rotation: -8, scale: 0.86, opacity: 0,
                    duration: 0.42, ease: "power2.in" }, 0.28);
      } else {
        tl.fromTo(el, { scale: 0.72, opacity: 0, x: -14 },
                      { scale: 1, opacity: 1, x: 0, duration: 0.26, ease: "back.out(2.2)" })
          .to(el, { x: 34, opacity: 0, duration: 0.5, ease: "power2.in" }, 0.42);
      }
    }

    function narrowNow() { return window.matchMedia("(max-width: 768px)").matches; }

    // zone centres, as a fraction of the rail width
    var ZONE_L = 0.16, ZONE_R = 0.84;
    var lastX = cards.map(function () { return null; });

    /* --- the swing (1b / 1d) ----------------------------------------------
       Each card is a pendulum hanging off its punched hole. The scroll pushes
       it — horizontal ACCELERATION is the force — and a damped spring does the
       rest, so a card kicked by a fast scroll swings and settles by itself
       instead of snapping to an angle. A little idle sway on top means the rail
       is never completely still, the way a hung card never is.

       This runs on its own frame loop rather than inside placeCards, because
       the swing has to keep going after you stop scrolling. */
    var SW_K = 0.17;      // spring: how hard it chases the lean
    var SW_DAMP = 0.82;    // how fast the swing dies away
    var SW_LEAN = 0.30;    // deg of lean per px/frame of travel
    var SW_MAX = 15;       // deg — the most it will ever lean
    var SW_IDLE = 0.55;    // deg — the sway that is always there
    var swing = cards.map(function (_, i) {
      return { a: 0, v: 0, lean: 0, x: null, phase: i * 1.7 };
    });
    var swingRAF = 0, swingOn = false;

    function swingFrame(t) {
      swingRAF = requestAnimationFrame(swingFrame);
      var idle = t / 1000;
      for (var i = 0; i < cards.length; i++) {
        var s = swing[i];
        // chase the lean, damped: it overshoots, comes back, and settles —
        // which is the shake. Standing still, the lean is zero and it hangs.
        s.v = (s.v + (s.lean - s.a) * SW_K) * SW_DAMP;
        s.a += s.v;
        s.lean *= 0.86;          // the shove fades if the scroll stops
        var sway = Math.sin(idle * 1.6 + s.phase) * SW_IDLE;
        gsap.set(cards[i], { rotation: s.a + sway });
      }
    }
    function swingStart() {
      if (swingOn || reduced) return;
      swingOn = true;
      swingRAF = requestAnimationFrame(swingFrame);
    }
    function swingStop() {
      swingOn = false;
      cancelAnimationFrame(swingRAF);
      swingRAF = 0;
    }

    // The card index and the wheel index are the same number. Card i is dead
    // centre exactly when the wheel is showing word i, which is what makes the
    // coin under the headline always the coin the headline is naming.
    function placeCards(p) {
      railAt = p;
      // NOT clamped at the low end: the lead-in runs at negative t, and that
      // is what carries the first card in from off the left edge (1c). Only the
      // wheel clamps, because it has no item before the first one.
      var pos = pickerPos(Math.min(p, cards.length - 1));
      var centre = railW / 2 - cardW / 2;
      var zl = ZONE_L * railW, zr = ZONE_R * railW;
      // One full turn of the belt. Wrapping the offset into +/- half of it puts
      // the seam well outside the rail, so a card is always off screen when it
      // jumps from one end to the other.
      var span = cards.length * spacing;
      var half = span / 2;
      for (var i = 0; i < cards.length; i++) {
        var raw = (pos - i) * spacing;
        var off = ((raw + half) % span + span) % span - half;
        var x = centre + off;
        gsap.set(cards[i], { x: x });
        var s = swing[i];
        // A jump bigger than one card gap is the belt wrapping round, not
        // movement: no lean off it, and no pill either.
        var wrapped = s.x !== null && Math.abs(x - s.x) > spacing;
        if (s.x !== null && !wrapped) {
          // Clamped: a scrollbar drag can move a card a whole screen in one
          // frame, and an unbounded lean off that is what sent it spinning.
          var vx = Math.max(-60, Math.min(60, x - s.x));
          s.lean = Math.max(-SW_MAX, Math.min(SW_MAX, -vx * SW_LEAN));
        }
        s.x = x;
        var prev = lastX[i];
        lastX[i] = x;
        if (prev === null || wrapped) continue;
        if ((prev < zl) !== (x < zl)) pop(pillsL, cards[i].dataset.sent, "left");
        // the payout line is long; a phone gets the short form of it
        if ((prev < zr) !== (x < zr)) pop(pillsR,
          narrowNow() ? cards[i].dataset.short : cards[i].dataset.got, "right");
      }
    }

    measure();
    // refreshInit runs before pins are measured, refresh after — do both, so a
    // resize or a pin-spacer change cannot leave the wire off the headline.
    ScrollTrigger.addEventListener("refreshInit", measure);
    ScrollTrigger.addEventListener("refresh", measure);

    leadIn(scene);
    var tl = gsap.timeline({
      scrollTrigger: Object.assign(pinnedScene(scene, HOLD.rates), {
        onLeaveBack: function () { lastX = cards.map(function () { return null; }); },
        // The swing costs a frame loop, so it only runs while the hold is on
        // screen. This has to hang off the PIN's trigger: a separate one would
        // be measured before the pin spacer exists and would cut out early.
        onToggle: function (self) { if (self.isActive) swingStart(); else swingStop(); },
      }),
    });

    // 1. the pulse — two rings out of dead centre
    tl.fromTo(pulse, { scale: 0.02, opacity: 1 },
                     { scale: 1.25, opacity: 0, duration: 0.09, ease: "power2.out" }, 0);
    tl.fromTo(pulse, { scale: 0.02, opacity: 0.55 },
                     { scale: 0.8, opacity: 0, duration: 0.06, ease: "power2.out" }, 0.015);
    // 2. the purple chases it out from the same point
    tl.fromTo(wash, { scale: 0 }, { scale: 1, duration: 0.11, ease: "power3.inOut" }, 0.02);
    tl.call(function () { scene.classList.add("is-open"); }, null, 0.09);
    tl.call(function () { scene.classList.remove("is-open"); }, null, 0.089);
    // 3. the centred type falls down into it — the two fixed lines and then the
    //    wheel, so the headline assembles top to bottom
    var fallers = gsap.utils.toArray(".rates__lead, .picker", scene);
    if (!fallers.length) fallers = Array.prototype.slice.call(copy.children);
    tl.fromTo(fallers,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.09, stagger: 0.04, ease: "power3.out" }, 0.10);
    // 4. the wire draws itself across
    tl.fromTo(".rail__wire", { scaleX: 0 }, { scaleX: 1, duration: 0.08, ease: "power2.inOut" }, 0.17);
    tl.call(function () { if (rail) rail.classList.add("is-open"); }, null, 0.17);
    tl.call(function () { if (rail) rail.classList.remove("is-open"); }, null, 0.169);
    // 5. the copy lifts to open the lane, and then ONE number runs both the
    //    wheel and the rail for the rest of the hold: the wheel's detent is the
    //    card's detent, so the card that settles dead centre is always the coin
    //    the headline has just named.
    tl.to(copy, { y: function () { return -lift; }, duration: 0.1, ease: "power2.inOut" }, 0.2);
    // The belt is endless, so there is no first card to walk on — the entrance
    // is the whole rail sliding into place under the drawn wire (1c). It still
    // starts before the wheel does, so the cards are already travelling by the
    // time the headline starts naming them.
    // Dropped onto the wire rather than slid along it: sliding would shift
    // every card sideways during the entrance, and the card under the headline
    // has to be the right one on every single frame.
    tl.fromTo(track, { y: -44, opacity: 0 },
                     { y: 0, opacity: 1, duration: 0.09, ease: "power3.out" }, 0.17);
    // Starts at 0, not before it: the belt and the wheel share this number,
    // and a negative lead would put an arbitrary wrapped card under a headline
    // still reading the first word. The entrance is the slide-in above.
    var drive = { t: 0 };
    placeCards(drive.t);
    setPicker(0);
    tl.to(drive, {
      t: cards.length - 1, duration: 0.74, ease: "none",
      onUpdate: function () {
        placeCards(drive.t);
        setPicker(Math.max(0, Math.min(drive.t, pickItems.length - 1)));
      },
    }, 0.22);

  }

  /* =========================================================================
     BOOT
     ========================================================================= */
  function boot() {
    // fonts.ready can settle after the reader has already navigated away, in
    // which case this instance was destroyed and must not build anything.
    if (window.__linqLanding !== instance) return;
    // Don't let ScrollTrigger refresh on the mobile URL-bar show/hide
    // (height-only viewport changes) — that refresh storm during scroll is a
    // source of mobile jank.
    if (window.ScrollTrigger) ScrollTrigger.config({ ignoreMobileResize: true });
    initStars();
    initGlobe();
    initNavScroll();
    initPlane();
    initColourIn();
    initSceneReveals();
    // DOM ORDER MATTERS: each pin inserts a spacer, and a trigger created
    // before an earlier pin measures its start without that spacer. receive →
    // rates → how-it-works is the order they appear on the page.
    initStamps();        // #receive
    initLinksScene();      // #payment-links
    initChainsScene();   // #chains
    initRatesReveal();   // #rates
    initStepsRail();     // #how-it-works
    initStampHover();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
  } else {
    on(window, "load", boot);
  }
})();

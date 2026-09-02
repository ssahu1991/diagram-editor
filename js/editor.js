/* ============================================================
   editor.js — core state, coordinate math, viewport, bootstrap
   ============================================================ */
(function () {
  'use strict';

  const App = (window.App = {
    WORKSPACE: { w: 5000, h: 4000 },
    SVGNS: 'http://www.w3.org/2000/svg',

    nodes: [],
    edges: [],
    selectedNodes: [],
    selectedEdges: [],
    clipboard: null,
    customShapes: [],       // user-defined shapes saved to the left library (persisted separately)
    editingPointsId: null,  // node id currently in vertex/point-edit mode, else null

    tool: 'select',
    defaultEdgeType: 'orthogonal',
    _id: 0,
    _toastT: null,

    settings: {
      gridEnabled: true,
      gridSize: 20,
      gridStyle: 'lines',   // 'lines' | 'dots'
      gridColor: '#e8e8e8',
      snapEnabled: true,
      zoom: 1,
      panX: 60,
      panY: 60
    },

    dom: {}
  });

  /* ---------- small utilities ---------- */
  App.uid = function (prefix) {
    App._id += 1;
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + App._id;
  };
  App.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  App.escapeHTML = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  App.round = function (v) { return Math.round(v * 100) / 100; };

  App.make = function (tag, attrs, parent) {
    const el = document.createElementNS(App.SVGNS, tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v !== null && v !== undefined) el.setAttribute(k, v);
      }
    }
    if (parent) parent.appendChild(el);
    return el;
  };

  App.getNode = function (id) { return App.nodes.find(n => n.id === id); };
  App.getEdge = function (id) { return App.edges.find(e => e.id === id); };

  // run `fn` at most once per animation frame, always with the most recent args —
  // keeps drag / resize buttery even when the mouse fires 100+ events/second
  App.rafThrottle = function (fn) {
    let raf = 0, args = null;
    const run = function () { raf = 0; const a = args; args = null; if (a) fn.apply(null, a); };
    const wrapped = function () { args = arguments; if (!raf) raf = requestAnimationFrame(run); };
    wrapped.cancel = function () { if (raf) cancelAnimationFrame(raf); raf = 0; args = null; };
    wrapped.flush = function () { if (raf) { cancelAnimationFrame(raf); run(); } }; // apply the last frame now
    return wrapped;
  };

  /* ---------- coordinate conversion ---------- */
  App.screenToWorld = function (sx, sy) {
    const r = App.dom.svg.getBoundingClientRect();
    return {
      x: (sx - r.left - App.settings.panX) / App.settings.zoom,
      y: (sy - r.top - App.settings.panY) / App.settings.zoom
    };
  };
  App.worldToScreen = function (wx, wy) {
    const r = App.dom.svg.getBoundingClientRect();
    return {
      x: wx * App.settings.zoom + App.settings.panX + r.left,
      y: wy * App.settings.zoom + App.settings.panY + r.top
    };
  };

  /* ---------- grid / snap ---------- */
  App.snap = function (v) {
    if (!App.settings.snapEnabled) return v;
    const g = App.settings.gridSize;
    return Math.round(v / g) * g;
  };

  App.applyGridSettings = function () {
    const s = App.settings;
    const g = Math.max(4, s.gridSize || 20);
    const dots = s.gridStyle === 'dots';
    // the factory-default grid colour adapts to the theme; a user-picked colour is used as-is
    // the factory-default grid colour maps to a clearly-visible dark-mode grey;
    // treat the previous dark default as "still default" so old saves adapt too
    const isDefault = /^#(e8e8e8|3e424b)$/i.test(s.gridColor);
    const color = (isDefault && App.theme === 'dark') ? '#4a4f5b'
                : (isDefault && App.theme === 'light') ? '#e0e2e6'
                : s.gridColor;
    App.dom.gridPattern.setAttribute('width', g);
    App.dom.gridPattern.setAttribute('height', g);
    App.dom.gridPath.setAttribute('d', 'M ' + g + ' 0 L 0 0 L 0 ' + g);
    App.dom.gridPath.setAttribute('stroke', color);
    App.dom.gridPath.style.display = dots ? 'none' : '';
    App.dom.gridDot.setAttribute('fill', color);
    App.dom.gridDot.style.display = dots ? '' : 'none';

    $('[data-cmd="toggleGrid"]').toggleClass('checked', s.gridEnabled);
    $('[data-cmd="toggleSnap"]').toggleClass('checked', s.snapEnabled);
    $('#tb-grid-toggle').toggleClass('active', s.gridEnabled);
    $('#tb-snap-toggle').toggleClass('active', s.snapEnabled);

    if (App.updateInfiniteLayers) App.updateInfiniteLayers();
    App.updateStatusBar();
  };

  /* ---------- viewport ---------- */
  // keep the white "page" rect and the grid rect covering the whole visible
  // canvas, so the grid always fills the centre of the workspace (infinite grid).
  App.updateInfiniteLayers = function () {
    if (!App.dom.svg) return;
    const s = App.settings;
    const r = App.dom.svg.getBoundingClientRect();
    if (!r.width) return;
    const g = s.gridSize || 20;
    const pad = g * 6;
    const x0 = -s.panX / s.zoom, y0 = -s.panY / s.zoom;
    const vw = r.width / s.zoom, vh = r.height / s.zoom;
    const gx = Math.floor((x0 - pad) / g) * g;
    const gy = Math.floor((y0 - pad) / g) * g;
    const gw = Math.ceil((vw + pad * 2) / g) * g + g;
    const gh = Math.ceil((vh + pad * 2) / g) * g + g;
    [App.dom.canvasBg, App.dom.gridRect].forEach(el => {
      if (!el) return;
      el.setAttribute('x', gx); el.setAttribute('y', gy);
      el.setAttribute('width', gw); el.setAttribute('height', gh);
    });
    // hide the grid when cells would be too dense to read
    const tooDense = g * s.zoom < 4;
    App.dom.gridRect.style.display = (App.settings.gridEnabled && !tooDense) ? '' : 'none';
  };

  App.updateViewport = function () {
    const s = App.settings;
    App.dom.viewport.setAttribute(
      'transform', 'translate(' + s.panX + ' ' + s.panY + ') scale(' + s.zoom + ')'
    );
    App.updateInfiniteLayers();
    App.updateStatusBar();
    if (App.updateSelectionOverlay) App.updateSelectionOverlay();
  };

  // a side panel slides open/closed without firing a window resize, so the
  // canvas widens but the infinite grid/page rects still cover the old box —
  // re-sync the viewport every frame for the length of the panel transition
  App.reflowCanvas = function (ms) {
    if (App._reflowRAF) cancelAnimationFrame(App._reflowRAF);
    const t0 = performance.now(), dur = ms || 260;
    const tick = function () {
      App.updateViewport();
      App._reflowRAF = (performance.now() - t0 < dur) ? requestAnimationFrame(tick) : 0;
    };
    App._reflowRAF = requestAnimationFrame(tick);
  };

  App.setZoom = function (z, cx, cy) {
    const s = App.settings;
    z = Math.min(4, Math.max(0.2, z));
    const r = App.dom.svg.getBoundingClientRect();
    if (cx === undefined) { cx = r.width / 2; cy = r.height / 2; }
    const wx = (cx - s.panX) / s.zoom;
    const wy = (cy - s.panY) / s.zoom;
    s.zoom = z;
    s.panX = cx - wx * z;
    s.panY = cy - wy * z;
    App.updateViewport();
  };

  // true when the OS / browser asks for less motion — every animation checks this
  App.reducedMotion = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  };

  // smoothly glide the viewport to a target pan/zoom (used by Fit / Reset)
  App.tweenView = function (px, py, z, ms) {
    if (App._viewRAF) { cancelAnimationFrame(App._viewRAF); App._viewRAF = 0; }
    const s = App.settings;
    if (App.reducedMotion() || ms === 0) {
      s.panX = px; s.panY = py; s.zoom = z; App.updateViewport(); return;
    }
    const fromX = s.panX, fromY = s.panY, fromZ = s.zoom;
    const dur = ms || 260, t0 = performance.now();
    const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2); // easeInOutCubic
    const step = function (now) {
      const k = Math.min(1, (now - t0) / dur), e = ease(k);
      s.panX = fromX + (px - fromX) * e;
      s.panY = fromY + (py - fromY) * e;
      s.zoom = fromZ + (z - fromZ) * e;
      App.updateViewport();
      App._viewRAF = (k < 1) ? requestAnimationFrame(step) : 0;
    };
    App._viewRAF = requestAnimationFrame(step);
  };

  // bounding box of all nodes (world coords); a default region when the canvas is empty
  App.contentBox = function () {
    if (!App.nodes.length) return { x: 0, y: 0, w: 920, h: 640 };
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    App.nodes.forEach(n => {
      a = Math.min(a, n.x); b = Math.min(b, n.y);
      c = Math.max(c, n.x + n.width); d = Math.max(d, n.y + n.height);
    });
    return { x: a, y: b, w: c - a, h: d - b };
  };

  // centre the given world-box (default: all content) in the visible canvas at the current zoom
  App.centerView = function (box) {
    box = box || App.contentBox();
    const r = App.dom.svg.getBoundingClientRect();
    const z = App.settings.zoom;
    App.settings.panX = (r.width - box.w * z) / 2 - box.x * z;
    App.settings.panY = (r.height - box.h * z) / 2 - box.y * z;
    App.updateViewport();
  };

  App.resetZoom = function (animate) {
    const box = App.contentBox(), z = 1;
    const r = App.dom.svg.getBoundingClientRect();
    const px = (r.width - box.w * z) / 2 - box.x * z;
    const py = (r.height - box.h * z) / 2 - box.y * z;
    App.tweenView(px, py, z, animate === false ? 0 : undefined);
  };

  App.fitToScreen = function () {
    if (!App.nodes.length) { App.resetZoom(); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    App.nodes.forEach(n => {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
    });
    const pad = 70;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const r = App.dom.svg.getBoundingClientRect();
    const z = Math.min(r.width / (maxX - minX), r.height / (maxY - minY), 2);
    const px = (r.width - (maxX - minX) * z) / 2 - minX * z;
    const py = (r.height - (maxY - minY) * z) / 2 - minY * z;
    App.tweenView(px, py, z);
  };

  /* ---------- floating HUD (size / angle / position readout) ---------- */
  App.hud = function (text, cx, cy) {
    let h = document.getElementById('hud');
    if (!h) { h = document.createElement('div'); h.id = 'hud'; document.body.appendChild(h); }
    if (text == null) { h.style.display = 'none'; return; }
    h.textContent = text;
    h.style.display = 'block';
    h.style.left = (cx + 16) + 'px';
    h.style.top = (cy + 18) + 'px';
  };

  /* ---------- theme (dark by default) ---------- */
  App.theme = 'dark';
  App.setTheme = function (theme, save) {
    App.theme = (theme === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', App.theme);
    $('[data-cmd="toggleTheme"]').toggleClass('checked', App.theme === 'dark');
    if (save !== false) { try { localStorage.setItem('diagramEditor.theme', App.theme); } catch (e) {} }
    if (App.dom && App.dom.gridPath) App.applyGridSettings();   // grid + edges follow the theme
    if (App.renderAllEdges) App.renderAllEdges();
  };

  /* ---------- status bar ---------- */
  App.updateStatusBar = function () {
    $('#sb-zoom').text('Zoom: ' + Math.round(App.settings.zoom * 100) + '%');
    $('#zoom-pill').text(Math.round(App.settings.zoom * 100) + '%');
    $('#sb-grid').text('Grid: ' + (App.settings.gridEnabled ? 'ON' : 'OFF'));
    $('#sb-snap').text('Snap: ' + (App.settings.snapEnabled ? 'ON' : 'OFF'));
    $('#sb-count').text(App.nodes.length + ' shape' + (App.nodes.length === 1 ? '' : 's') +
      ' / ' + App.edges.length + ' link' + (App.edges.length === 1 ? '' : 's'));
    const ce = document.getElementById('canvas-empty');
    if (ce) ce.hidden = (App.nodes.length + App.edges.length) > 0;
  };

  /* ---------- full render ---------- */
  App.render = function () {
    App.renderAllEdges();
    App.renderAllNodes();
    App.refreshSelectionClasses();
    App.updateSelectionOverlay();
    App.updateStatusBar();
  };

  /* ---------- toast ---------- */
  App.toast = function (msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(App._toastT);
    App._toastT = setTimeout(() => t.classList.remove('show'), 2200);
  };

  /* ---------- tool switch ---------- */
  App.setTool = function (t) {
    App.tool = t;
    $('.tool-btn[data-tool]').removeClass('active');
    $('.tool-btn[data-tool="' + t + '"]').addClass('active');
    App.dom.svg.setAttribute('data-tool', t);
  };

  window.isEditingText = function () {
    const a = document.activeElement;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  };

  /* ---------- canvas navigation: pan + wheel zoom ---------- */
  function initCanvasNav() {
    const svg = App.dom.svg;
    const $svg = $(svg);
    let panning = false, spaceDown = false, last = null;

    $(document).on('keydown.nav', function (e) {
      if (e.code === 'Space' && !isEditingText()) { spaceDown = true; $svg.addClass('space-pan'); }
    }).on('keyup.nav', function (e) {
      if (e.code === 'Space') { spaceDown = false; $svg.removeClass('space-pan'); }
    });

    $svg.on('mousedown.nav', function (e) {
      if (e.button === 1 || (e.button === 0 && spaceDown)) {
        panning = true;
        last = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    });
    $(document).on('mousemove.nav', function (e) {
      if (!panning) return;
      App.settings.panX += e.clientX - last.x;
      App.settings.panY += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      App.updateViewport();
    }).on('mouseup.nav', function () { panning = false; });

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      App.setZoom(App.settings.zoom * factor, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    $svg.on('mousemove.nav', function (e) {
      const w = App.screenToWorld(e.clientX, e.clientY);
      $('#sb-x').text('X: ' + Math.round(w.x));
      $('#sb-y').text('Y: ' + Math.round(w.y));
    });

    svg.addEventListener('auxclick', function (e) { if (e.button === 1) e.preventDefault(); });

    $(window).on('resize.nav', function () { App.updateViewport(); });
  }


  /* ---------- bootstrap ---------- */
  App.init = function () {
    const d = App.dom;
    d.svg = document.getElementById('canvas');
    d.viewport = document.getElementById('viewport');
    d.gridPattern = document.getElementById('grid-pattern');
    d.gridPath = document.getElementById('grid-path');
    d.gridDot = document.getElementById('grid-dot');
    d.gridRect = document.getElementById('grid-rect');
    d.canvasBg = document.getElementById('canvas-bg');
    d.layerEdges = document.getElementById('layer-edges');
    d.layerNodes = document.getElementById('layer-nodes');
    d.layerOverlay = document.getElementById('layer-overlay');
    d.layerTmp = document.getElementById('layer-tmp');

    initCanvasNav();
    App.updateViewport();   // size the infinite page + grid to the viewport

    // module inits (defined in their own files)
    App.initHistory();
    App.loadCustomShapes();   // must run before the palette is built
    App.buildShapePalette();
    App.initSelection();
    App.initResize();
    App.initConnectors();
    App.initProperties();
    App.initToolbar();
    App.initShapeEditor();
    App.initStorage();

    App.setTool('select');
    App.setTheme(document.documentElement.getAttribute('data-theme') || 'dark', false); // sync menu check
    App.applyGridSettings();

    const restored = App.loadDiagram();
    if (!restored) App.settings.zoom = 1;   // fresh start: blank canvas at 100%

    App.render();
    App.updateProperties();
    App.centerView();            // always open with the drawing centred in the canvas
    App.pushHistory(true);
  };

  $(document).ready(App.init);
})();

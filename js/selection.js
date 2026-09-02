/* ============================================================
   selection.js — selection model, node dragging, rubber-band,
   selection overlay (handles / rotation / connection points)
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  let nd = null;      // node-drag state
  let rubber = null;  // rubber-band state

  /* ---------------- selection model ---------------- */
  App.select = function (ids, additive) {
    if (!additive) { App.selectedNodes = []; App.selectedEdges = []; }
    ids.forEach(id => { if (App.selectedNodes.indexOf(id) < 0) App.selectedNodes.push(id); });

    // expand to group members
    const extra = [];
    App.selectedNodes.forEach(id => {
      const n = App.getNode(id);
      if (n && n.groupId) {
        App.nodes.forEach(o => {
          if (o.groupId === n.groupId &&
              App.selectedNodes.indexOf(o.id) < 0 &&
              extra.indexOf(o.id) < 0) extra.push(o.id);
        });
      }
    });
    App.selectedNodes = App.selectedNodes.concat(extra);
    // leave point-edit mode unless the selection is still exactly that one node
    if (App.editingPointsId &&
        (App.selectedNodes.length !== 1 || App.selectedNodes[0] !== App.editingPointsId)) {
      App.editingPointsId = null;
    }
    App.refreshSelectionClasses();
    App.updateSelectionOverlay();
  };

  App.deselect = function (id) {
    App.selectedNodes = App.selectedNodes.filter(x => x !== id);
    App.refreshSelectionClasses();
    App.updateSelectionOverlay();
    App.updateProperties();
  };

  App.selectEdge = function (id, additive) {
    if (!additive) { App.selectedNodes = []; App.selectedEdges = []; }
    if (App.selectedEdges.indexOf(id) < 0) App.selectedEdges.push(id);
    App.refreshSelectionClasses();
    App.updateSelectionOverlay();
  };

  App.clearSelection = function () {
    App.selectedNodes = [];
    App.selectedEdges = [];
    App.editingPointsId = null;
    App.refreshSelectionClasses();
    App.updateSelectionOverlay();
  };

  App.selectAll = function () {
    App.select(App.nodes.map(n => n.id));
    App.updateProperties();
  };

  App.refreshSelectionClasses = function () {
    $(App.dom.layerNodes).find('g.node').each(function () {
      this.classList.toggle('selected', App.selectedNodes.indexOf(this.getAttribute('data-id')) >= 0);
    });
    App.renderAllEdges(); // re-colour selected edges
  };

  /* ---------------- selection overlay ---------------- */
  App.updateSelectionOverlay = function () {
    const ov = App.dom.layerOverlay;
    if (!ov) return;
    ov.textContent = '';
    const z = App.settings.zoom;
    const sw = 1 / z;
    const hs = 9 / z;
    const single = App.selectedNodes.length === 1;

    App.selectedNodes.forEach(id => {
      const n = App.getNode(id);
      if (!n) return;
      const w = n.width, h = n.height;
      const og = App.make('g', {
        class: 'sel-overlay', 'data-id': id,
        transform: 'translate(' + n.x + ' ' + n.y + ') rotate(' + (n.rotation || 0) + ' ' + w / 2 + ' ' + h / 2 + ')'
      }, ov);
      App.make('rect', { class: 'sel-border', x: 0, y: 0, width: w, height: h, fill: 'none', 'stroke-width': sw }, og);

      // vertex/point-edit mode: draw one draggable handle per outline point, nothing else
      const editingThis = single && App.editingPointsId === id &&
        App.POLYGON_TYPES.indexOf(App.effectiveType(n)) >= 0;
      if (editingThis) {
        const vhs = 11 / z;
        App.polygonPoints(n).forEach((p, i) => {
          App.make('circle', {
            class: 'vertex-handle', 'data-id': id, 'data-idx': i,
            cx: p[0], cy: p[1], r: vhs / 2, 'stroke-width': sw
          }, og);
        });
        return;
      }

      if (single) {
        App.make('line', { class: 'sel-rot-line', x1: w / 2, y1: 0, x2: w / 2, y2: -28 * sw, 'stroke-width': sw }, og);
        App.make('circle', { class: 'sel-rot', cx: w / 2, cy: -28 * sw, r: hs * 0.62, 'data-id': id, 'stroke-width': sw }, og);

        // connection points sit just OUTSIDE the shape so they never overlap the
        // edge-midpoint resize handles (drag still starts an edge from the true edge)
        const gap = 13 * sw;
        [['top', w / 2, -gap], ['right', w + gap, h / 2], ['bottom', w / 2, h + gap], ['left', -gap, h / 2]].forEach(c =>
          App.make('circle', {
            class: 'conn-point', 'data-id': id, 'data-side': c[0],
            cx: c[1], cy: c[2], r: hs * 0.55, 'stroke-width': sw
          }, og));

        // 8 resize handles (drawn last so they always win the click):
        // 4 corners + 4 edge midpoints — left/right stretch width, top/bottom stretch height
        const hd = [['nw', 0, 0], ['n', w / 2, 0], ['ne', w, 0], ['e', w, h / 2],
                    ['se', w, h], ['s', w / 2, h], ['sw', 0, h], ['w', 0, h / 2]];
        hd.forEach(d => App.make('rect', {
          class: 'sel-handle', 'data-dir': d[0], 'data-id': id,
          x: d[1] - hs / 2, y: d[2] - hs / 2, width: hs, height: hs, 'stroke-width': sw
        }, og));
      }
    });

    if (App.selectedNodes.length > 1) {
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      App.selectedNodes.forEach(id => {
        const n = App.getNode(id); if (!n) return;
        a = Math.min(a, n.x); b = Math.min(b, n.y);
        c = Math.max(c, n.x + n.width); d = Math.max(d, n.y + n.height);
      });
      if (a < Infinity) App.make('rect', { class: 'sel-bbox', x: a, y: b, width: c - a, height: d - b, fill: 'none', 'stroke-width': sw }, ov);
    }
  };

  // cheap per-frame reposition of the selection overlay while a node is being
  // *moved* (size/rotation unchanged) — just nudges each group's transform
  App.updateOverlayTransforms = function () {
    const ov = App.dom.layerOverlay;
    if (!ov) return;
    App.selectedNodes.forEach(id => {
      const n = App.getNode(id);
      if (!n) return;
      const og = ov.querySelector('g.sel-overlay[data-id="' + id + '"]');
      if (og) og.setAttribute('transform',
        'translate(' + n.x + ' ' + n.y + ') rotate(' + (n.rotation || 0) + ' ' + n.width / 2 + ' ' + n.height / 2 + ')');
    });
    if (App.selectedNodes.length > 1) {
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      App.selectedNodes.forEach(id => {
        const n = App.getNode(id); if (!n) return;
        a = Math.min(a, n.x); b = Math.min(b, n.y);
        c = Math.max(c, n.x + n.width); d = Math.max(d, n.y + n.height);
      });
      const bb = ov.querySelector('rect.sel-bbox');
      if (bb && a < Infinity) {
        bb.setAttribute('x', a); bb.setAttribute('y', b);
        bb.setAttribute('width', c - a); bb.setAttribute('height', d - b);
      }
    }
  };

  App.syncFields = function () {
    if (!App.selectedNodes.length) return;
    const n = App.getNode(App.selectedNodes[App.selectedNodes.length - 1]);
    if (!n) return;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = v;
    };
    set('p-x', Math.round(n.x)); set('p-y', Math.round(n.y));
    set('p-w', Math.round(n.width)); set('p-h', Math.round(n.height));
    set('p-rot', Math.round(n.rotation || 0));
  };

  /* ---------------- node dragging ---------------- */
  function startNodeDrag(e) {
    const o = App.screenToWorld(e.clientX, e.clientY);
    nd = {
      sx: o.x, sy: o.y, moved: false,
      items: App.selectedNodes.map(id => {
        const n = App.getNode(id);
        return { n: n, x0: n.x, y0: n.y };
      })
    };
  }

  function doMove(cx, cy) {
    if (nd) {
      const p = App.screenToWorld(cx, cy);
      let dx = p.x - nd.sx, dy = p.y - nd.sy;
      if (App.settings.snapEnabled && nd.items.length) {
        const prim = nd.items[0];
        dx = App.snap(prim.x0 + dx) - prim.x0;
        dy = App.snap(prim.y0 + dy) - prim.y0;
      }
      if (Math.abs(dx) + Math.abs(dy) > 0.4) nd.moved = true;
      const ids = {};
      nd.items.forEach(it => {
        it.n.x = it.x0 + dx;
        it.n.y = it.y0 + dy;
        App.updateNodeTransform(it.n);   // transform attr only — no DOM rebuild
        ids[it.n.id] = 1;
      });
      App.edges.forEach(ed => { if (ids[ed.source] || ids[ed.target]) App.renderEdge(ed); });
      App.updateOverlayTransforms();     // reposition handles without rebuilding them
      App.syncFields();
    } else if (rubber) {
      const p = App.screenToWorld(cx, cy);
      rubber.x2 = p.x; rubber.y2 = p.y;
      drawRubber();
    }
  }
  const moveThrottled = App.rafThrottle(doMove);

  function onMouseMove(e) {
    if (!nd && !rubber) return;
    moveThrottled(e.clientX, e.clientY);
  }

  function onMouseUp() {
    moveThrottled.flush();   // land exactly where the mouse was released
    if (nd) {
      if (nd.moved) { App.updateSelectionOverlay(); App.updateProperties(); App.pushHistory(); }
      nd = null;
    }
    if (rubber) { finishRubber(); rubber = null; }
  }

  /* ---------------- rubber band ---------------- */
  function startRubber(e) {
    const p = App.screenToWorld(e.clientX, e.clientY);
    rubber = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  }
  function drawRubber() {
    let r = App.dom.layerTmp.querySelector('rect.rubber');
    if (!r) r = App.make('rect', { class: 'rubber' }, App.dom.layerTmp);
    const x = Math.min(rubber.x1, rubber.x2), y = Math.min(rubber.y1, rubber.y2);
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', Math.abs(rubber.x2 - rubber.x1));
    r.setAttribute('height', Math.abs(rubber.y2 - rubber.y1));
  }
  function finishRubber() {
    const el = App.dom.layerTmp.querySelector('rect.rubber');
    if (el) el.remove();
    const x = Math.min(rubber.x1, rubber.x2), y = Math.min(rubber.y1, rubber.y2);
    const w = Math.abs(rubber.x2 - rubber.x1), h = Math.abs(rubber.y2 - rubber.y1);
    if (w < 3 && h < 3) return;
    const hits = App.nodes.filter(n =>
      n.x < x + w && n.x + n.width > x && n.y < y + h && n.y + n.height > y
    ).map(n => n.id);
    App.select(hits);
    App.updateProperties();
  }

  /* ---------------- wiring ---------------- */
  App.initSelection = function () {
    const $nodes = $(App.dom.layerNodes);
    const $edges = $(App.dom.layerEdges);
    const $svg = $(App.dom.svg);

    $nodes.on('mousedown', 'g.node', function (e) {
      if (e.button !== 0) return;
      if (App.tool === 'connector') return;   // handled by connectors.js
      if ($svg.hasClass('space-pan')) return;
      e.stopPropagation();
      const id = this.getAttribute('data-id');
      // while reshaping a node's points, its body is inert — interact via the vertex handles
      if (App.editingPointsId === id) return;
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (additive && App.selectedNodes.indexOf(id) >= 0) { App.deselect(id); return; }
      if (App.selectedNodes.indexOf(id) < 0) App.select([id], additive);
      App.updateProperties();
      startNodeDrag(e);
    });

    $nodes.on('dblclick', 'g.node', function (e) {
      e.stopPropagation();
      App.editNodeText(this.getAttribute('data-id'));
    });

    $edges.on('mousedown', 'path.edge-hit', function (e) {
      if (e.button !== 0) return;
      e.stopPropagation();
      const id = this.parentNode.getAttribute('data-id');
      App.selectEdge(id, e.shiftKey || e.ctrlKey || e.metaKey);
      App.updateProperties();
    });

    $svg.on('mousedown', function (e) {
      if (e.button !== 0) return;
      if ($svg.hasClass('space-pan')) return;

      if (App.tool === 'text') {
        const w = App.screenToWorld(e.clientX, e.clientY);
        // silent: finish() in editNodeText pushes history; start blank so a
        // cancelled click leaves nothing behind (see nodes.js editNodeText)
        const n = App.createNode('text', w.x, w.y, true, true);
        n.text = '';
        App.renderNode(n);
        App.setTool('select');
        setTimeout(() => App.editNodeText(n.id), 0);
        return;
      }
      App.clearSelection();
      App.updateProperties();
      App.hideContextMenu && App.hideContextMenu();
      if (App.tool === 'select') startRubber(e);
    });

    $(document).on('mousemove.sel', onMouseMove).on('mouseup.sel', onMouseUp);
  };
})();

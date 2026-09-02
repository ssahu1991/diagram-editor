/* ============================================================
   connectors.js — connection points, edges, routing, arrowheads
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  function rotVec(x, y, deg) {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  App.edgeDefaultStyle = function () {
    return { stroke: '#33373d', strokeWidth: 2, dashed: false, arrowStart: false, arrowEnd: true, flow: false };
  };

  /* ---------------- anchors ---------------- */
  App.anchorLocal = function (n, side) {
    switch (side) {
      case 'top': return { x: n.width / 2, y: 0 };
      case 'bottom': return { x: n.width / 2, y: n.height };
      case 'left': return { x: 0, y: n.height / 2 };
      case 'right': return { x: n.width, y: n.height / 2 };
      default: return { x: n.width / 2, y: n.height / 2 };
    }
  };
  App.anchorWorld = function (n, side) {
    const l = App.anchorLocal(n, side);
    const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
    const v = rotVec(l.x - n.width / 2, l.y - n.height / 2, n.rotation || 0);
    return { x: cx + v.x, y: cy + v.y };
  };

  function bestSide(n, p) {
    const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
    const dx = (p.x - cx) / (n.width / 2 || 1);
    const dy = (p.y - cy) / (n.height / 2 || 1);
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
  }
  App.bestSide = bestSide;

  /* ---------------- routing ---------------- */
  function extend(p, side, d) {
    return {
      x: p.x + (side === 'left' ? -d : side === 'right' ? d : 0),
      y: p.y + (side === 'top' ? -d : side === 'bottom' ? d : 0)
    };
  }
  function orthPath(S, sSide, T, tSide) {
    const d = 26;
    const s1 = extend(S, sSide, d);
    const t1 = extend(T, tSide, d);
    const sh = sSide === 'left' || sSide === 'right';
    const th = tSide === 'left' || tSide === 'right';
    const p = [S, s1];
    if (sh && th) {
      const mx = (s1.x + t1.x) / 2;
      p.push({ x: mx, y: s1.y }, { x: mx, y: t1.y });
    } else if (!sh && !th) {
      const my = (s1.y + t1.y) / 2;
      p.push({ x: s1.x, y: my }, { x: t1.x, y: my });
    } else if (sh && !th) {
      p.push({ x: t1.x, y: s1.y });
    } else {
      p.push({ x: s1.x, y: t1.y });
    }
    p.push(t1, T);
    return 'M ' + p.map(q => q.x + ' ' + q.y).join(' L ');
  }

  App.edgePath = function (edge) {
    const s = App.getNode(edge.source), t = App.getNode(edge.target);
    if (!s || !t) return null;
    let sa = edge.sourceAnchor, ta = edge.targetAnchor;
    if (!sa || sa === 'auto') sa = bestSide(s, { x: t.x + t.width / 2, y: t.y + t.height / 2 });
    if (!ta || ta === 'auto') ta = bestSide(t, { x: s.x + s.width / 2, y: s.y + s.height / 2 });
    const S = App.anchorWorld(s, sa), T = App.anchorWorld(t, ta);
    if (edge.type === 'straight') return 'M ' + S.x + ' ' + S.y + ' L ' + T.x + ' ' + T.y;
    return orthPath(S, sa, T, ta);
  };

  /* ---------------- create / render ---------------- */
  App.createEdge = function (sourceId, targetId, sAnchor, tAnchor, opts) {
    opts = opts || {};
    const ed = {
      id: App.uid('edge'),
      source: sourceId,
      target: targetId,
      sourceAnchor: sAnchor || 'auto',
      targetAnchor: tAnchor || 'auto',
      type: opts.type || App.defaultEdgeType,
      text: '',
      style: Object.assign(App.edgeDefaultStyle(), opts.style || {})
    };
    App.edges.push(ed);
    App.renderEdge(ed);
    App.updateStatusBar();
    return ed;
  };

  App.renderEdge = function (edge) {
    const d = App.edgePath(edge);
    let g = App.dom.layerEdges.querySelector('g.edge[data-id="' + edge.id + '"]');
    if (!d) { if (g) g.remove(); return; }
    if (g) g.textContent = '';
    else g = App.make('g', { class: 'edge', 'data-id': edge.id }, App.dom.layerEdges);

    const sel = App.selectedEdges.indexOf(edge.id) >= 0;
    const st = edge.style;
    // the factory-default connector colour flips light on a dark canvas
    let strokeCol = st.stroke;
    if (App.theme === 'dark' && /^#33373d$/i.test(strokeCol)) strokeCol = '#b9bec8';
    App.make('path', { class: 'edge-hit', d: d, fill: 'none', stroke: 'transparent', 'stroke-width': 14 }, g);
    const flow = !!st.flow && !App.reducedMotion();
    const line = App.make('path', {
      class: 'edge-line' + (flow ? ' flow' : ''), d: d, fill: 'none',
      stroke: sel ? '#2b7de9' : strokeCol,
      'stroke-width': (st.strokeWidth || 2) + (sel ? 1 : 0),
      'stroke-dasharray': st.dashed ? '7 5' : (flow ? '8 6' : null),
      'marker-end': st.arrowEnd ? 'url(#arrow)' : null,
      'marker-start': st.arrowStart ? 'url(#arrow)' : null
    }, g);

    // optional edge label at the path midpoint (double-click an edge to add one)
    if (edge.text && String(edge.text).trim()) {
      let mid = null;
      try { const L = line.getTotalLength(); if (L) mid = line.getPointAtLength(L / 2); } catch (e) {}
      if (mid) {
        const t = App.make('text', {
          class: 'edge-label', x: mid.x, y: mid.y,
          'text-anchor': 'middle', 'dominant-baseline': 'middle'
        }, g);
        t.textContent = edge.text;
        try {
          const bb = t.getBBox();
          const r = App.make('rect', {
            class: 'edge-label-bg', x: bb.x - 4, y: bb.y - 1,
            width: bb.width + 8, height: bb.height + 2, rx: 3
          });
          g.insertBefore(r, t);
        } catch (e) {}
      }
    }
    g.classList.toggle('selected', sel);
    return g;
  };

  // double-click an edge -> inline label editor
  App.editEdgeLabel = function (id) {
    const ed = App.getEdge(id);
    if (!ed) return;
    const line = App.dom.layerEdges.querySelector('g.edge[data-id="' + id + '"] path.edge-line');
    let mid = { x: 0, y: 0 };
    try { const L = line.getTotalLength(); const p = line.getPointAtLength(L / 2); mid = { x: p.x, y: p.y }; } catch (e) {}
    const scr = App.worldToScreen(mid.x, mid.y);
    let ta = document.getElementById('text-editor');
    if (!ta) { ta = document.createElement('textarea'); ta.id = 'text-editor'; document.body.appendChild(ta); }
    ta.style.display = 'block';
    ta.style.left = (scr.x - 65) + 'px';
    ta.style.top = (scr.y - 13) + 'px';
    ta.style.width = '130px';
    ta.style.height = '24px';
    ta.style.fontSize = '12px';
    ta.style.fontFamily = '';
    ta.style.textAlign = 'center';
    ta.placeholder = 'Label…';
    ta.value = ed.text || '';
    ta.focus();
    ta.select();
    function fin(commit) {
      ta.style.display = 'none';
      ta.onblur = null; ta.onkeydown = null;
      if (commit && ta.value !== (ed.text || '')) {
        ed.text = ta.value;
        App.renderEdge(ed);
        App.updateProperties();
        App.pushHistory();
      }
    }
    ta.onblur = function () { fin(true); };
    ta.onkeydown = function (e) {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fin(true); }
      else if (e.key === 'Escape') { e.preventDefault(); fin(false); }
    };
  };

  App.renderAllEdges = function () {
    App.dom.layerEdges.textContent = '';
    App.edges.forEach(App.renderEdge);
  };

  App.refreshConnectedEdges = function (nodeId) {
    App.edges.forEach(e => { if (e.source === nodeId || e.target === nodeId) App.renderEdge(e); });
  };

  /* ---------------- interactive edge creation ---------------- */
  function startEdgeCreate(node, side, downEvt) {
    const start = App.anchorWorld(node, side);
    const tmp = App.make('path', { class: 'tmp-edge', fill: 'none', 'marker-end': 'url(#arrow)' }, App.dom.layerTmp);

    function nodeUnder(ev) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const g = el && el.closest ? el.closest('g.node') : null;
      return g && g.getAttribute('data-id') !== node.id ? g : null;
    }
    const draw = App.rafThrottle(function (cx, cy) {
      const p = App.screenToWorld(cx, cy);
      tmp.setAttribute('d', 'M ' + start.x + ' ' + start.y + ' L ' + p.x + ' ' + p.y);
      $('.node.drop-target').removeClass('drop-target');
      const g = nodeUnder({ clientX: cx, clientY: cy });
      if (g) g.classList.add('drop-target');
    });
    function mm(ev) { draw(ev.clientX, ev.clientY); }
    function mu(ev) {
      $(document).off('mousemove.edge', mm).off('mouseup.edge', mu);
      draw.cancel();
      tmp.remove();
      $('.node.drop-target').removeClass('drop-target');
      const g = nodeUnder(ev);
      if (g) {
        const target = App.getNode(g.getAttribute('data-id'));
        const p = App.screenToWorld(ev.clientX, ev.clientY);
        App.createEdge(node.id, target.id, side, bestSide(target, p));
        App.pushHistory();
      }
    }
    $(document).on('mousemove.edge', mm).on('mouseup.edge', mu);
    if (downEvt) downEvt.preventDefault();
  }
  App.startEdgeCreate = startEdgeCreate;

  App.initConnectors = function () {
    // drag from a connection point of the selected node
    $(App.dom.layerOverlay).on('mousedown', '.conn-point', function (e) {
      e.stopPropagation();
      const n = App.getNode(this.getAttribute('data-id'));
      if (n) startEdgeCreate(n, this.getAttribute('data-side'), e);
    });

    // connector tool: drag from anywhere on a node
    $(App.dom.layerNodes).on('mousedown', 'g.node', function (e) {
      if (App.tool !== 'connector' || e.button !== 0) return;
      e.stopPropagation();
      const n = App.getNode(this.getAttribute('data-id'));
      const w = App.screenToWorld(e.clientX, e.clientY);
      startEdgeCreate(n, bestSide(n, w), e);
    });
  };
})();

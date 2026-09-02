/* ============================================================
   shapeeditor.js — "New Shape" mini editor
   Draw a polygon on a pad (click to add points, drag to move),
   or start from a template, then save it into the Custom library.
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;
  const SNAP = 2.5;                       // pad units to snap to (pad is 0..100)

  let pts = [];                           // [[x,y], …] in 0..100 pad space
  let drag = null;                        // index of the point being dragged
  let pad = null;

  function poly(n, cx, cy, rx, ry, rot) {
    const P = [];
    for (let k = 0; k < n; k++) {
      const a = (rot || -Math.PI / 2) + k * 2 * Math.PI / n;
      P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return P;
  }
  const TEMPLATES = {
    triangle: [[50, 15], [85, 85], [15, 85]],
    diamond: [[50, 12], [88, 50], [50, 88], [12, 50]],
    pentagon: poly(5, 50, 52, 38, 38),
    hexagon: [[30, 15], [70, 15], [88, 50], [70, 85], [30, 85], [12, 50]],
    chevron: [[15, 15], [55, 15], [85, 50], [55, 85], [15, 85], [43, 50]],
    star: (function () {
      const P = [];
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 16 : 40, a = -Math.PI / 2 + k * Math.PI / 5;
        P.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
      }
      return P.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
    })()
  };

  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  function snap(v) { return Math.round(v / SNAP) * SNAP; }

  function padPoint(e) {
    const r = pad.getBoundingClientRect();
    return {
      x: clamp(snap((e.clientX - r.left) / r.width * 100)),
      y: clamp(snap((e.clientY - r.top) / r.height * 100))
    };
  }

  function draw() {
    pad.textContent = '';
    const NS = App.SVGNS;
    // grid
    for (let i = 10; i < 100; i += 10) {
      App.make('line', { x1: i, y1: 0, x2: i, y2: 100, stroke: '#ededed', 'stroke-width': 0.5 }, pad);
      App.make('line', { x1: 0, y1: i, x2: 100, y2: i, stroke: '#ededed', 'stroke-width': 0.5 }, pad);
    }
    const fill = $('#ns-fill').val() || '#dae8fc';
    const stroke = $('#ns-stroke').val() || '#6c8ebf';
    if (pts.length >= 3) {
      App.make('polygon', { points: pts.map(p => p[0] + ',' + p[1]).join(' '), fill: fill, stroke: stroke, 'stroke-width': 1.4, 'fill-opacity': 0.85 }, pad);
    } else if (pts.length === 2) {
      App.make('line', { x1: pts[0][0], y1: pts[0][1], x2: pts[1][0], y2: pts[1][1], stroke: stroke, 'stroke-width': 1.4 }, pad);
    }
    pts.forEach((p, i) => {
      App.make('circle', { class: 'ns-vert', 'data-idx': i, cx: p[0], cy: p[1], r: 2.6 }, pad);
    });
    $('#ns-count').text(pts.length + ' point' + (pts.length === 1 ? '' : 's'));
  }

  function open() {
    pts = TEMPLATES.diamond.map(p => p.slice());
    $('#ns-name').val('');
    $('#ns-fill').val('#dae8fc');
    $('#ns-stroke').val('#6c8ebf');
    $('#modal-newshape').addClass('show');
    draw();
    setTimeout(() => $('#ns-name').trigger('focus'), 30);
  }
  App.openNewShapeModal = open;

  function save() {
    const name = ($('#ns-name').val() || '').trim();
    if (!name) { App.toast('Give the shape a name'); $('#ns-name').trigger('focus'); return; }
    if (pts.length < 3) { App.toast('Add at least 3 points'); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(p => { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); });
    const bw = maxX - minX, bh = maxY - minY;
    if (bw < 2 || bh < 2) { App.toast('Shape is too thin — spread the points out'); return; }
    const norm = pts.map(p => [(p[0] - minX) / bw, (p[1] - minY) / bh]);
    const w = 120;
    const def = {
      id: App.uid('custom'),
      name: name,
      baseType: 'polygon',
      width: w,
      height: Math.max(30, Math.round(w * bh / bw)),
      points: norm,
      style: {
        fill: $('#ns-fill').val() || '#dae8fc',
        stroke: $('#ns-stroke').val() || '#6c8ebf',
        strokeWidth: 2, dashed: false, cornerRadius: 0, opacity: 1
      }
    };
    App.addCustomShape(def);
    $('#modal-newshape').removeClass('show');
    App.updateProperties();
    App.toast('Added "' + name + '" to the Custom shapes');
  }

  App.initShapeEditor = function () {
    pad = document.getElementById('ns-pad');
    if (!pad) return;

    $(pad).on('mousedown', function (e) {
      e.preventDefault();
      const t = e.target;
      if (t && t.classList && t.classList.contains('ns-vert')) {
        drag = +t.getAttribute('data-idx');
        return;
      }
      const p = padPoint(e);
      pts.push([p.x, p.y]);
      draw();
    });
    $(document).on('mousemove.nsed', function (e) {
      if (drag === null || !$('#modal-newshape').hasClass('show')) return;
      const p = padPoint(e);
      pts[drag] = [p.x, p.y];
      draw();
    }).on('mouseup.nsed', function () { drag = null; });

    // right-click a vertex to delete it
    $(pad).on('contextmenu', function (e) {
      e.preventDefault();
      const t = e.target;
      if (t && t.classList && t.classList.contains('ns-vert')) {
        pts.splice(+t.getAttribute('data-idx'), 1);
        draw();
      }
    });

    $('#ns-templates').on('click', '[data-tpl]', function () {
      pts = (TEMPLATES[$(this).data('tpl')] || []).map(p => p.slice());
      draw();
    });
    $('#ns-undo').on('click', function () { pts.pop(); draw(); });
    $('#ns-clear').on('click', function () { pts = []; draw(); });
    $('#ns-fill, #ns-stroke').on('input', draw);
    $('#ns-cancel').on('click', function () { $('#modal-newshape').removeClass('show'); });
    $('#ns-save').on('click', save);
    $('#ns-name').on('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { e.preventDefault(); $('#modal-newshape').removeClass('show'); }
    });

    $('#new-shape-btn').on('click', open);
  };
})();

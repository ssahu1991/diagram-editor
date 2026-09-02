/* ============================================================
   shapes.js — EVERY shape & icon lives in this one file
   ------------------------------------------------------------
   • To ADD a shape/icon  : add an object to  App.SHAPES  below.
   • To REMOVE one         : delete its object.
   • To tweak a built-in   : edit the tables further down.
   Nothing else in the codebase needs changing — the palette
   tile, the "Type" picker, resize/rotate/connect/style, and
   JSON export/import are all wired up from what's here.

   ── App.SHAPES entry kinds ────────────────────────────────
   1) ICON  (an SVG drawing)
        type:   'path'
        viewBox:[srcW, srcH]        the artwork's own coord space
        path:   'M.. .. z'          one string; sub-paths punch holes
   2) POLYGON  (straight-sided; also reshapeable via "Edit Points")
        type:   'polygon'
        points: [[x,y], …]          FRACTIONS of width/height (0..1)

   ── common fields ─────────────────────────────────────────
        key      unique id  (also stored in .json — keep it stable)
        label    name shown in the library / Type picker
        category library group heading  (default: "My Shapes")
        width/height   default size on the canvas
        style    optional { fill, stroke, strokeWidth, … } defaults
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  /* ==========================================================
     1)  YOUR SHAPES & ICONS  — edit this array
     ========================================================== */
  App.SHAPES = [

    /* ---------------- ICONS (SVG paths) ---------------- */
    {
      key: 'fuelPump', label: 'Fuel Pump', category: 'Icons',type: 'path', width: 92, height: 102,viewBox: [110.9, 122.88],
      style: { fill: '#eef1f5' },
      path: 'M99.06,20.2c0.27,0.13,0.51,0.3,0.74,0.52c0.06,0.06,0.11,0.12,0.16,0.18c2.89,2.29,5.78,4.88,7.88,8 c2.32,3.45,3.61,7.44,2.83,12.17c-0.33,1.98-1.08,3.71-2.22,5.24c-0.82,1.09-1.82,2.05-3,2.89c-0.06,1.53-0.08,3.03-0.08,4.52 c0.01,1.91,0.07,3.88,0.18,5.9c0.25,4.74,0.96,9.52,1.67,14.26c0.76,5.1,1.52,10.16,1.72,15.43c0.27,6.75-0.53,12.3-2.76,16.22 c-2.48,4.38-6.51,6.72-12.45,6.51v0c-7.09-0.13-11.45-4.11-13.42-11.46c-1.72-6.43-1.46-15.61,0.49-27.16 c-0.06-9.15-1.25-16.08-3.61-20.75c-1.54-3.05-3.63-5.07-6.27-6.03v59.91c0.86,0.41,1.64,0.97,2.3,1.64 c1.52,1.52,2.47,3.63,2.47,5.95v5.98c0,1.51-1.23,2.74-2.74,2.74H2.74c-1.51,0-2.74-1.23-2.74-2.74v-5.98 c0-2.32,0.95-4.42,2.47-5.95c0.47-0.47,1-0.89,1.57-1.24V14.52c0-4,1.63-7.63,4.26-10.26C10.93,1.63,14.56,0,18.56,0h37.78 C60.35,0,64,1.64,66.64,4.28c2.64,2.64,4.28,6.29,4.28,10.31v26.36c4.86,1.06,8.57,4.17,11.15,9.27 c2.77,5.47,4.15,13.31,4.19,23.46c0,0.16-0.01,0.32-0.04,0.47l0.01,0c-1.85,10.87-2.15,19.35-0.63,25.02 c1.27,4.77,3.95,7.35,8.24,7.41l0.05,0v0c3.66,0.12,6.09-1.22,7.52-3.75c1.69-2.98,2.28-7.55,2.05-13.31 c-0.19-4.88-0.94-9.85-1.68-14.85c-0.72-4.82-1.44-9.68-1.71-14.78c-0.11-2.01-0.17-4.06-0.18-6.18c-0.01-1.68,0.02-3.34,0.09-4.97 c-5.11-4.48-8.22-8.96-9.18-13.42c-0.91-4.23,0.05-8.29,3-12.17c-2.25-1.54-4.54-2.8-6.86-3.81c-3.17-1.38-6.43-2.31-9.75-2.85 c-1.49-0.24-2.5-1.65-2.26-3.14c0.24-1.49,1.65-2.5,3.14-2.26c3.76,0.61,7.45,1.66,11.06,3.23C92.54,15.82,95.85,17.75,99.06,20.2 L99.06,20.2z M65.44,44.23c-0.12-0.34-0.18-0.7-0.15-1.08c0.02-0.27,0.07-0.52,0.15-0.76v-27.8c0-2.5-1.03-4.78-2.68-6.43 c-1.65-1.65-3.93-2.68-6.43-2.68H18.56c-2.48,0-4.74,1.02-6.38,2.66c-1.64,1.64-2.66,3.9-2.66,6.38v91.22h55.92V44.23L65.44,44.23z M68.42,111.46c-0.08,0.01-0.15,0.01-0.23,0.01H7.26c-0.34,0.15-0.65,0.36-0.91,0.62c-0.53,0.53-0.86,1.26-0.86,2.07v3.24h64.73 v-3.24c0-0.8-0.33-1.53-0.86-2.07C69.09,111.82,68.77,111.61,68.42,111.46L68.42,111.46z M23.04,13.74h29.44 c1.53,0,2.92,0.62,3.92,1.63c0.07,0.07,0.14,0.14,0.2,0.22c0.89,0.99,1.43,2.29,1.43,3.7v18.78c0,1.53-0.62,2.92-1.63,3.92 c-1,1-2.39,1.63-3.92,1.63H23.04c-1.52,0-2.9-0.63-3.91-1.63l-0.01,0.01c-1-1-1.63-2.39-1.63-3.92V19.29 c0-1.53,0.62-2.92,1.63-3.92c0.07-0.07,0.14-0.14,0.22-0.2C20.33,14.28,21.63,13.74,23.04,13.74L23.04,13.74z M52.48,19.22H23.04 c-0.01,0-0.02,0-0.02,0L23,19.24c-0.01,0.01-0.02,0.03-0.02,0.04v18.78c0,0.01,0.01,0.03,0.02,0.04L23,38.12L23,38.12 c0.01,0.01,0.02,0.01,0.04,0.01h29.44c0.01,0,0.03-0.01,0.04-0.02c0.01-0.01,0.02-0.03,0.02-0.04V19.29c0-0.01,0-0.02,0-0.02 l-0.02-0.02C52.51,19.23,52.5,19.22,52.48,19.22L52.48,19.22z M98.15,26.5c-1.91,2.56-2.55,5.12-1.99,7.7 c0.67,3.12,3,6.44,6.88,9.95c0.39-0.35,0.74-0.72,1.03-1.11c0.61-0.81,1.02-1.76,1.19-2.84c0.52-3.16-0.37-5.87-1.97-8.25 C101.97,29.97,100.13,28.16,98.15,26.5L98.15,26.5z'
    },

    /* ---------------- CUSTOM POLYGON SHAPES ---------------- */
    {
      key: 'trapezoid', label: 'Trapezoid', category: 'My Shapes', type: 'polygon',
      width: 130, height: 70,
      points: [[0.22, 0], [0.78, 0], [1, 1], [0, 1]]
    },
    {
      key: 'parallelogram2', label: 'Parallelogram', category: 'My Shapes', type: 'polygon',
      width: 130, height: 70,
      points: [[0.22, 0], [1, 0], [0.78, 1], [0, 1]]
    },
    {
      key: 'cross', label: 'Cross', category: 'My Shapes', type: 'polygon',
      width: 90, height: 90,
      points: [
        [0.34, 0], [0.66, 0], [0.66, 0.34], [1, 0.34], [1, 0.66], [0.66, 0.66],
        [0.66, 1], [0.34, 1], [0.34, 0.66], [0, 0.66], [0, 0.34], [0.34, 0.34]
      ]
    },
    {
      key: 'chevronRight', label: 'Chevron', category: 'My Shapes', type: 'polygon',
      width: 120, height: 70,
      points: [[0, 0], [0.7, 0], [1, 0.5], [0.7, 1], [0, 1], [0.3, 0.5]]
    }
  ];


  /* ==========================================================
     2)  BUILT-IN SHAPE TABLES  (edit sizes / labels if you like)
     ========================================================== */

  App.shapeDefaults = {
    width: 120,
    height: 60,
    style: {
      fill: '#ffffff', stroke: '#33373d', strokeWidth: 2, opacity: 1,
      dashed: false, cornerRadius: 8,
      fontSize: 14, fontFamily: 'Helvetica, Arial, sans-serif',
      fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none',
      textAlign: 'center', verticalAlign: 'middle', textColor: '#23272e'
    }
  };

  App.shapeLabels = {
    rectangle: 'Rectangle', roundrect: 'Rounded Rect', circle: 'Circle', ellipse: 'Ellipse',
    diamond: 'Diamond', triangle: 'Triangle', hexagon: 'Hexagon', star: 'Star', polygon: 'Polygon',
    text: 'Text', line: 'Line',
    arrow: 'Arrow', arrow2: 'Bidirectional Arrow', dashedArrow: 'Dashed Arrow',
    blockArrow: 'Block Arrow', blockArrowLeft: 'Block Arrow Left', blockArrowBi: 'Double Block Arrow',
    process: 'Process', decision: 'Decision', terminator: 'Start / End', io: 'Input / Output',
    document: 'Document', database: 'Database', predefined: 'Predefined Process'
  };

  // per-type size / default-text / style overrides
  App.shapeTypes = {
    rectangle: {},
    roundrect: {},
    circle: { width: 90, height: 90 },
    ellipse: { width: 130, height: 80 },
    diamond: { width: 120, height: 80 },
    triangle: { width: 110, height: 90 },
    hexagon: { width: 130, height: 70 },
    star: { width: 90, height: 90 },
    polygon: { width: 120, height: 90 },   // free polygon — outline lives in node.points
    text: { width: 100, height: 40, text: 'Text', style: { fill: 'none', stroke: 'none', strokeWidth: 0 } },
    line: { width: 130, height: 2, text: '', style: { fill: 'none' } },

    arrow: { width: 130, height: 2, text: '', style: { fill: 'none' } },
    arrow2: { width: 130, height: 2, text: '', style: { fill: 'none' } },
    dashedArrow: { width: 130, height: 2, text: '', style: { fill: 'none', dashed: true } },
    blockArrow: { width: 140, height: 56, text: '' },
    blockArrowLeft: { width: 140, height: 56, text: '' },
    blockArrowBi: { width: 150, height: 56, text: '' },

    process: { text: 'Process' },
    decision: { width: 130, height: 90, text: 'Decision' },
    terminator: { width: 130, height: 50, text: 'Start' },
    io: { text: 'Input / Output' },
    document: { text: 'Document' },
    database: { width: 100, height: 90, text: 'Database', textPos: 'below' },
    predefined: { text: 'Process' }
  };

  App.paletteCategories = [
    { name: 'General', items: ['rectangle', 'roundrect', 'circle', 'ellipse', 'diamond', 'triangle', 'hexagon', 'star', 'polygon', 'text', 'line'] },
    { name: 'Arrows', items: ['arrow', 'arrow2', 'dashedArrow', 'blockArrow', 'blockArrowLeft', 'blockArrowBi'] },
    { name: 'Flowchart', items: ['process', 'decision', 'terminator', 'io', 'document', 'database', 'predefined'] }
  ];

  // shape types whose outline is a plain polygon and can be reshaped point-by-point
  App.POLYGON_TYPES = ['polygon', 'diamond', 'decision', 'triangle', 'hexagon', 'star', 'io', 'blockArrow', 'blockArrowLeft', 'blockArrowBi'];


  /* ==========================================================
     3)  ENGINE  — merges App.SHAPES into the tables above and
         draws every shape. You rarely need to touch this.
     ========================================================== */

  // fold each App.SHAPES entry into shapeLabels / shapeTypes / paletteCategories / POLYGON_TYPES
  (function registerUserShapes() {
    const cats = {};
    (App.SHAPES || []).forEach(function (d) {
      if (!d || !d.key) return;
      App.shapeLabels[d.key] = d.label || d.key;
      const t = { width: d.width || 100, height: d.height || 80, text: '', style: d.style || {} };
      if (d.type === 'polygon' && d.points) {
        t.points = d.points;
        if (App.POLYGON_TYPES.indexOf(d.key) < 0) App.POLYGON_TYPES.push(d.key);
      } else {                          // 'path' (default) -> SVG icon
        t.path = d.path;
        t.viewBox = d.viewBox || [t.width, t.height];
      }
      App.shapeTypes[d.key] = t;
      const cat = d.category || 'My Shapes';
      (cats[cat] = cats[cat] || []).push(d.key);
    });
    Object.keys(cats).forEach(function (name) {
      App.paletteCategories.push({ name: name, items: cats[name] });
    });
  })();

  // the default (formula-driven) outline for a polygon type at a given size, in local px
  App.shapeDefaultPoints = function (type, w, h) {
    const reg = App.shapeTypes[type];
    if (reg && reg.points) return reg.points.map(p => [p[0] * w, p[1] * h]);   // App.SHAPES polygons
    switch (type) {
      case 'polygon': {           // fallback outline when a free polygon has no points yet
        const cx = w / 2, cy = h / 2, P = [];
        for (let k = 0; k < 5; k++) {
          const A = -Math.PI / 2 + k * 2 * Math.PI / 5;
          P.push([cx + (w / 2) * Math.cos(A), cy + (h / 2) * Math.sin(A)]);
        }
        return P;
      }
      case 'diamond':
      case 'decision':
        return [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
      case 'triangle':
        return [[w / 2, 0], [w, h], [0, h]];
      case 'hexagon': {
        const i = Math.min(w * 0.25, h * 0.5);
        return [[i, 0], [w - i, 0], [w, h / 2], [w - i, h], [i, h], [0, h / 2]];
      }
      case 'star': {
        const cx = w / 2, cy = h / 2, or = Math.min(w, h) / 2, ir = or * 0.4, P = [];
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? ir : or, a = -Math.PI / 2 + k * Math.PI / 5;
          P.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        return P;
      }
      case 'io':
        return [[w * 0.22, 0], [w, 0], [w * 0.78, h], [0, h]];
      case 'blockArrow': {
        const hh = h * 0.32;
        return [[0, h / 2 - hh], [w * 0.6, h / 2 - hh], [w * 0.6, 0], [w, h / 2],
          [w * 0.6, h], [w * 0.6, h / 2 + hh], [0, h / 2 + hh]];
      }
      case 'blockArrowLeft': {
        const hh = h * 0.32;
        return [[w, h / 2 - hh], [w * 0.4, h / 2 - hh], [w * 0.4, 0], [0, h / 2],
          [w * 0.4, h], [w * 0.4, h / 2 + hh], [w, h / 2 + hh]];
      }
      case 'blockArrowBi': {
        const hh = h * 0.28;
        return [[0, h / 2], [w * 0.18, 0], [w * 0.18, h / 2 - hh], [w * 0.82, h / 2 - hh], [w * 0.82, 0],
          [w, h / 2], [w * 0.82, h], [w * 0.82, h / 2 + hh], [w * 0.18, h / 2 + hh], [w * 0.18, h]];
      }
      default:
        return null; // not a polygon type
    }
  };

  /* ---------------- geometry: draw a shape into group <g> ---------------- */
  function pts(arr) { return arr.map(p => p[0] + ',' + p[1]).join(' '); }

  App.appendShapeGeometry = function (g, n) {
    const w = n.width, h = n.height, s = n.style;
    const base = {
      class: 'shape',
      fill: s.fill,
      stroke: s.stroke,
      'stroke-width': s.strokeWidth,
      'stroke-dasharray': s.dashed ? '6 4' : null
    };
    const detail = { class: 'shape-detail', fill: 'none', stroke: s.stroke, 'stroke-width': Math.min(s.strokeWidth, 1.5) };
    const M = App.make;
    const type = App.effectiveType(n);   // custom shapes draw using their base type's geometry

    // ── App.SHAPES entries draw generically from their definition ──
    const def = App.shapeTypes[type];
    if (def && def.path) {   // SVG-path icon: scale the path into the node box
      const vb = def.viewBox || [w, h];
      const gg = M('g', { transform: 'scale(' + (w / vb[0]) + ' ' + (h / vb[1]) + ')' }, g);
      M('path', {
        class: 'shape', d: def.path,
        fill: s.fill, stroke: s.stroke, 'stroke-width': s.strokeWidth,
        'fill-rule': 'evenodd', 'vector-effect': 'non-scaling-stroke',
        'stroke-dasharray': s.dashed ? '6 4' : null,
        'fill-opacity': s.opacity
      }, gg);
      return;
    }
    if (def && def.points) {   // custom polygon: point list (or reshaped node.points)
      M('polygon', Object.assign({ points: pts(App.polygonPoints(n)) }, base), g);
      return;
    }

    // ── built-in vocabulary ──
    switch (type) {
      case 'rectangle':
      case 'process':
        M('rect', Object.assign({ x: 0, y: 0, width: w, height: h }, base), g); break;

      case 'roundrect':
        M('rect', Object.assign({ x: 0, y: 0, width: w, height: h, rx: s.cornerRadius, ry: s.cornerRadius }, base), g); break;

      case 'circle':
      case 'ellipse':
        M('ellipse', Object.assign({ cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2 }, base), g); break;

      // plain-polygon shapes: use this node's own points if reshaped, else the type's formula
      case 'polygon':
      case 'diamond':
      case 'decision':
      case 'triangle':
      case 'hexagon':
      case 'star':
      case 'io':
      case 'blockArrow':
      case 'blockArrowLeft':
      case 'blockArrowBi':
        M('polygon', Object.assign({ points: pts(App.polygonPoints(n)) }, base), g); break;

      case 'text':
        break; // text only

      case 'line':
        M('line', Object.assign({ x1: 0, y1: h / 2, x2: w, y2: h / 2 }, base), g); break;

      case 'arrow':
      case 'dashedArrow':
        M('line', Object.assign({ x1: 0, y1: h / 2, x2: w, y2: h / 2, 'marker-end': 'url(#arrow)' }, base), g); break;

      case 'arrow2':
        M('line', Object.assign({ x1: 0, y1: h / 2, x2: w, y2: h / 2, 'marker-start': 'url(#arrow)', 'marker-end': 'url(#arrow)' }, base), g); break;

      case 'terminator':
        M('rect', Object.assign({ x: 0, y: 0, width: w, height: h, rx: h / 2, ry: h / 2 }, base), g); break;

      case 'document':
        M('path', Object.assign({
          d: 'M0,0 H' + w + ' V' + (h * 0.82) +
             ' C' + (w * 0.72) + ',' + (h * 1.06) + ' ' + (w * 0.28) + ',' + (h * 0.6) + ' 0,' + (h * 0.86) + ' Z'
        }, base), g);
        break;

      case 'database': {
        const ry = Math.min(h * 0.16, 14);
        M('path', Object.assign({
          d: 'M0,' + ry + ' C0,' + (-ry * 0.5) + ' ' + w + ',' + (-ry * 0.5) + ' ' + w + ',' + ry +
             ' L' + w + ',' + (h - ry) + ' C' + w + ',' + (h + ry * 0.5) + ' 0,' + (h + ry * 0.5) + ' 0,' + (h - ry) + ' Z'
        }, base), g);
        M('path', Object.assign({}, detail, { d: 'M0,' + ry + ' C0,' + (ry * 2.5) + ' ' + w + ',' + (ry * 2.5) + ' ' + w + ',' + ry }), g);
        break;
      }
      case 'predefined':
        M('rect', Object.assign({ x: 0, y: 0, width: w, height: h }, base), g);
        M('line', Object.assign({}, detail, { x1: 9, y1: 0, x2: 9, y2: h }), g);
        M('line', Object.assign({}, detail, { x1: w - 9, y1: 0, x2: w - 9, y2: h }), g);
        break;

      default:
        M('rect', Object.assign({ x: 0, y: 0, width: w, height: h }, base), g);
    }
  };
})();

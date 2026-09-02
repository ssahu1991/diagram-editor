/* ============================================================
   nodes.js — node data, rendering, text editing, the shape palette
   (WHAT shapes exist and HOW they're drawn lives in js/shapes.js)
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  /* ---------------- shape / custom-shape resolution ---------------- */
  // custom shapes (from the "New Shape" editor / "Save as Custom Shape")
  App.findCustomShape = function (type) {
    return App.customShapes && App.customShapes.filter(c => c.id === type)[0];
  };

  // the type whose geometry should actually be drawn (custom -> its base type)
  App.effectiveType = function (n) {
    const c = App.findCustomShape(n.type);
    return c ? c.baseType : n.type;
  };

  // this node's outline in local px: its own saved points if reshaped, else the base formula
  App.polygonPoints = function (n) {
    if (n.points && n.points.length >= 3) {
      return n.points.map(p => [p[0] * n.width, p[1] * n.height]);
    }
    return App.shapeDefaultPoints(App.effectiveType(n), n.width, n.height) || [];
  };

  // display label for any built-in / App.SHAPES / custom shape id
  App.shapeLabel = function (type) {
    const c = App.findCustomShape(type);
    return (c && c.name) || App.shapeLabels[type] || type;
  };

  /* ---------------- node data factory ---------------- */
  App.makeNodeData = function (type, x, y) {
    const d = App.shapeDefaults;
    const custom = App.findCustomShape(type);
    if (custom) {
      const base = App.shapeTypes[custom.baseType] || {};
      return {
        id: App.uid('node'),
        type: type,
        x: x, y: y,
        width: custom.width || base.width || d.width,
        height: custom.height || base.height || d.height,
        rotation: 0,
        text: '',
        groupId: null,
        points: custom.points ? App.clone(custom.points) : null,
        style: Object.assign({}, d.style, custom.style || {})
      };
    }
    const o = App.shapeTypes[type] || {};
    return {
      id: App.uid('node'),
      type: type,
      x: x, y: y,
      width: o.width || d.width,
      height: o.height || d.height,
      rotation: 0,
      text: ('text' in o) ? o.text : '',
      groupId: null,
      points: o.points ? App.clone(o.points) : null,   // App.SHAPES polygon shapes carry an outline
      style: Object.assign({}, d.style, o.style || {})
    };
  };

  /* ---------------- custom-shape library ---------------- */
  // capture the current node's outline / size / style as a new reusable library shape
  App.saveCustomShape = function (n, name) {
    const baseType = App.effectiveType(n);
    const def = {
      id: App.uid('custom'),
      name: (name || 'Custom Shape').trim() || 'Custom Shape',
      baseType: baseType,
      width: n.width,
      height: n.height,
      points: n.points ? App.clone(n.points) : null,
      style: {
        fill: n.style.fill, stroke: n.style.stroke, strokeWidth: n.style.strokeWidth,
        dashed: n.style.dashed, cornerRadius: n.style.cornerRadius, opacity: n.style.opacity
      }
    };
    App.customShapes.push(def);
    App.saveCustomShapes();
    App.buildShapePalette();
    return def;
  };

  App.removeCustomShape = function (id) {
    App.customShapes = App.customShapes.filter(c => c.id !== id);
    App.saveCustomShapes();
    App.buildShapePalette();
  };

  // add a fully-formed custom-shape definition (used by the "New Shape" editor)
  App.addCustomShape = function (def) {
    if (!def.id) def.id = App.uid('custom');
    App.customShapes.push(def);
    App.saveCustomShapes();
    App.buildShapePalette();
    return def;
  };

  App.createNode = function (type, wx, wy, doSelect, silent) {
    const n = App.makeNodeData(type, 0, 0);
    n.x = App.snap(wx - n.width / 2);
    n.y = App.snap(wy - n.height / 2);
    App.nodes.push(n);
    const g = App.renderNode(n);
    if (g && !App.reducedMotion()) {
      g.classList.add('node-enter');
      g.addEventListener('animationend', function h() {
        g.classList.remove('node-enter'); g.removeEventListener('animationend', h);
      });
    }
    if (doSelect !== false) {
      App.select([n.id]);
      App.updateProperties();
    }
    if (!silent) App.pushHistory();
    return n;
  };

  /* ---------------- text ---------------- */
  // display-only greedy word wrap; the stored node.text keeps the user's own line breaks
  function wrapText(text, maxChars) {
    const out = [];
    String(text).split('\n').forEach(para => {
      if (maxChars < 1 || para.length <= maxChars) { out.push(para); return; }
      let cur = '';
      para.split(' ').forEach(w => {
        while (w.length > maxChars) {
          if (cur) { out.push(cur); cur = ''; }
          out.push(w.slice(0, maxChars));
          w = w.slice(maxChars);
        }
        if (!cur) cur = w;
        else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
        else { out.push(cur); cur = w; }
      });
      out.push(cur);
    });
    return out.length ? out : [''];
  }

  App.appendNodeText = function (g, n) {
    const s = n.style;
    const txt = String(n.text == null ? '' : n.text);
    if (txt === '') return;
    const et = App.effectiveType(n);
    const below = App.shapeTypes[et] && App.shapeTypes[et].textPos === 'below';
    const fs = s.fontSize;
    const lh = fs * 1.25;
    const maxChars = Math.max(1, Math.floor((n.width - 12) / (fs * 0.58)));
    const lines = below ? txt.split('\n') : wrapText(txt, maxChars);

    let anchor = 'middle', tx = n.width / 2;
    if (s.textAlign === 'left') { anchor = 'start'; tx = 6; }
    else if (s.textAlign === 'right') { anchor = 'end'; tx = n.width - 6; }

    let cy;
    if (below) cy = n.height + fs + 2;
    else if (s.verticalAlign === 'top') cy = fs * 0.9 + 5;
    else if (s.verticalAlign === 'bottom') cy = n.height - (lines.length - 1) * lh - 5;
    else cy = n.height / 2 - (lines.length - 1) * lh / 2;

    const t = App.make('text', {
      class: 'node-text', x: tx, y: cy,
      'text-anchor': anchor, 'dominant-baseline': 'middle',
      fill: s.textColor || '#23272e',
      'font-size': fs, 'font-family': s.fontFamily,
      'font-weight': s.fontWeight, 'font-style': s.fontStyle,
      'text-decoration': s.textDecoration
    }, g);
    lines.forEach((ln, i) => {
      App.make('tspan', { x: tx, dy: i === 0 ? 0 : lh }, t).textContent = ln === '' ? ' ' : ln;
    });
  };

  /* ---------------- render one / all ---------------- */
  App.nodeTransform = function (n) {
    return 'translate(' + n.x + ' ' + n.y + ') rotate(' + (n.rotation || 0) +
      ' ' + n.width / 2 + ' ' + n.height / 2 + ')';
  };

  App.renderNode = function (n) {
    let g = App.dom.layerNodes.querySelector('g.node[data-id="' + n.id + '"]');
    if (g) { g.textContent = ''; }
    else { g = App.make('g', { class: 'node', 'data-id': n.id }, App.dom.layerNodes); }
    g.setAttribute('data-type', n.type);
    g.setAttribute('transform', App.nodeTransform(n));
    g.style.opacity = n.style.opacity;
    g.classList.toggle('selected', App.selectedNodes.indexOf(n.id) >= 0);

    const hitH = Math.max(n.height, 14);
    App.make('rect', {
      class: 'node-hit', x: 0, y: (n.height - hitH) / 2,
      width: Math.max(n.width, 8), height: hitH, fill: 'transparent'
    }, g);

    App.appendShapeGeometry(g, n);   // defined in js/shapes.js
    App.appendNodeText(g, n);
    return g;
  };

  App.updateNodeTransform = function (n) {
    const g = App.dom.layerNodes.querySelector('g.node[data-id="' + n.id + '"]');
    if (g) g.setAttribute('transform', App.nodeTransform(n));
  };

  App.renderAllNodes = function () {
    App.dom.layerNodes.textContent = '';
    App.nodes.forEach(App.renderNode);
  };

  // leave a fading clone of each doomed shape behind while the real ones are removed
  App.flyOutNodes = function (ids) {
    if (App.reducedMotion() || !ids || !ids.length) return;
    ids.forEach(function (id) {
      const g = App.dom.layerNodes.querySelector('g.node[data-id="' + id + '"]');
      if (!g) return;
      const ghost = g.cloneNode(true);
      ghost.removeAttribute('data-id');
      ghost.classList.add('node-leave');
      ghost.style.pointerEvents = 'none';
      App.dom.layerTmp.appendChild(ghost);
      setTimeout(function () { ghost.remove(); }, 220);
    });
  };

  /* ---------------- double-click text editor ---------------- */
  App.editNodeText = function (id) {
    const n = App.getNode(id);
    if (!n) return;
    let ta = document.getElementById('text-editor');
    if (!ta) {
      ta = document.createElement('textarea');
      ta.id = 'text-editor';
      document.body.appendChild(ta);
    }
    const s = App.settings;
    const scr = App.worldToScreen(n.x, n.y);
    ta.style.display = 'block';
    ta.style.left = scr.x + 'px';
    ta.style.top = scr.y + 'px';
    ta.style.width = Math.max(n.width * s.zoom, 40) + 'px';
    ta.style.height = Math.max(n.height * s.zoom, 24) + 'px';
    ta.style.fontSize = (n.style.fontSize * s.zoom) + 'px';
    ta.style.fontFamily = n.style.fontFamily;
    ta.style.textAlign = n.style.textAlign;
    ta.placeholder = 'Type text…';
    ta.value = n.text;
    ta.focus();
    ta.select();

    function finish(commit) {
      ta.style.display = 'none';
      ta.onblur = null; ta.onkeydown = null;
      const changed = commit && ta.value !== n.text;
      if (changed) n.text = ta.value;

      if (n.type === 'text' && !String(n.text || '').trim()) {
        // a free-floating Text shape with no content is invisible and useless — drop it
        App.nodes = App.nodes.filter(x => x.id !== n.id);
        App.selectedNodes = App.selectedNodes.filter(x => x !== n.id);
        const g = App.dom.layerNodes.querySelector('g.node[data-id="' + n.id + '"]');
        if (g) g.remove();
        App.updateSelectionOverlay();
        App.updateProperties();
        App.pushHistory();
        return;
      }
      if (changed) {
        App.renderNode(n);
        App.updateProperties();
        App.pushHistory();
      }
    }
    ta.onblur = function () { finish(true); };
    ta.onkeydown = function (e) {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    };
  };

  /* ---------------- left shape palette ---------------- */
  App.shapeThumb = function (type) {
    const svg = App.make('svg', { class: 'thumb', viewBox: '-2 -2 36 28' });
    const n = App.makeNodeData(type, 0, 0);
    n.width = 30; n.height = 20; n.text = '';
    const et = App.effectiveType(n);
    const isIcon = !!(App.shapeTypes[et] && App.shapeTypes[et].path);
    if (App.shapeTypes[et] && App.shapeTypes[et].textPos === 'below') n.height = 16;
    n.style = Object.assign({}, n.style, {
      strokeWidth: isIcon ? 0 : 1.4,
      fill: isIcon ? '#7b8290' : 'none',          // outline-only regular shapes; grey icons
      stroke: isIcon ? 'none' : 'currentColor'    // currentColor is themed via CSS (.shape-tile svg.thumb)
    });
    if (et === 'text') { App.make('text', { x: 15, y: 15, 'text-anchor': 'middle', 'font-size': 16, 'font-family': 'Georgia, serif', fill: 'currentColor' }, svg).textContent = 'A'; return svg; }
    App.appendShapeGeometry(svg, n);
    return svg;
  };

  function paletteDrag($tile, type) {
    $tile.on('mousedown', function (e) {
      e.preventDefault();
      const $ghost = $('<div class="drag-ghost"></div>').text(App.shapeLabel(type)).appendTo('body');
      function move(ev) { $ghost.css({ left: ev.clientX + 10, top: ev.clientY + 8 }); }
      move(e);
      function up(ev) {
        $(document).off('mousemove.pal', move).off('mouseup.pal', up);
        $ghost.remove();
        const r = App.dom.svg.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          const w = App.screenToWorld(ev.clientX, ev.clientY);
          App.createNode(type, w.x, w.y);
        }
      }
      $(document).on('mousemove.pal', move).on('mouseup.pal', up);
    });
    $tile.on('dblclick', function () {
      const r = App.dom.svg.getBoundingClientRect();
      const w = App.screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
      App.createNode(type, w.x, w.y);
    });
  }

  // remembered open/closed state of each library category (name -> true = open)
  const CAT_KEY = 'diagramEditor.catOpen.v1';
  function loadCatState() {
    try { return JSON.parse(localStorage.getItem(CAT_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveCatState(s) {
    try { localStorage.setItem(CAT_KEY, JSON.stringify(s)); } catch (e) {}
  }

  App.buildShapePalette = function () {
    const $list = $('#shape-list').empty();
    const cats = App.paletteCategories.slice();
    if (App.customShapes && App.customShapes.length) {
      cats.push({ name: 'Custom', custom: true, items: App.customShapes.map(c => c.id) });
    }
    const catState = loadCatState();
    cats.forEach((cat, idx) => {
      const $cat = $('<div class="shape-cat"></div>');
      // default: only the first 2 categories open; the rest collapsed (until the user chooses)
      const pref = catState[cat.name];
      const collapsed = (pref === undefined) ? (idx >= 2) : (pref === false);
      if (collapsed) $cat.addClass('collapsed');
      $('<div class="shape-cat-head"><span class="caret">▾</span><span>' + cat.name + '</span></div>')
        .appendTo($cat).on('click', function () {
          $cat.toggleClass('collapsed');
          catState[cat.name] = !$cat.hasClass('collapsed');
          saveCatState(catState);
        });
      const $grid = $('<div class="shape-grid"></div>').appendTo($cat);
      cat.items.forEach(type => {
        const label = App.shapeLabel(type);
        const $tile = $('<div class="shape-tile" data-type="' + type + '"></div>')
          .attr('title', label + ' — drag onto canvas');
        $tile.append(App.shapeThumb(type));
        $tile.append($('<span class="tl"></span>').text(label));
        if (cat.custom) {
          $('<button class="tile-remove" title="Remove custom shape">&times;</button>')
            .on('mousedown', function (e) { e.stopPropagation(); })
            .on('click', function (e) {
              e.stopPropagation();
              if (confirm('Remove custom shape "' + label + '"?')) App.removeCustomShape(type);
            })
            .appendTo($tile);
        }
        $grid.append($tile);
        paletteDrag($tile, type);
      });
      $list.append($cat);
    });

    $('#shape-search').off('input').on('input', function () {
      const q = this.value.trim().toLowerCase();
      $('.shape-tile').each(function () {
        const label = ($(this).find('.tl').text() + ' ' + $(this).data('type')).toLowerCase();
        $(this).toggleClass('hidden', q !== '' && label.indexOf(q) < 0);
      });
      $('.shape-cat').each(function () {
        $(this).toggle($(this).find('.shape-tile:not(.hidden)').length > 0);
      });
    });
  };
})();

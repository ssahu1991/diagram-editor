/* ============================================================
   properties.js — diagrams.net-style Format panel
   Tabs: Style / Text / Arrange  (+ Diagram settings when idle)
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  const FONTS = ['Helvetica', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS',
    'Georgia', 'Times New Roman', 'Courier New'];

  const PRESETS = [
    { f: '#ffffff', s: '#33373d' }, { f: '#dae8fc', s: '#6c8ebf' },
    { f: '#d5e8d4', s: '#82b366' }, { f: '#ffe6cc', s: '#d79b00' },
    { f: '#fff2cc', s: '#d6b656' }, { f: '#f8cecc', s: '#b85450' },
    { f: '#e1d5e7', s: '#9673a6' }, { f: '#f5f5f5', s: '#666666' }
  ];

  const r = Math.round;
  function toHex(v) { return (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v)) ? v : '#ffffff'; }
  function sel(a, b) { return a === b ? 'selected' : ''; }

  // grouped <option> list of every shape type this node can be switched to
  function shapeTypeOptions(current) {
    let html = '';
    App.paletteCategories.forEach(function (cat) {
      html += '<optgroup label="' + cat.name + '">';
      cat.items.forEach(function (t) {
        html += '<option value="' + t + '" ' + sel(t, current) + '>' + App.escapeHTML(App.shapeLabels[t] || t) + '</option>';
      });
      html += '</optgroup>';
    });
    if (App.customShapes && App.customShapes.length) {
      html += '<optgroup label="Custom">';
      App.customShapes.forEach(function (c) {
        html += '<option value="' + c.id + '" ' + sel(c.id, current) + '>' + App.escapeHTML(c.name) + '</option>';
      });
      html += '</optgroup>';
    }
    return html;
  }
  function isPolygonEditable(n) {
    return App.POLYGON_TYPES.indexOf(App.effectiveType(n)) >= 0;
  }

  App._propTab = 'style';
  App._secCollapsed = {};

  // remember which Format-panel sections the user has collapsed, and re-apply
  // after every rebuild (headers are keyed by their title, e.g. "Fill", "Line")
  function secKey(h) { return h.textContent.split('·')[0].trim(); }
  function applySecState() {
    document.querySelectorAll('#prop-body .prop-section').forEach(function (sec) {
      const h = sec.querySelector('.prop-h');
      if (h) sec.classList.toggle('sec-collapsed', !!App._secCollapsed[secKey(h)]);
    });
  }

  App.initProperties = function () {
    $('.fmt-tab').on('click', function () {
      App._propTab = $(this).data('tab');
      $('.fmt-tab').removeClass('active');
      $(this).addClass('active');
      App.updateProperties();
    });
    $('#prop-body').on('click', '.prop-h', function () {
      const sec = this.closest('.prop-section');
      if (sec) App._secCollapsed[secKey(this)] = sec.classList.toggle('sec-collapsed');
    });
    App.updateProperties();
  };

  App.updateProperties = function () {
    const $b = $('#prop-body');
    const $rp = $('#right-panel');
    const tab = App._propTab;

    if (!App.selectedNodes.length && !App.selectedEdges.length) {
      $rp.addClass('nosel');
      $b.html(diagramHTML());
      bindDiagram();
    } else {
      $rp.removeClass('nosel');
      if (App.selectedNodes.length) {
        const n = App.getNode(App.selectedNodes[App.selectedNodes.length - 1]);
        if (!n) return;
        const count = App.selectedNodes.length;
        if (tab === 'text') { $b.html(textTab(n, count)); bindText(n); }
        else if (tab === 'arrange') { $b.html(arrangeTab(n, count)); bindArrange(n, count); }
        else { $b.html(styleTab(n, count)); bindStyle(n); }
      } else {
        const ed = App.getEdge(App.selectedEdges[0]);
        if (!ed) return;
        if (tab === 'text') $b.html(section('Text', '<div class="prop-hint">Connectors have no text label in this build.</div>'));
        else if (tab === 'arrange') { $b.html(edgeArrange()); $('#prop-body [data-cmd]').on('click', function () { App.run($(this).data('cmd')); }); }
        else { $b.html(edgeStyle(ed)); bindEdge(ed); }
      }
    }
    applySecState();
  };

  /* ================= NODE · STYLE ================= */
  function styleTab(n, count) {
    const s = n.style;
    const swatches = PRESETS.map(p =>
      '<button class="swatch" data-fill="' + p.f + '" data-stroke="' + p.s + '" style="background:' + p.f + ';border-color:' + p.s + '"></button>'
    ).join('') +
      '<button class="swatch swatch-custom" data-custom="1" title="Custom colour…"></button>';
    const et = App.effectiveType(n);
    const rounded = (n.type === 'rectangle' || n.type === 'roundrect');
    const fillHex = s.fill === 'none' ? 'none' : toHex(s.fill);
    const strokeHex = s.stroke === 'none' ? 'none' : toHex(s.stroke);
    const editing = App.editingPointsId === n.id;
    return '' +
    section('Shape' + (count > 1 ? ' · ' + count + ' selected' : ''),
      row('<label>Type</label><select id="p-shapetype">' + shapeTypeOptions(n.type) + '</select>') +
      (isPolygonEditable(n) && count === 1 ?
        '<div class="btn-row">' +
          '<button class="mini wide ' + (editing ? 'on' : '') + '" data-cmd="editPoints">' +
            (editing ? 'Done Editing Points' : 'Edit Points') + '</button>' +
          (n.points ? '<button class="mini wide" data-cmd="resetPoints">Reset Outline</button>' : '') +
        '</div>' : '') +
      (count === 1 ? '<div class="btn-row"><button class="mini wide" data-cmd="saveCustomShape">Save as Custom Shape…</button></div>' : '')) +

    section('Preset' + (count > 1 ? ' · ' + count + ' selected' : ''),
      '<div class="btn-row preset-row">' + swatches + '</div>') +

    section('Fill',
      row('<input type="checkbox" id="p-fill-on" ' + (s.fill !== 'none' ? 'checked' : '') + '>' +
          '<label>Color</label><input type="color" id="p-fill" value="' + toHex(s.fill) + '">' +
          '<input type="text" id="p-fill-hex" class="hex" maxlength="7" value="' + fillHex + '" title="Type any hex colour, e.g. #3366cc, or \'none\'">')) +

    section('Line',
      row('<input type="checkbox" id="p-line-on" ' + (s.stroke !== 'none' ? 'checked' : '') + '>' +
          '<label>Color</label><input type="color" id="p-stroke" value="' + toHex(s.stroke) + '">' +
          '<input type="text" id="p-stroke-hex" class="hex" maxlength="7" value="' + strokeHex + '" title="Type any hex colour, e.g. #333333, or \'none\'">') +
      row('<label>Width</label><input type="number" id="p-sw" min="0" step="0.5" value="' + s.strokeWidth + '">' +
          '<select id="p-dash" style="flex:0 0 92px">' +
            '<option value="solid" ' + (s.dashed ? '' : 'selected') + '>Solid</option>' +
            '<option value="dashed" ' + (s.dashed ? 'selected' : '') + '>Dashed</option></select>')) +

    section('Appearance',
      (rounded ? row('<input type="checkbox" id="p-rounded" ' + (n.type === 'roundrect' ? 'checked' : '') + '>' +
                     '<label>Rounded</label>' +
                     '<input type="range" id="p-corner" min="0" max="40" value="' + s.cornerRadius + '">' +
                     '<span id="p-corner-v">' + s.cornerRadius + '</span>') : '') +
      row('<label>Opacity</label><input type="range" id="p-op" min="0" max="1" step="0.05" value="' + s.opacity + '">' +
          '<span id="p-op-v">' + Math.round(s.opacity * 100) + '%</span>'));
  }

  function bindStyle(primary) {
    const each = fn => App.selectedNodes.forEach(id => { const nn = App.getNode(id); if (nn) fn(nn); });
    const redraw = () => {
      App.selectedNodes.forEach(id => { const nn = App.getNode(id); if (nn) { App.renderNode(nn); App.refreshConnectedEdges(id); } });
      App.updateSelectionOverlay();
    };
    const commit = () => App.pushHistory();

    // preset colour swatches
    $('#prop-body .swatch:not([data-custom])').on('click', function () {
      const f = $(this).data('fill'), st = $(this).data('stroke');
      each(n => { n.style.fill = String(f); n.style.stroke = String(st); });
      redraw(); commit(); App.updateProperties();
    });
    // "custom" swatch -> open the native colour picker for Fill
    $('#prop-body .swatch[data-custom]').on('click', function () {
      const el = document.getElementById('p-fill');
      if (el) el.click();
    });

    // apply a free-typed hex (or the word "none") from a text field
    function applyHex(pickerId, key, raw) {
      let v = String(raw).trim().toLowerCase();
      if (v === 'none' || v === '') { each(n => n.style[key] = 'none'); redraw(); return 'none'; }
      if (/^[0-9a-f]{6}$/.test(v)) v = '#' + v;
      if (/^[0-9a-f]{3}$/.test(v)) v = '#' + v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
      if (!/^#[0-9a-f]{6}$/.test(v)) return null;          // invalid -> ignore
      each(n => n.style[key] = v);
      const picker = document.getElementById(pickerId);
      if (picker) picker.value = v;
      redraw();
      return v;
    }

    $('#p-fill-on').on('change', function () {
      const on = this.checked;
      each(n => n.style.fill = on ? ($('#p-fill').val() || '#ffffff') : 'none');
      $('#p-fill-hex').val(on ? ($('#p-fill').val() || '#ffffff') : 'none');
      redraw(); commit();
    });
    $('#p-fill').on('input', function () {
      const v = this.value; each(n => n.style.fill = v);
      $('#p-fill-on').prop('checked', true); $('#p-fill-hex').val(v); redraw();
    }).on('change', commit);
    $('#p-fill-hex').on('change', function () {
      const res = applyHex('p-fill', 'fill', this.value);
      if (res === null) { this.value = toHex(primary.style.fill === 'none' ? '#ffffff' : primary.style.fill); return; }
      this.value = res;
      $('#p-fill-on').prop('checked', res !== 'none');
      commit();
    });

    $('#p-line-on').on('change', function () {
      const on = this.checked;
      each(n => n.style.stroke = on ? ($('#p-stroke').val() || '#33373d') : 'none');
      $('#p-stroke-hex').val(on ? ($('#p-stroke').val() || '#33373d') : 'none');
      redraw(); commit();
    });
    $('#p-stroke').on('input', function () {
      const v = this.value; each(n => n.style.stroke = v);
      $('#p-line-on').prop('checked', true); $('#p-stroke-hex').val(v); redraw();
    }).on('change', commit);
    $('#p-stroke-hex').on('change', function () {
      const res = applyHex('p-stroke', 'stroke', this.value);
      if (res === null) { this.value = toHex(primary.style.stroke === 'none' ? '#333333' : primary.style.stroke); return; }
      this.value = res;
      $('#p-line-on').prop('checked', res !== 'none');
      commit();
    });
    $('#p-sw').on('input', function () { const v = Math.max(0, +this.value || 0); each(n => n.style.strokeWidth = v); redraw(); }).on('change', commit);
    $('#p-dash').on('change', function () { const d = this.value === 'dashed'; each(n => n.style.dashed = d); redraw(); commit(); });

    $('#p-rounded').on('change', function () {
      const on = this.checked;
      each(n => { if (n.type === 'rectangle' || n.type === 'roundrect') n.type = on ? 'roundrect' : 'rectangle'; });
      redraw(); commit();
    });
    $('#p-corner').on('input', function () {
      const v = Math.max(0, +this.value || 0);
      $('#p-corner-v').text(v);
      each(n => n.style.cornerRadius = v);
      redraw();
    }).on('change', commit);
    $('#p-op').on('input', function () {
      const v = +this.value; $('#p-op-v').text(Math.round(v * 100) + '%');
      each(n => n.style.opacity = v); redraw();
    }).on('change', commit);

    // change the shape type of every selected node (keeps text / size / style)
    $('#p-shapetype').on('change', function () {
      const newType = this.value;
      each(n => { if (n.type !== newType) { n.type = newType; n.points = null; } });
      App.editingPointsId = null;
      redraw(); commit(); App.updateProperties();
    });

    // Edit Points / Reset Outline / Save as Custom Shape
    $('#prop-body [data-cmd]').on('click', function () { App.run($(this).data('cmd')); });
  }

  /* ================= NODE · TEXT ================= */
  function textTab(n, count) {
    const s = n.style;
    const fontOpts = FONTS.map(f => '<option ' + sel((s.fontFamily || '').split(',')[0], f) + '>' + f + '</option>').join('');
    return '' +
    section('Text' + (count > 1 ? ' · ' + count + ' selected' : ''),
      '<textarea id="p-text" rows="3" placeholder="Type text…">' + App.escapeHTML(n.text) + '</textarea>') +

    section('Font',
      row('<select id="p-font" style="flex:2">' + fontOpts + '</select>' +
          '<input type="number" id="p-fs" min="6" value="' + s.fontSize + '" style="flex:0 0 54px">') +
      '<div class="btn-row">' +
        tb('ts', 'fontWeight', '<b>B</b>', s.fontWeight === 'bold') +
        tb('ts', 'fontStyle', '<i>I</i>', s.fontStyle === 'italic') +
        tb('ts', 'textDecoration', '<u>U</u>', s.textDecoration === 'underline') +
        '<span class="sep"></span>' +
        '<input type="color" id="p-textcolor" value="' + toHex(s.textColor) + '">' +
      '</div>') +

    section('Alignment',
      '<div class="btn-row">' +
        tb('align', 'left', '&#8676;', s.textAlign === 'left') +
        tb('align', 'center', '&#8801;', s.textAlign === 'center') +
        tb('align', 'right', '&#8677;', s.textAlign === 'right') +
        '<span class="sep"></span>' +
        tb('valign', 'top', '&#8673;', s.verticalAlign === 'top') +
        tb('valign', 'middle', '&#8597;', s.verticalAlign === 'middle') +
        tb('valign', 'bottom', '&#8675;', s.verticalAlign === 'bottom') +
      '</div>');
  }

  function bindText(primary) {
    const each = fn => App.selectedNodes.forEach(id => { const nn = App.getNode(id); if (nn) fn(nn); });
    const redraw = () => {
      App.selectedNodes.forEach(id => { const nn = App.getNode(id); if (nn) { App.renderNode(nn); App.refreshConnectedEdges(id); } });
      App.updateSelectionOverlay();
    };
    const commit = () => App.pushHistory();

    $('#p-text').on('input', function () { const v = this.value; each(n => n.text = v); redraw(); }).on('change', commit);
    $('#p-font').on('change', function () { const v = this.value; each(n => n.style.fontFamily = v + ', Arial, sans-serif'); redraw(); commit(); });
    $('#p-fs').on('input', function () { const v = Math.max(6, +this.value || 14); each(n => n.style.fontSize = v); redraw(); }).on('change', commit);
    $('#p-textcolor').on('input', function () { const v = this.value; each(n => n.style.textColor = v); redraw(); }).on('change', commit);

    $('#prop-body .btn-row [data-ts]').on('click', function () {
      const key = $(this).data('ts');
      const pair = { fontWeight: ['normal', 'bold'], fontStyle: ['normal', 'italic'], textDecoration: ['none', 'underline'] }[key];
      each(n => { n.style[key] = n.style[key] === pair[1] ? pair[0] : pair[1]; });
      redraw(); commit(); App.updateProperties();
    });
    $('#prop-body .btn-row [data-align]').on('click', function () {
      const a = $(this).data('align'); each(n => n.style.textAlign = a); redraw(); commit(); App.updateProperties();
    });
    $('#prop-body .btn-row [data-valign]').on('click', function () {
      const a = $(this).data('valign'); each(n => n.style.verticalAlign = a); redraw(); commit(); App.updateProperties();
    });
  }

  /* ================= NODE · ARRANGE ================= */
  function arrangeTab(n, count) {
    return '' +
    section('Size',
      row(fld('W', 'p-w', r(n.width)) + fld('H', 'p-h', r(n.height)))) +
    section('Position',
      row(fld('X', 'p-x', r(n.x)) + fld('Y', 'p-y', r(n.y))) +
      row('<label>Angle</label><input type="number" id="p-rot" value="' + r(n.rotation || 0) + '"><label style="min-width:12px">&deg;</label>')) +
    section('Order',
      '<div class="btn-row">' +
        cb('bringFront', 'To Front', 'wide') + cb('sendBack', 'To Back', 'wide') +
      '</div>' +
      '<div class="btn-row">' +
        cb('bringForward', 'Forward', 'wide') + cb('sendBackward', 'Backward', 'wide') +
      '</div>') +
    (count > 1 ? section('Align',
      '<div class="btn-row">' +
        cb('alignLeft', '&#8676;') + cb('alignCenterH', '&#8596;') + cb('alignRight', '&#8677;') +
        cb('alignTop', '&#8673;') + cb('alignMiddle', '&#8597;') + cb('alignBottom', '&#8675;') +
      '</div>' +
      '<div class="btn-row">' + cb('group', 'Group', 'wide') + cb('ungroup', 'Ungroup', 'wide') + '</div>')
      : section('Group', '<div class="btn-row">' + cb('ungroup', 'Ungroup', 'wide') + '</div>'));
  }

  function bindArrange(primary) {
    const commit = () => App.pushHistory();
    const nudge = () => { App.updateNodeTransform(primary); App.refreshConnectedEdges(primary.id); App.updateSelectionOverlay(); };
    $('#p-x').on('input', function () { primary.x = +this.value || 0; nudge(); }).on('change', commit);
    $('#p-y').on('input', function () { primary.y = +this.value || 0; nudge(); }).on('change', commit);
    $('#p-w').on('input', function () { primary.width = Math.max(40, +this.value || 40); App.renderNode(primary); App.refreshConnectedEdges(primary.id); App.updateSelectionOverlay(); }).on('change', commit);
    $('#p-h').on('input', function () { primary.height = Math.max(30, +this.value || 30); App.renderNode(primary); App.refreshConnectedEdges(primary.id); App.updateSelectionOverlay(); }).on('change', commit);
    $('#p-rot').on('input', function () { primary.rotation = +this.value || 0; nudge(); }).on('change', commit);
    $('#prop-body [data-cmd]').on('click', function () { App.run($(this).data('cmd')); });
  }

  /* ================= EDGE ================= */
  function edgeStyle(ed) {
    const s = ed.style;
    return '' +
    section('Connector',
      row('<label>Line</label><select id="e-type">' +
        '<option value="orthogonal" ' + sel(ed.type, 'orthogonal') + '>Orthogonal</option>' +
        '<option value="straight" ' + sel(ed.type, 'straight') + '>Straight</option></select>')) +
    section('Line',
      row('<label>Color</label><input type="color" id="e-stroke" value="' + toHex(s.stroke) + '">' +
          '<input type="number" id="e-sw" min="0.5" step="0.5" value="' + s.strokeWidth + '" style="flex:0 0 54px">') +
      row('<label>Style</label><select id="e-dash">' +
        '<option value="solid" ' + (s.dashed ? '' : 'selected') + '>Solid</option>' +
        '<option value="dashed" ' + (s.dashed ? 'selected' : '') + '>Dashed</option></select>')) +
    section('Arrows',
      '<div class="btn-row">' +
        tb('arr', 'start', 'Start &#8592;', s.arrowStart) +
        tb('arr', 'end', 'End &#8594;', s.arrowEnd) +
      '</div>');
  }
  function bindEdge(ed) {
    const redraw = () => App.renderEdge(ed);
    const commit = () => App.pushHistory();
    $('#e-type').on('change', function () { ed.type = this.value; redraw(); commit(); });
    $('#e-stroke').on('input', function () { ed.style.stroke = this.value; redraw(); }).on('change', commit);
    $('#e-sw').on('input', function () { ed.style.strokeWidth = Math.max(0.5, +this.value || 2); redraw(); }).on('change', commit);
    $('#e-dash').on('change', function () { ed.style.dashed = this.value === 'dashed'; redraw(); commit(); });
    $('#prop-body .btn-row [data-arr]').on('click', function () {
      const k = $(this).data('arr') === 'start' ? 'arrowStart' : 'arrowEnd';
      ed.style[k] = !ed.style[k]; redraw(); commit(); App.updateProperties();
    });
  }
  function edgeArrange() {
    return section('Connector', '<div class="btn-row">' + cb('deleteSelection', 'Delete', 'wide') + '</div>' +
      '<div class="prop-hint">Ordering does not apply to connectors.</div>');
  }

  /* ================= DIAGRAM (nothing selected) ================= */
  const GRID_PRESETS = [10, 20, 40];

  function diagramHTML() {
    const g = App.settings;
    const presetBtns = GRID_PRESETS.map(v =>
      '<button class="mini ' + (Number(g.gridSize) === v ? 'on' : '') + '" data-gridsize="' + v + '">' + v + 'px</button>'
    ).join('');
    return '' +
    section('Diagram',
      '<div class="prop-hint">Nothing selected — click a shape to edit it.</div>') +

    section('Grid',
      row('<input type="checkbox" id="d-grid" ' + (g.gridEnabled ? 'checked' : '') + '><label>Show grid</label>') +
      row('<label>Style</label><select id="d-gridstyle">' +
        '<option value="lines" ' + sel(g.gridStyle, 'lines') + '>Lines</option>' +
        '<option value="dots" ' + sel(g.gridStyle, 'dots') + '>Dots</option></select>') +
      row('<label>Color</label><input type="color" id="d-gridcolor" value="' + toHex(g.gridColor) + '">' +
          '<input type="text" id="d-gridcolor-hex" class="hex" maxlength="7" value="' + toHex(g.gridColor) + '">') +
      row('<label>Size</label><input type="number" id="d-gridsize" min="4" max="200" step="1" value="' + g.gridSize + '"><label style="min-width:16px">px</label>') +
      '<div class="btn-row">' + presetBtns + '</div>' +
      row('<input type="checkbox" id="d-snap" ' + (g.snapEnabled ? 'checked' : '') + '><label>Snap to grid</label>')) +

    section('View',
      '<div class="btn-row">' + cb('resetZoom', 'Reset Zoom', 'wide') + cb('fit', 'Fit Page', 'wide') + '</div>');
  }

  function bindDiagram() {
    $('#d-grid').on('change', function () { App.settings.gridEnabled = this.checked; App.applyGridSettings(); App.pushHistory(); });
    $('#d-snap').on('change', function () { App.settings.snapEnabled = this.checked; App.applyGridSettings(); });
    $('#d-gridstyle').on('change', function () { App.settings.gridStyle = this.value; App.applyGridSettings(); App.pushHistory(); });

    $('#d-gridsize').on('input', function () {
      const v = Math.min(200, Math.max(4, +this.value || 20));
      App.settings.gridSize = v; App.applyGridSettings();
    }).on('change', function () { App.updateProperties(); App.pushHistory(); });

    $('#prop-body .btn-row [data-gridsize]').on('click', function () {
      App.settings.gridSize = +$(this).data('gridsize');
      App.applyGridSettings(); App.pushHistory(); App.updateProperties();
    });

    $('#d-gridcolor').on('input', function () {
      App.settings.gridColor = this.value; $('#d-gridcolor-hex').val(this.value); App.applyGridSettings();
    }).on('change', function () { App.pushHistory(); });
    $('#d-gridcolor-hex').on('change', function () {
      let v = this.value.trim().toLowerCase();
      if (/^[0-9a-f]{6}$/.test(v)) v = '#' + v;
      if (!/^#[0-9a-f]{6}$/.test(v)) { this.value = toHex(App.settings.gridColor); return; }
      App.settings.gridColor = v; $('#d-gridcolor').val(v); App.applyGridSettings(); App.pushHistory();
    });

    $('#prop-body [data-cmd]').on('click', function () { App.run($(this).data('cmd')); });
  }

  /* ================= html helpers ================= */
  function section(title, body) {
    return '<div class="prop-section"><div class="prop-h">' + title + '</div>' + body + '</div>';
  }
  function row(inner) { return '<div class="prop-row">' + inner + '</div>'; }
  function fld(label, id, val) {
    return '<label>' + label + '</label><input type="number" id="' + id + '" value="' + val + '">';
  }
  function tb(group, val, label, on) {
    return '<button class="mini ' + (on ? 'on' : '') + '" data-' + group + '="' + val + '">' + label + '</button>';
  }
  function cb(cmd, label, cls) {
    return '<button class="mini ' + (cls || '') + '" data-cmd="' + cmd + '">' + label + '</button>';
  }
})();

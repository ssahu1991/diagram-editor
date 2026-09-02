/* ============================================================
   toolbar.js — menus, toolbar buttons, context menu, keyboard,
   command dispatch, clipboard, layer order, align, grouping
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  /* ---------------- clipboard ---------------- */
  function copySelection() {
    if (!App.selectedNodes.length) return;
    const ids = {}; App.selectedNodes.forEach(id => ids[id] = 1);
    App.clipboard = {
      nodes: App.nodes.filter(n => ids[n.id]).map(App.clone),
      edges: App.edges.filter(e => ids[e.source] && ids[e.target]).map(App.clone)
    };
  }
  function pasteClipboard() {
    if (!App.clipboard || !App.clipboard.nodes.length) return;
    const map = {};
    const nn = App.clipboard.nodes.map(n => {
      const c = App.clone(n); c.id = App.uid('node');
      c.x += 24; c.y += 24; map[n.id] = c.id; return c;
    });
    const ee = App.clipboard.edges.map(e => {
      const c = App.clone(e); c.id = App.uid('edge');
      c.source = map[e.source]; c.target = map[e.target]; return c;
    });
    App.nodes = App.nodes.concat(nn);
    App.edges = App.edges.concat(ee);
    App.render();
    App.select(nn.map(n => n.id));
    App.updateProperties();
    App.pushHistory();
  }
  function duplicateSelection() {
    if (!App.selectedNodes.length) return;
    copySelection();
    pasteClipboard();
  }
  function deleteSelection() {
    if (!App.selectedNodes.length && !App.selectedEdges.length) return;
    const ids = {}; App.selectedNodes.forEach(id => ids[id] = 1);
    const eids = {}; App.selectedEdges.forEach(id => eids[id] = 1);
    App.edges = App.edges.filter(e => !ids[e.source] && !ids[e.target] && !eids[e.id]);
    App.nodes = App.nodes.filter(n => !ids[n.id]);
    App.clearSelection();
    App.render();
    App.updateProperties();
    App.pushHistory();
  }

  /* ---------------- layer order ---------------- */
  function reorder(mode) {
    if (!App.selectedNodes.length) return;
    const ids = {}; App.selectedNodes.forEach(id => ids[id] = 1);
    const arr = App.nodes;
    if (mode === 'front') {
      const keep = arr.filter(n => !ids[n.id]);
      App.nodes = keep.concat(arr.filter(n => ids[n.id]));
    } else if (mode === 'back') {
      const keep = arr.filter(n => !ids[n.id]);
      App.nodes = arr.filter(n => ids[n.id]).concat(keep);
    } else if (mode === 'forward') {
      for (let i = arr.length - 2; i >= 0; i--) {
        if (ids[arr[i].id] && !ids[arr[i + 1].id]) { const t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t; }
      }
    } else if (mode === 'backward') {
      for (let i = 1; i < arr.length; i++) {
        if (ids[arr[i].id] && !ids[arr[i - 1].id]) { const t = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = t; }
      }
    }
    App.renderAllNodes();
    App.refreshSelectionClasses();
    App.pushHistory();
  }

  /* ---------------- align ---------------- */
  function align(kind) {
    const list = App.selectedNodes.map(id => App.getNode(id)).filter(Boolean);
    if (list.length < 2) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    list.forEach(n => {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
    });
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    list.forEach(n => {
      if (kind === 'left') n.x = minX;
      else if (kind === 'right') n.x = maxX - n.width;
      else if (kind === 'centerH') n.x = cx - n.width / 2;
      else if (kind === 'top') n.y = minY;
      else if (kind === 'bottom') n.y = maxY - n.height;
      else if (kind === 'middle') n.y = cy - n.height / 2;
      App.updateNodeTransform(n);
      App.refreshConnectedEdges(n.id);
    });
    App.updateSelectionOverlay();
    App.updateProperties();
    App.pushHistory();
  }

  /* ---------------- grouping ---------------- */
  function group() {
    if (App.selectedNodes.length < 2) return;
    const gid = App.uid('group');
    App.selectedNodes.forEach(id => { const n = App.getNode(id); if (n) n.groupId = gid; });
    App.pushHistory();
    App.toast('Grouped ' + App.selectedNodes.length + ' shapes');
  }
  function ungroup() {
    App.selectedNodes.forEach(id => { const n = App.getNode(id); if (n) n.groupId = null; });
    App.pushHistory();
    App.toast('Ungrouped');
  }

  /* ---------------- misc commands ---------------- */
  function newDiagram() {
    if (App.nodes.length && !confirm('Discard the current diagram and start a new one?')) return;
    App.nodes = []; App.edges = [];
    App.clearSelection();
    App.render();
    App.updateProperties();
    App.pushHistory();
  }
  function toggleGrid() { App.settings.gridEnabled = !App.settings.gridEnabled; App.applyGridSettings(); App.pushHistory(); }
  function toggleSnap() { App.settings.snapEnabled = !App.settings.snapEnabled; App.applyGridSettings(); }
  function fullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  }
  function editSelectedText() {
    if (App.selectedNodes.length === 1) App.editNodeText(App.selectedNodes[0]);
  }
  function toggleEditPoints() {
    if (App.selectedNodes.length !== 1) return;
    const id = App.selectedNodes[0];
    const n = App.getNode(id);
    if (!n || App.POLYGON_TYPES.indexOf(App.effectiveType(n)) < 0) {
      App.toast('This shape has no editable points'); return;
    }
    App.editingPointsId = (App.editingPointsId === id) ? null : id;
    App.updateSelectionOverlay();
    App.updateProperties();
    if (App.editingPointsId) App.toast('Drag the corner handles — Esc when done');
  }
  function resetPoints() {
    if (App.selectedNodes.length !== 1) return;
    const n = App.getNode(App.selectedNodes[0]);
    if (!n) return;
    n.points = null;
    App.renderNode(n);
    App.refreshConnectedEdges(n.id);
    App.updateSelectionOverlay();
    App.updateProperties();
    App.pushHistory();
  }
  function saveCustomShapeCmd() {
    if (App.selectedNodes.length !== 1) { App.toast('Select a single shape first'); return; }
    App.openSaveShapeModal(App.getNode(App.selectedNodes[0]));
  }
  App.openSaveShapeModal = function (n) {
    if (!n) return;
    App._saveShapeTarget = n.id;
    const suggested = App.shapeLabel(n.type);
    $('#savecustom-name').val(suggested === n.type ? 'My Shape' : suggested);
    $('#modal-savecustom').addClass('show');
    setTimeout(function () { $('#savecustom-name').trigger('focus').trigger('select'); }, 30);
  };
  function startConnectorFromMenu() {
    App.setTool('connector');
    App.toast('Connector tool active — drag from one shape to another');
  }
  function openPrefs() {
    $('#pref-gridsize').val(String(App.settings.gridSize));
    $('#pref-grid').prop('checked', App.settings.gridEnabled);
    $('#pref-snap').prop('checked', App.settings.snapEnabled);
    $('#pref-conntype').val(App.defaultEdgeType);
    $('#modal-prefs').addClass('show');
  }

  /* ---------------- command table ---------------- */
  App.commands = {
    new: newDiagram,
    open: () => $('#file-open-json').trigger('click'),
    importJSON: () => $('#file-open-json').trigger('click'),
    save: () => App.saveDiagram(true),
    saveAs: () => App.exportJSON(),
    exportJSON: () => App.exportJSON(),
    exportSVG: () => App.exportSVG(),
    exportPNG: () => App.exportPNG(),
    exportHTML: () => App.exportHTML(),
    deleteDiagram: () => { if (confirm('Delete the diagram saved in this browser?')) App.deleteDiagram(); },

    undo: () => App.undo(),
    redo: () => App.redo(),
    cut: () => { copySelection(); deleteSelection(); },
    copy: copySelection,
    paste: pasteClipboard,
    duplicate: duplicateSelection,
    deleteSelection: deleteSelection,
    selectAll: () => App.selectAll(),

    zoomIn: () => App.setZoom(App.settings.zoom * 1.2),
    zoomOut: () => App.setZoom(App.settings.zoom / 1.2),
    resetZoom: () => App.resetZoom(),
    fit: () => App.fitToScreen(),
    toggleGrid: toggleGrid,
    toggleSnap: toggleSnap,
    fullscreen: fullscreen,

    bringFront: () => reorder('front'),
    sendBack: () => reorder('back'),
    bringForward: () => reorder('forward'),
    sendBackward: () => reorder('backward'),
    alignLeft: () => align('left'),
    alignCenterH: () => align('centerH'),
    alignRight: () => align('right'),
    alignTop: () => align('top'),
    alignMiddle: () => align('middle'),
    alignBottom: () => align('bottom'),
    group: group,
    ungroup: ungroup,

    editText: editSelectedText,
    editPoints: toggleEditPoints,
    resetPoints: resetPoints,
    saveCustomShape: saveCustomShapeCmd,
    newShape: () => App.openNewShapeModal(),
    startConnector: startConnectorFromMenu,
    preferences: openPrefs,
    shortcuts: () => $('#modal-shortcuts').addClass('show'),
    about: () => $('#modal-about').addClass('show')
  };
  App.run = function (name) {
    const fn = App.commands[name];
    if (fn) fn(); else console.warn('Unknown command:', name);
  };

  /* ---------------- context menu ---------------- */
  App.hideContextMenu = function () { $('#context-menu').hide(); };
  App.showContextMenu = function (x, y, onObject) {
    const $m = $('#context-menu');
    $m.find('[data-cmd]').show();
    if (!onObject) {
      $m.find('[data-cmd="editText"],[data-cmd="copy"],[data-cmd="duplicate"],[data-cmd="deleteSelection"],' +
        '[data-cmd="bringFront"],[data-cmd="sendBack"],[data-cmd="group"],[data-cmd="ungroup"],' +
        '[data-cmd="editPoints"],[data-cmd="saveCustomShape"],[data-cmd="startConnector"]').hide();
      $m.find('.cm-sep').hide();
    } else {
      $m.find('.cm-sep').show();
      if (App.selectedNodes.length < 2) $m.find('[data-cmd="group"]').hide();
      const one = App.selectedNodes.length === 1 ? App.getNode(App.selectedNodes[0]) : null;
      $m.find('[data-cmd="saveCustomShape"]').toggle(!!one);
      const canEditPoints = one && App.POLYGON_TYPES.indexOf(App.effectiveType(one)) >= 0;
      $m.find('[data-cmd="editPoints"]').toggle(!!canEditPoints)
        .text(App.editingPointsId && one && App.editingPointsId === one.id ? 'Done Editing Points' : 'Edit Points');
    }
    const vw = window.innerWidth, vh = window.innerHeight;
    $m.css({ left: Math.min(x, vw - 200), top: Math.min(y, vh - 300) }).show();
  };

  /* ---------------- responsive drawers ---------------- */
  App._compact = null;
  App.applyResponsive = function () {
    const compact = window.innerWidth < 1024;
    if (compact === App._compact) return;
    App._compact = compact;
    $('#app').toggleClass('compact', compact);
    if (compact) {
      $('#left-panel, #right-panel').addClass('collapsed');
      $('#reopen-left, #reopen-right').addClass('show');
    } else {
      $('#left-panel, #right-panel').removeClass('collapsed');
      $('#reopen-left, #reopen-right').removeClass('show');
    }
  };

  /* ---------------- init ---------------- */
  App.initToolbar = function () {
    /* menus */
    $('.menu-item > span').on('click', function (e) {
      e.stopPropagation();
      const $mi = $(this).parent();
      const open = $mi.hasClass('open');
      $('.menu-item').removeClass('open');
      if (!open) $mi.addClass('open');
    });
    $('.menu-item').on('mouseenter', function () {
      if ($('.menu-item.open').length) { $('.menu-item').removeClass('open'); $(this).addClass('open'); }
    });
    $('.menu-dropdown .mi').on('click', function (e) {
      e.stopPropagation();
      $('.menu-item').removeClass('open');
      App.run($(this).data('cmd'));
    });

    /* toolbar */
    $('.tool-btn[data-cmd]').on('click', function () { App.run($(this).data('cmd')); });
    $('.tool-btn[data-tool]').on('click', function () { App.setTool($(this).data('tool')); });
    $('#zoom-pill').on('click', function () { App.resetZoom(); });

    /* panel collapse */
    $('#collapse-left').on('click', () => { $('#left-panel').addClass('collapsed'); $('#reopen-left').addClass('show'); });
    $('#reopen-left').on('click', () => { $('#left-panel').removeClass('collapsed'); if (!App._compact) $('#reopen-left').removeClass('show'); });
    $('#collapse-right').on('click', () => { $('#right-panel').addClass('collapsed'); $('#reopen-right').addClass('show'); });
    $('#reopen-right').on('click', () => { $('#right-panel').removeClass('collapsed'); if (!App._compact) $('#reopen-right').removeClass('show'); });
    $(window).on('resize', App.applyResponsive);
    App.applyResponsive();

    /* global click closers */
    $(document).on('click', function () { $('.menu-item').removeClass('open'); App.hideContextMenu(); });

    /* context menu */
    $(App.dom.svg).on('contextmenu', function (e) {
      e.preventDefault();
      const gNode = e.target.closest ? e.target.closest('g.node') : null;
      const gEdge = e.target.closest ? e.target.closest('g.edge') : null;
      if (gNode) {
        const id = gNode.getAttribute('data-id');
        if (App.selectedNodes.indexOf(id) < 0) { App.select([id]); App.updateProperties(); }
      } else if (gEdge) {
        App.selectEdge(gEdge.getAttribute('data-id')); App.updateProperties();
      }
      App.showContextMenu(e.clientX, e.clientY, !!(gNode || gEdge));
    });
    $('#context-menu .cm-item').on('click', function (e) {
      e.stopPropagation();
      App.hideContextMenu();
      App.run($(this).data('cmd'));
    });

    /* modals */
    $('.modal .modal-x').on('click', function () { $(this).closest('.modal').removeClass('show'); });
    $('.modal').on('mousedown', function (e) { if (e.target === this) $(this).removeClass('show'); });

    /* save-as-custom-shape modal */
    $('#savecustom-cancel').on('click', function () { $('#modal-savecustom').removeClass('show'); });
    $('#savecustom-save').on('click', function () {
      const n = App.getNode(App._saveShapeTarget);
      $('#modal-savecustom').removeClass('show');
      if (!n) return;
      const name = ($('#savecustom-name').val() || 'Custom Shape').trim() || 'Custom Shape';
      App.saveCustomShape(n, name);
      App.updateProperties();
      App.toast('Saved "' + name + '" to the Custom shapes library');
    });
    $('#savecustom-name').on('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); $('#savecustom-save').trigger('click'); }
      else if (e.key === 'Escape') { e.preventDefault(); $('#modal-savecustom').removeClass('show'); }
    });

    /* preferences live apply */
    $('#pref-gridsize').on('change', function () { App.settings.gridSize = +this.value; App.applyGridSettings(); App.pushHistory(); });
    $('#pref-grid').on('change', function () { App.settings.gridEnabled = this.checked; App.applyGridSettings(); });
    $('#pref-snap').on('change', function () { App.settings.snapEnabled = this.checked; App.applyGridSettings(); });
    $('#pref-conntype').on('change', function () { App.defaultEdgeType = this.value; });

    /* file input */
    $('#file-open-json').on('change', function () {
      if (this.files && this.files[0]) App.importJSON(this.files[0]);
      this.value = '';
    });

    /* keyboard */
    $(document).on('keydown', function (e) {
      if (isEditingText()) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? App.redo() : App.undo(); }
      else if (ctrl && k === 'y') { e.preventDefault(); App.redo(); }
      else if (ctrl && k === 'c') { copySelection(); }
      else if (ctrl && k === 'x') { copySelection(); deleteSelection(); }
      else if (ctrl && k === 'v') { pasteClipboard(); }
      else if (ctrl && k === 'd') { e.preventDefault(); duplicateSelection(); }
      else if (ctrl && k === 'a') { e.preventDefault(); App.selectAll(); }
      else if (ctrl && k === 's') { e.preventDefault(); App.saveDiagram(true); }
      else if (ctrl && k === 'o') { e.preventDefault(); $('#file-open-json').trigger('click'); }
      else if (ctrl && (k === '0')) { e.preventDefault(); App.resetZoom(); }
      else if (ctrl && (k === '=' || k === '+')) { e.preventDefault(); App.setZoom(App.settings.zoom * 1.2); }
      else if (ctrl && k === '-') { e.preventDefault(); App.setZoom(App.settings.zoom / 1.2); }
      else if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelection(); }
      else if (k === 'escape') {
        App.hideContextMenu();
        $('.modal').removeClass('show');
        if (App.editingPointsId) { App.editingPointsId = null; App.updateSelectionOverlay(); App.updateProperties(); }
        else { App.clearSelection(); App.updateProperties(); }
      }
      else if (k.indexOf('arrow') === 0 && App.selectedNodes.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0;
        const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
        App.selectedNodes.forEach(id => {
          const n = App.getNode(id);
          n.x += dx; n.y += dy;
          App.updateNodeTransform(n);
          App.refreshConnectedEdges(id);
        });
        App.updateSelectionOverlay();
        App.syncFields();
        clearTimeout(App._nudgeT);
        App._nudgeT = setTimeout(() => App.pushHistory(), 400);
      }
    });
  };
})();

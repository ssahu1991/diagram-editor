/* ============================================================
   storage.js — localStorage persistence (survives refresh)
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  App.STORAGE_KEY = 'diagramEditor.current.v1';
  App.CUSTOM_SHAPES_KEY = 'diagramEditor.customShapes.v1';

  // the custom-shape library persists independently of any one diagram, so it's
  // still there the next time you open a blank canvas or a different file
  App.saveCustomShapes = function () {
    try { localStorage.setItem(App.CUSTOM_SHAPES_KEY, JSON.stringify(App.customShapes)); }
    catch (err) { /* quota / private mode — ignore */ }
  };

  App.loadCustomShapes = function () {
    try {
      const raw = localStorage.getItem(App.CUSTOM_SHAPES_KEY);
      App.customShapes = raw ? (JSON.parse(raw) || []) : [];
    } catch (err) { App.customShapes = []; }
  };

  // merge shapes carried inside an imported diagram file into the library (skip duplicate ids)
  App.mergeCustomShapes = function (list) {
    if (!Array.isArray(list) || !list.length) return;
    const known = {};
    App.customShapes.forEach(c => { known[c.id] = true; });
    let added = 0;
    list.forEach(c => { if (c && c.id && !known[c.id]) { App.customShapes.push(c); known[c.id] = true; added++; } });
    if (added) { App.saveCustomShapes(); App.buildShapePalette(); }
  };

  function debounce(fn, ms) {
    let t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  App.initStorage = function () {
    App.autosave = debounce(function () {
      try {
        localStorage.setItem(App.STORAGE_KEY, JSON.stringify(App.serialize()));
      } catch (err) { /* quota / private mode — ignore */ }
    }, 600);
  };

  App.saveDiagram = function (flash) {
    try {
      localStorage.setItem(App.STORAGE_KEY, JSON.stringify(App.serialize()));
      if (flash) App.toast('Diagram saved to browser storage');
    } catch (err) {
      App.toast('Save failed: ' + err.message);
    }
  };

  App.loadDiagram = function () {
    let raw;
    try { raw = localStorage.getItem(App.STORAGE_KEY); }
    catch (err) { return false; }
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      App.nodes = data.nodes || [];
      App.edges = data.edges || [];
      if (data.settings) {
        App.settings.gridEnabled = data.settings.gridEnabled !== false;
        App.settings.snapEnabled = data.settings.snapEnabled !== false;
        if (data.settings.gridSize) App.settings.gridSize = data.settings.gridSize;
        if (data.settings.gridStyle) App.settings.gridStyle = data.settings.gridStyle;
        if (data.settings.gridColor) App.settings.gridColor = data.settings.gridColor;
        if (data.settings.zoom) App.settings.zoom = data.settings.zoom;
      }
      return App.nodes.length > 0 || App.edges.length > 0;
    } catch (err) {
      return false;
    }
  };

  App.deleteDiagram = function () {
    try { localStorage.removeItem(App.STORAGE_KEY); } catch (err) {}
    App.nodes = []; App.edges = [];
    App.clearSelection();
    App.render();
    App.updateProperties();
    App.pushHistory();
    App.toast('Saved diagram deleted');
  };

  // save on unload as a safety net
  $(window).on('beforeunload', function () {
    try { localStorage.setItem(App.STORAGE_KEY, JSON.stringify(App.serialize())); } catch (err) {}
  });
})();

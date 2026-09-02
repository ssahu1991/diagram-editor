/* ============================================================
   history.js — snapshot-based undo / redo manager
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  App.initHistory = function () {
    App._hist = [];
    App._histIdx = -1;
  };

  App.serialize = function () {
    return {
      nodes: App.clone(App.nodes),
      edges: App.clone(App.edges),
      settings: {
        gridEnabled: App.settings.gridEnabled,
        gridSize: App.settings.gridSize,
        gridStyle: App.settings.gridStyle,
        gridColor: App.settings.gridColor,
        snapEnabled: App.settings.snapEnabled,
        zoom: App.settings.zoom
      }
    };
  };

  // keepView: retain current pan/zoom (used by undo/redo)
  App.deserialize = function (data, keepView) {
    App.nodes = App.clone(data.nodes || []);
    App.edges = App.clone(data.edges || []);
    if (data.settings) {
      App.settings.gridEnabled = !!data.settings.gridEnabled;
      App.settings.snapEnabled = !!data.settings.snapEnabled;
      if (data.settings.gridSize) App.settings.gridSize = data.settings.gridSize;
      if (data.settings.gridStyle) App.settings.gridStyle = data.settings.gridStyle;
      if (data.settings.gridColor) App.settings.gridColor = data.settings.gridColor;
      if (!keepView && data.settings.zoom) App.settings.zoom = data.settings.zoom;
    }
    App.selectedNodes = [];
    App.selectedEdges = [];
    App.applyGridSettings();
    App.updateViewport();
    App.render();
    App.updateProperties();
  };

  App.pushHistory = function (reset) {
    if (reset) { App._hist = []; App._histIdx = -1; }
    App._hist = App._hist.slice(0, App._histIdx + 1);
    App._hist.push(App.serialize());
    if (App._hist.length > 120) App._hist.shift();
    App._histIdx = App._hist.length - 1;
    if (App.autosave) App.autosave();
    App.updateStatusBar();
  };

  App.undo = function () {
    if (App._histIdx <= 0) return;
    App._histIdx--;
    App.deserialize(App._hist[App._histIdx], true);
    App.toast('Undo');
  };

  App.redo = function () {
    if (App._histIdx >= App._hist.length - 1) return;
    App._histIdx++;
    App.deserialize(App._hist[App._histIdx], true);
    App.toast('Redo');
  };
})();

/* ============================================================
   resize.js — 8-handle resize + rotation handle + vertex editing
   (works correctly for arbitrary rotation: the opposite
   handle stays pinned in world space)
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;

  const MIN_W = 40, MIN_H = 30;

  function rotVec(x, y, deg) {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  // pointer (screen) -> node-local unrotated coords, origin at the node's top-left
  function pointerToLocal(n, clientX, clientY) {
    const P = App.screenToWorld(clientX, clientY);
    const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
    const l = rotVec(P.x - cx, P.y - cy, -(n.rotation || 0));
    return { x: l.x + n.width / 2, y: l.y + n.height / 2 };
  }

  let rs = null;   // resize state
  let rot = null;  // rotation state
  let vtx = null;  // vertex-drag state

  App.initResize = function () {
    const $ov = $(App.dom.layerOverlay);

    /* ---------- vertex / point editing ---------- */
    $ov.on('mousedown', '.vertex-handle', function (e) {
      e.stopPropagation();
      e.preventDefault();
      const n = App.getNode(this.getAttribute('data-id'));
      if (!n) return;
      // seed a full editable point list from the current outline on first drag
      if (!n.points || !n.points.length) {
        n.points = App.polygonPoints(n).map(p => [p[0] / n.width, p[1] / n.height]);
      }
      vtx = { n: n, idx: +this.getAttribute('data-idx') };
    });

    /* ---------- resize ---------- */
    $ov.on('mousedown', '.sel-handle', function (e) {
      e.stopPropagation();
      e.preventDefault();
      const n = App.getNode(this.getAttribute('data-id'));
      if (!n) return;
      const dir = this.getAttribute('data-dir');
      const map = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
      const hx = map[dir][0], hy = map[dir][1];
      const rotDeg = n.rotation || 0;
      const cx0 = n.x + n.width / 2, cy0 = n.y + n.height / 2;
      // world position of the OPPOSITE handle -> stays fixed
      const off = rotVec(-hx * n.width / 2, -hy * n.height / 2, rotDeg);
      rs = { n: n, hx: hx, hy: hy, rot: rotDeg, w0: n.width, h0: n.height,
             Wo: { x: cx0 + off.x, y: cy0 + off.y } };
    });

    /* ---------- rotation ---------- */
    $ov.on('mousedown', '.sel-rot', function (e) {
      e.stopPropagation();
      e.preventDefault();
      const n = App.getNode(this.getAttribute('data-id'));
      if (n) rot = { n: n };
    });

    function doDrag(cx, cy, shift) {
      if (vtx) {
        const n = vtx.n;
        let l = pointerToLocal(n, cx, cy);
        let lx = l.x, ly = l.y;
        if (App.settings.snapEnabled) { lx = App.snap(lx); ly = App.snap(ly); }
        lx = Math.max(0, Math.min(n.width, lx));
        ly = Math.max(0, Math.min(n.height, ly));
        n.points[vtx.idx] = [lx / n.width, ly / n.height];
        App.renderNode(n);
        App.refreshConnectedEdges(n.id);
        App.updateSelectionOverlay();
        return;
      }
      if (rs) {
        const n = rs.n;
        const P = App.screenToWorld(cx, cy);
        const d = rotVec(P.x - rs.Wo.x, P.y - rs.Wo.y, -rs.rot);

        let newW = rs.hx !== 0 ? Math.max(MIN_W, rs.hx * d.x) : rs.w0;
        let newH = rs.hy !== 0 ? Math.max(MIN_H, rs.hy * d.y) : rs.h0;

        if (App.settings.snapEnabled && !rs.rot) {
          const g = App.settings.gridSize;
          if (rs.hx !== 0) newW = Math.max(MIN_W, Math.round(newW / g) * g);
          if (rs.hy !== 0) newH = Math.max(MIN_H, Math.round(newH / g) * g);
        }

        const co = rotVec(rs.hx * newW / 2, rs.hy * newH / 2, rs.rot);
        const ncx = rs.Wo.x + co.x, ncy = rs.Wo.y + co.y;
        n.width = newW; n.height = newH;
        n.x = ncx - newW / 2; n.y = ncy - newH / 2;

        App.renderNode(n);
        App.refreshConnectedEdges(n.id);
        App.updateSelectionOverlay();
        App.syncFields();
        App.hud(Math.round(n.width) + '  ×  ' + Math.round(n.height), cx, cy);
      } else if (rot) {
        const n = rot.n;
        const c = App.worldToScreen(n.x + n.width / 2, n.y + n.height / 2);
        let ang = Math.atan2(cy - c.y, cx - c.x) * 180 / Math.PI + 90;
        if (shift) ang = Math.round(ang / 15) * 15;
        n.rotation = Math.round(ang);
        App.updateNodeTransform(n);
        App.refreshConnectedEdges(n.id);
        App.updateSelectionOverlay();
        App.syncFields();
        App.hud(((n.rotation % 360) + 360) % 360 + '°', cx, cy);
      }
    }
    const dragThrottled = App.rafThrottle(doDrag);

    $(document).on('mousemove.resize', function (e) {
      if (!vtx && !rs && !rot) return;
      dragThrottled(e.clientX, e.clientY, e.shiftKey);
    });

    $(document).on('mouseup.resize', function () {
      dragThrottled.flush();   // apply the final frame before committing
      App.hud(null);
      if (vtx) { vtx = null; App.updateProperties(); App.pushHistory(); }
      if (rs) { rs = null; App.updateProperties(); App.pushHistory(); }
      if (rot) { rot = null; App.updateProperties(); App.pushHistory(); }
    });
  };
})();

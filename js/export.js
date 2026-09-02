/* ============================================================
   export.js — export / import
   • Export JSON
   • Editable Bitmap Image (.png)  — PNG with the diagram JSON in a tEXt chunk
   • Editable Vector Image (.svg)  — SVG with the diagram JSON on the root element
   • HTML File (.html)             — self-contained page with the JSON embedded
   Import understands .json / .svg / .png / .html and pulls the diagram back out.
   ============================================================ */
(function () {
  'use strict';
  const App = window.App;
  const EMBED_KEY = 'diagram-json';

  function download(name, type, data) {
    const blob = (data instanceof Blob) ? data : new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---- UTF-8 safe base64 ---- */
  function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64ToUtf8(b64) { return decodeURIComponent(escape(atob(String(b64).replace(/\s+/g, '')))); }

  App.diagramJSON = function () {
    return {
      nodes: App.clone(App.nodes),
      edges: App.clone(App.edges),
      customShapes: App.clone(App.customShapes || []),
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

  /* ================= JSON ================= */
  App.exportJSON = function () {
    download('diagram.json', 'application/json', JSON.stringify(App.diagramJSON(), null, 2));
    App.toast('Exported diagram.json');
  };

  /* ================= bounding box ================= */
  function exportBBox() {
    if (!App.nodes.length) return { x: 0, y: 0, w: 800, h: 600 };
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    App.nodes.forEach(n => {
      const diag = Math.hypot(n.width, n.height) / 2;
      const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
      const useDiag = (n.rotation || 0) % 360 !== 0;
      const hw = useDiag ? diag : n.width / 2;
      const hh = useDiag ? diag : n.height / 2;
      a = Math.min(a, cx - hw); b = Math.min(b, cy - hh);
      c = Math.max(c, cx + hw); d = Math.max(d, cy + hh);
    });
    const pad = 44;
    return { x: a - pad, y: b - pad, w: (c - a) + pad * 2, h: (d - b) + pad * 2 };
  }

  // returns { plain, editable } SVG strings (editable carries the diagram JSON on <svg>)
  function buildExportSVG() {
    const bb = exportBBox();
    const NS = App.SVGNS;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('xmlns', NS);
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svg.setAttribute('width', Math.round(bb.w));
    svg.setAttribute('height', Math.round(bb.h));
    svg.setAttribute('viewBox', bb.x + ' ' + bb.y + ' ' + bb.w + ' ' + bb.h);

    const defs = document.querySelector('#canvas defs').cloneNode(true);
    defs.querySelectorAll('marker path').forEach(p => p.setAttribute('fill', '#33373d'));
    svg.appendChild(defs);

    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', bb.x); bg.setAttribute('y', bb.y);
    bg.setAttribute('width', bb.w); bg.setAttribute('height', bb.h);
    bg.setAttribute('fill', '#ffffff');
    svg.appendChild(bg);

    const edges = document.getElementById('layer-edges').cloneNode(true);
    const nodes = document.getElementById('layer-nodes').cloneNode(true);
    [edges, nodes].forEach(layer => {
      layer.removeAttribute('id');
      layer.querySelectorAll('.edge-hit, .node-hit').forEach(el => el.remove());
      layer.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    });
    svg.appendChild(edges);
    svg.appendChild(nodes);

    const head = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const plain = head + new XMLSerializer().serializeToString(svg);

    svg.setAttribute('data-diagram-json', utf8ToB64(JSON.stringify(App.diagramJSON())));
    const editable = head + new XMLSerializer().serializeToString(svg);
    return { plain: plain, editable: editable };
  }

  // public: raw string for a given export kind (no download) — handy for embedding / testing
  App.exportString = function (kind) {
    const svg = buildExportSVG();
    if (kind === 'svg-plain') return svg.plain;
    if (kind === 'svg') return svg.editable;
    if (kind === 'html') return htmlDocument(svg.editable);
    return JSON.stringify(App.diagramJSON(), null, 2);
  };

  /* ================= Editable Vector Image (.svg) ================= */
  App.exportSVG = function () {
    download('diagram.svg', 'image/svg+xml;charset=utf-8', buildExportSVG().editable);
    App.toast('Exported diagram.svg (re-openable)');
  };

  /* ================= HTML File (.html) ================= */
  function htmlDocument(editableSvg) {
    const svg = editableSvg.replace(/^<\?xml[^>]*\?>\s*/, '');
    const json = JSON.stringify(App.diagramJSON()).replace(/</g, '\\u003c');
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>Diagram</title>\n<style>\n' +
      'html,body{margin:0;min-height:100%;background:#f4f4f4;' +
      'font:13px/1.4 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#2b2b2b}\n' +
      '.wrap{min-height:100vh;box-sizing:border-box;display:flex;align-items:center;' +
      'justify-content:center;padding:28px}\n' +
      'svg{max-width:100%;height:auto;background:#fff;box-shadow:0 1px 8px rgba(0,0,0,.18);border-radius:4px}\n' +
      '</style>\n</head>\n<body>\n<div class="wrap">\n' + svg + '\n</div>\n' +
      '<script type="application/json" id="diagram-source">\n' + json + '\n<\/script>\n' +
      '</body>\n</html>\n';
  }

  App.exportHTML = function () {
    download('diagram.html', 'text/html;charset=utf-8', htmlDocument(buildExportSVG().editable));
    App.toast('Exported diagram.html (re-openable)');
  };

  /* ================= PNG helpers (embed JSON as a tEXt chunk) ================= */
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes, start, end) {
    let c = 0xFFFFFFFF;
    for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function textChunk(keyword, text) {
    const kw = new TextEncoder().encode(keyword);
    const tx = new TextEncoder().encode(text);           // text is base64 -> pure ASCII
    const dataLen = kw.length + 1 + tx.length;
    const out = new Uint8Array(12 + dataLen);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, dataLen);
    out.set([0x74, 0x45, 0x58, 0x74], 4);               // "tEXt"
    out.set(kw, 8);
    out[8 + kw.length] = 0;
    out.set(tx, 9 + kw.length);
    dv.setUint32(8 + dataLen, crc32(out, 4, 8 + dataLen));
    return out;
  }
  function pngEmbed(arrayBuffer, keyword, text) {
    const bytes = new Uint8Array(arrayBuffer);
    const dv = new DataView(bytes.buffer, bytes.byteOffset);
    const ihdrLen = dv.getUint32(8);
    const ihdrEnd = 8 + 12 + ihdrLen;                    // sig(8) + len(4)+type(4)+data+crc(4)
    const chunk = textChunk(keyword, text);
    const out = new Uint8Array(bytes.length + chunk.length);
    out.set(bytes.subarray(0, ihdrEnd), 0);
    out.set(chunk, ihdrEnd);
    out.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length);
    return out;
  }
  function pngReadText(bytes, keyword) {
    if (bytes.length < 8) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset);
    const dec = new TextDecoder('latin1');
    let off = 8;
    while (off + 12 <= bytes.length) {
      const len = dv.getUint32(off);
      const type = dec.decode(bytes.subarray(off + 4, off + 8));
      if (type === 'tEXt') {
        const data = bytes.subarray(off + 8, off + 8 + len);
        let z = 0; while (z < data.length && data[z] !== 0) z++;
        if (dec.decode(data.subarray(0, z)) === keyword) return dec.decode(data.subarray(z + 1));
      }
      if (type === 'IEND') break;
      off += 12 + len;
    }
    return null;
  }

  // public: write / read the diagram JSON into a PNG's tEXt chunk
  App.pngEmbedDiagram = function (arrayBuffer) {
    return pngEmbed(arrayBuffer, EMBED_KEY, utf8ToB64(JSON.stringify(App.diagramJSON())));
  };
  App.pngReadDiagram = function (u8) {
    const raw = pngReadText(u8, EMBED_KEY);
    return raw ? JSON.parse(b64ToUtf8(raw)) : null;
  };

  /* ================= Editable Bitmap Image (.png) ================= */
  App.exportPNG = function () {
    const bb = exportBBox();
    const { plain } = buildExportSVG();
    const url = URL.createObjectURL(new Blob([plain], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = function () {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bb.w * scale));
      canvas.height = Math.max(1, Math.round(bb.h * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (b) {
        if (!b) { App.toast('PNG export failed'); return; }
        b.arrayBuffer().then(function (buf) {
          download('diagram.png', 'image/png', new Blob([App.pngEmbedDiagram(buf)], { type: 'image/png' }));
          App.toast('Exported diagram.png (re-openable)');
        }).catch(function () {
          download('diagram.png', 'image/png', b);       // fall back to a plain PNG
          App.toast('Exported diagram.png');
        });
      }, 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); App.toast('PNG export failed'); };
    img.src = url;
  };

  /* ================= Import (.json / .svg / .png / .html) ================= */
  function applyImported(data, file) {
    if (!data || !Array.isArray(data.nodes)) throw new Error('no diagram data found in this file');
    App.mergeCustomShapes(data.customShapes);
    App.deserialize(data, false);
    App.pushHistory();
    App.fitToScreen();
    App.toast('Imported ' + (file && file.name ? file.name : 'diagram'));
  }

  App.importJSON = function (file) {
    const name = (file && file.name || '').toLowerCase();
    const reader = new FileReader();
    reader.onerror = function () { App.toast('Could not read that file'); };

    if (name.endsWith('.png')) {
      reader.onload = function () {
        try {
          const raw = pngReadText(new Uint8Array(reader.result), EMBED_KEY);
          if (!raw) throw new Error('this PNG has no embedded diagram');
          applyImported(JSON.parse(b64ToUtf8(raw)), file);
        } catch (err) { App.toast('Import failed: ' + err.message); }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    reader.onload = function () {
      try {
        const text = String(reader.result);
        const head = text.slice(0, 500);
        let data;
        if (name.endsWith('.svg') || /<svg[\s>]/i.test(head)) {
          const m = text.match(/data-diagram-json\s*=\s*"([^"]+)"/);
          if (!m) throw new Error('this SVG has no embedded diagram');
          data = JSON.parse(b64ToUtf8(m[1]));
        } else if (name.endsWith('.html') || /<html[\s>]/i.test(head)) {
          const m = text.match(/<script[^>]*id=["']diagram-source["'][^>]*>([\s\S]*?)<\/script>/i);
          if (!m) throw new Error('this HTML has no embedded diagram');
          data = JSON.parse(m[1].trim());
        } else {
          data = JSON.parse(text);
        }
        applyImported(data, file);
      } catch (err) { App.toast('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
  };
})();

# Diagram Editor

A professional **diagrams.net (draw.io)-style** diagram editor built with **only**
HTML5, CSS3, vanilla JavaScript, jQuery and SVG. No React / Vue / Angular /
TypeScript, no Fabric / Konva / React-Flow or any diagram library.

## Run it

Just open **`index.html`** in a modern browser (Chrome, Edge, Firefox).
jQuery is vendored in `js/vendor/jquery.min.js`, so it works fully offline;
if that file is missing it falls back to a CDN copy.

## File structure

```
diagram-editor/
├── index.html
├── css/
│   └── editor.css
├── js/
│   ├── editor.js       core state, coord math, viewport, zoom/pan, bootstrap
│   ├── history.js      snapshot undo / redo
│   ├── nodes.js        shape library, geometry, rendering, text editing
│   ├── selection.js    selection model, dragging, rubber-band, overlay handles
│   ├── resize.js       8-handle resize + rotation (rotation-aware)
│   ├── connectors.js   connection points, edges, orthogonal/straight routing
│   ├── properties.js   right-hand properties panel
│   ├── toolbar.js      menus, toolbar, context menu, keyboard, clipboard,
│   │                   layer order, align, grouping
│   ├── storage.js      localStorage persistence (survives refresh)
│   ├── export.js       JSON / SVG / PNG export + JSON import
│   └── vendor/jquery.min.js
└── assets/icons/
```

## Features

| Area | What works |
|------|------------|
| **Layout** | Top menu, toolbar, collapsible left shape library, SVG canvas, right properties panel, status bar |
| **Shapes** | General / Arrows / Flowchart libraries — drag onto canvas or double-click a tile |
| **Dynamic shapes** | **Type picker** (Style tab) swaps a shape into any other type, keeping text/size/style · **Edit Points** shows draggable vertex handles on polygon shapes (diamond, triangle, hexagon, star, I/O, block arrows) so you can reshape the outline itself · **Save as Custom Shape** captures the current outline + size + style as a reusable tile in a persistent *Custom* library (stored in localStorage, also travels inside exported JSON) |
| **New Shape editor** | `Shapes ▸ +` (or `Extras ▸ New Shape…`) opens a pad — click to drop points, drag to move, right-click to delete, or start from a template (triangle / diamond / pentagon / hexagon / chevron / star) — name it, pick fill/line, **Add to Library**. Saved as a normalised free `polygon` custom shape that behaves like every built-in one (resize, rotate, connect, re-reshape via Edit Points). |
| **`js/shapes.js`** | **The one file to edit to add/remove library shapes & icons.** Each entry is `{ key, label, category, width, height, style }` plus either `type:'path'` + `viewBox` + `path` (an SVG icon) or `type:'polygon'` + `points` (fractions of w/h — also vertex-editable). Everything else — palette tile, Type picker, resize/rotate/connect/style, JSON — is wired up automatically; no other file changes. |
| **Editing** | Select, multi-select (Ctrl+click / rubber-band), move, 8-handle resize, rotate, delete, double-click to edit text (Enter save / Esc cancel / Shift+Enter newline) |
| **Connectors** | Drag from a connection point or use the Connector tool; straight / orthogonal, start/end arrowheads, dashed, colour, width; edges follow nodes automatically |
| **Format panel** | diagrams.net-style right panel with **Style / Text / Arrange** tabs (plus a Diagram/grid panel when nothing is selected): preset colour swatches, fill, line, opacity, rounded; font + bold/italic/underline/colour/align; size, position, angle, order & align buttons |
| **Text** | Wraps to the shape width automatically (stored text keeps your own line breaks) |
| **View** | Zoom (wheel / buttons / menu), pan (Space+drag or middle-drag), reset, fit to screen, grid (10/20/40 px), snap to grid |
| **History** | Undo / Redo for create, move, resize, rotate, text, style, edge create/delete |
| **Clipboard** | Copy / Cut / Paste / Duplicate — pasted nodes get new IDs and keep internal connections |
| **Arrange** | Bring to front / send to back / forward / backward, align 6 ways, group / ungroup |
| **Persistence** | Auto-saved to `localStorage`; `saveDiagram()` / `loadDiagram()` / `deleteDiagram()` |
| **Save As / Export** | **JSON File** · **Editable Bitmap Image (.png)** — PNG with the diagram JSON stored in a `tEXt` chunk · **Editable Vector Image (.svg)** — SVG with the JSON on the root `<svg data-diagram-json>` · **HTML File (.html)** — self-contained page with the inlined SVG + JSON. All three render as normal images/pages anywhere, and re-open losslessly. |
| **Open** | `File ▸ Open Diagram…` accepts `.json`, `.svg`, `.png` or `.html` and pulls the embedded diagram back out (custom shapes travel with the file) |
| **Context menu** | Right-click: Edit, Copy, Duplicate, Delete, Bring to Front / Send to Back, Group / Ungroup, Add Connector |
| **Responsive** | Panels overlay / collapse on narrow screens; canvas + toolbar stay usable |

## Keyboard shortcuts

`Ctrl+Z/Y` undo/redo · `Ctrl+C/X/V` copy/cut/paste · `Ctrl+D` duplicate ·
`Ctrl+A` select all · `Del` delete · `Ctrl+S` save · `Ctrl +/-` zoom ·
`Ctrl+0` reset zoom · arrows nudge (Shift ×10) · `Space+drag` pan · wheel zoom.

## Data model

```js
node = {
  id, type, x, y, width, height, rotation, text, groupId,
  points,            // null, or [[fx,fy], …] fractions of w/h when the outline was reshaped
  style: { fill, stroke, strokeWidth, opacity, dashed, cornerRadius,
           fontSize, fontFamily, fontWeight, fontStyle, textDecoration,
           textAlign, verticalAlign, textColor }
}

customShape = { id, name, baseType, width, height, points, style }   // reusable library shape

edge = {
  id, source, target, sourceAnchor, targetAnchor, type /* straight | orthogonal */,
  style: { stroke, strokeWidth, dashed, arrowStart, arrowEnd }
}

document = { nodes: [], edges: [], settings: { gridEnabled, gridSize, snapEnabled, zoom } }
```

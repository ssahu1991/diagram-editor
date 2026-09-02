# Diagram Editor

A **diagrams.net (draw.io)-style** diagram editor built with **only** HTML5, CSS3, vanilla
JavaScript, jQuery and SVG — no React / Vue / Angular / TypeScript, no Fabric / Konva /
React-Flow or any diagram library.

**Run it:** open **`index.html`** in a modern browser. jQuery is vendored
(`js/vendor/jquery.min.js`) so it works fully offline; a CDN copy is the fallback.

**Live repo:** https://github.com/ssahu1991/diagram-editor

---

## Highlights

| Area | What it does |
|---|---|
| **Layout** | Top menu · toolbar · collapsible shape library · SVG canvas · Format panel (Style / Text / Arrange) · status bar |
| **Themes** | Light **and dark** (default). Toolbar sun/moon button, `View ▸ Dark Mode`, or Preferences. The dark canvas keeps shapes readable — connectors & grid flip light. Choice persists. |
| **Shapes** | General · Arrows · Flowchart · SVG-path **Icons** · your own **polygon** shapes — **all declared in one file, `js/shapes.js`** |
| **Editing** | Select · multi-select (Shift/Ctrl-click or drag box) · move · 8-handle resize · rotate · delete · `V`/`C`/`T` tool keys |
| **Smart guides** | Dragging a shape snaps its edges/centre to nearby shapes and draws alignment lines |
| **Text** | Double-click / `F2` / `Enter` to edit; wraps to shape width (stored text keeps your line breaks) |
| **Connectors** | Drag from a connection point or the Connector tool · straight / orthogonal · start/end arrowheads · dashed · colour · **double-click for a label** · auto-reroute when shapes move |
| **Format panel** | Preset swatches · fill / line / opacity / rounded · font, B/I/U, colour, align · size / position / angle · order · align **& distribute** (3+) · group · **collapsible sections** |
| **Dynamic shapes** | **Type picker** swaps a shape into any other type · **Edit Points** drags polygon vertices to reshape the outline · **Save as Custom Shape** · **New Shape** editor (draw on a pad) |
| **View** | Zoom (wheel to cursor / buttons / `Ctrl ±0`) · pan (Space-drag or middle-drag) · fit · reset · **infinite grid** (lines / dots · size · colour) · snap |
| **History / clipboard** | Undo / redo · copy / cut / paste / duplicate · **Alt-drag to duplicate** |
| **HUD** | Live `W × H` while resizing, angle while rotating, `X, Y` while dragging |
| **Persistence** | Auto-saved to `localStorage`; survives refresh |
| **Save As / Open** | JSON · **Editable Bitmap (.png)** (diagram JSON in a `tEXt` chunk) · **Editable Vector (.svg)** (`<svg data-diagram-json>`) · **HTML File** (inlined SVG + JSON). `File ▸ Open` re-opens any of them. |
| **Responsive** | Panels become slide-in drawers under 1024 px; toolbar & canvas stay usable |
| **a11y** | Icon buttons carry `aria-label`s; `prefers-reduced-motion` respected; keyboard focus rings |

---

## File structure

```
diagram-editor/
├── index.html
├── css/editor.css
└── js/
    ├── shapes.js       ← the ONE file to edit to add/remove shapes & icons
    ├── editor.js       core state, coord math, zoom/pan, infinite grid, theme, HUD
    ├── history.js      snapshot undo / redo
    ├── nodes.js        node data, rendering, text editing, shape palette
    ├── selection.js    selection, dragging, rubber-band, smart guides, overlay
    ├── resize.js       8-handle resize + rotation + vertex editing
    ├── connectors.js   connection points, edges, routing, labels
    ├── properties.js   Format panel (Style / Text / Arrange)
    ├── toolbar.js      menus, toolbar, context menu, keyboard, commands, align/distribute
    ├── storage.js      localStorage persistence + custom-shape library
    ├── export.js       JSON / PNG / SVG / HTML export + format-detecting import
    ├── shapeeditor.js  the "New Shape" modal (draw a polygon)
    └── vendor/jquery.min.js
```

---

## Adding a shape or icon — edit `js/shapes.js` only

Add an object to `App.SHAPES` (top of the file). Two kinds:

```js
// SVG-path ICON
{
  key: 'server', label: 'Server', category: 'Icons', type: 'path',
  width: 80, height: 100, viewBox: [64, 80],
  style: { fill: '#eef1f5' },
  path: 'M4,4 h56 v72 h-56 z M10,14 h44 M10,26 h44'
}

// POLYGON shape (also reshapeable via "Edit Points")
{
  key: 'trapezoid', label: 'Trapezoid', category: 'My Shapes', type: 'polygon',
  width: 130, height: 70,
  points: [[0.22,0],[0.78,0],[1,1],[0,1]]   // fractions of width/height
}
```

The palette tile, Type picker, resize/rotate/connect/style, and JSON export/import are
all wired up automatically. Delete the object to remove the shape. The built-in shape
tables (sizes, labels, categories) and geometry live further down the same file.

---

## Data model

```js
node = {
  id, type, x, y, width, height, rotation, text, groupId,
  points,            // null, or [[fx,fy], …] fractions of w/h when the outline was reshaped
  style: { fill, stroke, strokeWidth, opacity, dashed, cornerRadius,
           fontSize, fontFamily, fontWeight, fontStyle, textDecoration,
           textAlign, verticalAlign, textColor }
}

edge = {
  id, source, target, sourceAnchor, targetAnchor,
  type /* straight | orthogonal */, text /* label */,
  style: { stroke, strokeWidth, dashed, arrowStart, arrowEnd }
}

customShape = { id, name, baseType, width, height, points, style }   // reusable library shape

document = { nodes: [], edges: [], customShapes: [], settings: { … } }
```

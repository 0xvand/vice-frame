// Vice Frame — editor wiring.
// Owns the cover state, the photo tray, all controls, canvas gestures
// (click to select, drag to pan, scroll to zoom) and PNG export.
// Everything runs locally; photos are only ever read, never uploaded.

import {
  SIZES, LAYOUTS, GRADES, TITLE_COLORS, ACCENT_COLORS,
  renderCover, panelAt, photoPlacement,
} from './render.js';
import { SAMPLE_URLS, parseShot, shotPanelKeys, shotPhotoKeys } from './shots.js';

const SAMPLE_NAMES = { boulevard: 'Sunset Boulevard', neon: 'Neon Night' };

const state = {
  size: 'portrait',
  layout: 'blockbuster',
  grade: 'sunset',
  title: 'NEON SHORES',
  subtitle: 'VICE DISTRICT',
  titleSize: 1,
  titlePos: 'bottom',
  titleColor: '#ffffff',
  accent: '#ffd23f',
  panels: [],
};

const photos = []; // { img, name, key? }
let selected = 0;
let coverShot = false;

const stage = document.getElementById('stage');
const wrap = document.getElementById('canvasWrap');
const tray = document.getElementById('tray');
const $ = (id) => document.getElementById(id);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const images = () => photos.map((p) => p.img);

function panelCount() { return LAYOUTS[state.layout].panels.length; }

function blankPanel() {
  return { photo: photos.length ? 0 : null, zoom: 1, panX: 0, panY: 0 };
}

function syncPanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push(blankPanel());
  state.panels.length = n;
  selected = clamp(selected, 0, n - 1);
}

function render() {
  syncPanels();
  if (coverShot) {
    renderCover(stage, state, images(), { scale: 1 });
    stage.style.width = `${SIZES[state.size].w}px`;
    stage.style.height = `${SIZES[state.size].h}px`;
  } else {
    const scale = Math.min(1, 900 / SIZES[state.size].w);
    renderCover(stage, state, images(), { scale, highlight: selected });
    stage.style.width = '';
    stage.style.height = '';
  }
  syncPanelControls();
  markTray();
}

/* ---------------- photos ---------------- */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function addPhoto(src, name, key) {
  const img = await loadImage(src);
  photos.push({ img, name, key });
  buildTray();
  return photos.length - 1;
}

async function addPhotoFiles(files) {
  const wasEmpty = photos.length === 0;
  let first = null;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const idx = await addPhoto(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ''));
    if (first === null) first = idx;
  }
  if (first !== null) {
    if (wasEmpty) state.panels.forEach((p) => { p.photo = first; });
    else state.panels[selected].photo = first;
    render();
  }
}

async function ensureSample(key) {
  const found = photos.findIndex((p) => p.key === key);
  if (found >= 0) return found;
  return addPhoto(SAMPLE_URLS[key], SAMPLE_NAMES[key], key);
}

function buildTray() {
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const fig = document.createElement('figure');
    const im = document.createElement('img');
    im.src = p.img.src;
    im.alt = p.name;
    const cap = document.createElement('figcaption');
    cap.textContent = p.name;
    fig.append(im, cap);
    fig.title = `Put "${p.name}" in the selected panel`;
    fig.addEventListener('click', () => {
      state.panels[selected].photo = i;
      render();
    });
    tray.appendChild(fig);
  });
  markTray();
}

function markTray() {
  const used = state.panels[selected] ? state.panels[selected].photo : null;
  [...tray.children].forEach((fig, i) => fig.classList.toggle('used', i === used));
}

/* ---------------- controls ---------------- */

function optionButtons(container, entries, current, onPick) {
  container.innerHTML = '';
  for (const [id, item] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'option' + (id === current ? ' active' : '');
    const name = document.createElement('b');
    name.textContent = item.name || item.label;
    b.appendChild(name);
    if (item.blurb) {
      const small = document.createElement('small');
      small.textContent = item.blurb;
      b.appendChild(small);
    }
    b.addEventListener('click', () => onPick(id));
    container.appendChild(b);
  }
}

function swatchRow(container, colors, current, onPick) {
  container.innerHTML = '';
  for (const color of colors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (color === current ? ' active' : '');
    b.style.setProperty('--c', color);
    b.title = color;
    b.setAttribute('aria-label', `Colour ${color}`);
    b.addEventListener('click', () => onPick(color));
    container.appendChild(b);
  }
}

function buildControls() {
  optionButtons($('layoutOptions'), Object.entries(LAYOUTS), state.layout, (id) => {
    state.layout = id;
    selected = 0;
    buildControls();
    render();
  });
  optionButtons($('gradeOptions'), Object.entries(GRADES), state.grade, (id) => {
    state.grade = id;
    buildControls();
    render();
  });
  const sw = $('sizeSwitch');
  sw.innerHTML = '';
  for (const [id, size] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = size.label;
    b.className = id === state.size ? 'active' : '';
    b.addEventListener('click', () => {
      state.size = id;
      buildControls();
      render();
    });
    sw.appendChild(b);
  }
  swatchRow($('titleColors'), TITLE_COLORS, state.titleColor, (c) => {
    state.titleColor = c;
    buildControls();
    render();
  });
  swatchRow($('accentColors'), ACCENT_COLORS, state.accent, (c) => {
    state.accent = c;
    buildControls();
    render();
  });
  document.querySelectorAll('#posSeg button').forEach((b) => {
    b.classList.toggle('active', b.dataset.pos === state.titlePos);
  });
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('titleSize').value = state.titleSize;
}

function syncPanelControls() {
  const p = state.panels[selected];
  if (!p) return;
  $('panelLabel').textContent = `${selected + 1} of ${panelCount()}`;
  $('zoomRange').value = p.zoom;
  $('panXRange').value = p.panX;
  $('panYRange').value = p.panY;
}

/* ---------------- events ---------------- */

$('fileInput').addEventListener('change', (e) => {
  addPhotoFiles([...e.target.files]);
  e.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach((chip) => {
  chip.addEventListener('click', async () => {
    const idx = await ensureSample(chip.dataset.sample);
    state.panels[selected].photo = idx;
    render();
  });
});

$('spreadBtn').addEventListener('click', () => {
  let idx = state.panels[selected] ? state.panels[selected].photo : null;
  if (idx == null && photos.length) idx = 0;
  if (idx == null) return;
  state.panels.forEach((p) => { p.photo = idx; });
  render();
});

$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
$('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
$('titleSize').addEventListener('input', (e) => { state.titleSize = parseFloat(e.target.value); render(); });

document.querySelectorAll('#posSeg button').forEach((b) => {
  b.addEventListener('click', () => {
    state.titlePos = b.dataset.pos;
    buildControls();
    render();
  });
});

$('zoomRange').addEventListener('input', (e) => { state.panels[selected].zoom = parseFloat(e.target.value); render(); });
$('panXRange').addEventListener('input', (e) => { state.panels[selected].panX = parseFloat(e.target.value); render(); });
$('panYRange').addEventListener('input', (e) => { state.panels[selected].panY = parseFloat(e.target.value); render(); });
$('resetPanelBtn').addEventListener('click', () => {
  const photo = state.panels[selected].photo;
  state.panels[selected] = { photo, zoom: 1, panX: 0, panY: 0 };
  render();
});

$('exportBtn').addEventListener('click', () => {
  const out = document.createElement('canvas');
  renderCover(out, state, images(), { scale: 1 });
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-frame-cover-${SIZES[state.size].w}x${SIZES[state.size].h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

/* Canvas gestures: click selects, drag pans, wheel zooms. */

function stagePoint(e) {
  const r = stage.getBoundingClientRect();
  return {
    nx: (e.clientX - r.left) / r.width,
    ny: (e.clientY - r.top) / r.height,
    px: (e.clientX - r.left) * (stage.width / r.width),
    py: (e.clientY - r.top) * (stage.height / r.height),
  };
}

function boundsOf(quad) {
  const { w, h } = SIZES[state.size];
  const xs = quad.map((p) => p[0] * w);
  const ys = quad.map((p) => p[1] * h);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

let drag = null;

stage.addEventListener('pointerdown', (e) => {
  if (coverShot) return;
  const pt = stagePoint(e);
  const hit = panelAt(state.layout, pt.nx, pt.ny);
  if (hit >= 0) selected = hit;
  const panel = state.panels[selected];
  const img = panel && panel.photo != null ? photos[panel.photo].img : null;
  drag = { x: pt.px, y: pt.py, panX: panel ? panel.panX : 0, panY: panel ? panel.panY : 0, ox: 0, oy: 0 };
  if (img && panel) {
    const place = photoPlacement(img, boundsOf(LAYOUTS[state.layout].panels[selected]), panel);
    const k = stage.width / SIZES[state.size].w;
    drag.ox = place.ox * k;
    drag.oy = place.oy * k;
  }
  stage.classList.add('dragging');
  stage.setPointerCapture(e.pointerId);
  render();
});

stage.addEventListener('pointermove', (e) => {
  if (!drag || coverShot) return;
  const pt = stagePoint(e);
  const panel = state.panels[selected];
  if (!panel) return;
  if (drag.ox > 0.5) panel.panX = clamp(drag.panX + (pt.px - drag.x) / drag.ox, -1, 1);
  if (drag.oy > 0.5) panel.panY = clamp(drag.panY + (pt.py - drag.y) / drag.oy, -1, 1);
  render();
});

const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

stage.addEventListener('wheel', (e) => {
  if (coverShot) return;
  e.preventDefault();
  const pt = stagePoint(e);
  const hit = panelAt(state.layout, pt.nx, pt.ny);
  if (hit >= 0) selected = hit;
  const panel = state.panels[selected];
  if (!panel) return;
  panel.zoom = clamp(panel.zoom * (e.deltaY < 0 ? 1.08 : 0.925), 1, 3);
  render();
}, { passive: false });

/* Drag-and-drop photo intake. */
for (const name of ['dragenter', 'dragover']) {
  wrap.addEventListener(name, (e) => { e.preventDefault(); wrap.classList.add('over'); });
}
for (const name of ['dragleave', 'drop']) {
  wrap.addEventListener(name, (e) => { e.preventDefault(); wrap.classList.remove('over'); });
}
wrap.addEventListener('drop', (e) => addPhotoFiles([...e.dataTransfer.files]));

/* ---------------- fonts & boot ---------------- */

async function loadFonts() {
  const defs = [
    ['Noto Sans Display Condensed', 'fonts/NotoSansDisplay-CondensedBlack.ttf', '900'],
    ['Noto Sans Display', 'fonts/NotoSansDisplay-Black.ttf', '900'],
    ['Noto Sans', 'fonts/NotoSans-Bold.ttf', '700'],
  ];
  await Promise.all(defs.map(async ([family, url, weight]) => {
    try {
      const face = new FontFace(family, `url(${url})`, { weight });
      await face.load();
      document.fonts.add(face);
    } catch { /* the CSS @font-face declarations are the fallback */ }
  }));
}

function applyShotScalars(shot) {
  if (shot.size && SIZES[shot.size]) state.size = shot.size;
  if (shot.layout && LAYOUTS[shot.layout]) state.layout = shot.layout;
  if (shot.grade && GRADES[shot.grade]) state.grade = shot.grade;
  if (shot.caption != null) state.title = shot.caption;
  if (shot.sub != null) state.subtitle = shot.sub;
}

async function boot() {
  const shot = parseShot();
  if (shot) applyShotScalars(shot);
  buildControls();
  syncPanels();
  render();
  await loadFonts();

  if (shot) {
    const count = panelCount();
    const idxByKey = {};
    for (const key of shotPhotoKeys(shot, count)) {
      idxByKey[key] = await addPhoto(SAMPLE_URLS[key], SAMPLE_NAMES[key] || key, key);
    }
    state.panels = shotPanelKeys(shot, count).map((key) => ({
      photo: idxByKey[key], zoom: 1, panX: 0, panY: 0,
    }));
    if (shot.mode === 'cover') {
      coverShot = true;
      document.body.classList.add('shot-cover');
    }
    buildTray();
    render();
  } else {
    const idx = await addPhoto(SAMPLE_URLS.boulevard, SAMPLE_NAMES.boulevard, 'boulevard');
    state.panels = LAYOUTS[state.layout].panels.map(() => ({ photo: idx, zoom: 1, panX: 0, panY: 0 }));
    render();
  }

  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

boot();

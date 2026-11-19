// Vice Frame — cover rendering engine.
// Pure canvas work: given a state object and a list of loaded images,
// paint a finished cover (panels, grade, lettering) onto a canvas.

export const SIZES = {
  portrait: { w: 1080, h: 1350, label: 'Poster · 1080 × 1350' },
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  wide: { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

// Panel layouts: each panel is a quad of [x, y] points in normalised
// canvas coordinates. Neighbouring panels share seam points so the
// white poster dividers line up exactly.
export const LAYOUTS = {
  blockbuster: {
    name: 'Blockbuster',
    blurb: 'Five-panel poster wall',
    panels: [
      [[0, 0], [1, 0], [1, 0.36], [0, 0.44]],
      [[0, 0.44], [0.54, 0.397], [0.50, 0.72], [0, 0.74]],
      [[0.54, 0.397], [1, 0.36], [1, 0.70], [0.50, 0.72]],
      [[0, 0.74], [0.50, 0.72], [0.50, 1], [0, 1]],
      [[0.50, 0.72], [1, 0.70], [1, 1], [0.50, 1]],
    ],
  },
  trio: {
    name: 'Trio',
    blurb: 'Three angled slices',
    panels: [
      [[0, 0], [0.36, 0], [0.30, 1], [0, 1]],
      [[0.36, 0], [0.68, 0], [0.62, 1], [0.30, 1]],
      [[0.68, 0], [1, 0], [1, 1], [0.62, 1]],
    ],
  },
  showdown: {
    name: 'Showdown',
    blurb: 'Two frames, one diagonal',
    panels: [
      [[0, 0], [1, 0], [0.62, 1], [0, 1]],
      [[1, 0], [1, 1], [0.62, 1]],
    ],
  },
  grid: {
    name: 'Grid Six',
    blurb: 'Comic grid, six frames',
    panels: [
      [[0, 0], [0.5, 0], [0.5, 0.34], [0, 0.34]],
      [[0.5, 0], [1, 0], [1, 0.34], [0.5, 0.34]],
      [[0, 0.34], [0.5, 0.34], [0.5, 0.67], [0, 0.67]],
      [[0.5, 0.34], [1, 0.34], [1, 0.67], [0.5, 0.67]],
      [[0, 0.67], [0.5, 0.67], [0.5, 1], [0, 1]],
      [[0.5, 0.67], [1, 0.67], [1, 1], [0.5, 1]],
    ],
  },
  hero: {
    name: 'Hero',
    blurb: 'One full-bleed frame',
    panels: [
      [[0, 0], [1, 0], [1, 1], [0, 1]],
    ],
  },
};

// Colour grades: a CSS filter pass over the composed collage, an
// optional overlay-blended gradient, a vignette and film grain.
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    blurb: 'Warm orange melt into violet',
    filter: 'saturate(1.38) contrast(1.09) brightness(1.04)',
    overlay: [[0, 'rgba(255,120,40,0.20)'], [0.55, 'rgba(255,45,120,0.10)'], [1, 'rgba(16,8,64,0.28)']],
    vignette: 0.34,
    grain: 0.05,
  },
  neon: {
    name: 'Neon Night',
    blurb: 'Cyan and magenta after dark',
    filter: 'saturate(1.32) contrast(1.16) brightness(0.98)',
    overlay: [[0, 'rgba(0,229,255,0.14)'], [0.5, 'rgba(20,0,60,0.16)'], [1, 'rgba(255,0,128,0.20)']],
    vignette: 0.46,
    grain: 0.07,
  },
  golden: {
    name: 'Golden Hour',
    blurb: 'Honeyed late-afternoon glow',
    filter: 'sepia(0.32) saturate(1.22) contrast(1.06) brightness(1.05)',
    overlay: [[0, 'rgba(255,170,40,0.16)'], [1, 'rgba(80,30,0,0.20)']],
    vignette: 0.30,
    grain: 0.05,
  },
  noir: {
    name: 'Noir',
    blurb: 'Hard black and white',
    filter: 'grayscale(1) contrast(1.24) brightness(1.02)',
    overlay: null,
    vignette: 0.52,
    grain: 0.09,
  },
};

export const TITLE_COLORS = ['#ffffff', '#ffd23f', '#ff5da2', '#39e6ff'];
export const ACCENT_COLORS = ['#ffd23f', '#ff2e88', '#19d3ff', '#ff7847'];

const TITLE_FONT = '"Noto Sans Display Condensed", "Arial Narrow", sans-serif';
const BODY_FONT = '"Noto Sans", system-ui, sans-serif';

function quadBounds(quad, W, H) {
  const xs = quad.map((p) => p[0] * W);
  const ys = quad.map((p) => p[1] * H);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function traceQuad(ctx, quad, W, H) {
  ctx.beginPath();
  quad.forEach(([nx, ny], i) => {
    if (i === 0) ctx.moveTo(nx * W, ny * H);
    else ctx.lineTo(nx * W, ny * H);
  });
  ctx.closePath();
}

// Cover-fit placement of an image inside a panel's bounding box.
// zoom multiplies the cover scale; panX/panY in [-1, 1] slide the
// image across the overflow the cover fit leaves on each axis.
export function photoPlacement(img, bounds, panel) {
  const scale = Math.max(bounds.w / img.naturalWidth, bounds.h / img.naturalHeight) * (panel.zoom || 1);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const ox = Math.max(0, (w - bounds.w) / 2);
  const oy = Math.max(0, (h - bounds.h) / 2);
  return {
    x: bounds.x - ox + (panel.panX || 0) * ox,
    y: bounds.y - oy + (panel.panY || 0) * oy,
    w,
    h,
    ox,
    oy,
  };
}

// Point-in-polygon hit test over a layout's quads, in normalised coords.
export function panelAt(layout, nx, ny) {
  const panels = LAYOUTS[layout].panels;
  for (let i = 0; i < panels.length; i++) {
    const quad = panels[i];
    let inside = false;
    for (let a = 0, b = quad.length - 1; a < quad.length; b = a++) {
      const [ax, ay] = quad[a];
      const [bx, by] = quad[b];
      if ((ay > ny) !== (by > ny) && nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax) {
        inside = !inside;
      }
    }
    if (inside) return i;
  }
  return -1;
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 64);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = c;
  return c;
}

function applyGrade(ctx, canvas, grade, W, H) {
  // Filter pass: snapshot the collage, then draw it back through the filter.
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  tmp.getContext('2d').drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = grade.filter;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  if (grade.overlay) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    for (const [at, color] of grade.overlay) grad.addColorStop(at, color);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (grade.vignette > 0) {
    const r = Math.hypot(W, H) / 2;
    const vg = ctx.createRadialGradient(W / 2, H / 2, r * 0.42, W / 2, H / 2, r);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (grade.grain > 0) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grade.grain;
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

// Split a title into at most two lines, choosing the word boundary
// that best balances the pair. Returns { lines, fontPx } fitted so
// the widest line is at most maxW wide.
function fitTitle(ctx, title, fontPx, maxW) {
  const setFont = (px) => { ctx.font = `900 ${px}px ${TITLE_FONT}`; };
  setFont(fontPx);
  const words = title.split(/\s+/).filter(Boolean);
  let lines = [title];
  if (words.length > 1 && ctx.measureText(title).width > maxW) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (!best || w < best.w) best = { lines: [a, b], w };
    }
    lines = best.lines;
  }
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > maxW) {
    fontPx = Math.floor(fontPx * (maxW / widest));
    setFont(fontPx);
  }
  return { lines, fontPx };
}

function drawLettering(ctx, state, W, H) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const accent = state.accent || '#ffd23f';
  const lineHeightRatio = 0.94;

  let titleBlock = { top: 0, bottom: 0, fontPx: 0 };
  if (title) {
    const basePx = W * 0.128 * (state.titleSize || 1);
    const { lines, fontPx } = fitTitle(ctx, title, basePx, W * 0.92);
    const lineH = fontPx * lineHeightRatio;
    const blockH = fontPx * 0.8 + (lines.length - 1) * lineH; // ascent of first line + extra lines
    let firstBaseline;
    if (state.titlePos === 'top') {
      firstBaseline = H * 0.045 + fontPx * 0.8;
    } else {
      firstBaseline = H - fontPx * 0.30 - (lines.length - 1) * lineH;
    }
    titleBlock = {
      top: firstBaseline - fontPx * 0.8,
      bottom: firstBaseline + (lines.length - 1) * lineH + fontPx * 0.22,
      fontPx,
    };
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => {
      const y = firstBaseline + i * lineH;
      ctx.save();
      ctx.translate(W / 2, y);
      ctx.transform(1, 0, -0.055, 1, 0, 0);
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      // Occluding underlay: a solid silhouette of the whole line,
      // stroked wide enough that the halos of neighbouring glyphs
      // merge into one mass. The lettering is painted last in the
      // render, and this underlay seals the block, so the white
      // panel dividers underneath can never show through the gaps
      // between letters or words and appear to cut the title. The
      // accent copy goes down first, offset, so the hard coloured
      // shadow still peeks out at the lower right.
      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.lineWidth = fontPx * 0.34;
      ctx.strokeText(line, fontPx * 0.055, fontPx * 0.06);
      ctx.fillText(line, fontPx * 0.055, fontPx * 0.06);
      ctx.strokeStyle = '#0a0618';
      ctx.fillStyle = '#0a0618';
      ctx.strokeText(line, 0, 0);
      ctx.fillText(line, 0, 0);
      // Thick dark outline.
      ctx.strokeStyle = '#0a0618';
      ctx.lineWidth = fontPx * 0.17;
      ctx.strokeText(line, 0, 0);
      // Face.
      ctx.fillStyle = state.titleColor || '#ffffff';
      ctx.fillText(line, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  if (subtitle) {
    const subPx = Math.max(14, (titleBlock.fontPx || W * 0.1) * 0.30);
    ctx.save();
    ctx.font = `700 ${subPx}px ${BODY_FONT}`;
    try { ctx.letterSpacing = `${(subPx * 0.35).toFixed(1)}px`; } catch { /* older engines */ }
    const tw = ctx.measureText(subtitle).width;
    const chipW = tw + subPx * 1.7;
    const chipH = subPx * 1.9;
    let chipY;
    if (state.titlePos === 'top') {
      chipY = title ? titleBlock.bottom + subPx * 0.55 : H * 0.05;
    } else {
      chipY = title ? titleBlock.top - chipH - subPx * 0.55 : H - chipH - H * 0.05;
    }
    const chipX = (W - chipW) / 2;
    // Fully opaque: a translucent chip would let a panel divider
    // underneath ghost through the subtitle.
    ctx.fillStyle = '#080516';
    ctx.fillRect(chipX, chipY, chipW, chipH);
    ctx.fillStyle = accent;
    ctx.fillRect(chipX, chipY, chipW, chipH * 0.18);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subtitle, W / 2 + (subPx * 0.35) / 2, chipY + chipH / 2 + chipH * 0.09);
    ctx.restore();
  }
}

// Paint the whole cover. opts.scale fits the canvas backing store to
// the export size times a factor (1 for export, smaller for preview).
// opts.highlight, when a panel index, outlines that panel dashed cyan
// (editor only — never pass it for an export).
export function renderCover(canvas, state, photos, opts = {}) {
  const size = SIZES[state.size] || SIZES.portrait;
  const layout = LAYOUTS[state.layout] || LAYOUTS.blockbuster;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const scale = opts.scale || 1;
  const W = size.w;
  const H = size.h;
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // Backdrop.
  ctx.fillStyle = '#0d0a1e';
  ctx.fillRect(0, 0, W, H);

  // Panels.
  layout.panels.forEach((quad, i) => {
    const panel = state.panels[i] || { photo: null, zoom: 1, panX: 0, panY: 0 };
    const bounds = quadBounds(quad, W, H);
    ctx.save();
    traceQuad(ctx, quad, W, H);
    ctx.clip();
    const img = panel.photo != null ? photos[panel.photo] : null;
    if (img) {
      const p = photoPlacement(img, bounds, panel);
      ctx.drawImage(img, p.x, p.y, p.w, p.h);
    } else {
      const g = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
      g.addColorStop(0, '#241b4d');
      g.addColorStop(1, '#0d0a1e');
      ctx.fillStyle = g;
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `700 ${Math.round(W * 0.02)}px ${BODY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
    }
    ctx.restore();
  });

  // White poster dividers.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(5, W * 0.009);
  ctx.lineJoin = 'round';
  for (const quad of layout.panels) {
    traceQuad(ctx, quad, W, H);
    ctx.stroke();
  }
  ctx.restore();

  applyGrade(ctx, canvas, grade, W, H);

  // Editor selection outline.
  if (opts.highlight != null && layout.panels[opts.highlight]) {
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.strokeStyle = '#19d3ff';
    ctx.lineWidth = Math.max(3, W * 0.0045);
    ctx.setLineDash([W * 0.014, W * 0.009]);
    traceQuad(ctx, layout.panels[opts.highlight], W, H);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawLettering(ctx, state, W, H);
  ctx.restore();
}

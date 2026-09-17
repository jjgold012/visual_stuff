const CURVES = {
  hilbert: {
    key: 'hilbert', label: 'Hilbert',
    axiom: 'A',
    rules: { A: '+BF-AFA-FB+', B: '-AF+BFB+FA-' },
    angle: 90, draw: 'F', shrink: 2, max: 15,
  },
  moore: {
    key: 'moore', label: 'Moore',
    axiom: 'LFL+F+LFL',
    rules: { L: '-RF+LFL+FR-', R: '+LF-RFR-FL+' },
    angle: 90, draw: 'F', shrink: 2, max: 15, closed: false,
  },
  dragon: {
    key: 'dragon', label: 'Dragon',
    axiom: 'FX',
    rules: { X: 'X+YF+', Y: '-FX-Y' },
    angle: 90, draw: 'F', max: 15,
  },
  gosper: {
    key: 'gosper', label: 'Gosper',
    axiom: 'A',
    rules: { A: 'A+B++B-A--AA-B+', B: '-A+BB++B+A--A-B' },
    angle: 60, draw: 'AB', max: 15,
  },
  sierpinski: {
    key: 'sierpinski', label: 'Sierpinski arrowhead',
    axiom: 'A',
    rules: { A: 'B-A-B', B: 'A+B+A' },
    angle: 60, draw: 'AB', max: 15,
  },
  sierpinski_triangle: {
    key: 'sierpinski_triangle', label: 'Sierpinski triangle',
    axiom: 'F-G-G',
    rules: { F: 'F-G+F+G-F', G: 'GG' },
    angle: 120, draw: 'FG', max: 8,
  },
  levy: {
    key: 'levy', label: 'Levy C',
    axiom: 'F',
    rules: { F: '+F--F+' },
    angle: 45, draw: 'F', max: 15,
  },
};

const CMAPS = {
  rainbow: {
    label: 'Rainbow',
    stops: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'],
  },
  rainbow2: {
    label: 'Rainbow2',
    stops: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
  },
  viridis: {
    label: 'Viridis',
    stops: ['#440154', '#482878', '#3e4a89', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
  },
  plasma: {
    label: 'Plasma',
    stops: ['#0d0887', '#42039d', '#7a03ff', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fca636', '#fdca26', '#f0f921'],
  },
  magma: {
    label: 'Magma',
    stops: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d03c', '#fcffa4'],
  },
  inferno: {
    label: 'Inferno',
    stops: ['#000004', '#160b39', '#420a68', '#6a176e', '#932667', '#bc3754', '#dd513a', '#f37819', '#fca50a', '#f6d746', '#fcffa4'],
  },
  grayscale: { label: 'Grayscale', stops: ['#000000', '#ffffff'] },
};

let pts = [];
let segColors = [];
let lwPx = 2;
let fit = null;
let segCount = 0;
let currentN = 5;
let currentKey = 'hilbert';
let customInitialized = false;

function el(id) {
  return document.getElementById(id);
}

function curveSpec() {
  return CURVES[currentKey];
}

function generateSequence(spec, n) {
  const rules = spec.rules;
  let seq = spec.axiom;
  for (let i = 0; i < n; i++) {
    const parts = new Array(seq.length);
    for (let j = 0; j < seq.length; j++) {
      parts[j] = rules[seq[j]] || seq[j];
    }
    seq = parts.join('');
  }
  return seq;
}

function interpretPoints(spec, seq, n) {
  const drawSet = new Set(spec.draw.split(''));
  const stepSize = spec.shrink ? 1 / Math.pow(spec.shrink, n) : 1;
  const rad = (Math.PI * spec.angle) / 180;
  let x = 0, y = 0, a = 0;
  const out = [[0, 0]];
  const stack = [];
  for (let i = 0; i < seq.length; i++) {
    const c = seq[i];
    if (drawSet.has(c)) {
      x += stepSize * Math.cos(a);
      y += stepSize * Math.sin(a);
      out.push([x, y]);
    } else if (c === 'f') {
      x += stepSize * Math.cos(a);
      y += stepSize * Math.sin(a);
    } else if (c === '+') {
      a += rad;
    } else if (c === '-') {
      a -= rad;
    } else if (c === '|') {
      a += Math.PI;
    } else if (c === '[') {
      stack.push([x, y, a]);
    } else if (c === ']') {
      const s = stack.pop();
      x = s[0]; y = s[1]; a = s[2];
    }
  }
  if (spec.closed) out.push(out[0].slice());
  for (const p of out) p[1] = -p[1];
  return out;
}

function octagonizePolyline(points, frac = 0.3) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const A = points[i - 1], B = points[i], C = points[i + 1];
    out.push([(1 - frac) * B[0] + frac * A[0], (1 - frac) * B[1] + frac * A[1]]);
    out.push([(1 - frac) * B[0] + frac * C[0], (1 - frac) * B[1] + frac * C[1]]);
  }
  out.push(points[points.length - 1]);
  return out;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function resolveStops(key) {
  if (key === 'custom') {
    const inputs = el('customStops').querySelectorAll('input[type="color"]');
    const stops = [];
    for (const inp of inputs) stops.push(inp.value);
    return stops.length ? stops : ['#ff0000', '#00ff00', '#0000ff'];
  }
  if (CMAPS[key]) return CMAPS[key].stops;
  return chroma.brewer[key];
}

function cmapOption(value, label) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label || value;
  return opt;
}

function selectHasValue(select, value) {
  const opts = select.querySelectorAll('option');
  for (const o of opts) {
    if (o.value === value) return true;
  }
  return false;
}

function populateCmapSelect() {
  const select = el('cmapSelect');
  const prev = select.value;
  select.innerHTML = '';
  select.appendChild(cmapOption('custom', 'Custom\u2026'));
  for (const key of Object.keys(CMAPS)) {
    select.appendChild(cmapOption(key, CMAPS[key].label));
  }
  const group = document.createElement('optgroup');
  group.label = 'ColorBrewer';
  for (const key of Object.keys(chroma.brewer).sort()) {
    group.appendChild(cmapOption(key));
  }
  select.appendChild(group);
  select.value = selectHasValue(select, prev) ? prev : 'rainbow';
}

function buildSegmentColors(n) {
  const colors = new Array(n);
  if (n === 0) return colors;
  const scale = chroma.scale(resolveStops(el('cmapSelect').value));
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0 : i / (n - 1);
    const c = scale(t).rgb();
    colors[i] = [c[0], c[1], c[2]];
  }
  return colors;
}

function addColorStop(value) {
  const wrap = document.createElement('span');
  wrap.className = 'stop';
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = value;
  inp.addEventListener('input', function () {
    regenerate();
  });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mini';
  btn.textContent = '\u00d7';
  btn.addEventListener('click', function () {
    if (el('customStops').children.length > 1) {
      wrap.remove();
      if (el('cmapSelect').value === 'custom') regenerate();
    }
  });
  wrap.append(inp, btn);
  el('customStops').appendChild(wrap);
}

function initCustomStops() {
  if (customInitialized) return;
  customInitialized = true;
  addColorStop('#e94560');
  addColorStop('#f0a500');
  addColorStop('#2dd4bf');
  el('addStopBtn').addEventListener('click', function () {
    const inputs = el('customStops').querySelectorAll('input[type="color"]');
    const defaults = ['#e94560', '#f0a500', '#2dd4bf', '#818cf8', '#38bdf8', '#34d399'];
    const next = inputs.length < defaults.length ? defaults[inputs.length] : '#e94560';
    addColorStop(next);
    if (el('cmapSelect').value === 'custom') regenerate();
  });
}

function regenerate() {
  const spec = curveSpec();
  const n = currentN;
  const seq = generateSequence(spec, n);
  let raw = interpretPoints(spec, seq, n);
  if (el('smoothCheck').checked) raw = octagonizePolyline(raw, 0.3);
  pts = raw;
  segCount = Math.max(0, pts.length - 1);

  segColors = buildSegmentColors(segCount);

  if (el('autoWidth').checked) {
    lwPx = clamp(80 / Math.sqrt(segCount), 0.5, 20);
  } else {
    lwPx = parseFloat(el('lwSlider').value);
  }

  el('segInfo').textContent = segCount.toLocaleString() + ' segments';

  fit = null;
  redraw();
}

function computeFit() {
  if (fit) return fit;
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const p of pts) {
    if (p[0] < minx) minx = p[0];
    if (p[0] > maxx) maxx = p[0];
    if (p[1] < miny) miny = p[1];
    if (p[1] > maxy) maxy = p[1];
  }
  const padx = (maxx - minx) * 0.05 || 1e-6;
  const pady = (maxy - miny) * 0.05 || 1e-6;
  const left = minx - padx;
  const top = miny - pady;
  const W = maxx - minx + 2 * padx;
  const H = maxy - miny + 2 * pady;
  const s = Math.min(width / W, height / H);
  const ox = (width - W * s) / 2 - left * s;
  const oy = (height - H * s) / 2 - top * s;
  fit = { left, top, W, H, s, ox, oy };
  return fit;
}

function draw() {
  background(10, 10, 30);
  if (segCount <= 0) return;
  const f = computeFit();
  strokeCap(ROUND);
  strokeJoin(ROUND);
  for (let i = 0; i < segCount; i++) {
    const c = segColors[i];
    stroke(c[0], c[1], c[2]);
    strokeWeight(lwPx);
    line(
      pts[i][0] * f.s + f.ox, pts[i][1] * f.s + f.oy,
      pts[i + 1][0] * f.s + f.ox, pts[i + 1][1] * f.s + f.oy
    );
  }
}

function exportSVG() {
  if (segCount <= 0) return;
  const f = computeFit();
  const lwData = (lwPx / f.s).toFixed(4);
  const rgb = (c) =>
    'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  const parts = new Array(segCount);
  for (let i = 0; i < segCount; i++) {
    parts[i] =
      '<line x1="' + pts[i][0] + '" y1="' + pts[i][1] +
      '" x2="' + pts[i + 1][0] + '" y2="' + pts[i + 1][1] +
      '" stroke="' + rgb(segColors[i]) + '" stroke-width="' + lwData +
      '" stroke-linecap="round"/>';
  }
  const svg =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + f.W + '" height="' + f.H +
    '" viewBox="' + f.left + ' ' + f.top + ' ' + f.W + ' ' + f.H + '">\n' +
    parts.join('\n') +
    '\n</svg>';

  const smooth = el('smoothCheck').checked ? '_smooth' : '';
  const name = currentKey + '_curve_' + currentN + smooth + '.svg';
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setCurve(key) {
  currentKey = key;
  const spec = curveSpec();
  currentN = 0;
  const iterSlider = document.getElementById('iterSlider');
  const autoWidth = document.getElementById('autoWidth');
  const smoothCheck = document.getElementById('smoothCheck');
  iterSlider.max = spec.max;
  iterSlider.value = 0;
  document.getElementById('iterValue').textContent = 0;
  smoothCheck.checked = false;
  autoWidth.checked = true;
  regenerate();
}

function setup() {
  const canvas = createCanvas(960, 960);
  canvas.parent('canvas-container');
  noLoop();

  const curveSelect = document.getElementById('curveSelect');
  const iterSlider = document.getElementById('iterSlider');
  const cmapSelect = document.getElementById('cmapSelect');
  const lwSlider = document.getElementById('lwSlider');
  const autoWidth = document.getElementById('autoWidth');
  const smoothCheck = document.getElementById('smoothCheck');

  currentKey = curveSelect.value;
  currentN = parseInt(iterSlider.value);

  populateCmapSelect();
  initCustomStops();
  el('customRow').hidden = cmapSelect.value !== 'custom';

  curveSelect.addEventListener('change', function () {
    setCurve(this.value);
  });

  iterSlider.addEventListener('input', function () {
    currentN = parseInt(this.value);
    document.getElementById('iterValue').textContent = currentN;
    regenerate();
  });

  cmapSelect.addEventListener('change', function () {
    el('customRow').hidden = this.value !== 'custom';
    regenerate();
  });

  lwSlider.addEventListener('input', function () {
    document.getElementById('lwValue').textContent =
      parseFloat(this.value).toFixed(1);
    if (!autoWidth.checked) {
      lwPx = parseFloat(this.value);
      redraw();
    }
  });

  autoWidth.addEventListener('change', function () {
    if (this.checked) {
      regenerate();
    } else {
      lwSlider.value = clamp(lwPx, parseFloat(lwSlider.min), parseFloat(lwSlider.max));
      document.getElementById('lwValue').textContent =
        parseFloat(lwSlider.value).toFixed(1);
      redraw();
    }
  });

  smoothCheck.addEventListener('change', function () {
    regenerate();
  });

  document.getElementById('exportBtn').addEventListener('click', function () {
    exportSVG();
  });

  regenerate();
}
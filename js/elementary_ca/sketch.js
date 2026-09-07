// Elementary Cellular Automaton
// Inspired by the Python notebook implementation

let CELL_SIZE = 2;
let grid;
let cells, steps;
let currentStep = 0;
let running = false;
let ruleTable = {};
let ruleNumber = 150;
let maxSteps;
let canvasWidth, canvasHeight;
let drawBuffer = 0;
let pGraphics; // offscreen buffer for full-resolution export

function getRuleTable(rule) {
  const ruleBin = rule.toString(2).padStart(8, '0').split('').map(Number);
  const table = {};
  for (let i = 0; i < 8; i++) {
    const key = (7 - i).toString(2).padStart(3, '0').split('').map(Number);
    table[key.join('')] = ruleBin[i];
  }
  return table;
}

function elementaryStep(row) {
  const n = row.length;
  const newRow = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const left = row[(i - 1 + n) % n];
    const center = row[i];
    const right = row[(i + 1) % n];
    newRow[i] = ruleTable[`${left}${center}${right}`];
  }
  return newRow;
}

function resetGrid() {
  const w = parseInt(document.getElementById('widthInput').value);
  const h = parseInt(document.getElementById('heightInput').value);

  // Number of cells needed to cover the requested canvas dimensions.
  // Round up so the grid fully spans width/height; canvas clips any overhang,
  // keeping the displayed/exported dimensions exactly equal to the input.
  cells = Math.ceil(w / CELL_SIZE);
  steps = Math.ceil(h / CELL_SIZE);
  canvasWidth = w;
  canvasHeight = h;

  grid = new Array(steps);
  for (let t = 0; t < steps; t++) {
    grid[t] = new Array(cells).fill(0);
  }

  const randomStart = document.getElementById('randomStart').checked;
  if (randomStart) {
    for (let i = 0; i < cells; i++) {
      grid[0][i] = Math.random() < 0.5 ? 1 : 0;
    }
  } else {
    grid[0][Math.floor(cells / 2)] = 1;
  }

  currentStep = 0;
  drawBuffer = 0;
  updateInfo();
}

function rebuildCanvas() {
  CELL_SIZE = parseInt(document.getElementById('cellSizeInput').value) || 2;
  resetGrid();

  // Recreate the on-screen canvas
  const container = document.getElementById('canvas-container');
  // Remove old canvas if any
  const oldCanvas = container.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();

  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container');

  // Create offscreen buffer at same resolution for PNG export
  if (pGraphics) pGraphics.remove();
  pGraphics = createGraphics(canvasWidth, canvasHeight);

  drawGrid();
  updateInfo();
}

function renderFullGridTo(buf) {
  buf.background(10, 10, 30);
  for (let t = 0; t <= currentStep; t++) {
    for (let i = 0; i < cells; i++) {
      if (grid[t][i] === 1) {
        buf.fill(220, 220, 255);
        buf.noStroke();
        buf.rect(i * CELL_SIZE, t * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }
}

function setup() {
  CELL_SIZE = parseInt(document.getElementById('cellSizeInput').value) || 2;
  resetGrid();

  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container');

  pGraphics = createGraphics(canvasWidth, canvasHeight);

  ruleNumber = parseInt(document.getElementById('ruleSlider').value);
  ruleTable = getRuleTable(ruleNumber);

  // --- Event Listeners ---

  function setRule(val) {
    const v = Math.max(0, Math.min(255, parseInt(val) || 0));
    document.getElementById('ruleSlider').value = v;
    document.getElementById('ruleInput').value = v;
    document.getElementById('ruleDisplay').textContent = v;
    ruleNumber = v;
    ruleTable = getRuleTable(v);
    if (!running) {
      resetGrid();
      drawGrid();
    }
  }

  document.getElementById('ruleSlider').addEventListener('input', function () {
    setRule(this.value);
  });

  document.getElementById('ruleInput').addEventListener('input', function () {
    setRule(this.value);
  });

  document.getElementById('ruleInput').addEventListener('change', function () {
    // Clamp value on final commit
    setRule(this.value);
  });

  document.getElementById('randomStart').addEventListener('change', function () {
    if (!running) {
      resetGrid();
      drawGrid();
    }
  });

  document.getElementById('speedSlider').addEventListener('input', function () {
    document.getElementById('speedValue').textContent = this.value;
  });

  document.getElementById('runBtn').addEventListener('click', function () {
    running = !running;
    this.textContent = running ? '⏸ Pause' : '▶ Run';
    if (!running) {
      drawGrid();
    }
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (running) {
      running = false;
      document.getElementById('runBtn').textContent = '▶ Run';
    }
    resetGrid();
    drawGrid();
  });

  document.getElementById('generateBtn').addEventListener('click', function () {
    if (running) {
      running = false;
      document.getElementById('runBtn').textContent = '▶ Run';
    }
    CELL_SIZE = parseInt(document.getElementById('cellSizeInput').value) || 2;
    rebuildCanvas();
  });

  document.getElementById('saveBtn').addEventListener('click', function () {
    // Render the full current state into the offscreen buffer and save
    renderFullGridTo(pGraphics);
    save(pGraphics, `ca_rule_${ruleNumber}_${canvasWidth}x${canvasHeight}`, 'png');
  });

  drawGrid();
}

function draw() {
  if (!running) return;

  const speed = parseInt(document.getElementById('speedSlider').value);
  const framesPerStep = Math.max(1, Math.round(60 / speed));

  drawBuffer++;
  if (drawBuffer < framesPerStep) return;
  drawBuffer = 0;

  if (currentStep < steps - 1) {
    grid[currentStep + 1] = elementaryStep(grid[currentStep]);
    currentStep++;
    updateInfo();
    drawRow(currentStep);
  } else {
    running = false;
    document.getElementById('runBtn').textContent = '▶ Run';
  }
}

function drawRow(row) {
  const y = row * CELL_SIZE;
  for (let x = 0; x < cells; x++) {
    if (grid[row][x] === 1) {
      fill(220, 220, 255);
    } else {
      fill(10, 10, 30);
    }
    noStroke();
    rect(x * CELL_SIZE, y, CELL_SIZE, CELL_SIZE);
  }
}

function drawGrid() {
  background(10, 10, 30);
  for (let t = 0; t <= currentStep; t++) {
    for (let i = 0; i < cells; i++) {
      if (grid[t][i] === 1) {
        fill(220, 220, 255);
        noStroke();
        rect(i * CELL_SIZE, t * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }
}

function updateInfo() {
  document.getElementById('stepsDisplay').textContent = currentStep;
  document.getElementById('dimDisplay').textContent = `${canvasWidth}×${canvasHeight}`;
}
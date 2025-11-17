// Cellular automata seeded from the Begin logo image
// Controls: click to pause/play, 's' step, 'r' reset, 'p' save canvas

let logoImg;
let cols, rows;
let cellSize = 4; // will be adjusted for canvas size
let grid, nextGrid, initialGrid;
let running = true;

function preload() {
  // path is relative to the HTML page (web/begin.html)
  logoImg = loadImage('../sketches/begin/begin-logo.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  initFromImage();
  frameRate(20);
}

function initFromImage() {
  // determine a grid size based on canvas size
  cols = floor(width / cellSize);
  rows = floor(height / cellSize);

  // optionally adjust cellSize to keep the logo detail reasonable on small screens
  if (cols < 100) {
    cellSize = max(2, floor(width / 200));
    cols = floor(width / cellSize);
    rows = floor(height / cellSize);
  }

  // scale logo to grid size for sampling colors/brightness
  let img = logoImg.get();
  img.resize(cols, rows);

  grid = create2D(cols, rows);
  nextGrid = create2D(cols, rows);
  initialGrid = create2D(cols, rows);

  img.loadPixels();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let i = (y * img.width + x) * 4;
      let r = img.pixels[i];
      let g = img.pixels[i + 1];
      let b = img.pixels[i + 2];
      let bright = (r + g + b) / 3;
      // threshold to create an initial binary state; darker pixels -> alive
      let alive = bright < 180 ? 1 : 0;
      grid[x][y] = alive;
      initialGrid[x][y] = alive;
    }
  }
  // keep a copy of the sampled color image for rendering colors
  sampledImg = img; // small image sized to cols x rows
}

function draw() {
  background(20);
  if (running) {
    stepCA();
  }
  renderGrid();
}

function stepCA() {
  // Conway's Game of Life rules (you can tweak these)
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let n = countNeighbors(x, y);
      if (grid[x][y] === 1) {
        // survival
        nextGrid[x][y] = (n === 2 || n === 3) ? 1 : 0;
      } else {
        // birth
        nextGrid[x][y] = (n === 3) ? 1 : 0;
      }
    }
  }
  // swap
  let tmp = grid;
  grid = nextGrid;
  nextGrid = tmp;
}

function renderGrid() {
  noStroke();
  // determine scale to draw cells to fill canvas
  let w = floor(width / cols);
  let h = floor(height / rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (grid[x][y]) {
        // sample color from the resized logo sample image
        let c = sampledImg.get(x, y);
        fill(c);
      } else {
        fill(20);
      }
      rect(x * w, y * h, w + 1, h + 1);
    }
  }
}

function countNeighbors(x, y) {
  let sum = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      let xi = (x + i + cols) % cols;
      let yj = (y + j + rows) % rows;
      sum += grid[xi][yj];
    }
  }
  return sum;
}

function mousePressed() {
  running = !running;
}

function keyPressed() {
  if (key === 's') {
    stepCA();
    redraw();
  } else if (key === 'r') {
    // reset to initial state
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) grid[x][y] = initialGrid[x][y];
  } else if (key === 'p') {
    saveCanvas('begin-ca-' + nf(year(),4) + nf(month(),2) + nf(day(),2) + '-' + nf(hour(),2) + nf(minute(),2) + nf(second(),2), 'png');
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initFromImage();
}

function create2D(c, r) {
  let a = new Array(c);
  for (let i = 0; i < c; i++) {
    a[i] = new Array(r).fill(0);
  }
  return a;

}

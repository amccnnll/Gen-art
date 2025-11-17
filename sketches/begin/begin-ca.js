// Cellular automata seeded from the Begin logo image
// Controls: click to pause/play, 's' step, 'r' reset, 'p' save canvas

let logoImg;
let sampledImg;
let cols = 0, rows = 0;
let cellSize = 4; // will be adjusted for canvas size
let grid, nextGrid, initialGrid;
let running = true;

function preload() {
  // path is relative to the HTML page (web/begin-ca.html)
  logoImg = loadImage('../sketches/begin/begin-logo.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  initFromImage();
  frameRate(20);
}

function initFromImage() {
  // ensure sensible minimums
  cellSize = max(2, cellSize);
  cols = max(2, floor(width / cellSize));
  rows = max(2, floor(height / cellSize));

  // scale logo to grid size for sampling colors/brightness
  let img = logoImg.get();
  img.resize(cols, rows);

  grid = create2D(cols, rows);
  nextGrid = create2D(cols, rows);
  initialGrid = create2D(cols, rows);

  img.loadPixels();
  // compute average brightness to choose an adaptive threshold
  let sumBright = 0;
  let sumAlpha = 0;
  for (let i = 0; i < img.pixels.length; i += 4) {
    let r = img.pixels[i];
    let g = img.pixels[i + 1];
    let b = img.pixels[i + 2];
    let a = img.pixels[i + 3];
    sumBright += (r + g + b) / 3;
    sumAlpha += a;
  }
  let avgBright = sumBright / (cols * rows);
  let avgAlpha = sumAlpha / (cols * rows);
  let threshold = avgBright * 0.95; // slightly darker than average
  let alphaCutoff = max(16, floor(avgAlpha * 0.25)); // treat near-transparent pixels as background

  let aliveCount = 0;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let i = (y * img.width + x) * 4;
      let r = img.pixels[i];
      let g = img.pixels[i + 1];
      let b = img.pixels[i + 2];
      let a = img.pixels[i + 3];
      let bright = (r + g + b) / 3;
      // if pixel is transparent (alpha below cutoff) treat it as background
      let alive = 0;
      if (a >= alphaCutoff) {
        // adaptive threshold: darker-than-average -> alive
        alive = bright < threshold ? 1 : 0;
      } else {
        alive = 0;
      }
      grid[x][y] = alive;
      initialGrid[x][y] = alive;
      if (alive) aliveCount++;
    }
  }

  // fallback: if no alive cells, invert threshold or add random seeds (respecting alpha)
  if (aliveCount === 0) {
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let i = (y * img.width + x) * 4;
        let r = img.pixels[i];
        let g = img.pixels[i + 1];
        let b = img.pixels[i + 2];
        let a = img.pixels[i + 3];
        let bright = (r + g + b) / 3;
        if (a >= alphaCutoff) {
          let alive = bright > threshold ? 1 : 0;
          grid[x][y] = alive;
          initialGrid[x][y] = alive;
          if (alive) aliveCount++;
        } else {
          grid[x][y] = 0;
          initialGrid[x][y] = 0;
        }
      }
    }
  }
  if (aliveCount === 0) {
    // final fallback: sprinkle a few random seeds only where alpha is sufficient
    for (let i = 0; i < floor(cols * rows * 0.01); i++) {
      let rx = floor(random(cols));
      let ry = floor(random(rows));
      let ai = (ry * img.width + rx) * 4 + 3;
      if (img.pixels[ai] >= alphaCutoff) {
        grid[rx][ry] = 1;
        initialGrid[rx][ry] = 1;
      }
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
  let w = max(1, floor(width / cols));
  let h = max(1, floor(height / rows));
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

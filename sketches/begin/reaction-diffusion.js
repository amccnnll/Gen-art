// Gray-Scott Reaction-Diffusion (CPU) seeded from the Begin logo alpha
// Controls: click to pause/play, 's' step, 'r' reset, 'p' save, +/- adjust speed

let logoImg;
let gridA, gridB, nextA, nextB;
let cols = 200, rows = 200; // compute based on canvas size
let scaleFactor = 1; // how many screen pixels per grid cell
let running = true;
let stepsPerFrame = 1;

// default Gray-Scott params (good starting point)
let dA = 1.0;
let dB = 0.5;
let feed = 0.036;
let kill = 0.064;
let dt = 1.0;

function preload() {
  logoImg = loadImage('../sketches/begin/begin-logo.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  // pick a grid size based on the smallest canvas dimension, capped
  let target = constrain(floor(min(width, height) / 3), 80, 300);
  cols = rows = target;
  scaleFactor = floor(min(width / cols, height / rows));

  initGrids();
  seedFromLogo();
  frameRate(30);
}

function initGrids() {
  gridA = make2D(cols, rows, 1.0);
  gridB = make2D(cols, rows, 0.0);
  nextA = make2D(cols, rows, 0.0);
  nextB = make2D(cols, rows, 0.0);
}

function seedFromLogo() {
  // resize logo to grid and use alpha to seed B concentration
  let img = logoImg.get();
  img.resize(cols, rows);
  img.loadPixels();
  let alphaSum = 0;
  for (let i = 3; i < img.pixels.length; i += 4) alphaSum += img.pixels[i];
  let avgAlpha = alphaSum / (cols * rows);
  let alphaCut = max(8, floor(avgAlpha * 0.5));

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let i = (y * img.width + x) * 4 + 3;
      let a = img.pixels[i];
      if (a >= alphaCut) {
        // give some B where logo is opaque; randomize intensity a bit
        gridB[x][y] = random(0.6, 1.0);
        gridA[x][y] = 1.0 - gridB[x][y] * 0.5;
      } else {
        gridB[x][y] = 0.0;
        gridA[x][y] = 1.0;
      }
    }
  }
}

function draw() {
  background(250);
  if (running) {
    for (let i = 0; i < stepsPerFrame; i++) step();
  }
  render();
  drawOverlay();
}

function step() {
  for (let x = 1; x < cols - 1; x++) {
    for (let y = 1; y < rows - 1; y++) {
      let a = gridA[x][y];
      let b = gridB[x][y];
      let lapA = laplacian(gridA, x, y);
      let lapB = laplacian(gridB, x, y);
      let reaction = a * b * b;
      let newA = a + (dA * lapA - reaction + feed * (1 - a)) * (dt * 0.5);
      let newB = b + (dB * lapB + reaction - (kill + feed) * b) * (dt * 0.5);
      nextA[x][y] = constrain(newA, 0, 1);
      nextB[x][y] = constrain(newB, 0, 1);
    }
  }
  // swap grids
  let tA = gridA; gridA = nextA; nextA = tA;
  let tB = gridB; gridB = nextB; nextB = tB;
}

function laplacian(arr, x, y) {
  // simple 3x3 Laplacian kernel
  let sum = 0;
  sum += arr[x][y] * -1;
  sum += arr[x-1][y] * 0.2;
  sum += arr[x+1][y] * 0.2;
  sum += arr[x][y-1] * 0.2;
  sum += arr[x][y+1] * 0.2;
  sum += arr[x-1][y-1] * 0.05;
  sum += arr[x+1][y-1] * 0.05;
  sum += arr[x-1][y+1] * 0.05;
  sum += arr[x+1][y+1] * 0.05;
  return sum;
}

function render() {
  loadPixels();
  let w = scaleFactor;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let a = gridA[x][y];
      let b = gridB[x][y];
      // color mapping: use B concentration to modulate a palette
      let v = constrain((b - a), -1, 1);
      // palette mapping: map v to color
      let c = color(map(v, -1, 1, 20, 255), map(v, -1, 1, 10, 100), map(v, -1, 1, 40, 200));
      fill(c);
      noStroke();
      rect(x * w, y * w, w, w);
    }
  }
  updatePixels();
}

function drawOverlay() {
  push();
  noStroke();
  fill(20, 220); // dark text for pale background
  textSize(12);
  textAlign(LEFT, TOP);
  text(`RD — feed:${nf(feed,1,4)} kill:${nf(kill,1,4)} dA:${nf(dA,1,2)} dB:${nf(dB,1,2)} speed:${stepsPerFrame}`, 8, 8);
  pop();
}

function make2D(c, r, v) {
  let a = new Array(c);
  for (let i = 0; i < c; i++) {
    a[i] = new Array(r);
    for (let j = 0; j < r; j++) a[i][j] = v;
  }
  return a;
}

function mousePressed() {
  running = !running;
}

function keyPressed() {
  if (key === 's') {
    step();
    redraw();
  } else if (key === 'r') {
    initGrids();
    seedFromLogo();
  } else if (key === 'p') {
    saveCanvas('begin-rd-' + nf(year(),4) + nf(month(),2) + nf(day(),2) + '-' + nf(hour(),2) + nf(minute(),2) + nf(second(),2), 'png');
  } else if (key === '+') {
    stepsPerFrame = min(10, stepsPerFrame + 1);
  } else if (key === '-') {
    stepsPerFrame = max(1, stepsPerFrame - 1);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let target = constrain(floor(min(width, height) / 3), 80, 300);
  cols = rows = target;
  scaleFactor = floor(min(width / cols, height / rows));
  initGrids();
  seedFromLogo();
}

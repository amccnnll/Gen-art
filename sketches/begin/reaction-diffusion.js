// Gray-Scott Reaction-Diffusion (CPU) seeded from the Begin logo alpha
// Controls: click to pause/play, 's' step, 'r' reset, 'p' save, +/- adjust speed

let logoImg;
let gridA, gridB, nextA, nextB;
let cols = 200, rows = 200; // compute based on canvas size
let scaleFactor = 1; // how many screen pixels per grid cell
let running = false; // start paused — begin only when user requests
let stepsPerFrame = 1;

// offsets to center the (square) simulation grid on a possibly widescreen canvas
let offsetX = 0, offsetY = 0;

// per-cell params / masks
let feedMap, killMap, redMask;
// color balance: 0 = default (cool), 1 = red. This value will diffuse along with B.
let colorBalance, nextColorBalance;
// masks and UI state
let logoMask; // true where logo alpha >= cutoff
// capture helpers
let capturer = null;
let recording = false;

// default Gray-Scott params (good starting point)
let dA = 1.0;
let dB = 0.5;
let feed = 0.036;
let kill = 0.064;
let dt = 1.0;
// presets to try for different behavior (1..5)
let presets = [
  {name: 'calm', dA:1.0, dB:0.5, feed:0.036, kill:0.064},
  {name: 'spiral', dA:1.0, dB:0.5, feed:0.018, kill:0.052},
  {name: 'worms', dA:1.0, dB:0.5, feed:0.025, kill:0.060},
  {name: 'chaotic', dA:1.0, dB:0.6, feed:0.030, kill:0.055},
  {name: 'explosive', dA:0.9, dB:0.8, feed:0.020, kill:0.046}
];
let currentPreset = 0;

function preload() {
  logoImg = loadImage('../sketches/begin/begin-logo.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  // pick a grid size based on the smallest canvas dimension, capped
  // keep the original 'target' as the logo height/width and make the simulation
  // twice as wide so we can place the logo on the right and leave the left half empty
  let target = constrain(floor(min(width, height) / 3), 80, 300);
  rows = target;
  cols = target * 2; // double width
  scaleFactor = max(1, floor(min(width / cols, height / rows)));

  // right-align the grid: offsetX positions the full grid so its right edge matches the canvas
  offsetX = floor(max(0, width - cols * scaleFactor));
  // vertically center the grid
  offsetY = floor((height - rows * scaleFactor) / 2);

  applyPreset(0);
  initGrids();
  seedFromLogo();
  frameRate(30);
  // prepare CCapture (will be available since runner includes CCapture script)
  if (window.CCapture) {
    try {
      capturer = new CCapture({ format: 'webm', framerate: 30, verbose: false });
    } catch (e) {
      capturer = null;
      console.warn('CCapture not available:', e);
    }
  }
}

function initGrids() {
  gridA = make2D(cols, rows, 1.0);
  gridB = make2D(cols, rows, 0.0);
  nextA = make2D(cols, rows, 0.0);
  nextB = make2D(cols, rows, 0.0);
  colorBalance = make2D(cols, rows, 0.0);
  nextColorBalance = make2D(cols, rows, 0.0);
}

function seedFromLogo() {
  // We'll place the logo into the right half of the doubled-width grid.
  // Resize the logo to the original 'target' width (rows) and keep it aligned to the right.
  let img = logoImg.get();
  // logo will nominally occupy 'logoCols' columns on the right
  let logoCols = floor(cols / 2);
  // compute how many extra grid columns correspond to ~50 screen pixels
  let extraRightPx = 50; // desired extra transparent padding in screen pixels
  let extraRightCols = max(0, ceil(extraRightPx / max(1, scaleFactor)));
  // ensure we don't overflow the grid
  extraRightCols = min(extraRightCols, cols - logoCols);
  // resize the image to the original logo width (without the extra transparent pad)
  img.resize(logoCols, rows);
  img.loadPixels();
  // compute avg alpha over the actual logo pixels only
  let alphaSum = 0;
  for (let i = 3; i < img.pixels.length; i += 4) alphaSum += img.pixels[i];
  let avgAlpha = alphaSum / (logoCols * rows);
  let alphaCut = max(8, floor(avgAlpha * 0.5));
  // initialize per-cell param maps and mask
  feedMap = make2D(cols, rows, feed);
  killMap = make2D(cols, rows, kill);
  redMask = make2D(cols, rows, 0);
  logoMask = make2D(cols, rows, false);

  // compute the x offset where the logo begins (right-aligned), leaving extra transparent padding on the right
  let logoOffsetX = cols - (logoCols + extraRightCols);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      // if x is in the left (extended) area, treat as transparent/background
      if (x < logoOffsetX) {
        var r = 250, g = 250, b = 250, a = 0;
      } else {
        let ix = x - logoOffsetX;
        // if we're in the extra transparent padding area to the right of the logo, treat as transparent
        if (ix >= img.width) {
          var r = 250, g = 250, b = 250, a = 0;
        } else {
          let i = (y * img.width + ix) * 4;
          var r = img.pixels[i];
          var g = img.pixels[i + 1];
          var b = img.pixels[i + 2];
          var a = img.pixels[i + 3];
        }
      }
      if (a >= alphaCut) {
        logoMask[x][y] = true;
        // detect red-ish pixels (preferential treatment)
        let isRed = (r > 130 && r > g * 1.2 && r > b * 1.2) || (r > 160 && g < 100);
        if (isRed) {
          redMask[x][y] = 1;
          // stronger B seed and slightly different local params for more activity
          gridB[x][y] = random(0.7, 1.0);
          gridA[x][y] = 1.0 - gridB[x][y] * 0.3;
          feedMap[x][y] = max(0.005, feed * 0.8); // slightly lower feed
          killMap[x][y] = max(0.02, kill * 0.9); // slightly lower kill -> more persistence
          colorBalance[x][y] = 1.0; // start red
        } else {
          // regular logo area
          gridB[x][y] = random(0.3, 0.7);
          gridA[x][y] = 1.0 - gridB[x][y] * 0.5;
          feedMap[x][y] = feed;
          killMap[x][y] = kill;
          colorBalance[x][y] = 0.0;
        }
      } else {
        logoMask[x][y] = false;
        // transparent/background area (including left extension): give a small seed so it can react/invade
        gridB[x][y] = random(0.02, 0.12);
        gridA[x][y] = 1.0 - gridB[x][y] * 0.5;
        // make background slightly more receptive: slightly higher feed, slightly lower kill
        feedMap[x][y] = feed * 1.05;
        killMap[x][y] = max(0.01, kill * 0.95);
        colorBalance[x][y] = 0.0;
      }
    }
  }
}

// (no-op) parameter-map updates are handled during seeding; sliders removed

function draw() {
  background(250);
  if (running) {
    for (let i = 0; i < stepsPerFrame; i++) step();
  }
  render();
  drawOverlay();
  // capture current canvas frame if recording
  if (recording && capturer) {
    // pass the canvas element to CCapture
    let cnv = document.querySelector('canvas');
    if (cnv) capturer.capture(cnv);
  }
}

function step() {
  for (let x = 1; x < cols - 1; x++) {
    for (let y = 1; y < rows - 1; y++) {
      let a = gridA[x][y];
      let b = gridB[x][y];
      let lapA = laplacian(gridA, x, y);
      let lapB = laplacian(gridB, x, y);
      let reaction = a * b * b;
      // use local feed/kill if present
      let f = feedMap && feedMap[x] ? feedMap[x][y] : feed;
      let k = killMap && killMap[x] ? killMap[x][y] : kill;
      let newA = a + (dA * lapA - reaction + f * (1 - a)) * (dt * 0.5);
      let newB = b + (dB * lapB + reaction - (k + f) * b) * (dt * 0.5);
      nextA[x][y] = constrain(newA, 0, 1);
      nextB[x][y] = constrain(newB, 0, 1);
    }
  }
  // stabilize edges: copy current edge cells into next arrays to avoid flicker
  for (let x = 0; x < cols; x++) {
    nextA[x][0] = gridA[x][0];
    nextB[x][0] = gridB[x][0];
    nextA[x][rows-1] = gridA[x][rows-1];
    nextB[x][rows-1] = gridB[x][rows-1];
  }
  for (let y = 0; y < rows; y++) {
    nextA[0][y] = gridA[0][y];
    nextB[0][y] = gridB[0][y];
    nextA[cols-1][y] = gridA[cols-1][y];
    nextB[cols-1][y] = gridB[cols-1][y];
  }

  // swap grids
  let tA = gridA; gridA = nextA; nextA = tA;
  let tB = gridB; gridB = nextB; nextB = tB;

  // small random perturbations to keep the system lively (original values)
  let sprinkle = max(1, floor(cols * rows * 0.0006));
  for (let k = 0; k < sprinkle; k++) {
    if (random() < 0.5) continue;
    let rx = floor(random(1, cols-1));
    let ry = floor(random(1, rows-1));
    gridB[rx][ry] = min(1, gridB[rx][ry] + random(0.05, 0.4));
  }

  // diffuse colorBalance along with B using a weighted neighborhood average
  for (let x = 1; x < cols - 1; x++) {
    for (let y = 1; y < rows - 1; y++) {
      // weights matching laplacian kernel
      let wSelf = 1.0;
      let wOrtho = 0.2;
      let wDiag = 0.05;
      // use nextB values (post-step) to weight contribution
      let denom = 0.0;
      let numer = 0.0;
      // self
      denom += wSelf * nextB[x][y];
      numer += wSelf * nextB[x][y] * colorBalance[x][y];
      // ortho neighbors
      let nx, ny, cb, bv;
      nx = x-1; ny = y; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wOrtho * bv; numer += wOrtho * bv * cb;
      nx = x+1; ny = y; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wOrtho * bv; numer += wOrtho * bv * cb;
      nx = x; ny = y-1; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wOrtho * bv; numer += wOrtho * bv * cb;
      nx = x; ny = y+1; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wOrtho * bv; numer += wOrtho * bv * cb;
      // diag neighbors
      nx = x-1; ny = y-1; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wDiag * bv; numer += wDiag * bv * cb;
      nx = x+1; ny = y-1; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wDiag * bv; numer += wDiag * bv * cb;
      nx = x-1; ny = y+1; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wDiag * bv; numer += wDiag * bv * cb;
      nx = x+1; ny = y+1; bv = nextB[nx][ny]; cb = colorBalance[nx][ny]; denom += wDiag * bv; numer += wDiag * bv * cb;
      if (denom > 0.0001) nextColorBalance[x][y] = constrain(numer / denom, 0, 1);
      else nextColorBalance[x][y] = colorBalance[x][y];
    }
  }
  // swap color balances
  let tc = colorBalance; colorBalance = nextColorBalance; nextColorBalance = tc;
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
  let w = scaleFactor;
  noStroke();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let a = gridA[x][y];
      let b = gridB[x][y];
      // color mapping: use B concentration to modulate a palette
      let v = constrain((b - a), -1, 1);
      // color mix based on colorBalance (diffusing red fraction)
      let mix = 0;
      if (colorBalance && colorBalance[x]) mix = colorBalance[x][y];
      else if (redMask && redMask[x]) mix = redMask[x][y] ? 1 : 0;
      // red palette
      let crR = map(v, -1, 1, 150, 255);
      let cgR = map(v, -1, 1, 20, 100);
      let cbR = map(v, -1, 1, 20, 80);
      // cool palette
      let crC = map(v, -1, 1, 20, 200);
      let cgC = map(v, -1, 1, 30, 140);
      let cbC = map(v, -1, 1, 80, 255);
      let cr = lerp(crC, crR, mix);
      let cg = lerp(cgC, cgR, mix);
      let cb = lerp(cbC, cbR, mix);
      fill(cr, cg, cb);
      rect(offsetX + x * w, offsetY + y * w, w, w);
    }
  }
}

function drawOverlay() {
  push();
  noStroke();
  fill(20, 220); // dark text for pale background
  textSize(12);
  textAlign(LEFT, TOP);
  // add some debug info: grid size, preset and whether B has any nonzero values
  let hasB = 0;
  for (let x = 0; x < cols && !hasB; x++) {
    for (let y = 0; y < rows; y++) {
      if (gridB[x][y] > 0.001) { hasB = 1; break; }
    }
  }
  // count red cells
  let redCount = 0;
  if (redMask) {
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) if (redMask[x][y]) redCount++;
  }
  text(`RD (${presets[currentPreset].name}) — ${cols}x${rows} feed:${nf(feed,1,4)} kill:${nf(kill,1,4)} speed:${stepsPerFrame} B:${hasB ? 'yes' : 'no'} red:${redCount}`, 8, 8);
  pop();
}

function applyPreset(i) {
  i = constrain(i, 0, presets.length - 1);
  currentPreset = i;
  dA = presets[i].dA;
  dB = presets[i].dB;
  feed = presets[i].feed;
  kill = presets[i].kill;
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
  // space toggles run/pause
  if (key === ' ') {
    running = !running;
    return;
  }
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
  } else if (key >= '1' && key <= '5') {
    // apply a preset (1-5)
    applyPreset(int(key) - 1);
  } else if (key === 'i') {
    // force a random injection
    for (let k = 0; k < 10; k++) {
      let rx = floor(random(2, cols-2));
      let ry = floor(random(2, rows-2));
      gridB[rx][ry] = 1;
    }
  } else if (key === 'R') {
    // toggle recording with CCapture (capital R)
    if (!capturer) {
      console.warn('Capturer not available in this environment');
      return;
    }
    if (!recording) {
      // ensure animation is running while recording
      if (!running) running = true;
      try {
        capturer.start();
        recording = true;
        console.log('Recording started (press R to stop)');
      } catch (e) {
        console.error('Failed to start capturer', e);
      }
    } else {
      try {
        recording = false;
        capturer.stop();
        capturer.save();
        console.log('Recording stopped and saved');
      } catch (e) {
        console.error('Failed to stop/save capturer', e);
      }
    }
  }
}

function mouseDragged() {
  // inject B at mouse position to perturb the field
  let gx = floor((mouseX - offsetX) / scaleFactor);
  let gy = floor((mouseY - offsetY) / scaleFactor);
  if (gx > 0 && gy > 0 && gx < cols-1 && gy < rows-1) {
    gridB[gx][gy] = 1.0;
    gridA[gx][gy] = 0.0;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let target = constrain(floor(min(width, height) / 3), 80, 300);
  rows = target;
  cols = target * 2;
  scaleFactor = floor(min(width / cols, height / rows));
  scaleFactor = max(1, scaleFactor);
  // right-align the grid
  offsetX = floor(max(0, width - cols * scaleFactor));
  offsetY = floor((height - rows * scaleFactor) / 2);
  initGrids();
  seedFromLogo();
  // sliders removed; nothing to reposition
}

// sliders removed

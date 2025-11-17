let palette;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noLoop();
  palette = [
    color('#0f172a'),
    color('#06b6d4'),
    color('#f472b6')
  ];
  drawNoiseField();
}

function drawNoiseField() {
  background(palette[0]);
  noiseDetail(4, 0.5);
  loadPixels();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let n = noise(x * 0.0025, y * 0.0025);
      // interpolate between two colors
      let c = lerpColor(palette[1], palette[2], n);
      set(x, y, c);
    }
  }
  updatePixels();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}

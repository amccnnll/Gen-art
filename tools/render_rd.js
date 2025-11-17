#!/usr/bin/env node
// tools/render_rd.js
// Automated renderer: loads a running sketch page with Puppeteer, calls step()/render(),
// saves PNG frames and (optionally) invokes ffmpeg to make an MP4.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer');
const argv = require('minimist')(process.argv.slice(2));

async function run() {
  const url = argv.url || 'http://localhost:8080/reaction-diffusion.html';
  const frames = parseInt(argv.frames || '300', 10);
  const outDir = argv.outDir || 'outputs/frames';
  const width = parseInt(argv.width || '1280', 10);
  const height = parseInt(argv.height || '720', 10);
  const fps = parseInt(argv.fps || '30', 10);
  const mp4 = argv.out || null; // if provided, run ffmpeg to create MP4

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Launching headless browser to ${url}`);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Ensure the sketch is ready: wait for a canvas element
  await page.waitForSelector('canvas');

  // Pause the sketch if it's running and expose step/render if needed.
  await page.evaluate(() => {
    // Pause automatic play if the sketch set global `running`.
    if (typeof window.running !== 'undefined') window.running = false;
    // expose simple no-op if functions missing
    if (typeof window.step !== 'function') window.step = function(){};
    if (typeof window.render !== 'function') window.render = function(){};
  });

  console.log('Beginning render loop: saving frames to', outDir);

  for (let i = 0; i < frames; i++) {
    // call step()+render() inside page context
    await page.evaluate(() => {
      // call step/render if defined by the sketch
      try { if (typeof step === 'function') step(); } catch(e) { console.error('step error', e); }
      try { if (typeof render === 'function') render(); } catch(e) { console.error('render error', e); }
    });

    // get dataURL of canvas
    const data = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c.toDataURL('image/png');
    });

    const base64 = data.replace(/^data:image\/png;base64,/, '');
    const filename = path.join(outDir, `frame_${String(i+1).padStart(5,'0')}.png`);
    fs.writeFileSync(filename, base64, 'base64');
    if ((i+1) % Math.max(1, Math.floor(frames/10)) === 0) console.log(`Saved ${i+1}/${frames}`);
  }

  await browser.close();
  console.log('Frames saved.');

  if (mp4) {
    // attempt to run ffmpeg to assemble frames into mp4
    const mp4Path = mp4;
    console.log('Assembling frames into MP4:', mp4Path);
    const args = [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(outDir, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '18',
      mp4Path
    ];
    const res = spawnSync('ffmpeg', args, { stdio: 'inherit' });
    if (res.error) {
      console.error('ffmpeg failed:', res.error.message);
      console.log('Frames are available in', outDir);
    } else {
      console.log('MP4 created at', mp4Path);
    }
  } else {
    console.log('No --out provided; skipping mp4 assembly. Use ffmpeg manually:');
    console.log(`ffmpeg -framerate ${fps} -i ${path.join(outDir,'frame_%05d.png')} -c:v libx264 -pix_fmt yuv420p -crf 18 output.mp4`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });

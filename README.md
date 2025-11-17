# gen-art

Lightweight setup for p5.js generative-art experiments.

Project layout

- `web/`: small web runner (open `web/index.html`) to view sketches in the browser.
- `sketches/`: individual sketch folders (each sketch gets its own folder).
- `resources/`: images, audio, data, fonts used by sketches.
- `outputs/`: rendered exports (intentionally git-ignored).
- `.gitignore`: OS/editor and outputs exclusions.
- `package.json`: convenience scripts to run a local static server.

Ideas to try

- Perlin/noise landscapes, cellular automata, reaction-diffusion, particle systems with attractors, shader experiments.

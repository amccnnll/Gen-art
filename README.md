# gen-art

Lightweight scaffold for p5.js generative-art experiments.

Project layout

- `web/`: small web runner (open `web/index.html`) to view sketches in the browser.
- `sketches/`: individual sketch folders (each sketch gets its own folder).
- `resources/`: images, audio, data, fonts used by sketches.
- `outputs/`: rendered exports (intentionally git-ignored).
- `.gitignore`: OS/editor and outputs exclusions.
- `package.json`: convenience scripts to run a local static server.

Quick start

1. Serve the `web/` folder (recommended). Example using `npx http-server`:

```bash
npm install --no-save http-server
npx http-server web -p 8080
# then open http://localhost:8080
```

2. Or just open `web/index.html` in your browser (some features may require a server).

Create a new sketch

- Add a folder under `sketches/` (e.g. `sketches/my-cool-sketch/`)
- Add `sketch.js` and any resources, then update `web/index.html` to load it.

GitHub setup

- Initialize a local repo and commit: `git init && git add . && git commit -m "Initial scaffold"`
- Create remote with `gh` (optional): `gh repo create <USER>/gen-art --public --source=. --remote=origin --push`
- Or create a repo on github.com and run: `git remote add origin git@github.com:<USER>/gen-art.git && git branch -M main && git push -u origin main`

Ideas to try

- Perlin/noise landscapes, cellular automata, reaction-diffusion, particle systems with attractors, shader experiments.

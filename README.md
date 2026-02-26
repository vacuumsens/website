# VSENS — Project Presentation Site

Modular Vacuum & Temperature Monitoring System for IR Testing Dewars.

Static site deployable directly to GitHub Pages. No build step required.

---

## Files

```
vsens/
├── index.html   # Main site
├── styles.css   # All styles
├── script.js    # Interactivity, simulations, animations
└── README.md
```

---

## Deploy to GitHub Pages

### Option A — `/docs` folder

1. Create a GitHub repo (e.g., `vsens-site`)
2. Copy all files into a `/docs` folder in the repo:
   ```
   your-repo/
   └── docs/
       ├── index.html
       ├── styles.css
       └── script.js
   ```
3. Go to **Settings → Pages**
4. Source: **Deploy from branch**
5. Branch: `main`, Folder: `/docs`
6. Save → site live at `https://<username>.github.io/vsens-site/`

### Option B — Root of `main` branch

1. Push all files to the root of your `main` branch
2. Go to **Settings → Pages**
3. Source: **Deploy from branch**, Branch: `main`, Folder: `/` (root)
4. Save

### Option C — `gh-pages` branch

```bash
git checkout --orphan gh-pages
git rm -rf .
# copy site files here
git add index.html styles.css script.js README.md
git commit -m "deploy"
git push origin gh-pages
```
Then set GitHub Pages to deploy from `gh-pages` branch.

---

## Local Preview

Open `index.html` directly in a browser — no local server needed.

Or use Python's built-in server:
```bash
cd vsens/
python3 -m http.server 8080
# open http://localhost:8080
```

---

## Features

- Dark/light mode toggle (persists via localStorage)
- Interactive PID simulator with Kp/Ki/Kd sliders
- Animated vacuum gauge with simulated live readout
- Animated data flow packets along pipeline diagram
- Live telemetry strip (simulated)
- Terminal-style log window
- Expandable architecture layers
- Scroll reveal animations
- Responsive layout
- Test validation plots (canvas-drawn)
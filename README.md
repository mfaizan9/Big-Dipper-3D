# Big Dipper in Three Dimensions — HTML5

An accessible HTML5 rebuild of the legacy Flash (ActionScript 1) *Big Dipper in
Three Dimensions* simulator, built on the shared KL‑UNL foundation.

## ⚠️ It must be served over HTTP — double‑clicking `index.html` will NOT work

The KL‑UNL masthead component (`foundation/kl-unl-masthead.js`) loads the page
title and the Help/About text with `fetch('foundation/contents.json')`.
Browsers block `fetch()` of local files under the `file://` protocol (the
same‑origin security policy), so if you open `index.html` by double‑clicking it,
the masthead comes up **empty/broken** and the title, Help and About buttons do
not appear. Served over HTTP everything loads normally.

## How to run it locally

Open a terminal **inside this `html5/` folder** and start any static server:

```sh
# Python 3
python3 -m http.server 8123
# then open  http://localhost:8123/

# Node
npx serve
# or
npx http-server
```

VS Code users can instead use the **Live Server** extension (right‑click
`index.html` → *Open with Live Server*).

Because you are serving from **inside** `html5/`, the simulation is at the
server root — open `http://localhost:8123/`, **not** `.../html5/index.html`.

## Production

When deployed to the cloud host (served over HTTP/HTTPS) it just works — the
`file://` limitation only affects local double‑clicking.

## What it does

Earth sits at the left. Faint sight‑lines run from Earth out to a patch of the
celestial sphere carrying a right‑ascension / declination grid. Black dots mark
each of the seven Big Dipper stars at its **true distance** in space; yellow
stars mark where each one **projects onto the celestial sphere** to form the
familiar asterism. Drag the diagram (or use the *View Orientation* sliders) to
rotate the view and see that the flat‑looking asterism is really a
three‑dimensional arrangement of stars at very different distances.

## Files

```
index.html          KL-UNL scaffold: .app-shell + <kl-unl-masthead> + panels
foundation/         KL-UNL foundation (masthead, CSS, MathJax helper, contents.json)
styles/styles.css   sim-specific styles only (foundation is not modified)
simulation.js       all simulation logic (a faithful port of the AS1 library)
assets/             exported vector art reused as-is (yellow star, Earth arrow, dot)
CONVERSION_NOTES.md  behaviour model, AS→HTML5 mapping, deviations
ACCESSIBILITY.md     WCAG affordances, keyboard map, screen-reader notes
```

No build step, no bundler, no framework, no CDN, no analytics. Everything is
local except that the page is expected to be served over HTTP (see above).

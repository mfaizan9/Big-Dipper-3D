# Conversion Notes — Big Dipper in Three Dimensions

## Behaviour model (one paragraph)

The simulator draws a wedge‑shaped patch of the celestial sphere (right
ascension 11ʰ–14ʰ, declination 50°–60°) with a coordinate grid, and places the
seven stars of the Big Dipper on it. Each star is shown twice: as a small black
dot at its **true three‑dimensional position** (its real distance from Earth,
distance ÷ 250 in sphere‑radius units) and as a yellow star at the point where
its direction **projects onto the unit celestial sphere**. A faint sight‑line is
drawn from Earth (the sphere’s centre, `r = 0`) out through each star to the
sphere surface. The user clicks and drags the diagram (or uses the keyboard
sliders) to rotate the whole construction; dragging horizontally changes the
sphere’s azimuth angle *theta* (clamped to 122°–247°) and dragging vertically
changes the viewer altitude *phi* (clamped to ±36°). As the view rotates, the
yellow stars stay locked in the flat Dipper pattern on the sphere while the black
dots visibly spread out in depth, demonstrating that the asterism is a chance
line‑of‑sight alignment of stars at very different distances. There is no
autonomous animation — the diagram only changes in response to user input.

## Source of truth

* **Behaviour / geometry:** the decompiled ActionScript in `scripts/` — the
  `CelestialSphere` prototype library (`CelestialSphere.as`, `2 CS Getter
  Setter.as`, `3 CS Geometry.as`, `7 CS Objects.as`, `8 CS Circles.as`,
  `9 CS Lines.as`) and the two frame scripts `frame_1/DoAction.as` /
  `frame_1/DoAction_2.as`.
* **Data / constants:** copied verbatim from `frame_1/DoAction_2.as`
  (`bigDipperStars`, the grid/patch circle definitions, the label positions,
  `sphereUnitRadius = 250`, `size = 1000`, `latitude = 35`, and the initial
  orientation `setSphereOrientation(221.2, -8.6)`).
* **Layout reference:** `frames/1.png` (the running Flash frame) and the
  provided screenshot.

## AS1 → HTML5 mapping

| ActionScript (AS1) | HTML5 port |
| --- | --- |
| `Object.registerClass` prototype classes (`CelestialSphere`, `CSObjects`, `CSCircles`, `CSLines`) | plain ES classes `Sphere`, `SphereObject`, `Circle`, `Line` in `simulation.js` |
| `doA` / `doM` / `doB` coefficient matrices | ported verbatim (`Sphere.doA/doM/doB`) |
| `parsePointInput`, `CtoS/CtoSz`, `WtoSz`, `CtoW`, `WtoC` | ported verbatim |
| `createEmptyMovieClip` + `moveTo/lineTo/curveTo/beginFill` | HTML5 `<canvas>` 2D path drawing with the **same** coordinates, radii and control points |
| `MovieClip.prototype.drawArc` tessellation (`_minStep = π/4`) | `Circle._arc()` reproduces the exact `quadraticCurveTo` control points |
| circle front/back split (`gAsc`/`gDesc` logic) | `Circle.update()` ported branch‑for‑branch |
| line vs. sphere clipping + segment bucketing | `Line.update()` (the `showUnder == true` branch) |
| object depth banding (`swapDepths` into `N`‑spaced bands, `sortRegion`) | `render()` draws back‑to‑front in the same band order, z‑sorting objects within a band; the `phi < 0` inner‑line depth swap (`_iLA`/`_iLB`) is reproduced |
| `setOrientationType("absolute")` + `update()` case 2 (`_yscale`, `_rotation`) | `SphereObject.setOrientationAbsolute()` + `SphereObject.compute()` |
| `drawPatch()` (frame script) | `fillPatch()` — same arc walk, fill `#6D89BC @ 60%` |
| `onEnterFrame` / `getTimer()` | not needed — the sim is event‑driven (no timed animation); a single `render()` redraws everything from state |
| `dragArea.onPress/onMouseMove` (`_xmouse`, offset, clamps) | Pointer Events; mouse deltas are divided by the canvas display scale so the drag math runs in original stage pixels (`r = size/2 = 500`) |
| `trace()`, `_root`/`_parent`, FUIComponent | dropped / replaced with explicit references |

AS decimal colours were converted directly: fill `7179196 → #6D89BC` (patch,
60% alpha), grid `14737632 → #E0E0E0`, sight‑lines `0 → #000` at 15% alpha.
**No colour was remapped** — the palette is faithful to the original.

## Rendering architecture

Hybrid, inside the KL‑UNL shell. The whole 3‑D construction (patch fill, grid,
sight‑lines, black dots, yellow stars, coordinate labels, Earth marker) is
code‑drawn geometry in the original AS and is therefore reproduced on a single
`<canvas>` inside a `.panel__canvas-wrap`. The canvas keeps the original
650 × 480 internal coordinate system (optionally × `devicePixelRatio` for
crispness) and is scaled to fit by CSS while preserving aspect ratio; pointer
coordinates are mapped back through the scale factor so the drag/clamp math
matches the AS at any display size. All interactive controls are native,
semantic HTML (`<input type="range">`, `<button>` via the masthead).

## Exported assets reused as‑is

Copied from the decompiled export into `assets/` and used directly (never
redrawn):

* `assets/star.svg` — the yellow gradient star (`shapes/2.svg`), drawn with
  `ctx.drawImage` at each projected star position, foreshortened/rotated by the
  ported absolute‑orientation transform.
* `assets/earth-arrow.svg` — the “Earth’s Position” up‑arrow (`shapes/18.svg`).
* `assets/star-point.svg` — the 4 px black dot (`shapes/25.svg`), also copied
  for completeness. The dot is additionally reproduced as an identical 2 px‑radius
  canvas circle so it stays crisp at any `devicePixelRatio`; the file and the
  canvas circle are pixel‑equivalent.

Unused exported shapes (`shapes/6.svg`, `8.svg` — the gradient/horizon disks;
`shapes/1.svg`, `3.svg` — the star **outline** frames, never shown because the
CS Star stays on frame 1; `shapes/30.svg` — the transparent stage‑sized drag
hit‑area) were intentionally not copied, matching the original which
removes/disables the shading disk, horizon plane and outline state.

## The contents.json entry (and an important foundation defect)

This sim’s `sim-id` is **`bigdipper`**, and an entry for it **already exists** in
the shared `foundation/contents.json`, so no new entry text had to be authored —
its Help/About text is used verbatim.

**However, the provided `foundation/contents.json` is not valid JSON.** Multiple
other simulators’ `content` strings contain *unescaped* control characters
(literal newlines/tabs) **and** *unescaped* double quotes inside their HTML (for
example `href="../venusphases"`). `JSON.parse()` / `response.json()` rejects the
whole file, so with a byte‑for‑byte copy the masthead fails to load its title,
Help and About for **every** simulator, not just this one (observed error:
`SyntaxError: Bad control character in string literal in JSON at position
12704`).

Because the masthead only reads `data["bigdipper"]`, and because an invalid file
breaks the required functionality, the copy placed in `html5/foundation/` is a
**minimal, valid per‑sim file** containing the `_comment`, the `newSim` example
entry, and this sim’s `bigdipper` entry — all three **extracted verbatim** from
the source. No text was altered; the malformed *other* entries were simply not
carried over (they are not referenced by this sim).

**Action recommended / question for the maintainer:** the shared
`foundation/contents.json` should be repaired upstream (escape the control
characters and the inner `"` as `\"`). Please also confirm the intended model:

* **Per‑sim copy** (what is shipped here) — nothing further needed once the
  upstream file is fixed and re‑copied; or
* **Single shared file** — in that case delete `html5/foundation/contents.json`
  and ensure the shared file (once valid) already contains the `bigdipper`
  entry, which it does. The exact entry to keep is:

```json
"bigdipper": {
  "meta": { "title": "Big Dipper in Three Dimensions", "version": "2.0" },
  "masthead": {
    "help": {
      "title": "Help and Instructions",
      "content": "<p>This simulator demonstrates how the stars of the big dipper, which are at various distances from earth, project onto the celestial sphere to give the familiar asterism.</p><p>Click and drag on the diagram to change the orientation.</p>"
    },
    "about": {
      "title": "About this Simulator",
      "content": "<p>For additional astronomy education materials please visit <a href=\"https://astro.unl.edu/\">Astronomy Education</a> at the University of Nebraska-Lincoln.</p><p>This simulator has been modernized by the AAS Applet Task Force to meet modern web accessibility standards (WCAG 2.1 AA).</p><p>Permission is granted to use these files for noncommercial purposes as long as they remain unmodified.</p>"
    }
  }
}
```

The foundation **code** files (`kl-unl-masthead.js`, `kl-unl.css`, `kl-unl.js`)
are copied in **byte‑for‑byte unchanged**.

## MathJax

The foundation ships **no MathJax include** here (there is no MathJax file in
`foundation/` and no demo referencing one), and external CDNs are disallowed.
This simulator also contains **no equations or formulas** — the only
mathematical notation is the coordinate‑grid tick text (`11h`…`14h`, `50°`…`60°`)
that is drawn, foreshortened, onto the 3‑D sphere patch. Those tick labels are
part of the canvas diagram (see ACCESSIBILITY.md); full text‑and‑units
equivalents are provided for assistive tech. `kl-unl.js`’s `klunlInitEqn()` hook
is redefined (per its design) to boot the simulator. If a MathJax include is
later added to the foundation, no sim math needs to move into it.

## Deviations from the original

* **Keyboard control added.** The Flash version was mouse‑drag only. An
  equivalent keyboard path (two native range sliders, *Horizontal angle* and
  *Vertical tilt*, with the same 122–247° / ±36° clamps) mutates the same state.
  This is an accessibility addition; it does not change behaviour.
* **Supplementary star table added** (name, RA, Dec, distance in light years),
  built only from the sim’s own `bigDipperStars` data, to make the educational
  content (the different distances) available to non‑visual users.
* **`contents.json`** reduced to a valid minimal per‑sim file (see above).
* No behaviour, constant, formula or educational text was changed.

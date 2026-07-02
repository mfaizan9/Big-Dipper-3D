# Accessibility Notes — Big Dipper in Three Dimensions

Target: WCAG 2.1 AA (AAA where reasonable). Human screen‑reader QA on **both**
NVDA (Windows) and VoiceOver (macOS/iOS) is still required before release — the
notes below describe what was built and verified structurally.

## Structure & semantics

* One `<h1>` only — rendered by the `<kl-unl-masthead>` component (the sim adds
  no competing `<h1>`). Panels use `<section aria-labelledby>` with `<h2>`
  headings in a non‑skipping order.
* Landmarks: `<main class="app-layout">` wraps the panels; the masthead provides
  the banner/nav.
* A “Skip to the simulation diagram” link (`.sr-only-focusable`) is the first
  focusable element.
* `<html lang="en">`.

## The diagram (canvas)

The 3‑D construction is inherently visual and is drawn on a `<canvas>`. It is
exposed to assistive tech as follows:

* `role="img"` with a descriptive `aria-label` summarising what the diagram
  shows (Earth at left, sight‑lines, black dots = true positions, yellow stars =
  projected asterism) and how to operate it.
* The canvas is focusable (`tabindex="0"`) with a visible `:focus-visible` ring.
* A polite live region (`#sr-live`, `aria-live="polite"`) announces the view
  orientation **with units** whenever a change is committed (on pointer release
  or slider `change`), e.g. *“View orientation: horizontal angle 221 degrees,
  vertical tilt −9 degrees. The seven Big Dipper stars are shown at their true
  distances from Earth…”*. Announcements fire on commit, not on every drag tick,
  to avoid flooding.
* The **Seven Stars** table gives the underlying data (star name, right
  ascension, declination, distance in light years) as real, navigable HTML — so
  an audio‑only user gets the educational content (the differing distances) that
  the diagram conveys visually.

### Canvas text — known limitation (documented)

The coordinate tick labels (`11h`…`14h`, `50°`…`60°`) and the “Earth’s Position”
caption are painted onto the canvas because in the original they lie **on the
tilted 3‑D sphere surface** (foreshortened and rotated); reproducing that exact
placement is part of visual parity. Consequences and mitigations:

* These specific strings do not scale with browser text zoom and are not
  individually selectable. Their information is fully available elsewhere in real
  text: the RA/Dec grid values appear in the **Seven Stars** table and the
  canvas `aria-label`, and “Earth’s Position” is stated in the `aria-label`.
* Everything else in the UI (headings, control labels, readouts, help text, the
  data table) is real HTML text sized in `rem`/`em` and reflows/zooms normally.
* There is **no MathJax** in this build (the foundation ships none, CDNs are
  disallowed, and the sim has no equations). The tick labels are the only
  math‑like notation; they are handled as above with full text/units
  equivalents. If a MathJax include is added to the foundation later, no sim math
  needs to move.

## Color & contrast

* Palette comes from the KL‑UNL CSS custom properties; sim additions use the
  same variables. Body text (`#1a1a1a` on `#ffffff`) and controls exceed 4.5:1.
* The physically meaningful blue sky patch and yellow stars are retained, but
  **state is never encoded by color alone** — orientation is given numerically
  (readouts + sliders + live region) and the star data is in a text table.
* Grid lines are decorative; the meaningful values are labelled textually.

## Keyboard

* Full keyboard operability in a logical tab order; visible focus rings from
  `kl-unl.css` `:focus-visible` (plus a sim ring on the canvas and sliders).
* **Sliders are native `<input type="range">`**, so they get the complete
  keyboard model for free: Left/Down decrement, Right/Up increment, PageUp/
  PageDown large steps, Home/End to min/max. Tab moves away cleanly — no trap.
  The custom slider *styling* is layered on the native control in
  `styles/styles.css` (a separate component; the foundation is untouched) and
  does not remove any native behaviour.
* Both slider and pointer‑drag paths mutate the **same** state object, so mouse,
  touch and keyboard stay in sync.
* Reset is provided **only** by the masthead (the `sim-reset` event is wired to
  restore the exact initial orientation, θ = 221.2°, φ = −8.6°); no second Reset
  button is added. The masthead’s Help/About dialog manages its own focus trap
  and Escape handling.

## Screen‑reader narration — units are always spoken

Per the explicit “always speak units with numbers” requirement:

* Each slider exposes a full spoken value via `aria-valuetext`, not a bare
  number, e.g. `"Horizontal viewing angle 221 degrees"` and `"Vertical tilt
  minus 9 degrees, looking up from below"` (negative values are spoken as
  “minus N degrees”; positive tilt says “looking down from above”).
* The live region repeats orientation **with units and context** on every commit.
* Table cells carry their units in the text (`11.06 h`, `61.75°`, `123.6 ly`);
  the caption (`.sr-only`) states the columns and that distance is in light
  years.

## Timing / motion

* The simulator has **no autonomous animation** — it only redraws in response to
  user input — so there is no motion to pause and no flashing. A Pause control is
  therefore not needed. `prefers-reduced-motion` is honoured for any
  browser‑added transitions.

## Responsive / touch

* Layout works desktop → iPad → phone **portrait**: the KL‑UNL grid collapses to
  a single column at 56rem, and sim breakpoints (in `styles/styles.css` only)
  carry it down to phone portrait with the diagram first, panels full‑width, and
  **no horizontal scrolling** (verified at 375 px). Body copy ≥ 1.0625rem and the
  layout reflows at 200% zoom without clipping.
* Pointer + touch share one Pointer‑Events path; `touch-action: none` on the
  canvas keeps a drag from scrolling the page. No hover‑only affordances.
* Touch targets (buttons, slider thumbs) meet the ≥ 44 px minimum.

## Still to verify by a human

* Live‑region timing and phrasing on real NVDA + VoiceOver (not just structural
  review).
* That the canvas `aria-label` + table together convey enough for a first‑time
  non‑visual user to understand the “same direction, different distance” idea.

# minhajur.dev — portfolio

React + Vite + Tailwind. One WebGL sky, one shared animation loop, and the
original skill-card deck carried over unchanged.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # serve the built site
```

## What goes where

```
api/contact.js          Vercel function → Brevo. The API key never leaves here.
public/media/           backdrop clips, mp4 + webm for every file
public/images/          portraits, gallery, travel
src/data/               ← everything you will actually want to edit
  site.js               name, links, stats, education, skills, blog posts
  work.js               projects, case-study bodies, which zone each sits in
  interests.js          the six journey sections and their modals
src/lib/
  loop.js               the single requestAnimationFrame every canvas rides on
  sky.js                raw-WebGL shader sky + canvas stars/comets (ported)
  terminal.js           the `~` terminal, radar, signal waveform, WebAudio
  fireflies.js          the cleared sky — darkness that fireflies reveal
  net.js                the overlay menu's particle cover
  lock.js               depth-counted scroll lock for overlays
  motion.js             Lenis + GSAP/ScrollTrigger, both collapsible
src/components/         chrome, modals, deck, carousel, GlassFilter
src/pages/              one file per route
src/styles/index.css    tokens, components, then @tailwind utilities LAST
```

Adding a project means adding an object to `src/data/work.js` — no component
changes. The same is true of a blog post, an interest, or a skill card.

## Things worth knowing before you edit

- **The stylesheet's layer order is load-bearing.** `@tailwind utilities` has
  to stay at the very bottom or a utility class will lose to a component rule.
- **`overflow-x: clip`, never `hidden`.** `hidden` on `<body>` turns it into a
  scroll container, which silently kills every `position: sticky` on the page —
  which is both horizontal rails and the pinned work zones.
- **Easing is time-based**: `approach(sec, dt) = 1 - 0.0015^(dt/sec)`. A
  per-frame lerp constant feels right at 60fps and wrong everywhere else.
- **Every clip ships twice**, `.mp4` and `.webm`, and every video layer sits on
  a gradient of the right colour, so a missing file or an unsupported codec
  degrades to the correct hue rather than to black.
- **One WebGL context.** `Sky.setHidden(true)` stands it down on /interests,
  where the backdrop is video instead.
- **Everything is a lens, and the lens is real.** `src/components/GlassFilter.jsx`
  generates SVG displacement maps and the stylesheet feeds them to
  `backdrop-filter`, so panels BEND the background at their rim instead of only
  blurring it. The map is a superellipse height field — `|x|^6 + |y|^6`,
  flat through the middle, rolling off inside the outer 16% — differentiated
  into normals and written to the R and G channels.
  An feImage stretches to whatever it filters, so three maps exist for three
  rough aspects and elements pick one with `--lg-filter`.
- **`backdrop-filter: url()` is Chromium-solid, partial in Safari, and absent in
  Firefox.** An `@supports` block drops those browsers to blur plus a heavier
  bevel. Check any change to the glass in Firefox too, or you will only be
  looking at the fallback.
- **Tint is per-context, refraction is not.** `--lens-tint` is how much backdrop
  is allowed through, and it has to depend on what is behind the panel: a few
  percent over the dark sky, far more over the Interests video or under the
  deck. The optics never change. Note `body.daylight` overrides the journey
  tint — that branch is easy to miss when retuning.
- **The skill deck carries heavy tint on purpose.** Eight faces overlap by
  design, and at normal transparency the text from the cards behind bleeds
  through and the whole deck turns to mush.
- **A scrollable thing inside an overlay needs `data-lenis-prevent`**, or the
  smooth-scroll driver captures the wheel and the panel never moves.
- **Anything that reacts to the pointer must measure rest geometry.** The dock
  magnifier and the magnetic cursor both move the thing being hit-tested; read
  live rects and you get a feedback loop that shakes.
- **Hover lifts are scales, never translates.** A translate moves an element out
  from under the cursor, which un-hovers it, which drops the transform — an
  oscillation at every edge. Scaling up cannot move a boundary past an
  interior point.
- **The dock highlight comes from the distance field, not `:hover`.** There is a
  5px gap between icons where `:hover` matches nothing, and nearest-centre on
  its own has a knife edge at the midpoint. Both are handled: nearest wins, but
  only by a 14px margin, so the midpoint is a band the current pick holds.

## Deploying

Vercel, zero config — `vercel.json` already handles the SPA rewrite and the
immutable cache headers for `/media` and `/images`.

Set these in **Project → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `BREVO_API_KEY` | from Brevo → SMTP & API → API keys |
| `CONTACT_FROM_EMAIL` | a sender address verified in Brevo |
| `CONTACT_FROM_NAME` | e.g. `Portfolio` |
| `CONTACT_TO_EMAIL` | where messages should land |

Without them `/api/contact` returns 500 and the form tells the visitor to email
directly instead — it never fails silently.

## Swapping in the signal audio

The terminal's incoming transmission is synthesised. To use a real recording,
drop it in `public/media/` and set the constant at the top of
`src/lib/terminal.js`:

```js
var SIGNAL_SRC = '/media/signal.mp3';
```

It routes through the same analyser node, so the waveform follows it with no
other change. `SIGNAL_DELAY` on the next line is how long after the terminal
opens the signal arrives, in ms.

## Still outstanding

These are placeholders in `src/data/site.js` and `src/data/work.js`, all marked
`TODO(minhajur)`:

- real GitHub / LinkedIn / Scholar / email addresses
- your role on each project — every case study currently reads
  “Role: to be confirmed — team project”
- the About page prose in your own words
- a résumé PDF (drop it in `public/` and set `profile.resume`)
- graduation status on the BSc card (flagged `confirm status`)
- `public/images/og.jpg` for link previews

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
  terminal.js           the `~` terminal, radar, alien scan, WebAudio (ported)
  net.js                the overlay menu's particle cover
  motion.js             Lenis + GSAP/ScrollTrigger, both collapsible
src/components/         chrome, modals, deck, carousel, robots
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

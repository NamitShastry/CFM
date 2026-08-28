# CreateForMe

CreateForMe's website: static HTML/CSS pages, no build step, no framework.
This pass adds a shared, vanilla-Three.js interactive 3D layer (**CFM3D**)
across every existing page while preserving all original content, routes,
and functionality.

## Structure

```
index.html                 About / home
contact.html                Contact details
pricing.html                Pricing
privacy.html                Privacy policy
refund.html                 Refund policy
portfolio/
  videos.html, images.html, before-after.html
services/
  thumbnail-design.html, ai-image-generation.html, ai-video-generation.html,
  voice-over.html, book-writing-guidance.html, ghostwriting.html,
  blog-articles.html, newsletter-writing.html, resume-cv.html, custom-project.html
style.css                   Original shared stylesheet (untouched)
css/threeui.css             CFM3D shared interactive-layer styles (new)
js/threeui.js               CFM3D shared interactive-layer module (new)
```

Every page keeps its own original markup, inline `<style>` blocks and copy.
Two files were added (`css/threeui.css`, `js/threeui.js`) and every page now
includes them plus a small loader/canvas snippet — nothing else in the
original markup was rewritten.

## What CFM3D adds, and where

- **Ambient WebGL background** (`#cfm-bg-canvas`, fixed, behind all content):
  a soft particle constellation plus a few slow-rotating wireframe forms,
  recolored per section (About = violet, Services = slate, Portfolio =
  ocean, Pricing = sunrise) via `pickTheme()` in `js/threeui.js`. Reacts to
  pointer position and scroll depth.
- **Pointer-reactive card depth** (`.cfm-tilt`): applied automatically at
  runtime to every existing card-like element (`.grid-box`, `.text-card`,
  `.image-card`, `.contact-item`, `.content-card`, `.intro-card`,
  `.intro-box`, `.approach-card`, `.fact-item`, `.process-card`,
  `.thumb-box`, `.pricing-block`) — no HTML class changes required.
- **Magnetic navigation/CTAs** (`.cfm-magnetic`): logo, nav links, dropdown
  buttons and contact detail links drift slightly toward the cursor.
- **Cursor glow**: a soft light that follows the pointer (desktop only).
- **Scroll parallax**: page titles/headers drift subtly with scroll depth.
- **Reveal-on-scroll**: fades in cards/sections that don't already have
  their own page-specific reveal animation (several service pages already
  ship one; CFM3D skips anything already carrying a `.reveal` class).
- **Mini 3D preview orbs**: every "Coming Soon" portfolio panel gets a small
  rotating wireframe icosahedron instead of empty space.
- **Page transitions**: a quick (~190ms) fade between same-origin pages.
- **Loader**: a brief branded loading screen while the first paint settles.

All of the above is skipped or reduced automatically when:
- `prefers-reduced-motion: reduce` is set,
- the pointer is coarse (touch/mobile),
- WebGL is unavailable (silent fallback — the page's existing CSS gradient
  background still renders normally).

## Fixes made along the way

- Removed the site's dependency on `via.placeholder.com` for image
  fallbacks (About page photos, pricing table image). Replaced with
  local, no-network inline SVG data URIs, so a missing image never
  triggers an external request.
- The Thumbnail Design service page referenced four thumbnail images
  (`thumb1.jpg`–`thumb4.jpg`) that don't exist in the repo. Replaced the
  broken `<img>` tags with styled, dependency-free placeholder tiles
  (`.thumb-box--placeholder`) so the page never 404s or hangs on an
  external fallback.

## Running locally

No build step. Any static file server works:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Notes for future content

- To add real portfolio images/videos, replace the `.coming-soon-container`
  blocks in `portfolio/*.html` with real media grids — the CFM3D reveal/tilt
  system will pick up standard `.thumb-box`/`.grid-box`-style cards
  automatically.
- To retheme the ambient background for a new section, add
  `data-cfm-theme="violet|ocean|sunrise|slate"` to `<body>`, or extend
  `THEME_PALETTES` in `js/threeui.js`.

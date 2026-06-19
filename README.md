# Alleanza Flashcards

A fast, lightweight, **fully static** Next.js (App Router) flashcard app built
from Markdown course content. Each domain becomes its own statically-exported
page with a 3D flip-card study UI, and any deck can be embedded in an iframe.

## How it works

- Course content lives as Markdown files in [`/content`](./content). Each file
  is one **domain** (a flashcard deck).
- At build time, [`src/lib/markdown.ts`](./src/lib/markdown.ts) reads every file
  with `fs`/`path`, parses frontmatter with `gray-matter`, and derives
  flashcards from the heading structure: **each heading is a card front
  (question), and the prose beneath it is the card back (answer)**, rendered to
  HTML with `marked`. Research-citation noise (`citeturn…`, `entity[…]`, broken
  image refs) is stripped automatically.
- [`src/app/[domainSlug]/page.tsx`](./src/app/[domainSlug]/page.tsx) uses
  `generateStaticParams` to prerender one HTML page per domain at its own
  sub-URL (e.g. `/types-of-policies-life/`).
- [`src/components/FlashcardDeck.tsx`](./src/components/FlashcardDeck.tsx) is the
  interactive client wrapper: multi-deck switcher, progress bar + per-card
  status dots, "got it / still learning" scoring (persisted per-deck in
  `localStorage`), shuffle + order/score resets, keyboard shortcuts, and a 3D
  perspective flip animation.

## Content format

Each file in `/content` uses YAML frontmatter followed by heading-based prose:

```markdown
---
title: "Types of Policies (Life)"
slug: types-of-policies-life
domain: "Domain I"
order: 1
weight: 0
---

# Document title (not turned into a card)

## What is term life insurance?
Term life provides coverage for a fixed period... (this prose becomes the back)

### Convertibility
Most term policies can convert to permanent coverage without evidence of
insurability...
```

- `slug` controls the page URL; if omitted, the filename is used.
- The first `#` heading is treated as the document title and is **not** a card.
- Any heading with prose directly beneath it becomes a card; nested headings
  carry a breadcrumb for context.

## Embedding (`?embed=true`)

Append `?embed=true` to any deck URL to hide the site chrome (top nav, deck
switcher, keyboard hints) and drop the page background/padding so the card sits
cleanly inside an iframe:

```html
<iframe
  src="https://your-host/types-of-policies-life/?embed=true"
  width="420" height="560" style="border:0" loading="lazy"
></iframe>
```

## Develop

```bash
npm run dev     # dev server at http://localhost:3000
npm run lint    # eslint
npm run build   # static export -> ./out  (output: "export")
```

The `out/` directory is a self-contained static site — host it on any CDN or
static host. No server is required.

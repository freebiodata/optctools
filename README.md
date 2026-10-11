# OPTCGTools

Static Astro website for `optctools.top`: focused math tools for the ONE PIECE Card Game.

## Included

- Lethal Calculator: transparent DON!! allocation and declared-counter sequencing.
- Draw Probability Calculator: hypergeometric draw and full-redraw odds.
- Counter Battle Calculator: minimum counter combination and unknown-hand probability.
- Official rules snapshot, methodology, privacy and independent-fan disclaimer pages.
- Static SEO output: canonical URLs, descriptions, Open Graph metadata, XML sitemap, WebApplication/Breadcrumb JSON-LD, robots.txt, and Cloudflare Pages headers.

## Local development

```sh
npm install
npm run dev
npm test
npm run build
```

The test suite covers the probability reference case, mulligan improvement, tie-power counter math, a lethal fixture, and a one-card unknown-hand counter case.

## Deploy to Cloudflare Pages

This is a static Astro build - no server adapter or environment variables are needed.

1. Push this directory to a Git repository.
2. In Cloudflare Dashboard, open **Workers & Pages** → **Create application** → **Pages** → **Import an existing Git repository**.
3. Set the production branch to `main`, build command to `npm run build`, and build output directory to `dist`.
4. Deploy, then add `optctools.top` under **Custom domains** and point its DNS at Cloudflare as instructed there.

Cloudflare Pages will serve the generated `dist` folder. The included `wrangler.jsonc` declares the same output folder for a later direct-upload workflow.

## Rules source

The shipped rules snapshot is the official English [ONE PIECE CARD GAME Comprehensive Rules, v1.2.1](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20240426=), last updated August 28, 2026 and last verified for this release on October 12, 2026. See `/rules-and-method/` in the built site for section-level references and tool limitations.

OPTCGTools is not affiliated with Bandai, Shueisha, or the ONE PIECE Card Game.

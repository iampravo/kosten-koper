# kosten koper

A single-page calculator for what a Dutch listing actually costs — transfer tax, NHG, mortgage payment net of the interest deduction, upfront cash needed, and the break-even point against renting. Built to replace doing this math by hand every time a new Funda listing shows up.

**Live: https://kosten-koper.vercel.app**

## Features

- **Import from Funda** — a bookmarklet reads the price, address, HOA fee, and living area straight out of a listing page you're already viewing (via its embedded `schema.org` data and features table) and hands them to the calculator. No server-side scraping — Funda blocks that outright.
- **Per-buyer transfer tax** — models the 2026 rules correctly: 0% *overdrachtsbelasting* per buyer under 35 buying a first home under €555,000, 2% otherwise, applied to each buyer's own ownership share.
- **NHG-aware** — flags eligibility against the €470,000 cap, adds the 0.4% one-time premium when used.
- **Mortgage interest deduction, net of eigenwoningforfait** — annuity or linear, year-1 estimate, at your marginal rate (default 37.56%, the 2026 cap).
- **Full kosten koper breakdown** — notary, valuation, mortgage advice, optional structural survey, all editable — down to one "cash needed upfront" number.
- **Rent vs. buy break-even** — enter a comparable rent, see the month buying overtakes it once upfront costs are paid off.
- Bold monochrome "ledger" design — Fraunces + IBM Plex Mono/Sans, hairline rules, no external requests beyond fonts.
- Zero build step, zero backend — everything computes client-side.

## Using the Funda import

Drag the "＋ import from funda" button into your bookmarks bar once. Then, on any funda.nl listing page, click it — it opens this calculator in a new tab with the fields pre-filled. Every field stays editable, and manual entry always works without it.

## Stack

- Vanilla JS, no framework or bundler, no API calls
- [Fraunces](https://fonts.google.com/specimen/Fraunces) + [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) via Google Fonts

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Deployed on Vercel, connected to this repo's `main` branch for automatic deploys on push.

## Disclaimer

Figures use 2026 Dutch defaults and are simplified year-1 estimates for personal use — not financial or tax advice. Always confirm with a licensed *hypotheekadviseur* before making a decision.

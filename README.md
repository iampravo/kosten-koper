# kosten koper

A single-page calculator for what a Dutch listing actually costs — transfer tax, NHG, mortgage payment net of the interest deduction, upfront cash needed, and the break-even point against renting. Built to replace doing this math by hand every time a new Funda listing shows up.

You enter the property details yourself; the fields are compact enough that copying price/address/m² off a listing takes a few seconds.

**Live: https://kosten-koper.vercel.app**

## Features

- **Property fact sheet** — address, price, living area, plot size, bedrooms, year built, energy label, and new-build vs. existing, all in one compact section.
- **New-build aware** — *nieuwbouw* (v.o.n.) properties skip transfer tax entirely (VAT is already priced in), unlike existing homes.
- **Per-buyer transfer tax** — models the 2026 rules correctly: 0% *overdrachtsbelasting* per buyer under 35 buying a first home under €555,000, 2% otherwise, applied to each buyer's own ownership share.
- **NHG-aware** — flags eligibility against the €470,000 cap, adds the 0.4% one-time premium when used.
- **Mortgage interest deduction, net of eigenwoningforfait** — annuity or linear, year-1 estimate, at your marginal rate (default 37.56%, the 2026 cap).
- **Full kosten koper breakdown** — notary, valuation, mortgage advice, structural survey, plus optional move-in, renovation, and extra-checks (foundation/asbestos/electrical) budgets — all editable, down to one "cash needed upfront" number.
- **Own vs. rent, at any horizon** — a single box driven by a year/month slider (1 month to 30 years) instead of fixed checkpoints. Shows upfront cost, monthly cost (EMI + HOA + insurance), and — cumulative to the slider's point — total principal/interest/tax rebate paid and home value gain, each with its share of the total. The headline is "money out of pocket (net)" — total cost minus principal paid minus tax rebate minus home value gain, i.e. what actually left your pocket after accounting for equity, refunds, and appreciation — compared against cumulative rent.
- **Sell after..., at any horizon** — the same box and math, on its own independent slider, with an added selling-costs (agent commission) row so it ends in a net profit/loss on an actual sale instead of a rent comparison. A loss on an early sale (very common — transaction costs are front-loaded) is easy to see *why*, since every contributing number is on screen.
- **What to check before you buy** — a reference checklist: contract contingencies (financing, structural survey, NHG), structural risks (wooden pile foundations, asbestos, old pipework), legal/ownership status (erfpacht, VvE health, monument status, boundaries, age/non-occupancy/asbestos clauses), and financial/admin checks (WOZ value, permits, soil contamination). "Own vs. rent", "sell after...", and this checklist are all collapsible.
- **Shareable permalink** — every input is encoded into the URL as you type, so the address bar is always a link to your exact scenario. Click "copy link" to grab it — paste it back into the app on any device (or send it to your wife/co-buyer) and every field, toggle, and slider restores exactly.
- Live NL-formatted number inputs (thousand separators as you type, comma-decimal rates accepted).
- Bold monochrome "blueprint" design — Archivo Narrow + IBM Plex Mono, hairline rules, no external requests beyond fonts.
- Zero build step, zero backend — everything computes client-side, entirely manual entry (Funda blocks server-side scraping, so there's no "paste a link" shortcut here — see git history for the bookmarklet-based approach that was tried and removed).

## Stack

- Vanilla JS, no framework or bundler, no API calls
- [Archivo Narrow](https://fonts.google.com/specimen/Archivo+Narrow) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) via Google Fonts

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Deployed on Vercel, connected to this repo's `main` branch for automatic deploys on push.

## Disclaimer

Figures use 2026 Dutch defaults and are simplified year-1 estimates for personal use — not financial or tax advice. Always confirm with a licensed *hypotheekadviseur* before making a decision.

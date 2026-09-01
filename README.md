# Turill Financial

Node.js + Express + Tailwind CSS website for Turill Financial, including the
concentrated-stock funnel (strategy page, analyzer, custom exit-strategy request).

## Pages

| URL | Source file |
| --- | --- |
| `/` | `src/pages/index.html` |
| `/concentrated-stock` | `src/pages/concentrated-stock.html` |
| `/stock-analyzer` | `src/pages/stock-analyzer.html` |
| `/stock-review` | `src/pages/stock-review.html` |
| `/about` | `src/pages/about.html` |
| `/contact` | `src/pages/contact.html` |
| `/thank-you` | `src/pages/thank-you.html` |
| anything else | `src/pages/404.html` (returns a real 404) |

Old `.html` URLs (`/stock-analyzer.html`, `/about.html`, …) 301-redirect to the
clean versions and keep their query string, so existing links and the analyzer's
deep link into the review form both survive.

## How pages are built

**Edit `src/pages/`, never `public/*.html`.** The files in `public/` are
generated and are overwritten on every build.

```
src/partials/header.html   <- the nav, once
src/partials/footer.html   <- the footer + disclosure, once
src/pages/<name>.html      <- just that page's content
        |
        |  node build-pages.js
        v
public/<name>.html         <- generated, do not edit
```

Each page starts with a `<!--META {...} -->` block giving its title,
description, canonical URL and which nav item to highlight.

The header and footer used to be copy-pasted into every page. They drifted
apart, which is how the site ended up showing the old brand in some places and
the new one in others. Building them from one source is what stops that
happening again.

## Run locally

```bash
npm install
npm run build      # build pages, then CSS
npm start          # http://localhost:3000
```

While editing: `npm run dev` watches the CSS and restarts the server. Re-run
`npm run build:pages` after changing anything in `src/pages/` or `src/partials/`.

## Deploying on Render

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Health check path:** `/healthz`

`render.yaml` declares all of the above.

Build order matters: `build:pages` must run before `build:css`, because Tailwind
scans the generated `public/*.html` to decide which utility classes to emit.
`npm run build` does them in the right order.

## Environment variables (Render dashboard → Environment)

| Variable | What it does |
| --- | --- |
| `BOOKING_URL` | Scheduling/payment link for the $2,000 planning engagement (Calendly, Acuity, Stripe…). When set, a **Book a Call** card appears on the Contact page. When empty, the card is hidden entirely so nothing unfinished is shown. |
| `BOOKING_LABEL` | Button text for that card. Defaults to `Book a Call`. |
| `LEAD_WEBHOOK_URL` | Optional. Every form submission is POSTed as JSON to this URL — point it at Zapier, Make, or your CRM. |

## Where form submissions go

Both the contact form and the stock-review form:

1. write a `[lead] {...}` line to the server log (visible in Render → Logs),
2. append to `data/leads.jsonl`,
3. POST the lead to `LEAD_WEBHOOK_URL` if that variable is set.

Every field the form submits is captured. The stock-review form carries the
whole analyzer snapshot across (ticker, position value, basis, concentration,
insider and charitable flags, consent), so those arrive with the lead.

> **Important:** Render's filesystem is ephemeral — `data/leads.jsonl` is wiped
> on every deploy and restart. Do not treat it as storage. Set
> `LEAD_WEBHOOK_URL` (or add an email/CRM integration) before relying on the
> forms to capture real enquiries.

## Assets

`public/assets/` holds the brand files. The wordmark was supplied on a solid
white background, which showed as a white box against the dark header, so a
transparent version with light text (`turill-financial-wordmark-dark.png`) is
what the site uses. The images were also resized and recompressed — together
they went from roughly 1.6 MB to about 180 KB.

`turill-financial-horizon-emblem.png` is kept in the repo but is not referenced
by any page.

## Still to be supplied

- Firm/compliance approval of all site copy and disclosures.
- Real ADV / CRS / privacy / terms links and firm-specific disclosure language.
- Business phone number and public email address, if they should be shown.
- The booking/payment link for `BOOKING_URL`.
- Confirmation that the analyzer's default planning rates (20% federal LTCG,
  3.8% NIIT, 0% state) are the intended defaults.

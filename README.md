# Turill Financial

Node.js + Express + Tailwind CSS website for Turill Financial.

## Pages

| URL | File |
| --- | --- |
| `/` | `public/index.html` |
| `/about` | `public/about.html` |
| `/contact` | `public/contact.html` |
| `/thank-you` | `public/thank-you.html` |
| anything else | `public/404.html` (returns a real 404) |

Old `.html` URLs (`/about.html`, `/contact.html`, …) 301-redirect to the clean
versions, so nothing that was already linked breaks.

## Run locally

```bash
npm install
npm run build:css
npm start          # http://localhost:3000
```

For live-reloading CSS while editing: `npm run dev`.

## Deploying on Render

- **Build command:** `npm install && npm run build:css`
- **Start command:** `npm start`
- **Health check path:** `/healthz`

`render.yaml` in this repo already declares all of the above.

`public/styles.css` is generated from `src/input.css` by Tailwind. It is
committed so the site still renders even if the build step is skipped, but the
build command should stay in place so edits to `src/input.css` take effect.

## Environment variables (set in the Render dashboard → Environment)

| Variable | What it does |
| --- | --- |
| `BOOKING_URL` | Scheduling/payment link (Calendly, Acuity, Stripe…). When set, a **Book a Call** card appears on the Contact page. When empty, the card is hidden entirely so nothing unfinished is shown. |
| `BOOKING_LABEL` | Button text for that card. Defaults to `Book a Call`. |
| `LEAD_WEBHOOK_URL` | Optional. Every form submission is POSTed as JSON to this URL — point it at Zapier, Make, or your CRM. |

## Where form submissions go

Submitting the contact form:

1. writes a `[lead] {...}` line to the server log (visible in Render → Logs),
2. appends to `data/leads.jsonl`,
3. POSTs the lead to `LEAD_WEBHOOK_URL` if that variable is set.

> **Important:** Render's filesystem is ephemeral — `data/leads.jsonl` is wiped
> on every deploy and restart. Do not treat it as storage. Set
> `LEAD_WEBHOOK_URL` (or add an email/CRM integration) before relying on the
> form to capture real enquiries.

## Still to be supplied

- Firm/compliance approval of all site copy and disclosures.
- Real ADV / CRS / privacy / terms links and firm-specific disclosure language.
- Advisor headshot for the About page portrait panel.
- Business phone number and public email address, if they should be shown.
- The booking/payment link for `BOOKING_URL`.

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Render terminates TLS in front of us; this makes req.protocol/req.ip correct.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true, limit: "64kb" }));
app.use(express.json({ limit: "64kb" }));

/* ------------------------------------------------------------------ *
 * Booking link
 * ------------------------------------------------------------------ *
 * Defaults to the live booking calendar published on Turill's own
 * Blueprint landing page. Override BOOKING_URL / BOOKING_LABEL in the
 * Render dashboard (Environment tab) to point somewhere else; set
 * BOOKING_URL to "off" to hide the card on the Contact page entirely.
 * ------------------------------------------------------------------ */
const DEFAULT_BOOKING_URL =
  "https://api.leadconnectorhq.com/widget/booking/UjTQTSHBauiLP2Zrf0V7";

const BOOKING_URL = (process.env.BOOKING_URL ?? DEFAULT_BOOKING_URL).trim();
const BOOKING_LABEL = (process.env.BOOKING_LABEL || "Book a Conversation").trim();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bookingBlock() {
  if (!/^https?:\/\//i.test(BOOKING_URL)) return "";
  return `
        <div class="glass rounded-3xl border-gold/25 bg-gold/[0.07] p-8 shadow-soft">
          <p class="eyebrow">Prefer to Pick a Time?</p>
          <h2 class="mt-4 font-display text-2xl font-bold text-white">Book directly on the calendar.</h2>
          <p class="mt-3 text-sm leading-7 text-slate-300">Choose a slot that works for you and we&rsquo;ll take it from there.</p>
          <a href="${escapeHtml(BOOKING_URL)}" class="btn-primary mt-6" target="_blank" rel="noopener noreferrer">${escapeHtml(BOOKING_LABEL)}</a>
        </div>`;
}

/* ------------------------------------------------------------------ *
 * Lead capture
 * ------------------------------------------------------------------ */
const FIELD_LIMIT = 4000;
const MAX_FIELDS = 40;

// Keep every field the form sends. The stock-review form carries the whole
// analyzer snapshot (ticker, basis, concentration, insider status…), so a
// hard-coded allow-list would silently throw that away.
function collectFields(body) {
  const out = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (key === "company") continue; // honeypot, never stored
    if (Object.keys(out).length >= MAX_FIELDS) break;
    out[String(key).slice(0, 80)] = String(
      Array.isArray(value) ? value.join(", ") : value
    )
      .trim()
      .slice(0, FIELD_LIMIT);
  }
  return out;
}

function saveLead(type, fields) {
  const record = { type, ...fields, createdAt: new Date().toISOString() };

  // Always log — on Render this shows up in the service Logs tab.
  console.log("[lead]", JSON.stringify(record));

  // Best-effort local copy. NOTE: Render's filesystem is ephemeral, so this
  // file is wiped on every deploy/restart. Treat LEAD_WEBHOOK_URL (below) or
  // a CRM integration as the real destination.
  try {
    const dir = path.join(__dirname, "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "leads.jsonl"), JSON.stringify(record) + "\n");
  } catch (err) {
    console.error("[lead] could not write local copy:", err.message);
  }

  // Optional: POST the lead to Zapier / Make / your CRM.
  const hook = (process.env.LEAD_WEBHOOK_URL || "").trim();
  if (/^https?:\/\//i.test(hook)) {
    fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    }).catch((err) => console.error("[lead] webhook failed:", err.message));
  }

  return record;
}

/* ------------------------------------------------------------------ *
 * Pages (defined before express.static so clean URLs win)
 * ------------------------------------------------------------------ */
function sendPage(res, file) {
  res.sendFile(path.join(PUBLIC_DIR, file));
}

const ROUTES = {
  "/": "index.html",
  "/about": "about.html",
  "/concentrated-stock": "concentrated-stock.html",
  "/retirement-planning": "retirement-planning.html",
  "/stock-analyzer": "stock-analyzer.html",
  "/stock-review": "stock-review.html",
  "/thank-you": "thank-you.html"
};
Object.entries(ROUTES).forEach(([url, file]) => {
  app.get(url, (req, res) => sendPage(res, file));
});

// Contact is rendered rather than sent, so the booking card can be injected.
app.get("/contact", (req, res) => {
  fs.readFile(path.join(PUBLIC_DIR, "contact.html"), "utf8", (err, html) => {
    if (err) return sendPage(res, "contact.html");
    res.type("html").send(html.replace("{{BOOKING_BLOCK}}", bookingBlock()));
  });
});

// Old .html URLs keep working, and consolidate on one canonical address.
const ALIASES = {
  "/index.html": "/",
  "/about.html": "/about",
  "/contact.html": "/contact",
  "/concentrated-stock.html": "/concentrated-stock",
  "/retirement-planning.html": "/retirement-planning",
  "/financial-plan-landing-page-page": "/retirement-planning",
  "/stock-analyzer.html": "/stock-analyzer",
  "/stock-review.html": "/stock-review",
  "/thank-you.html": "/thank-you",
  "/stock-review-thank-you.html": "/thank-you"
};
Object.entries(ALIASES).forEach(([from, to]) => {
  app.get(from, (req, res) => {
    const qs = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";
    res.redirect(301, to + qs);
  });
});

app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    setHeaders(res, filePath) {
      if (/\.(css|js|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    }
  })
);

/* ------------------------------------------------------------------ *
 * Form handlers
 * ------------------------------------------------------------------ */
function handleLead(type, errorPath) {
  return (req, res) => {
    const body = req.body || {};

    // Honeypot — real people never see or fill this field.
    if (body.company) return res.redirect(303, "/thank-you");

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.redirect(303, `${errorPath}?error=1`);
    }

    saveLead(type, collectFields(body));
    res.redirect(303, "/thank-you");
  };
}

app.post("/contact", handleLead("contact", "/contact"));
app.post("/stock-review", handleLead("concentrated-stock", "/stock-review"));

// Simple uptime check.
app.get("/healthz", (req, res) => res.json({ ok: true }));

/* ------------------------------------------------------------------ *
 * 404 — branded, and returns a real 404 status
 * ------------------------------------------------------------------ */
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
});

app.listen(PORT, () => console.log(`Turill Financial running on port ${PORT}`));

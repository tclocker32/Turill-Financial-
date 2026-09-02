/**
 * Page builder.
 *
 * Takes the content files in src/pages/, wraps each one in the shared <head>,
 * header and footer from src/partials/, and writes the finished page into
 * public/.
 *
 * Why this exists: the header and footer previously lived, copy-pasted, inside
 * every page. They drifted apart — which is exactly how the site ended up with
 * the old brand in some places and the new brand in others. Now they are
 * written once and stamped onto every page at build time.
 *
 * To edit the nav or the footer, edit src/partials/. To edit a page's content,
 * edit src/pages/<name>.html. Then run `npm run build`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PAGES = path.join(ROOT, "src", "pages");
const PARTIALS = path.join(ROOT, "src", "partials");
const OUT = path.join(ROOT, "public");
const SITE = "https://turillfinancial.com";

const header = fs.readFileSync(path.join(PARTIALS, "header.html"), "utf8");
const footer = fs.readFileSync(path.join(PARTIALS, "footer.html"), "utf8");

const NAV_KEYS = [
  "home",
  "concentrated",
  "retirement",
  "analyzer",
  "about",
  "contact"
];

/* Ties the site to the profiles it is the same entity as, so search engines
 * treat the YouTube channel, LinkedIn profile and the rest as one identity
 * rather than five unrelated pages. Every URL here has been confirmed to load. */
const PROFILES = [
  "https://www.linkedin.com/in/turillengelman/",
  "https://www.youtube.com/@TurillFin",
  "https://x.com/TurillEngleman",
  "https://www.facebook.com/profile.php?id=100095489802968"
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FinancialService",
  name: "Turill Financial",
  url: SITE,
  image: `${SITE}/assets/turill-financial-icon.png`,
  telephone: "+1-714-592-4990",
  areaServed: "US",
  sameAs: PROFILES,
  founder: {
    "@type": "Person",
    name: "Turill Engelman",
    jobTitle: "Financial Planning Advisor",
    sameAs: PROFILES
  },
  parentOrganization: {
    "@type": "Organization",
    name: "Tactive Advisors, LLC",
    url: "https://tactiveadvisors.com"
  }
};

function shell(meta, body) {
  const canonical = meta.url ? `${SITE}${meta.url}` : null;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${meta.description}" />
  <title>${meta.title}</title>
${canonical ? `  <link rel="canonical" href="${canonical}" />\n` : ""}${meta.noindex ? `  <meta name="robots" content="noindex" />\n` : ""}  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Turill Financial" />
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
${canonical ? `  <meta property="og:url" content="${canonical}" />\n` : ""}  <meta property="og:image" content="${SITE}/assets/turill-og-card.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@TurillEngleman" />
  <meta name="twitter:image" content="${SITE}/assets/turill-og-card.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css" />
  <script type="application/ld+json">${JSON.stringify(SCHEMA)}</script>
</head>
<body class="flex min-h-screen flex-col font-sans">
${header}
${body}
${footer}
  <script src="/app.js" defer></script>
${meta.scripts ? meta.scripts.map((s) => `  <script src="${s}" defer></script>`).join("\n") + "\n" : ""}</body>
</html>
`;
}

function applyNav(html, active) {
  return NAV_KEYS.reduce(
    (acc, key) =>
      acc.replaceAll(
        `{{NAV_${key}}}`,
        key === active ? "nav-link-active" : "nav-link"
      ),
    html
  );
}

const files = fs.readdirSync(PAGES).filter((f) => f.endsWith(".html"));
let built = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(PAGES, file), "utf8");
  const match = raw.match(/^<!--META\s*([\s\S]*?)-->\s*/);
  if (!match) throw new Error(`${file} is missing its <!--META ... --> block`);

  const meta = JSON.parse(match[1]);
  const body = raw.slice(match[0].length);
  const page = applyNav(shell(meta, body), meta.nav);

  const leftover = page.match(/\{\{NAV_[a-z]+\}\}/);
  if (leftover) throw new Error(`${file}: unreplaced token ${leftover[0]}`);

  fs.writeFileSync(path.join(OUT, file), page);
  built++;
}

console.log(`built ${built} pages -> public/`);

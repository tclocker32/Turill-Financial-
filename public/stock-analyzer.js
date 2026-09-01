/* Concentrated stock planning snapshot.
 *
 * Illustration only. Long-term capital gains are stacked on top of the other
 * taxable income entered, using the 2026 federal brackets, because the rate a
 * gain is taxed at depends on that income and on filing status. This is not a
 * tax-return calculation and does not model short-term gains, AMT, the
 * additional Medicare tax, deductions, losses, carryforwards, transaction
 * costs, or state-specific rules.
 */

const $ = (id) => document.getElementById(id);
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);
const pct = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;
const num = (id) => Math.max(0, parseFloat($(id).value) || 0);

/* 2026 federal long-term capital gains brackets. */
const LTCG_BRACKETS = {
  single: [
    { upTo: 49450, rate: 0 },
    { upTo: 545500, rate: 0.15 },
    { upTo: Infinity, rate: 0.2 }
  ],
  mfj: [
    { upTo: 98900, rate: 0 },
    { upTo: 613700, rate: 0.15 },
    { upTo: Infinity, rate: 0.2 }
  ],
  hoh: [
    { upTo: 66200, rate: 0 },
    { upTo: 579600, rate: 0.15 },
    { upTo: Infinity, rate: 0.2 }
  ]
};

/* Net investment income tax: 3.8% on the lesser of net investment income and
 * the amount by which modified AGI exceeds the statutory threshold. */
const NIIT_RATE = 0.038;
const NIIT_THRESHOLD = { single: 200000, mfj: 250000, hoh: 200000 };

/* Federal LTCG on `gain`, stacked on top of `ordinary` income. */
function federalLtcg(gain, ordinary, status) {
  if (gain <= 0) return 0;
  const bands = LTCG_BRACKETS[status] || LTCG_BRACKETS.single;
  const start = Math.max(0, ordinary);
  const end = start + gain;
  let tax = 0;
  let floor = 0;
  for (const band of bands) {
    const lo = Math.max(start, floor);
    const hi = Math.min(end, band.upTo);
    if (hi > lo) tax += (hi - lo) * band.rate;
    floor = band.upTo;
    if (floor >= end) break;
  }
  return tax;
}

function niit(gain, ordinary, status) {
  if (gain <= 0) return 0;
  const threshold = NIIT_THRESHOLD[status] ?? 200000;
  const excess = Math.max(0, Math.max(0, ordinary) + gain - threshold);
  return NIIT_RATE * Math.min(gain, excess);
}

/* Total estimated tax on realising `gain`, given other income and filing status. */
function taxOnGain(gain, ordinary, status, stateRate) {
  if (gain <= 0) return 0;
  return federalLtcg(gain, ordinary, status) + niit(gain, ordinary, status) + gain * stateRate;
}

function calc(e) {
  if (e) e.preventDefault();

  const ticker = $("ticker").value.trim().toUpperCase() || "your company";
  const value = num("stockValue");
  const basis = Math.min(num("costBasis"), value);
  const other = num("otherAssets");
  const desired = Math.min(num("diversifyAmount"), value);
  const years = Math.max(1, parseInt($("years").value || "3", 10));
  const status = $("filingStatus").value;
  const ordinary = num("otherIncome");
  const stateRate = num("stateRate") / 100;

  const gain = Math.max(value - basis, 0);
  const concentration = value + other > 0 ? (value / (value + other)) * 100 : 0;
  const gainRatio = value > 0 ? gain / value : 0;

  const desiredGain = desired * gainRatio;
  const fullTax = taxOnGain(gain, ordinary, status, stateRate);
  const desiredTax = taxOnGain(desiredGain, ordinary, status, stateRate);

  /* Staging spreads the realised gain across several tax years, so each slice
   * is stacked on the same other income separately. That is the whole point of
   * the comparison — it is why staged sales can land in a lower band. */
  const perYearTax = taxOnGain(desiredGain / years, ordinary, status, stateRate);
  const stagedTotal = perYearTax * years;

  $("concentration").textContent = pct(concentration);
  $("embeddedGain").textContent = money(gain);
  $("fullSaleTax").textContent = money(fullTax);
  $("netFullSale").textContent = money(Math.max(value - fullTax, 0));
  $("effRate").textContent = gain > 0 ? pct((fullTax / gain) * 100) : "--";

  $("down20").textContent = "-" + money(value * 0.2);
  $("down35").textContent = "-" + money(value * 0.35);
  $("down50").textContent = "-" + money(value * 0.5);

  $("sellAmt").textContent = money(desired);
  $("sellTax").textContent = money(desiredTax) + " est. now";
  $("stageAmt").textContent = `${money(desired)} over ${years} yr${years > 1 ? "s" : ""}`;
  $("stageTax").textContent =
    `~${money(perYearTax)}/yr, ${money(stagedTotal)} total` +
    (stagedTotal < desiredTax - 1 ? ` (${money(desiredTax - stagedTotal)} less than selling now)` : "");
  $("exchangeAmt").textContent = money(desired);

  const flags = [];
  const flag = (title, body) =>
    `<div class="metric"><p class="font-bold text-gold">${title}</p><p class="mt-2 text-sm leading-6 text-slate-400">${body}</p></div>`;

  flags.push(
    flag(
      `${concentration >= 50 ? "High" : concentration >= 25 ? "Meaningful" : "Current"} concentration flag`,
      `${pct(concentration)} of the investable assets entered are tied to ${ticker}. ${
        concentration >= 25 ? "Diversification tradeoffs deserve explicit modeling." : ""
      }`
    )
  );

  if ($("insider").value === "yes")
    flags.push(
      flag(
        "Trading-plan review",
        "Company policy, blackout windows and possible Rule 10b5-1 planning should be reviewed before modeling a sale schedule."
      )
    );

  if ($("charitable").value === "yes")
    flags.push(
      flag(
        "Charitable planning flag",
        "Appreciated-share gifting may deserve evaluation before shares are sold. Deduction limits and substantiation rules are fact-specific."
      )
    );

  if (gainRatio >= 0.6)
    flags.push(
      flag(
        "Large embedded-gain flag",
        `${pct(gainRatio * 100)} of current position value is unrealized gain based on the inputs. Tax sequencing becomes especially important.`
      )
    );

  if (stagedTotal < desiredTax - 1)
    flags.push(
      flag(
        "Bracket-sequencing opportunity",
        `Under these assumptions, spreading the sale over ${years} years lands part of the gain in a lower long-term band than selling in one year. The difference shown is an illustration and depends entirely on income staying as entered.`
      )
    );

  flags.push(
    flag(
      "Advanced structure review",
      "Exchange-fund, in-kind, hedging, charitable, estate and other tax-aware techniques may be relevant, but this calculator does not assume qualification."
    )
  );

  $("advancedFlags").innerHTML =
    `<p class="eyebrow">Planning Flags</p><h2 class="mt-2 font-display text-2xl font-bold">What deserves a closer look</h2><div class="mt-6 grid gap-4">${flags.join("")}</div>`;

  const q = new URLSearchParams({
    ticker,
    value: Math.round(value),
    basis: Math.round(basis),
    other: Math.round(other),
    diversify: Math.round(desired),
    concentration: concentration.toFixed(1),
    filing_status: status,
    other_income: Math.round(ordinary),
    insider: $("insider").value,
    charitable: $("charitable").value
  });
  $("reviewCta").href = "/stock-review?" + q.toString();
}

document.addEventListener("DOMContentLoaded", () => {
  $("analyzerForm").addEventListener("submit", calc);
  [
    "stockValue",
    "costBasis",
    "otherAssets",
    "diversifyAmount",
    "years",
    "filingStatus",
    "otherIncome",
    "stateRate",
    "insider",
    "charitable",
    "ticker"
  ].forEach((id) => $(id).addEventListener("change", calc));
  calc();
});

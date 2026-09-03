# Pointing turillfinancial.com at the live site

This moves the **website** from the current Namecheap hosting to Render.
It deliberately does **not** touch email.

> **Do not change the nameservers.** The domain uses Namecheap's hosting
> nameservers (`dns1.namecheaphosting.com` / `dns2.namecheaphosting.com`), and the
> mailboxes ride on those same nameservers. Switching them to anything else takes
> the mail down with the website. Everything below is done by editing individual
> records inside cPanel, which leaves mail alone.

---

## What the domain looks like today

Recorded before any change, so there is always something to roll back to.

| Record | Host | Current value | TTL |
|---|---|---|---|
| A | `@` (turillfinancial.com) | `67.223.118.123` | 14400 |
| CNAME | `www` | `turillfinancial.com` | 14400 |
| A | `mail` | `67.223.118.123` | 14400 |
| A | `webmail` | `67.223.118.123` | 14400 |
| A | `cpanel` | `67.223.118.123` | 14400 |
| A | `autodiscover` | `67.223.118.123` | 14400 |
| A | `autoconfig` | `67.223.118.123` | 14400 |
| A | `ftp` | `67.223.118.123` | 14400 |
| MX | `@` | `mx1/mx2/mx3-hosting.jellyfish.systems` (priority 5 / 10 / 20) | — |
| TXT (SPF) | `@` | `v=spf1 +a +mx +ip4:67.223.118.121 +ip4:67.223.118.124 include:spf.web-hosting.com ~all` | — |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none;` | — |

**Only the first two rows change.** Everything from `mail` downwards stays
exactly as it is — those are what your email clients and webmail connect to, and
they are separate records, so moving the website does not disturb them.

---

## Step 1 — Add the domain in Render first

Render will not answer for a domain it has not been told about, and it cannot
issue the HTTPS certificate until it can see the DNS pointing at it. So do this
**before** touching DNS.

1. Render dashboard → the **turill-financial** service → **Settings** → **Custom Domains**.
2. **Add Custom Domain** → `turillfinancial.com` → save.
3. **Add Custom Domain** again → `www.turillfinancial.com` → save.

Both will show as unverified. That is expected — DNS has not moved yet.

## Step 2 — Shorten the TTL, then wait

Do this a few hours before the actual switch, ideally the evening before.

In cPanel → **Zone Editor** → **Manage** on turillfinancial.com:

- Edit the `A` record for `@` — change **only the TTL** to `300`. Leave the value as `67.223.118.123`.
- Edit the `CNAME` record for `www` — change **only the TTL** to `300`.

Then leave it alone for at least 4 hours (the old 14400 TTL has to expire on its
own). This is what makes the switch itself fast and, more importantly, makes a
rollback fast if anything looks wrong.

## Step 3 — Point the two records at Render

Back in cPanel → **Zone Editor** → **Manage**:

**Edit the A record:**

| Field | Set to |
|---|---|
| Type | `A` |
| Name / Host | `@` |
| Value | `216.24.57.1` |
| TTL | `300` |

**Edit the CNAME record:**

| Field | Set to |
|---|---|
| Type | `CNAME` |
| Name / Host | `www` |
| Value | `turill-financial.onrender.com` |
| TTL | `300` |

Save both. Do not add, delete or edit anything else on that screen.

## Step 4 — Verify in Render

Back in Render → **Settings** → **Custom Domains** → **Verify** next to each
domain. Within a few minutes both should go green and Render will issue the
HTTPS certificate automatically. The certificate can take up to ~15 minutes
after verification; a browser warning during that window is normal and clears
itself.

## Step 5 — Check it actually worked

- `https://turillfinancial.com` loads the site, with a padlock and no warning.
- `https://www.turillfinancial.com` loads the same site.
- Send yourself an email at your domain address, and send one out. **Mail must
  still work** — if it does not, roll back immediately (below).
- Webmail still opens.

---

## Rolling back

Set the `@` A record back to `67.223.118.123` and the `www` CNAME back to
`turillfinancial.com`. With TTL at 300 this takes effect within five minutes.

---

## One follow-up worth doing afterwards: the SPF record

This is not required for the cutover and nothing breaks if it is skipped, but it
is worth understanding.

The SPF record currently starts `v=spf1 +a +mx ...`. The `+a` part means *"the
IP address in this domain's A record is allowed to send email as this domain."*

Right now that authorises the web host, `67.223.118.123`. After the cutover the
A record is Render's load balancer, so `+a` would instead authorise **Render's
shared IP address** — an address used by many unrelated Render customers.

Your actual mail is unaffected either way: it flows through the
`jellyfish.systems` mail servers, which are authorised by the `+mx` part and by
`include:spf.web-hosting.com`, and the two `+ip4:` entries cover the host's
outbound mail servers directly. So `+a` is doing nothing useful for you once the
website has moved, and is mildly counterproductive.

**Suggested change, after the cutover has been confirmed working** — edit the SPF
TXT record on `@` to:

```
v=spf1 +mx +ip4:67.223.118.121 +ip4:67.223.118.124 include:spf.web-hosting.com ~all
```

That is the identical record with `+a` removed. Do it as a separate change on a
separate day, so that if any mail issue appears it is obvious which change caused
it.

---

## What does not change

- Nameservers — untouched.
- MX records — untouched. Mail keeps being delivered to the same mailboxes.
- `mail` / `webmail` / `cpanel` / `autodiscover` / `autoconfig` / `ftp` — untouched.
  Your mail clients and webmail keep connecting exactly as they do now.
- The cPanel account itself stays open. Only the website traffic moves.

---

## After the cutover — three follow-ups, on separate days

Do these one at a time. If two things change at once and something breaks, you
cannot tell which one did it.

### 1. Make turillfinancial.com the primary domain (do first)

Render is currently redirecting `turillfinancial.com` to `www.turillfinancial.com`.
That is backwards for this site: `build-pages.js` sets
`SITE = "https://turillfinancial.com"`, and that bare domain is what every page's
canonical tag, `og:url`, JSON-LD and the sitemap already declare. Leaving the
redirect as-is means search engines are pointed at one address while the site
claims another.

Render's documented behaviour: *add the root domain and Render automatically adds
the `www` subdomain and redirects it to the root.* So:

1. Settings → Custom Domains.
2. Delete **both** `turillfinancial.com` and `www.turillfinancial.com`.
3. Add **only** `turillfinancial.com`. Render adds the `www` redirect itself.
4. No DNS change is needed — the two records already in cPanel stay exactly as
   they are.

Expect a few minutes of certificate re-issuing afterwards.

### 2. Remove `+a` from the SPF record (wait until the site is confirmed stable)

The TXT record currently reads:

```
v=spf1 +a +mx +ip4:67.223.118.121 +ip4:67.223.118.124 include:spf.web-hosting.com ~all
```

`+a` means *whatever the apex A record points at is allowed to send mail as this
domain*. That used to be the Namecheap web server. It now silently means Render's
shared load balancer — an address shared with every other Render customer.
Nothing breaks and nothing warns you; it just widens who can send mail claiming
to be you. Replace it with:

```
v=spf1 +mx +ip4:67.223.118.121 +ip4:67.223.118.124 include:spf.web-hosting.com ~all
```

Your own mail keeps working: `+mx` and the two `ip4:` entries still cover the
Namecheap mail servers. Send yourself a test message from webmail afterwards.

### 3. Raise the TTLs back to 14400

Only once everything above is settled and you are happy. 300 seconds is a
cutover setting; leaving it there just means more DNS lookups forever.

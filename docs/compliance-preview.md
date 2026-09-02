# The compliance preview site

Tactive Compliance asked that any change to the website is reviewed **before it
goes live**. The site auto-publishes the moment code is pushed, so without a
change of setup every edit would break that rule automatically.

This is the setup that fixes it.

## How it works

The same repository is deployed twice:

| Branch | Service | Address | Who sees it |
|---|---|---|---|
| `main` | turill-financial | the live website | the public |
| `staging` | turill-financial-preview | the review copy | you and compliance |

Changes land on `staging` first. Compliance opens the preview address and clicks
through the real, working site. Once they approve, `staging` is merged into
`main` and the live site updates — with exactly the code they signed off on,
because it is the same commit.

The preview copy is not a mock-up or a set of screenshots. It is the identical
application: same pages, same navigation, same forms, same booking calendar.

## Two safeguards on the preview copy

1. **A permanent orange bar** across the bottom of every page reading
   *"PREVIEW COPY — for compliance review only."* Nobody can mistake it for the
   real website.
2. **It is hidden from search engines** — a `noindex` instruction on every page,
   an equivalent HTTP header, and a robots.txt that denies all crawlers. Google
   will not index it and it cannot show up in search results as a duplicate of
   the real site.

Both are switched on by a single environment variable, `SITE_ENV=preview`, which
is set **only** on the preview service. The live service does not have it, and
with it unset the pages it serves are byte-for-byte identical to what it served
before this was added.

---

## One-time setup (about three minutes)

In the Render dashboard:

1. **New** → **Web Service**.
2. Connect the same repository, **tclocker32/Turill-Financial-**.
3. Fill in:
   - **Name**: `turill-financial-preview`
   - **Branch**: `staging`  ← the important one
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Open **Advanced** / **Environment Variables** and add one:
   - Key: `SITE_ENV`
   - Value: `preview`
5. **Create Web Service**.

Render builds it and gives you an address ending in `.onrender.com`. That is the
link to send compliance.

### Check it worked

Open the preview address. You should see the orange *PREVIEW COPY* bar at the
bottom of the page. If the bar is missing, the `SITE_ENV` variable did not save —
go to the service's **Environment** tab, add it, and let it redeploy.

### Why not the render.yaml file

The repo contains a `render.yaml`, which describes the live service. The preview
service is deliberately **not** added to it and should be created through the
dashboard as above. If both services were listed in that file and someone later
told Render to sync it as a Blueprint, Render would try to create the live
service a second time. Creating the preview by hand keeps the two completely
independent, and means nothing you do to the preview can reach the live site.

## A note on the free plan

Free Render services go to sleep after a period of no traffic, and the first
visit after that takes roughly 50 seconds to wake up. For occasional compliance
reviews that is usually fine — just worth warning the reviewer so a slow first
load is not mistaken for a broken link. Upgrading only the preview service to the
cheapest paid tier removes the delay if it becomes annoying.

## Day to day

- I commit work to `staging`.
- You get the preview link and a note of what changed.
- You forward it to compliance.
- On their approval, `staging` goes to `main` and it is live.

Nothing reaches the live website without that approval.

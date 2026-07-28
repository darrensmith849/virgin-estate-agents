# Virgin Estate Agents — Handover & Operations Guide

A modern real-estate website with a content-managed admin dashboard and
analytics, built for Virgin Estate Agents (Harare, Zimbabwe).

---

## 1. What this is

- **Public site** — home, listings index (filter + map), property detail pages,
  agents, about, contact, legal.
- **Admin dashboard** (`/admin`) — manage listings, photos, agents, enquiries,
  agency settings, and view analytics.
- **Tech stack** — Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 ·
  Drizzle ORM · Neon Postgres · Cloudflare Workers (via OpenNext) · Cloudflare R2
  (images) · Mapbox (maps). Enquiries go to the admin inbox + WhatsApp — no email service.

---

## 2. Running it locally

**Prerequisites:** Node 20+, pnpm 10+, and a Postgres database (local Postgres is
fine for development).

```bash
pnpm install
cp .env.example .env          # then fill in the values (see §5)
createdb virgin_estate        # or point DATABASE_URL at any Postgres
pnpm db:migrate               # create the tables
pnpm db:seed                  # create the admin user + demo content
pnpm dev                      # http://localhost:3000  (admin at /admin)
```

The seed prints the admin email; the password is whatever you set as
`ADMIN_PASSWORD` in `.env`.

**Useful scripts**

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build (Next.js) |
| `pnpm preview` | Build with OpenNext + run in Wrangler (Cloudflare runtime) |
| `pnpm deploy` | Build + deploy to Cloudflare |
| `pnpm db:generate` | Generate a new SQL migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed admin + demo data (re-running resets demo listings/agents) |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| `pnpm lint` | Lint |

---

## 3. Managing content (admin guide for the client)

Sign in at **`/admin`**.

- **Dashboard** — at-a-glance counts and recent activity.
- **Listings** — add/edit properties. Create the listing first (title, price,
  status, specs, location, features, agent), then add photos on the edit screen.
  - **Photos**: drag to reorder; click the star to set the cover image; trash to
    delete.
  - **Status**: `Draft` (hidden) → `For Sale` / `To Rent` → `Under Offer` →
    `Sold`. Only non-draft listings appear on the public site.
  - **Feature on homepage**: tick to show a listing in the homepage "Featured" row.
- **Agents** — manage the team profiles shown on listings and the Agents page
  (name, title, photo, phone, WhatsApp, email).
- **Enquiries** — every website enquiry lands here. Move them through
  New → Contacted → Closed, or delete. Email/WhatsApp links are one click.
- **Settings** — agency name, contact details, homepage hero text, social links.

Changes appear on the public site immediately (the site revalidates affected
pages automatically).

---

## 4. Project structure

```
src/
  app/
    (site)/            # public pages (home, listings, agents, about, contact, legal)
    admin/             # login + protected dashboard (listings, agents, enquiries, analytics, settings)
    sitemap.ts, robots.ts
  components/          # ui/, site/, listings/, admin/
  db/                  # schema.ts (Drizzle), index.ts (client), seed.ts
  lib/
    actions/           # server actions (auth, listings, agents, enquiries, settings, analytics)
    auth/              # password hashing, JWT session, data-access guard
    data/              # read queries
    storage/           # image storage (R2 in prod, local FS in dev)
    rate-limit.ts      # per-IP throttling for public write/spend paths
  proxy.ts             # optimistic auth gate for /admin (Next 16 "middleware")
```

---

## 5. Environment variables

See `.env.example` for the full list. Summary:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Local Postgres in dev; Neon connection string in prod (the `neon-http` driver auto-engages for `neon.tech` hosts) |
| `SESSION_SECRET` | ✅ | `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed | Used by `pnpm db:seed` to create the admin login |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public site URL (for SEO, canonical, sitemap) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | optional | Maps show a tasteful fallback until set |
| — | — | No email service is used. Enquiries land in the admin inbox and the visitor is offered a WhatsApp handoff — see §5a |
| `R2_PUBLIC_URL` | prod | Public base URL of the R2 bucket serving images |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | optional | Enables Cloudflare Web Analytics |

Secrets must **never** be committed. Locally they live in `.env` (and `.dev.vars`
for `wrangler`); in production set them with `wrangler secret put <NAME>`.

### 5a. How enquiries reach the agency

There is deliberately **no email service** in this project — nothing to pay for,
nothing to expire.

1. Every enquiry is written to the `enquiries` table and appears immediately at
   **`/admin/enquiries`**, with an unread badge in the admin sidebar. This is the
   permanent record.
2. On submit the visitor is offered a **"Continue on WhatsApp"** button that opens
   a chat to the number in `SITE.whatsapp` (`src/lib/constants.ts`) with their
   name, email, phone, the property and their message already typed. This is how
   the agency hears about an enquiry in real time.

To change the number that receives enquiries, edit `SITE.whatsapp` in
`src/lib/constants.ts` and redeploy.

### 5b. Abuse protection

The public paths that write to the database or cost money are throttled per IP
using Cloudflare's rate-limiting bindings, declared in `wrangler.jsonc` and read
by `src/lib/rate-limit.ts`:

| Limiter | Protects | Allowance |
|---|---|---|
| `CHAT_LIMITER` | `/api/chat` (billable model calls) | 10 / minute |
| `ENQUIRY_LIMITER` | Enquiry form | 4 / minute |
| `LOGIN_LIMITER` | Admin login (password guessing) | 8 / minute |
| `VIEW_LIMITER` | Listing view tracking | 30 / minute |

Nothing needs configuring in the dashboard. The checks fail **open** — if a
limiter is unavailable the request is allowed, so the site can never be taken
down by the throttle itself. Off Cloudflare (`next dev`) the bindings are absent
and all checks pass.

---

## 6. Deploying to Cloudflare

1. **Neon** — create a Postgres database; copy its connection string.
2. **R2** — create a bucket (e.g. `virgin-estate-media`); enable public access (or
   a custom domain) and note the public URL. Uncomment the `r2_buckets` binding in
   `wrangler.jsonc`.
3. **Secrets** — set production values:
   ```bash
   wrangler secret put DATABASE_URL
   wrangler secret put SESSION_SECRET
   # ...and the rest from §5
   ```
4. **Migrate** the Neon DB: with `DATABASE_URL` pointed at Neon, run `pnpm db:migrate`
   then `pnpm db:seed` (once) to create the admin user.
5. **Deploy:** `pnpm deploy` (runs the OpenNext build + Wrangler deploy).
6. **Custom domain** — add the domain in the Cloudflare dashboard and point DNS at
   the Worker. Set `NEXT_PUBLIC_SITE_URL` to the live URL.
7. **Mapbox / Web Analytics** — add the respective tokens as secrets/vars.

> Note: We use the **OpenNext Cloudflare adapter** (`@opennextjs/cloudflare`),
> the current recommended path for Next.js on Cloudflare (the older
> `next-on-pages` is deprecated). It targets Cloudflare Workers but uses the same
> account, DNS, and R2.

---

## 7. Go-live checklist

- [ ] Neon DB created, migrated, admin seeded, `ADMIN_PASSWORD` changed
- [ ] R2 bucket created + binding enabled + `R2_PUBLIC_URL` set
- [ ] All production secrets set via `wrangler secret`
- [ ] Mapbox token added (maps live)
- [ ] Enquiry form tested end-to-end (admin inbox + WhatsApp handoff)
- [ ] Real listings + photos added; demo content removed
- [ ] Agency settings + agent profiles filled in
- [ ] Brand assets applied (logo, final colours)
- [ ] Custom domain connected; `NEXT_PUBLIC_SITE_URL` updated
- [ ] Legal pages (privacy/terms) reviewed by the client
- [ ] Cloudflare Web Analytics token added (optional)

---

## 8. Future: moving to a VPS

The app is portable by design. To migrate off Cloudflare later:
- Point `DATABASE_URL` at the self-hosted Postgres (the driver switches
  automatically).
- Swap the image storage backend (add an S3/MinIO implementation behind the
  existing `Storage` interface in `src/lib/storage`).
- OpenNext also supports a Node server target, or run `next start` directly.

No application rewrite required.

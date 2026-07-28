# Virgin Estate Agents

A modern, photography-led real-estate website with a content-managed admin
dashboard and analytics, for Virgin Estate Agents (Harare, Zimbabwe).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM ·
Neon Postgres · Cloudflare Workers (OpenNext) · Cloudflare R2 · Mapbox.

## Quick start

```bash
pnpm install
cp .env.example .env      # fill in values
createdb virgin_estate    # or any Postgres via DATABASE_URL
pnpm db:migrate
pnpm db:seed
pnpm dev                  # http://localhost:3000  ·  admin at /admin
```

## Documentation

See **[docs/HANDOVER.md](docs/HANDOVER.md)** for the full operations guide:
local setup, content management (admin guide), environment variables, deploying
to Cloudflare, the go-live checklist, and the VPS-migration path.

## Features

- Public listings with filtering, sort, and an interactive Mapbox map
- Property detail pages — gallery/lightbox, stats, features, map, agent card,
  enquiry form, structured data (SEO)
- Admin: listings CRUD with drag-reorder photo uploads, agents, enquiries inbox
  with status workflow, agency settings
- Enquiry inbox with WhatsApp handoff, and an analytics dashboard (views, top listings,
  traffic sources, conversion)
- USD pricing, WhatsApp-first contact, and Harare-specific content

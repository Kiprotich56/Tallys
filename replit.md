# Tally's Barbershop & Beauty Studio

A production-ready full-stack web application for a premium Kenyan barbershop and beauty studio, featuring online booking, a CRM admin dashboard, loyalty program, staff management, and analytics — all priced in KES.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/tallys run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + TailwindCSS + Framer Motion + ShadCN UI + Wouter
- API: Express 5 (OpenAPI-first, Orval codegen)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Charts: Recharts

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contract
- `lib/db/src/schema/` — Drizzle table definitions (services, staff, customers, appointments, reviews)
- `artifacts/api-server/src/routes/` — Express route handlers (services, staff, customers, appointments, reviews, loyalty, dashboard)
- `artifacts/tallys/src/` — React frontend (pages: /, /services, /book, /team, /reviews, /portal, /admin/*)

## Architecture decisions

- OpenAPI-first: all endpoints defined in `lib/api-spec/openapi.yaml`, Orval generates typed React Query hooks and Zod schemas
- Staff availability endpoint uses query params only (`/staff/availability?staffId=&date=`) to avoid Orval `Params` naming collision in lib/api-zod
- Appointments store `date` as `text` in `YYYY-MM-DD` format, `timeSlot` as `HH:MM`
- Loyalty tier calculation is done server-side in the loyalty route based on `total_visits`
- Dashboard routes compute analytics in-memory from raw appointment/customer data (no materialized views needed at this scale)

## Product

- **Public site:** Landing page, Services menu (31 services, 8 categories, KSh-priced), Team profiles, Reviews, Multi-step booking wizard
- **Customer Portal:** View appointments, loyalty tier & points, spending history
- **Admin Dashboard:** Revenue analytics (daily/weekly/monthly KSh), revenue trend chart, service popularity, staff performance, today's appointments
- **Admin CRM:** Appointments management (confirm/complete/cancel), Customer management, Service management, Staff management
- **Loyalty Program:** Bronze (0–4 visits) → Silver (5–14) → Gold (15–29) → Platinum (30+) with tier-specific benefits
- **Currency:** All prices in KES (displayed as "KSh X,XXX")

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Orval Params collision:** endpoints with BOTH a path param AND a query param generate `GetXParams` in both `api.ts` (Zod) and `types/` (TS), causing TS2308. Fix: move the path param to a query param so the endpoint has only query params.
- Staff availability route must come before `/staff/:id` in the router or Express 5 will match `/staff/availability` as `:id = "availability"`.
- Always run `pnpm --filter @workspace/api-spec run codegen` after any spec change before touching route files.
- `pnpm --filter @workspace/db run push` to sync schema changes to the DB.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

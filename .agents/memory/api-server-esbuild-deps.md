---
name: API Server esbuild externals and dependencies
description: Packages from workspace libs must be both externalized in build.mjs AND installed in api-server's package.json to resolve at runtime.
---

When `artifacts/api-server` bundles with esbuild and externalizes a package (e.g. drizzle-orm, pg, zod), Node.js must be able to find it at runtime from `artifacts/api-server/node_modules/`. pnpm does NOT hoist these automatically — they must be declared as direct dependencies in `artifacts/api-server/package.json`.

**Why:** esbuild externalizes the import (leaves it as a bare `import "pkg"`), but the dist bundle runs from `artifacts/api-server/dist/`, which resolves packages via `artifacts/api-server/node_modules/`. If the package is only in `lib/db/node_modules/` or `lib/api-zod/node_modules/`, Node.js won't find it.

**How to apply:** Any time you add a new workspace lib to api-server that brings in new external dependencies, also add those packages to `artifacts/api-server/package.json` dependencies AND to the `external: [...]` list in `artifacts/api-server/build.mjs`. Current externalized packages:
- `drizzle-orm`, `drizzle-orm/*` — catalog version
- `drizzle-zod` — ^0.8.3
- `pg` — ^8.22.0
- `zod`, `zod/v4` — catalog version
- `multer` — latest
- `express-rate-limit` — latest

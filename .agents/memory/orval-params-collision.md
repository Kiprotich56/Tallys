---
name: Orval path+query param collision
description: When an OpenAPI endpoint has BOTH a path param AND a query param, Orval generates GetXParams in both api.ts (Zod) and types/ (TS), causing TS2308 in lib/api-zod barrel.
---

When an operation has a path parameter (e.g. `{id}`) AND a query parameter (e.g. `?date=`), Orval generates `GetXParams` in two places:
1. A Zod schema in `lib/api-zod/src/generated/api.ts`
2. A TypeScript type in `lib/api-zod/src/generated/types/`

The `lib/api-zod` barrel re-exports both with `export *`, causing:
```
error TS2308: Module "./generated/api" has already exported a member named 'GetXParams'.
```

**Why:** Orval's dual-output (Zod + TS types) both derive the same name from the operationId.

**How to apply:** When designing a route that needs a filterable sub-resource, use query params for all filtering instead of a path segment. Example: change `/staff/{id}/availability?date=` to `/staff/availability?staffId=&date=`. This is the same fix as the Body naming rule but applies to params.

The openapi.md reference only documents the Body collision — this Params collision is undocumented and discovered at runtime.

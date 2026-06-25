---
name: Staff availability route ordering in Express 5
description: Static route /staff/availability must be registered before dynamic /staff/:id or Express 5 matches "availability" as the :id value.
---

In Express 5, route registration order still matters for static vs dynamic segments. Register `/staff/availability` BEFORE `/staff/:id` in the router file, or Express will match GET /staff/availability as `req.params.id = "availability"` and return a 404 (no staff with that ID).

**Why:** Express resolves routes in registration order.

**How to apply:** In any router that mixes static sub-paths with dynamic `:id` routes, always put the static routes first (e.g. `router.get("/staff/availability", ...)` before `router.get("/staff/:id", ...)`).

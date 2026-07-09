---
name: Orval/Zod nullable response fields
description: OpenAPI response schemas must mark nullable DB columns as ["type","null"], or Orval-generated Zod parsing throws 500s at runtime for legitimately-null values.
---

When a DB column is nullable (e.g. `customerId` on a guest-authored review, where only `guestName` is set), the corresponding OpenAPI response schema property must be `{ type: ["<type>", "null"] }`, not a bare required type.

**Why:** the generated Zod schema (`lib/api-zod`) `.parse()`s the response before sending it. A non-nullable schema on a field that is actually `null` at runtime (e.g. reviews with no `customerId`) throws a ZodError and returns a 500 to the client — silently breaking the endpoint (e.g. admin "approve review" appeared broken this way) even though the DB and route logic were correct.

**How to apply:** when adding a route/response tied to a nullable column, check the actual runtime data shape (not just the "happy path" record), and update `lib/api-spec/openapi.yaml` + rerun `pnpm --filter @workspace/api-spec run codegen` before assuming a "not working" admin action is a frontend bug.

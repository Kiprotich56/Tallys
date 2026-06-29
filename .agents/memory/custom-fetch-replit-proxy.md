---
name: customFetch returns empty in Replit dev proxy
description: React Query's customFetch with credentials:"include" silently returns empty arrays for list endpoints when accessed through the Replit dev proxy, even though the API is healthy.
---

## The Rule
When a React Query hook uses `customFetch` (which hardcodes `credentials: "include"`) to fetch a public list endpoint through the Replit dev proxy, the hook resolves with an empty array `[]` and `isError: false`. A direct `fetch()` call to the same URL works correctly.

**Why:** The Replit dev proxy uses path-based routing and mTLS. The `credentials: "include"` flag causes the browser to behave differently when going through this proxy layer compared to a plain `fetch()`. The exact mechanism is unclear — the response status is 200 and no error is thrown, but the parsed response body comes back as `[]`.

**How to apply:** Whenever a public list endpoint backed by `useListReviews` (or any hook using `customFetch`) shows an empty state in the Replit preview but the API returns data correctly via `curl`, add a direct `useEffect` + `fetch()` fallback and merge: prefer the hook data when non-empty, fall back to the direct fetch otherwise.

```tsx
const { data: hookData } = useListSomething();
const [directData, setDirectData] = useState<any[] | null>(null);

useEffect(() => {
  fetch('/api/something')
    .then(r => r.json())
    .then(setDirectData)
    .catch(() => setDirectData([]));
}, []);

const displayData = (hookData && hookData.length > 0) ? hookData : (directData ?? []);
```

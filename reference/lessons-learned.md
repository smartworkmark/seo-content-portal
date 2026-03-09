# Lessons Learned — Troubleshooting Log

---

## 2026-03-09 — Infinite Reload Loop & Overheating

### Symptoms
- App kept reloading every ~20ms in the browser
- Computer overheating from CPU spike
- Google Sheets API returning HTTP 429 (Too Many Requests)

### Root Cause
`src/lib/features.tsx` exported only a config constant (`FEATURE_CONFIG`) — no React components. Next.js Fast Refresh requires `.tsx` files to export at least one named React component (uppercase function). When it finds none, it triggers a **full page reload** on every compile cycle instead of a hot update. Since `features.tsx` is in the dependency chain of every page render, this created an infinite loop:

1. Page loads → Turbopack compiles `features.tsx`
2. Fast Refresh: "no component exports" → full page reload
3. Repeat indefinitely

Each reload hit the Google Sheets API, exhausting the rate limit (429), and the server spun constantly trying to compile and serve requests → overheating.

### Fix
Extracted the icon JSX into proper **named React component functions** (uppercase):

```tsx
// ✅ Correct — Fast Refresh detects these as React components
export function HyperlocalIcon() {
  return <svg>...</svg>;
}

export const FEATURE_CONFIG = {
  hyperlocal: { Icon: HyperlocalIcon, ... }
};
```

```tsx
// ❌ Wrong — JSX stored as a value, no component exports → infinite reload
export const FEATURE_CONFIG = {
  hyperlocal: { icon: <svg>...</svg>, ... }
};
```

### Rule to Remember
**Any `.tsx` file that contains JSX must export at least one named React component (uppercase function).** If it only exports config objects or constants — even if those contain JSX or render functions — Fast Refresh will do a full page reload every time it compiles that file.

### Secondary Issue: Turbopack Cache Corruption
The repeated panics/crashes corrupted the Turbopack cache (`.next/` directory). Even after fixing the code, the loop continued until the cache was cleared:

```bash
rm -rf .next && npm run dev
```

Do this any time Turbopack reports a FATAL panic.

---

## 2026-03-09 — Feature Columns Not Mapped to Correct Sheet Columns

### Symptoms
Hyperlocal filter returned 0 results. EEAT filter returned 0 results. Feature pills showed in the UI but clicking them filtered to empty.

### Root Cause
The Google Sheets column names had been updated, but the code still referenced the old names. `google-sheets.ts` looked for columns by exact name (case-insensitive), so any rename silently breaks the feature.

| What code expected | Actual sheet column |
|---|---|
| `hyperlocal` | `Hyperlocal Used` |
| `reviews` | `EEAT Included` |

### Fix
Updated the `findIndex` lookups in `parseBlogs()` in `google-sheets.ts` to match the actual column names:

```ts
const hyperlocalBoolIndex = headers.findIndex((h) => h === 'hyperlocal used');
const reviewsBoolIndex    = headers.findIndex((h) => h === 'eeat included');
```

Also updated the UI label in `features.tsx` from `'Reviews'` → `'EEAT'` to match.

### Rule to Remember
When the Google Sheet schema changes (columns renamed, added, or reordered), update the column name strings in `parseBlogs()`, `parseGmbPosts()`, and `parseReplies()` in `src/lib/google-sheets.ts`. The comment at the top of each parse function documents the expected column layout — keep it in sync.

To quickly verify actual sheet column names without opening the sheet:

```bash
SHEETS_ID="..." API_KEY="..." \
curl -s "https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Blogs!1:1?key=${API_KEY}"
```

---

## General Debugging Tips

- **Check server logs first** — `GET /` repeating in the Next.js log is a sign of a reload loop, not normal behaviour.
- **Vue warnings in browser console** — `__VUE_OPTIONS_API__ not defined` warnings come from `@n8n/chat` (a Vue-based package). These are harmless warnings, not errors, and do not cause reloads.
- **429 rate limiting** — When the page reloads rapidly, it exhausts the Google Sheets API quota. The app falls back to mock data automatically. The 429s self-resolve once the reload loop is fixed and a few minutes pass.
- **Playwright browser** — The Playwright MCP tool keeps a persistent browser session. If diagnostics are running and showing repeated `GET /` requests, close it with the `browser_close` tool before assuming the app itself is looping.

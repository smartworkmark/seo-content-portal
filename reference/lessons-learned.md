# Lessons Learned — Troubleshooting Log

---

## 2026-06-15 — G Ads Pacing: recommendation label contradicts the applied budget

### Symptoms
After the pacing workflow added day-of-week (DOW) shaping (`final_daily_budget`, `dow_multiplier`, etc.), the detail panel showed rows like "No decrease" next to a real −22% cut, and "Decrease (auto)" on budgets that actually went **up**. In a real export, **29 of 129** post-go-live rows had a `recommendation_type` whose direction disagreed with the actual `current → final_daily_budget` move.

### Root Cause
The sheet exposes **two decision layers** that can point opposite directions:
1. **Pacing layer** (`recommendation_type` + `skip_reason`) — the engine's month-to-date decision, measured against a *de-normalized baseline*, not the live budget.
2. **Applied layer** (`final_daily_budget`) — the only number actually pushed to Google Ads.

The old UI led with layer 1 (badge + skip subtext, `—` for "no change"), so it misreported what actually happened. Also: `final_daily_budget` lives past column `AN`, so the original `'A:AN'` fetch range never retrieved it.

### Fix
- **Widened fetch range** to `'A:BH'` (parser matches by header name, so over-fetching is safe).
- **Made `current → final_daily_budget` the source of truth.** `campaignBudgetView()` derives direction/%/status from the real move; `recommendation_type` is used ONLY to branch auto-vs-approval. Skip-reason subtext is suppressed unless the row is genuinely flat. Pre-go-live rows (null `final`) fall back to the legacy rendering.

### Rules to remember
- For G Ads Pacing, **never derive a budget direction or "change" from `recommendation_type`** — use `current_daily_budget → finalDailyBudget` via `campaignBudgetView()`. The label can legitimately contradict the live budget because it's measured against a de-normalized base.
- When a workflow adds columns, **check the fetch range** (`fetchSheet('G Ads Pacing', …)`) — new columns past the current range are silently dropped, not errored.
- Two **upstream (n8n)** issues were identified, owned by the workflow author, NOT the portal: (1) `dow_multiplier` stuck at `1` (Edit-Fields node not passing the value through); (2) the DOW step shapes `proposedDailyBudget × multiplier` for skipped/NO_CHANGE rows — it should shape `currentDailyBudget × multiplier`, otherwise it re-applies pacing changes the engine deliberately skipped. **Both were fixed in the `2026-06-15` workflow** (see the 2026-06-16 entry below for the transition-day side effect).

---

## 2026-06-16 — G Ads Pacing: DOW go-live de-normalization boundary artifact

### Symptoms
First run after the `dow_multiplier` fix (Tuesday 06-16). Action rows (`BUDGET_INCREASE`/`DECREASE`) validated perfectly (`final == round(proposed × multiplier)`, 0 mismatches), but `DOW_ADJUSTMENT` rows were cutting ~16–20% off current (e.g. Fame Dental Local Dentistry $307 → $246) even though Tuesday's multiplier is only −4%. The portal correctly showed these (it just renders `current → final`), so it looked like the data over-cut.

### Root Cause
The workflow de-normalizes the live budget by an **estimated yesterday multiplier derived purely from yesterday's day-of-week**, gated on `DOW_ENABLED_SINCE`:
```js
const DOW_ENABLED_SINCE = '2026-06-12';
if (yesterdayISO >= DOW_ENABLED_SINCE)
  estimatedYesterdayMultiplier = 1 + DOW_MULTIPLIERS[yesterday.getDay()];  // Mon → 1.20
baseCurrentDailyBudget = round(currentBudget / estimatedYesterdayMultiplier);
```
`DOW_ENABLED_SINCE` was `2026-06-12`, but the multiplier didn't *actually* apply until the Edit-Fields fix on `2026-06-16`. So on 06-16 the workflow divided out a Monday +20% boost that the bug had prevented from ever being applied → landed at ~`base × 0.80` instead of the intended `base × 0.96`.

### Fix / Decision
- Set `DOW_ENABLED_SINCE = '2026-06-16'` (the true go-live). Then 06-16 skips de-normalization (yesterday < enabled date → multiplier 1), and from 06-17 on "yesterday" is always a correctly-shaped day, so de-normalization is exact. No new over-correction is ever re-introduced.
- The already-pushed 06-16 over-cut was **intentionally left to self-heal**: under-cutting budget-limited campaigns makes the account underpace, which the pacing engine corrects via `BUDGET_INCREASE`s over the following days. Demand-limited over-cuts are largely harmless (those campaigns weren't spending the budget anyway).

### Rules to remember
- A go-live date constant (`DOW_ENABLED_SINCE`) **must equal the date the behavior actually started taking effect**, not the date the code was deployed. A mismatch creates a one-time boundary artifact at the bug→fix transition.
- The depressed base **does not snowball** — daily de-normalization preserves whatever base is live but never compounds the error; it decays only as pacing issues real increases. So "let it self-heal" is valid, but the heal relies on those catch-up increases actually applying (watch the approval queue for `BUDGET_INCREASE_APPROVAL` rows that would otherwise stall recovery).
- When auditing DOW math, branch by row type: **action rows** use `final = round(campaign_proposed_daily_budget × dow_multiplier)`; **NO_CHANGE/DOW_ADJUSTMENT rows** use `final = round(deNormalizedCurrent × dow_multiplier)`, where `deNormalizedCurrent` is NOT written to the sheet — so a naive `final == proposed × mult` check will false-flag every no-change row.

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

## 2026-03-09 — Newlines from Google Sheets Not Rendered in Detail Panel

### Symptoms
Hyperlocal content and review content displayed as a single run-on line in the expanded blog row panel, even though the raw spreadsheet cell contained line breaks.

### Root Cause
HTML collapses whitespace (including `\n`) by default. The content `<p>` tags had no `whiteSpace` CSS property set, so the browser rendered all text on one line.

### Fix
Added `whiteSpace: 'pre-wrap'` to both content paragraph styles in `BlogDetailPanel` in `src/components/DataTable.tsx`:

```tsx
<p style={{ ..., whiteSpace: 'pre-wrap' }}>{blog.hyperlocalContent}</p>
<p style={{ ..., whiteSpace: 'pre-wrap' }}>&ldquo;{blog.reviewContent}&rdquo;</p>
```

`pre-wrap` preserves `\n` characters as visual line breaks while still allowing normal word wrapping.

### Rule to Remember
Any time content comes from a spreadsheet and may contain embedded newlines, add `whiteSpace: 'pre-wrap'` to the container element. Plain `<p>` tags collapse whitespace.

---

## 2026-03-09 — CSV Export Ignored Feature Filters (Hyperlocal/EEAT)

### Symptoms
Clicking "Export CSV" with an active Hyperlocal or EEAT filter downloaded the full practice+date filtered set (e.g. 223 rows) instead of the feature-filtered set (e.g. 164 rows).

### Root Cause
`handleExport` in `src/app/page.tsx` called `exportToCSV(filteredBlogs, ...)`. The feature filter is applied in a second step, producing `featureFilteredBlogs`. The export skipped that second step entirely.

### Fix
Changed the blogs export to use `featureFilteredBlogs` instead of `filteredBlogs`:

```ts
// Before
exportToCSV(filteredBlogs, 'blogs', [...]);

// After
exportToCSV(featureFilteredBlogs, 'blogs', [...]);
```

### Rule to Remember
Whenever a new filter layer is added on top of existing filtered data (e.g. feature filters on top of practice+date filters), **all downstream actions** (exports, summaries, counts) must use the most-derived filtered variable — not an intermediate one. When adding a new filter, audit every consumer of the previous filtered variable.

---

## 2026-03-09 — Pagination Stranding When Filters Reduce Total Pages

### Symptoms
User navigates to page 2 of results. They then apply a feature filter that reduces results to fewer than 25 items (1 page). The table shows "No blogs found" with no pagination controls to go back, leaving the user stuck.

### Root Cause
`currentPage` in `DataTable` only reset to 1 when `contentType` or `isErrorMode` changed — not when the `blogs` prop shrank due to a filter change. When `totalPages` dropped to 1 and `currentPage` was still 2, the `Pagination` component returned `null` (it hides when `totalPages <= 1`), removing all navigation.

### Fix
Added a second `useEffect` in `DataTable` that resets `currentPage` to 1 whenever any data array length changes:

```ts
useEffect(() => {
  setCurrentPage(1);
}, [blogs.length, gmbPosts.length, replies.length, blogErrors.length, gmbPostErrors.length]);
```

### Rule to Remember
Pagination state must reset whenever the **data** changes, not just when the **tab** changes. Any filter applied externally (practice, date, feature) can shrink results below the current page. Watch all data-length dependencies.

---

## 2026-03-10 — Reviews Content Column Not Populating

### Symptoms
- "Review Content" data added to the Google Sheets Blogs tab was not appearing in the app's expandable blog detail panel
- `reviewContent` was always `null` despite data existing in the sheet

### Root Cause
The spreadsheet column is named **"Reviews Content"** (with an 's'), but `google-sheets.ts` was matching against `"review content"` (without the 's'). The `findIndex` call returned `-1`, so the content was never read.

### Fix
Changed the header match in `parseBlogs()` from `'review content'` to `'reviews content'`.

### Rule to Remember
**Always verify column names against the live spreadsheet header row** — don't assume a column name from documentation or memory. Column names can be subtly different (pluralization, spacing, casing). Use the Google Sheets API to fetch row 1 and confirm exact names.

---

## 2026-05-01 — Custom Tooltip Invisible Despite Correct Positioning

### Symptoms
Built a CSS-only hover tooltip on the conflict warning icon (⚠) inside the G Ads Pacing detail panel. DOM inspection showed:
- `getBoundingClientRect()` reported sensible viewport coords (top: 319, left: 336, width: 230, height: 43.5).
- Computed `opacity` was `1` on hover.
- `getComputedStyle()` showed no `display: none` or `visibility: hidden`.

But the tooltip never appeared visually. Screenshots taken mid-hover showed nothing.

### Root Cause
The campaign breakdown table sits inside **three nested CSS overflow ancestors**:

1. `<div style={{ overflowX: 'auto' }}>` — the table's horizontal scroller.
2. `<div className="max-h-[640px] overflow-y-auto overflow-x-auto">` — the data-table's vertical scroller.
3. `<div className="border border-gray-200 rounded-lg overflow-hidden">` — the rounded outer wrapper.

Any non-`visible` overflow on an ancestor creates a CSS clipping container. An absolute-positioned descendant — even one with `bottom-full` correctly placing it above its trigger — gets clipped at the ancestor's bounding box. With three layers of clipping, the tooltip rendered "into the void."

The tooltip's bounding rect was reported correctly because layout still computed it; only the paint was clipped.

### Fix
Render the tooltip via `createPortal(..., document.body)` so it escapes all three overflow ancestors. Capture the trigger's screen position on `mouseenter` and apply `position: fixed` with `top`/`left` from `getBoundingClientRect()`. State is held in the `ConflictIcon` component:

```tsx
const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
// onMouseEnter: setPos({ left: r.left + r.width / 2, top: r.top - 6 });
// onMouseLeave: setPos(null);
{pos && createPortal(<div style={{ position: 'fixed', left: pos.left, top: pos.top, ... }}>...</div>, document.body)}
```

Lives in `src/components/GAdsPacingDetailPanel.tsx`.

### Rule to Remember
**If a tooltip/popover lives inside any `overflow: hidden | auto | scroll` container — directly or transitively — render it through a portal.** Don't trust `getBoundingClientRect()` and `opacity: 1` as proof of visibility; layout reports those even when paint is clipped.

Quick triage when a CSS-positioned overlay appears invisible:
```js
let el = element.parentElement;
while (el) {
  const cs = getComputedStyle(el);
  if (cs.overflow !== 'visible') console.log(el, cs.overflow);
  el = el.parentElement;
}
```

If any ancestor has non-`visible` overflow, switch to a portal.

---

## 2026-05-27 — "Needs Review" Showing for Accounts with No Approval Campaigns

### Symptoms
- The "Pacing Reviews Pending" summary card count was inflated — it counted every G Ads Pacing account with an empty `approvalStatus`, including accounts whose campaigns were all auto-applied (`BUDGET_INCREASE`, `BUDGET_DECREASE`) or `NO_CHANGE`.
- "Needs review" chip appeared in the table for accounts that had nothing for a human to approve.
- The feedback form (decision dropdown, reviewer name, notes) appeared in the detail panel for those same accounts.

### Root Cause
The approval status field (`approvalStatus`) defaults to `''` (empty string) for every account that hasn't been explicitly marked Approved or Rejected. The original UI logic treated `approvalStatus === ''` as synonymous with "needs review," but not every account actually needs a human decision — only those with campaigns of type `BUDGET_INCREASE_APPROVAL`, `BUDGET_DECREASE_APPROVAL`, or `PAUSE_CAMPAIGN`.

### Fix
Added `needsApproval(record: GAdsPacingRecord): boolean` helper in `src/lib/g-ads-pacing.ts` that returns true only when at least one campaign has an approval-required recommendation type. Gated three callsites on this helper:

1. **"Needs review" chip** (`DataTable.tsx`) — `approvalStatus === '' && needsApproval(record)`
2. **Feedback form** (`GAdsPacingDetailPanel.tsx`) — `!showGrace && !record.accountOnTrack && needsApproval(record)`
3. **Summary count** (`useContentData.ts` and `google-sheets.ts`) — filter by `needsApproval(g)` before counting pending records

### Rule to Remember
**`approvalStatus === ''` means "not yet reviewed," not "needs a review."** An account with only auto-applied or no-change campaigns has nothing to approve — its approval status is empty by default, not because it's awaiting a decision. Always gate approval UI on the presence of approval-required recommendation types (`BUDGET_INCREASE_APPROVAL`, `BUDGET_DECREASE_APPROVAL`, `PAUSE_CAMPAIGN`), not just on an empty `approvalStatus`.

---

## General Debugging Tips

- **Check server logs first** — `GET /` repeating in the Next.js log is a sign of a reload loop, not normal behaviour.
- **Vue warnings in browser console** — `__VUE_OPTIONS_API__ not defined` warnings come from `@n8n/chat` (a Vue-based package). These are harmless warnings, not errors, and do not cause reloads.
- **429 rate limiting** — When the page reloads rapidly, it exhausts the Google Sheets API quota. The app falls back to mock data automatically. The 429s self-resolve once the reload loop is fixed and a few minutes pass.
- **Playwright browser** — The Playwright MCP tool keeps a persistent browser session. If diagnostics are running and showing repeated `GET /` requests, close it with the `browser_close` tool before assuming the app itself is looping.

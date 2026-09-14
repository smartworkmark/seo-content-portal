# Lessons Learned — Troubleshooting Log

---

## 2026-07-31 — Optimistic budget save silently wiped campaigns absent from the payload

### Symptoms
Latent, and invisible until paused campaigns started rendering a held amount. After saving a
campaign budget allocation, any campaign not included in the POST body had its `budgetDollars`
blanked in local state until the next hourly sync. Shared-budget campaigns had been hitting this
since the feature shipped; it was masked because the read-only table short-circuits on
`c.sharedBudget` and prints `—` for them regardless of the value.

### Root Cause
`useContentData.ts` built `dollarsByCampaign` from `payload.campaigns` and then applied it to
*every* campaign on the account:

```ts
budgetDollars: payload.managed ? (dollarsByCampaign.get(c.campaignId) ?? null) : null
```

`.get()` returns `undefined` for a campaign that was never in the payload, and `?? null` converts
that into "this campaign has no budget" — conflating **"not mentioned"** with **"cleared"**. The
backend does the opposite: it tombstones only campaigns named in `removed_campaign_ids`, so
absence means "leave alone". Client and server disagreed about the meaning of omission.

### Fix
Test membership, don't coalesce the value:

```ts
budgetDollars: payload.managed
  ? (dollarsByCampaign.has(c.campaignId)
      ? (dollarsByCampaign.get(c.campaignId) as number)
      : c.budgetDollars)   // absent from payload → leave alone
  : null;                   // managed:false clears everything, correctly
```

`.has()` rather than `?? c.budgetDollars`: the `??` form happens to work for a legitimate `0`, but
it would silently restore the **old** value if anything upstream ever yielded `undefined` for a
campaign that *was* in the payload — surfacing to the operator as "my $0 save didn't take", with
no error anywhere.

### Rule to remember
**In an optimistic update, "absent from the payload" and "set to empty" are different facts —
encode which one you mean.** Reach for `map.has(key)` when the question is membership; `?? default`
answers a different question and quietly merges the two cases. Check this whenever the payload is
a *filtered* subset of what's on screen, and make sure the client's meaning of omission matches
the backend's.

---

## 2026-07-31 — A "$0 allocation" needed a backend gate, not a frontend fallback

### Symptoms
Operators wanted to park a campaign at $0 ("keep it to zero for now, we'll set it as soon as we're
able"). The allocation save gate required every field `> 0`, so $0 was unreachable.

### Root Cause
Relaxing the gate alone would have been actively dangerous, not merely a no-op. A $0 target on an
ENABLED campaign that has already spent this month sets `campaignSteered = true` and proposes
$0/day, which the damping ladder converts into a compounding $50 → $35 → $25 decrease — silently,
with no operator-visible signal. A frontend-only fallback (e.g. `&& cfg.budget_dollars > 0`
reverting the row to spend-share) would also have left the row routable, so day-of-week shaping
would still convert it and `Alter Budget` would still write it — the n8n code carries an explicit
`DOW_CONVERT_EXCLUSIONS` list precisely for this, and a frontend fallback wouldn't be on it.
Worse, spend-share for one campaign while its siblings steer by target breaks the XOR invariant
that an account is *either* account-steered *or* campaign-steered.

### Fix
Backend B4: a `NO_CHANGE / UNALLOCATED_TARGET` branch in the routing ladder plus the exclusion
entry, making $0 genuinely inert. Only then was the frontend gate relaxed to
`Number.isFinite(d) && d >= 0`. This also dissolved the `budget_dollars || 0` ambiguity — blank
and deliberate-zero now mean the same thing ("not allocated yet") and behave identically.

Removed the `parseFloat(...) || 0` coercion in the payload at the same time: it silently turned
NaN into a deliberate $0. Unreachable through the button while the gate held, but exactly the trap
the `>= 0` change arms.

### Rule to remember
**Before relaxing a validation gate, find out what the value does downstream — a gate is often the
only thing standing between a benign-looking input and a live money path.** "It'll just be a
no-op" is a hypothesis about the backend, not a fact about the frontend. And when a sentinel value
becomes legal, audit every `|| 0` / `?? 0` on its path: those coercions were load-bearing
correctness only while the value was impossible.

---

## 2026-07-31 — Hiding paused campaigns from the allocation editor would have stranded budget invisibly

### Symptoms
A PAUSED campaign rendered as a fully editable, save-gated row in the budget allocation card,
while the campaign breakdown directly below it hid the same campaign — the two halves of one panel
disagreed. The obvious fix (filter paused out of the editor too) was wrong.

### Root Cause
Two things collided. `campaignStatus` had been in the feed since the 7/30 deploy but
`isEligible()` still only checked `sharedBudget`, with a stale comment claiming paused state was
"not yet in the feed". Separately, backend B4 made a paused campaign's allocation **retained and
inert** — so the money stays parked where it cannot steer. Filtering the row out would have made
that stranded budget invisible *and* unclearable. Live data at the time: 293 records with an
eligible+PAUSED campaign, 45 holding real money — one account with its entire $2,500 budget parked
in two paused campaigns.

### Fix
Split the predicate rather than widening it. `isEligible` ("does this get a row?") stays
`!sharedBudget`; new `isAllocatable` ("can this be given a new amount?") adds `isCampaignEnabled`.
Rendering keys off the first, the save gate/draft/summary/editable-payload off the second. Paused
rows render greyed with the held amount as static text. Held dollars are **excluded** from the
allocation total and named separately, so the under-allocation warning fires and explains itself.

The same eligibility predicate was inlined a second time in `applyBudgetConfigs`'s mode rollup;
that copy was repointed at `isAllocatable` too, otherwise a paused campaign whose status row never
flipped to `'campaign'` would hold the account at account-level forever.

### Rule to remember
**When a filter would hide a state the operator needs to act on, the answer is a disabled
affordance, not a hidden one.** "Not editable" and "not visible" are different requirements and
frequently pull in opposite directions — before filtering, ask what becomes undetectable. Related:
when one predicate starts serving two questions, split it instead of widening it, and grep for
inlined copies of it (`applyBudgetConfigs` had one) rather than assuming the exported helper is the
only definition.

---

## 2026-07-29 — Paused campaigns appear to receive budget increases

### Symptoms
The pacing detail panel showed positive budget changes on campaigns labeled **Paused** or **Approved**. Examples in the July 29 data included East Vancouver ($18 → $29), even though the workflow action was `PAUSE_CAMPAIGN`.

### Root Cause
The workflow and portal attach different meanings to the same row:

1. In the n8n workflow, `PAUSE_CAMPAIGN` is rebuilt into `actions.pauseList` and routed to `campaigns:mutate` with only `updateMask: status`. It is not placed in `actions.autoApply` and does not call `campaignBudgets:mutate`.
2. The pause row still logs `proposed_daily_budget` and a de-normalized `final_daily_budget` for audit purposes. Neither is a pause-action budget target.
3. In `GAdsPacingDetailPanel`, `pending` is defined as `view.mode === 'approval' || view.mode === 'pause'` regardless of the actual approval status. Every pause row therefore displays `ifApprovedTarget = proposedDaily` and its delta as though approving the pause would also change the budget. This continues even after `approvalStatus === 'Approved'`.

### Fix
Treat pause actions as status-only in the portal. A `PAUSE_CAMPAIGN` row should display no Applied/Proposed budget and no Change (`—`), regardless of approval state. Reserve `ifApprovedTarget` for `BUDGET_INCREASE_APPROVAL` and `BUDGET_DECREASE_APPROVAL`; never use it for pause rows.

### Rule to remember
**A pause approval changes campaign status, not campaign budget.** Logged pacing proposals on a pause row are audit context and must not be rendered as applied or if-approved money movement.

---

## 2026-07-29 — Current pause flags make historical pacing rows look paused

### Symptoms
The backend status export contained 15 paused campaign rows across 7 Google Ads accounts, while a live-portal export filtered to **Paused / Last 7 Days** contained 28 rows across only 6 accounts. Individual accounts appeared once on several run dates, including dates before their recorded `paused_date`.

### Root Cause
`applyBudgetConfigs()` joins the current `Campaign Budget Status.paused_by_agent` value onto every historical `G Ads Pacing` record containing that campaign ID. `resolveDisplayStatus()` then gives the derived Paused override precedence, and the date filter independently filters by the pacing record's `runDate`. The result is a projection of today's pause state backward across multiple daily snapshots—not a pause-event history and not a campaign count.

### Fix
Do not use the normal Status/Last-7-Days result to count pause events. The dedicated paused-practices view reads `google_ads_id + paused_date` from Campaign Budget Status, filters pause events to the current calendar month, and deduplicates by account. Paused was removed from the normal Status dropdown. For normal history, join the account's distinct event dates as `pauseDates`; `resolveDisplayStatus()` and row dimming apply Paused only when `record.runDate` exactly matches one of those dates. Earlier and later rows retain their own daily `display_status`/variance tier.

### Rule to remember
**Current-state joins and historical snapshots answer different questions.** Never interpret repeated account-by-day rows carrying a current status as distinct events, campaigns, or practices.

---

## 2026-07-29 — Monthly paused-practice view drops accounts from older pacing snapshots

### Symptoms
`Campaign Budget Status` contained 15 paused campaigns across 7 Google Ads accounts in the current month, but the portal showed only 6 paused practices. The missing account had two paused campaigns in the status sheet, yet its latest pacing run contained only a different active campaign.

### Root Cause
The paused view reconstructed account membership from the latest `G Ads Pacing` record and required every campaign in that record to be paused. Paused campaigns can disappear from later pacing runs, so the latest snapshot is not a complete history of pause events.

### Fix
Use `Campaign Budget Status.google_ads_id`, `paused_by_agent`, and `paused_date` as the paused-view membership source. Filter those events to the current calendar month, deduplicate by `google_ads_id`, and use the latest pacing record only for display details. Keep the normal pacing payload bounded to seven days.

### Rule to remember
**Event views must be built from the event/status source, not reconstructed from a changing daily snapshot.** A missing campaign in a later pacing run does not erase its earlier pause event.

---

## 2026-07-29 — Paused status exists, but the portal drops the pause date

### Symptoms
The Google Ads pacing portal could identify a fully paused account through `paused_by_agent`, but it could not show when the account became paused. Reusing `runDate` would have shown the pacing snapshot date rather than the actual pause event.

### Root Cause
The n8n workflow already writes `paused_date` to the backend-owned **Campaign Budget Status** sheet, but `parseBudgetStatus()` only parsed `paused_by_agent`. The join therefore discarded the date before the data reached the UI.

### Fix
Parse and join `paused_date` onto every campaign. For a fully paused account, derive **Date Paused** as the latest campaign pause date—the date the final campaign became paused. Keep the normal browser payload bounded to seven days and send a separate, deduplicated current-month paused snapshot instead of exposing all pacing history to the client. The month boundary must be applied to **Date Paused**, not to the pacing run date.

### Rule to remember
**Pause state and pause timing are separate fields.** Use `paused_by_agent` to decide whether a campaign is paused, use `paused_date` for timing, and derive an account’s pause date from the latest paused campaign. Never substitute the pacing `runDate` for the pause event date.

---

## 2026-07-08 — "NEXT_PUBLIC_… is not configured" in production (env var missing from Vercel)

### Symptoms
Submitting a Keyword Buildout approval on the **deployed (Vercel) UI** threw `NEXT_PUBLIC_KW_FEEDBACK_WEBHOOK_URL is not configured` (the `if (!webhookUrl)` guard in `useContentData.ts`). The error appeared with **nothing in the Network or Console tabs** on button press — no fetch fired at all. A hard refresh did not help. The same var was present in `.env.local` and worked fine on `localhost`.

### Root Cause
`.env.local` is **local-dev only** — it is never uploaded to Vercel. The var was never added to the Vercel project's Environment Variables, so the production build inlined `undefined`. Because `NEXT_PUBLIC_*` values are **string-inlined at build time**, the guard threw before reaching `fetch()`, which is why no network request appeared.

### Fix
1. Add the var in Vercel (Settings → Environment Variables, or `vercel env add NEXT_PUBLIC_KW_FEEDBACK_WEBHOOK_URL production`), for Production **and** Preview.
2. **Redeploy** (`vercel --prod` or Deployments → Redeploy). Saving the var alone does nothing to existing builds — the value only gets baked in on the next build.

### Rule to remember
**Any time a new `NEXT_PUBLIC_*` (or any) env var is added to `.env.local`, it MUST also be added to Vercel and the site redeployed — otherwise it works locally and silently breaks in production.** When adding a new env-gated feature, add setting the Vercel var to the checklist, or ask Mark to do it together. Quick prod-vs-local check: if a feature works on `localhost:3000` but errors with "…is not configured" on the live site and fires no network request, the Vercel env var is missing.

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

## 2026-07-23 — PR "not mergeable" from a Duplicated Commit

### Symptoms
- `gh pr merge` failed with `Pull request #4 is not mergeable: the merge commit cannot be cleanly created`, even though the feature branch had been rebased on a recent `main` and had only touched files nobody else was editing.
- `git log main..branch` showed **two** commits, one of which looked like work that was already released.

### Root Cause
The branch's older commit (`38c0ab0`) had already been merged into `main` **under a different SHA** (`f79cf64`) via an earlier squash/merge PR. Git saw two independent commits making the *same* edits to the same lines, so the three-way merge conflicted on every hunk. `git diff 38c0ab0 f79cf64 -- src/` returned **empty**, proving the content was identical and only the SHA differed.

### Fix
Rebased the branch onto `main` while **dropping the already-merged commit**, replaying only the genuinely new work:

```bash
git diff <local-sha> <main-sha> -- src/    # empty output ⇒ same content, different SHA
git rebase --onto origin/main <already-merged-sha> <branch>
git push --force-with-lease origin <branch>
```

The PR then merged cleanly with a single new commit.

### Rule to Remember
**A merge conflict on a "clean" branch usually means duplicated commits, not genuinely competing edits.** Before resolving hunks by hand, check whether the conflicting commit is already on `main` under a different SHA — squash-merges and re-created PRs both cause this. `git diff <local> <main> -- src/` returning empty is the tell. The fix is `git rebase --onto origin/main <already-merged-sha>` to drop the duplicate, **never** hand-resolving the conflict (which would re-apply the same change twice). Always use `--force-with-lease`, never bare `--force`, when force-pushing a rebased branch.

---

## 2026-07-23 — Campaign Rows Stuck on "Pending Approval" After the Account Was Approved

### Symptoms
- The account's **Feedback** column read **Approved**, but every campaign inside the expanded panel still read **Pending approval** — indefinitely, with no self-correction.
- The account's amber "pending approval" action dot stayed amber forever.
- Worse: on those same pending rows, **Applied /day and Change both rendered `—`**, so the reviewer was asked to approve a budget change without being shown what the change was. Most visible on campaigns moving *counter* to the account direction (an increase while the account is decreasing) — precisely the case that routes to approval.

### Root Cause
Two independent problems that looked like one:

1. **Two unrelated sources of truth.** The account label comes from the `approval_status` column (human feedback, written back by the Make.com webhook). The campaign pill and the action dots came from `appliedStatusLabel(campaignBudgetView(c))` / `actionDotCounts(campaigns)`, which only ever saw `recommendation_type`. `recommendation_type` is a record of what the pacing engine decided **on that run date** and is never rewritten — so it advertises "pending" forever. Approving in the portal makes the workflow update the sheet **and action the Google Ads budget immediately**, so the pill was not merely stale, it was contradicting a change already live in Google Ads.

2. **`final == current` collapsed the numbers.** On a not-yet-approved row the workflow hasn't applied anything, so `final_daily_budget` still equals `campaign_current_daily_budget`. In `campaignBudgetView()` that yields `target = final` → `delta = 0` → `direction = 'flat'` → `showDash = true`, dashing out both Applied /day and Change. `CLAUDE.md` had documented the intent ("Applied /day = final, **or the if-approved target for approval/pause rows**") but the code never implemented that second clause.

### Fix
- Threaded the account's `approval_status` into both helpers: `appliedStatusLabel(view, approvalStatus)` and `actionDotCounts(campaigns, approvalStatus)`. Approval/pause rows now read **Needs approval** (amber) → **Approved** (emerald) / **Rejected** (rose), and the amber dot turns **green** once actioned.
- Added `ifApprovedTarget` (= `proposedDaily`) and `ifApprovedDeltaPct` to `CampaignBudgetView`; the panel uses them whenever `mode` is `'approval'` or `'pause'`, with an italic `if approved` subtext, so pending rows always show the number being approved.
- **Deliberately did NOT** repoint `target`/`deltaPct`/`direction` at the proposal, even though that would have been a smaller diff.

### Rule to Remember
**`direction`/`deltaPct`/`target` mean *actually applied* movement (`current → final`) — never the proposal.** `hasAppliedChange()`, and therefore on-track row dimming, depends on that meaning; repointing them at the proposal would make pending approvals count as applied changes and un-dim on-track rows. Add new fields for hypothetical values instead of overloading existing ones.

And more generally: **when a status label never self-corrects, look for two independent sources of truth.** A column written by the *engine* (`recommendation_type`) and a column written by a *human* (`approval_status`) describe different things and will silently disagree forever. Any UI that mixes them must read both. Both new params default to `''`, so a forgotten argument silently restores the old stale behavior — always pass `record.approvalStatus`.

---

## 2026-09-14 — Content Refresh Taking Up to 10s (Performance Investigation)

### Symptoms
- Dashboard load/refresh took up to ~10s. User suspected it was fetching far more data than the UI (max 90 days) ever displays.

### Root Cause
Three compounding issues in `fetchAllContent()` (`src/lib/google-sheets.ts`):
1. 8 separate `values.get` HTTP calls (one per sheet) instead of one `values:batchGet`.
2. Zero caching anywhere — `cache: 'no-store'` on every fetch, no memoization in the API route — so *every* load/tab-remount/hourly-sync re-fetched and re-parsed all 8 sheets from scratch, even seconds apart.
3. Full, unbounded history returned to the browser for Blogs/GMB Posts/Replies/Neg Keywords/KW Buildout (only G Ads Pacing was already windowed to 7 days).

### Fix
- Consolidated the 8 fetches into 1 `batchGet` call, with automatic fallback to the old per-sheet-with-individual-catches path if the batch call fails (batchGet fails *entirely* if any requested sheet doesn't exist — the fallback preserves graceful degradation for optional sheets on older spreadsheets).
- Added a 45s in-memory server cache + in-flight de-dup around `fetchAllContent`. `forceRefresh` (the manual Refresh button) always bypasses it. This is the change that actually mattered: repeat loads went from ~13s to 0ms.
- Added a 120-day return-side trim (mirroring the existing G Ads Pacing 7-day trim) for Blogs/GMB Posts/Replies/Neg Keywords/KW Buildout/errors — computed **after** `practices`/`accounts`/summary stats are derived from the full untrimmed arrays, so dormant practices and historical counts don't regress.
- Negative Keywords specifically: discovered via live measurement that its 80,425 rows span only ~105 days (very high daily volume — multiple rows per practice/campaign/day — not "years of history" like the row count suggests). Added a row-count metadata lookup (cheap, ~400ms) + tail-windowed fetch (last 20,000 rows ≈ 3 weeks), with the header row fetched as its own small range (`A1:Z1`) and merged back on top — **a tail slice starting mid-sheet loses row 1**, which the column-name-matching parser depends on.

### What was investigated and deliberately NOT done: windowing G Ads Pacing's fetch range
This sheet (96,683 rows × 52 columns, ~5M cells) is ~11 of the ~13 total cold-load seconds — by far the dominant cost, dwarfing Negative Keywords. A "fetch only recent rows" fix seemed obvious but real measurements killed it:
- **Row growth is heavily back-loaded** (density has been ramping up as more accounts/campaigns are added), so even the tightest safe window — last 10 days + the full previous calendar month (required by `lastMonthGAdsPacing()`, `src/lib/g-ads-pacing.ts:399-423`) — still needs **73% of the sheet's rows**. Not worth the month-boundary edge-case risk for a ~25% cut.
- **The real cost driver is column count, not row count**: fetching 1 column (96,683 rows) took 710ms; fetching the full `A:BH` (60 columns) took 11.1s — roughly linear in cell count. But `parseGAdsPacing` matches ~39 fields **by header name, not position** (deliberately, per rule #31 below — hand-narrowing the column range would silently drop a column again the next time one is added/reordered, exactly the incident that rule already documents).
- Conclusion: no safe, worthwhile fix exists within this codebase for the remaining ~11s. A durable one would mean the n8n pipeline maintaining a separate, smaller "current state" table for the portal to read from daily, with full history kept elsewhere — a backend/workflow decision outside this repo, not something to bolt onto the frontend speculatively.

### Rule to Remember
**Before optimizing a Google Sheets fetch, measure the actual sheet — row count, column count, and date density — via a live script, not code inspection alone.** Column count can dominate fetch time more than row count (a 60-column fetch here was ~15x slower than a 1-column fetch of the same rows). And a sheet's row count can be misleading: 80k rows might span 3 weeks (extremely high density, safe to windowed-fetch) or 96k rows might span 5 months with growth back-loaded into the recent weeks (windowing barely helps, since "recent" already IS most of the sheet). Don't assume high row count ⇒ old data ⇒ safe to truncate — check first.

Also: **a server-side cache is worth far more than reducing fetch payload size**, for any app where the same data is loaded repeatedly in a short window (tab switches, remounts, multiple users). The cache changed repeat loads from ~13s to 0ms; payload/range optimizations on top of that only affect the comparatively rare cold-load case.

---

## General Debugging Tips

- **Check server logs first** — `GET /` repeating in the Next.js log is a sign of a reload loop, not normal behaviour.
- **Vue warnings in browser console** — `__VUE_OPTIONS_API__ not defined` warnings come from `@n8n/chat` (a Vue-based package). These are harmless warnings, not errors, and do not cause reloads.
- **429 rate limiting** — When the page reloads rapidly, it exhausts the Google Sheets API quota. The app falls back to mock data automatically. The 429s self-resolve once the reload loop is fixed and a few minutes pass.
- **Playwright browser** — The Playwright MCP tool keeps a persistent browser session. If diagnostics are running and showing repeated `GET /` requests, close it with the `browser_close` tool before assuming the app itself is looping.

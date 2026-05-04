# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Troubleshooting Reference

Past debugging sessions, root causes, and lessons learned are documented in:
**[reference/lessons-learned.md](reference/lessons-learned.md)**

Key rules to know before touching related code:
- `.tsx` files must export at least one named React component (uppercase) — see lessons-learned.md for the Fast Refresh reload loop issue
- Google Sheets column names must match exactly — check `parseBlogs()` in `google-sheets.ts` if feature filters return 0 results

**When you discover a new bug, root cause, or non-obvious fix during any session, add an entry to `reference/lessons-learned.md`.** Include: symptoms, root cause, the fix, and a "rule to remember" so future sessions don't repeat the same diagnosis work.

## Testing Cleanup Rule

After any session that uses Playwright (or any browser/screenshot-based testing), the working directory accumulates throwaway artifacts: `*.png` screenshots in the repo root and `.playwright-mcp/` (page snapshots, console logs). These are not committed and just create clutter.

**Rule: when testing is finished for the current task, always ask the user before deleting screenshot/test artifacts** — never delete them silently or without confirmation, even if you created them yourself in this session.

- Trigger: end of a task that involved Playwright tool calls or wrote `.png`/`.yml`/`.log` files into the repo root or `.playwright-mcp/`.
- What to ask: list the artifacts and propose deleting them ("Want me to clean up the 7 screenshots and `.playwright-mcp/` from this session?"). Wait for explicit confirmation.
- Scope: only delete files that *this* session generated. Don't touch artifacts you didn't create — they may belong to user-driven testing.
- Never use `rm -rf` on broader patterns (e.g. `rm -rf *.png`) without listing exactly what will be removed first, so the user can verify the scope.

## Project Overview

This is a Next.js-based content portal for managing SEO content (blogs, GMB posts, and review replies) sourced from Google Sheets. The application uses TypeScript throughout and follows a modern React pattern with Server Components and client-side interactivity.

## Commands

### Development
```bash
npm run dev        # Start development server (usually port 3000)
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npx tsc --noEmit   # Type check without emitting files
```

## Architecture

### Data Flow

The application follows a specific data flow pattern:

1. **Google Sheets → Server → API → Client → UI**
   - `src/lib/google-sheets.ts` fetches raw data from Google Sheets API (or mock data)
   - `src/app/api/content/route.ts` wraps this in a Next.js API route
   - `src/hooks/useContentData.ts` fetches from API and applies client-side filters
   - Components consume filtered data from the hook

2. **Filtering happens at TWO levels:**
   - **Server-side** (`google-sheets.ts`): Filters out invalid records during parsing (empty required fields, invalid URLs)
   - **Client-side** (`utils.ts`): Additional filtering based on user selections (practice, date range, URL validation)

3. **URL Validation is critical:**
   - `isValidUrl()` in `src/lib/utils.ts` validates ALL URLs
   - Accepts URLs with or without `http://`/`https://` prefix
   - Rejects placeholder text ("TBD", "pending", etc.)
   - Used in BOTH server and client filtering
   - Blog URLs also get sanitization to remove localhost prefixes

### Key Architectural Patterns

**Google Sheets Integration:**
- Requires `GOOGLE_SHEETS_ID` and `GOOGLE_API_KEY` in `.env.local`
- Falls back to mock data automatically if not configured
- No OAuth required (uses public API with API key)
- Expected sheet names: "Blogs", "GMB Posts", "GMB Replies", "Negative Keywords", "G Ads Pacing"
- Data is NOT cached (`cache: 'no-store'`) for fresh data

**Type System:**
- All content types defined in `src/types/index.ts`
- Four main content types: `BlogPost`, `GmbPost`, `GmbReply`, `NegKeywordReview`
- All blog/GMB/neg-keyword types (including error types) include `companyId` for HubSpot integration
- Unified filtering interface via `DateRange` (`'1d' | '3d' | '7d' | '30d' | '90d'`) and filter functions
- Path alias `@/*` maps to `./src/*`

**Component Structure:**
- `src/app/page.tsx` is the main dashboard (Client Component)
- `src/components/DataTable.tsx` handles display, sorting, and pagination
- `src/components/Filters.tsx` manages practice/account and date range selection
- `src/hooks/useContentData.ts` centralizes data fetching and filter application
- All UI components follow a consistent pattern with loading states

**State Management:**
- No global state library (React hooks only)
- Filter state lives in parent component and flows down
- `useContentData` hook manages server state and filtered results
- Local component state for UI concerns (sorting, pagination, expansion)
- Saved filters persist in localStorage via `useSavedFilters` hook
- **Automatic re-sync:** Data automatically re-syncs from Google Sheets every hour (3,600,000ms)

**Saved Filters System:**
- Users can select multiple practices via `MultiSelectDropdown` component
- Filter configurations can be saved with custom names
- Stored in localStorage (key: `content-portal-saved-filters`)
- Filters are tab-specific (blogs, gmb-posts, replies have separate saved filters)
- Empty practices array `[]` means "all practices" - simplifies storage/comparison

**Blog Enrichment Indicators Feature:**
- Blogs can have two enrichment features tracked in Google Sheets: **Hyperlocal** (teal, map pin icon) and **EEAT** (purple, star icon)
- Feature presence is driven by boolean columns in the Blogs sheet (`Hyperlocal Used`, `EEAT Included`) — empty cell = false, only literal `"TRUE"` activates
- Two content columns hold the enrichment text: `Hyperlocal Content`, `Review Content`
- `FEATURE_CONFIG` in `src/lib/features.tsx` is the single source of truth for all feature UI (colors, icons, labels) — adding a new feature = one new entry here
- **`BlogPost`** type includes: `hyperlocalEnabled`, `reviewsEnabled`, `hyperlocalContent`, `reviewContent`, `features` (derived string array)
- **Feature icons** render inline in the Practice cell of each blog row; muted gray by default, colored when in "include" filter mode or hovered; click cycles the filter state
- **Feature filter pills** (`Features: [Hyperlocal] [EEAT]`) appear in the Filters bar on the Blogs tab only
- **Feature filter is 3-state per feature** — click cycles: Off → Include (✓, feature color) → Exclude (✗, rose/red) → Off
  - **Include mode**: shows only blogs WITH that feature
  - **Exclude mode**: shows only blogs WITHOUT that feature
  - **Off**: no filtering on that feature
- **Feature filter types**: `FeatureFilterMode = 'include' | 'exclude'`, `FeatureFilters = Record<string, FeatureFilterMode>` (key absence = off)
- **Feature filter state** (`featureFilters: FeatureFilters`) lives in `page.tsx`; filtering uses AND logic across all active features
- **Filter status bar** appears between Filters and DataTable when any feature filter is active: "Showing X of Y blogs — with [Feature], without [Feature]" + "Clear filters" link; "with" text uses feature color, "without" text uses rose
- **Expandable row detail panel** — rows with features show a chevron (▸) and are clickable; clicking expands a `BlogDetailPanel` with Hyperlocal and/or EEAT cards; only one row open at a time; rows without features are not clickable
- `src/lib/features.tsx` must stay `.tsx` (not `.ts`) — it exports JSX icon elements

**Error Log Toggle Feature:**
- Toggle between "Records" and "Errors" view modes via `ViewModeToggle` component
- Error records are those filtered out during validation (invalid URLs, missing required fields)
- Color scheme shifts from indigo (normal mode) to amber (error mode)
- Error mode shows `ErrorBanner` explaining error records are kept for reference
- **Error data structure:**
  - `BlogError`: Contains `date`, `practiceName`, `companyId`, `errorMessage` (the blogTitle field contains the error)
  - `GmbPostError`: Contains `date`, `practiceName`, `companyId`, `postTitle`, `keyword`, `reason` (the URL field value)
- **Error mode differences:**
  - No Replies tab (only Blog Errors and GMB Errors)
  - Summary cards show last-7-days error counts (2 cards: Blog Errors, GMB Errors)
  - Tables display different columns based on error type
  - Blog errors: Date, Practice, HSID, Error (no Keyword, no URL)
  - GMB errors: Date, Practice, HSID, Post Title, Keyword, Reason (shows "-" for title/keyword if reason is not "processing")
- Error records are parsed during data fetching in `parseBlogs()` and `parseGmbPosts()`
- Errors can be filtered by practice and date range (same as normal records)
- Background color changes to `bg-amber-50` in error mode

### Important Files to Understand

**Data Layer:**
- `src/lib/google-sheets.ts` - Core data fetching, parsing, and server-side filtering
  - `sanitizeBlogUrl()` - Removes localhost prefixes, adds https:// protocol
  - `parseBlogs()`, `parseGmbPosts()`, `parseReplies()` - Parse and filter sheet data, return both valid records and errors
  - `calculateSummary()` - Generate dashboard statistics
  - `calculateErrorSummary()` - Generate error statistics (last 7 days only)

**Utilities:**
- `src/lib/utils.ts` - Core utility functions
  - `isValidUrl()` - **CRITICAL**: Validates URLs, accepts URLs without protocol
  - `filterBlogs()`, `filterGmbPosts()`, `filterReplies()` - Client-side filtering (accept `string[]` for practices)
  - `filterBlogErrors()`, `filterGmbPostErrors()` - Error record filtering
  - All filters apply practice/account, date range, AND URL validation
- `src/lib/saved-filters.ts` - localStorage CRUD for saved filters
  - `getSavedFilters()`, `saveFilter()`, `deleteFilter()`
  - Migrates legacy `'all'` date range values to `'90d'` on load

**Feature Config:**
- `src/lib/features.tsx` - `FEATURE_CONFIG` object defining all enrichment features (colors, icons, labels); must be `.tsx` not `.ts` (exports JSX)

**Types:**
- `src/types/index.ts` - All TypeScript interfaces and types
  - Content types: `BlogPost`, `GmbPost`, `GmbReply` (`BlogPost` and `GmbPost` include `companyId`)
  - `BlogPost` enrichment fields: `hyperlocalEnabled`, `reviewsEnabled`, `hyperlocalContent`, `reviewContent`, `features`
  - Error types: `BlogError`, `GmbPostError`, `ErrorSummaryData` (last 7 days counts only; `BlogError` and `GmbPostError` include `companyId`)
  - `ErrorContentType` - Content type for error mode (no replies)
  - `SavedFilter`, `SavedFiltersStore` - Saved filter persistence
  - Column configurations for tables

**Components:**
- `src/components/ViewModeToggle.tsx` - Toggle between Records and Errors modes
- `src/components/ErrorBanner.tsx` - Warning banner displayed in error mode
- `src/components/SummaryCard.tsx` - Supports `isErrorMode` prop for amber styling
- `src/components/SummaryCards.tsx` - Displays error summary cards in error mode (2 cards: Blog Errors, GMB Errors — last 7 days)
- `src/components/ContentTabs.tsx` - Hides Replies tab and uses amber colors in error mode
- `src/components/DataTable.tsx` - Renders error tables with different column layouts; includes `HUBSPOT_URL` constant for HSID links; contains inline `FeatureIcon` and `BlogDetailPanel` sub-components
- `src/components/ChatWidget.tsx` - Floating n8n chat widget powered by `@n8n/chat`, mounted in `layout.tsx` for persistence across routes

## Google Sheets Schema

The application expects three sheets with specific column structures:

**Blogs:**
- Date, Time, Practice Name, Practice URL, Blog Title, Post URL, Webflow Item ID, Webflow Collection ID, Keyword, Make Execution, companyId, rejected_keyword, keyword_notes, Hyperlocal Used, EEAT Included, Word Count
- Required: Date, Practice Name, Blog Title, Post URL (valid)
- Optional: companyId (HubSpot Company ID)
- Enrichment flags: `Hyperlocal Used` (boolean TRUE/FALSE → `hyperlocalEnabled`), `EEAT Included` (boolean TRUE/FALSE → `reviewsEnabled`, UI label: "EEAT")
- Enrichment content: `Hyperlocal Content`, `Review Content` — columns exist in sheet; older records may have empty cells, parsed as `null` when empty

**GMB Posts:**
- Date, Time, Practice Name, Practice URL, Post Title, Post URL, Make Execution, Keyword, CompanyID
- Required: Date, Practice Name, Post Title, Post URL (valid)
- Optional: CompanyID (HubSpot Company ID)

**GMB Replies:**
- Account Name, Date Time, Reply, Reviews URL, Make Execution, Review ID, Location ID
- Required: Date Time, Account Name, Reply, Reviews URL (valid)

**Negative Keywords:**
- Practice, Campaign Name, Ad Channel Type, Report Start Date, Report End Date, Terms Reviewed, Company ID
- Required: Report End Date (used as the display date), Practice
- Optional: Company ID (HubSpot Company ID)
- Parser matches headers flexibly: "Practice" or "Practice Name", "Report End Date" preferred over "Report Start Date"
- `Terms Reviewed` parsed as integer (0 if missing/invalid); header matched with `startsWith('terms review')`
- Dates are date-only (no time component), e.g. "2026-04-08"
- No URL validation needed (no URL column)
- No error tracking (unlike blogs/GMB posts)

**G Ads Pacing:**
- 40 columns; the source rows are **campaign-level** (one row per campaign per run date). Account-level fields repeat across all campaign rows of the same `(Run Date, google_ads_id)` account.
- Columns 1–29 (legacy): Run Date, run_id, practice_name, google_ads_id, HS ID, campaign_id, campaign_name, account_monthly_budget, account_actual_spend_mtd, campaign_actual_spend_mtd, account_expected_spend_mtd, account_variance_percent, account_current_daily_budget, campaign_current_daily_budget, account_proposed_daily_budget, campaign_proposed_daily_budget, spend_share, yesterday_account_proposed, account_proposed_multiple, campaign_proposed_multiple, status, recommendation_type, applied, correction_percent, damped_from, severity, approval_status, reviewed_by, notes
- Columns 30–40 (V3 — explanatory signals): classification, search_budget_lost_is, yesterday_utilization, utilization_days, chronic_demand_limited, skip_reason, account_on_track, all_demand_limited, any_budget_limited, conflicts_with_pacing, seven_day_avg_utilization
- Required: Run Date, google_ads_id (used as group key)
- The parser groups rows into one `GAdsPacingRecord` per `(runDate, googleAdsId)` with a `campaigns[]` array. Each campaign carries its own `recommendation_type`, `classification`, `searchBudgetLostIs`, `sevenDayAvgUtilization`, `utilizationDays`, `chronicDemandLimited`, `skipReason`, `conflictsWithPacing`. Account-level booleans (`accountOnTrack`, `allDemandLimited`, `anyBudgetLimited`) live on the record.
- Severity values: `OK`, `Auto`, `Alert`, `Underpace`, `Critical`, `Investigate` (read directly from `severity` column; empty = `OK`; case-insensitive match).
- Recommendation types per campaign (6 enums): `PAUSE_CAMPAIGN`, `BUDGET_DECREASE_APPROVAL`, `BUDGET_INCREASE_APPROVAL`, `BUDGET_DECREASE`, `BUDGET_INCREASE`, `NO_CHANGE`.
- Classification (per campaign): `BUDGET_LIMITED` (sky/blue badge), `DEMAND_LIMITED` (slate badge), or null (no badge — month-start grace).
- Skip reason (per campaign, 9 enums): `ACCOUNT_ON_TRACK`, `DEMAND_SIDE_ISSUE`, `DEMAND_LIMITED_NO_CHANGE`, `BUDGET_LIMITED_BUT_CHANGE_TOO_SMALL`, `CHRONIC_DEMAND_LIMITED_DONOR`, `CHRONIC_BUT_NO_BUDGET_LIMITED_SIBLING`, `NO_MEANINGFUL_CHANGE`, `MONTH_START_GRACE`, `BUDGET_LIMITED_NO_DECREASE`. Friendly labels in `SKIP_REASON_LABELS` (`src/lib/g-ads-pacing.ts`); shown only as italic subtext under `NO_CHANGE` recommendations.
- Action dot color coding: red = pause; amber = approval-pending; blue = auto-applied; `NO_CHANGE` not shown. On-track accounts replace the dots with a green "On track" pill.
- Fetched with range `A:AN` (40 columns); `fetchSheet()` accepts an optional range parameter for sheets wider than 26 columns.
- Sheet may not exist in older spreadsheets — fetch is wrapped in `.catch(() => [])` for graceful empty fallback.
- No URL validation, no error tracking.

**G Ads Pacing detail panel display rules** (driven by helpers in `src/lib/g-ads-pacing.ts`):
- **Banners** (priority order, only one at a time when multiple match): grace banner (every campaign has `skipReason === 'MONTH_START_GRACE'`); INVESTIGATE banner (`severity === 'Investigate' && allDemandLimited`); generic INVESTIGATE banner (`severity === 'Investigate' && !allDemandLimited`).
- **Mixed-account chip** "X of N campaigns budget-limited" — shown in panel header when both BUDGET_LIMITED and DEMAND_LIMITED campaigns exist on the same account.
- **Classification badge** — replaces with "chronic" (orange) variant when `chronicDemandLimited && classification === 'DEMAND_LIMITED'`. Hidden for null classification.
- **IS-lost text** — "X% IS lost" subtext under classification badge, only on BUDGET_LIMITED campaigns with `searchBudgetLostIs >= 1`.
- **7-day util bar** — shown when `sevenDayAvgUtilization` is non-null AND `skipReason !== 'MONTH_START_GRACE'`. Bar fill = `min(pct, 100)`. Color: <50% orange, 50–94% green, ≥95% blue.
- **Conflict icon ⚠** — only when `conflictsWithPacing && recommendationType !== 'NO_CHANGE' && skipReason === ''`.
- **Skip reason italic subtext** — only on `NO_CHANGE` rows with a non-empty `skipReason`.
- **Proposed /day and Change cells** — replaced with a muted `—` on `NO_CHANGE` campaigns. The pre-decision proposed value would otherwise read as a contradicting recommendation; the "No Change" pill plus skip-reason subtext is the source of truth.
- **Feedback form** suppressed when grace banner shows OR `accountOnTrack === true`. The header chip in the table column ("Approved"/"Rejected"/"Needs review") still renders.
- **On-track row dimming** — `opacity-60` on the table row when `accountOnTrack === true && !isExpanded`.

## Critical Implementation Details

### URL Validation Logic
When modifying URL handling, understand the validation flow:
1. Raw URL from sheet may or may not have protocol
2. `sanitizeBlogUrl()` removes localhost prefixes (blogs only)
3. `isValidUrl()` validates the URL:
   - Trims whitespace
   - Rejects common placeholders
   - Temporarily adds `https://` if no protocol for validation
   - Uses `URL` constructor to validate
   - Requires hostname with TLD (must contain `.`)
4. Both server and client filters use `isValidUrl()`

### Filter Application Order
1. Parse data from sheets → apply server filters (required fields + valid URLs)
2. Calculate summary stats from filtered data
3. Client applies user-selected filters (practice/account, date range) via `useContentData` hook → `filteredBlogs` / `filteredGAdsPacing` / etc.
4. Client re-validates URLs as additional safety
5. `page.tsx` applies tab-specific final-pass filters:
   - **Blogs**: feature filter → `featureFilteredBlogs`
   - **G Ads Pacing**: severity filter → `severityFilteredGAdsPacing`
6. The most-derived variable is what flows to `DataTable` AND to CSV export (don't skip the final pass on either path).

### Date Handling
- Blogs/GMB Posts combine separate Date and Time columns into single datetime string
- Replies and Neg. Keywords use single "Date Time" / "Date and Time" column
- Date parsing is lenient (handles various formats)
- Date filtering uses threshold comparison (1d, 3d, 7d, 30d, 90d) — all options return a date threshold, there is no "all time"
- Standard tabs (Blogs, GMB Posts, Replies) use 7d/30d/90d pills; **short-range tabs (Neg. Keywords, G Ads Pacing) use 1d/3d/7d pills**
- Switching tabs maps date range by **pill position** (not value): position 0 ↔ position 0, etc.
  - Standard `['7d', '30d', '90d']` ↔ Short `['1d', '3d', '7d']`
  - `SHORT_RANGE_TABS` in `page.tsx` is the set of tabs that use the short pills (currently `neg-keywords`, `g-ads-pacing`)
  - Logic lives in `mapDateRangeForTab()` in `page.tsx`

## Common Gotchas

1. **Don't bypass URL validation** - It's intentionally applied at multiple levels for data quality
2. **Mock data fallback is automatic** - If Google Sheets isn't configured, app uses mock data without errors
3. **Date vs DateTime** - Blogs/GMB Posts use `date` field, Replies use `dateTime` field
4. **Practice filters use arrays** - `selectedPractices: string[]` where empty array means "all"
5. **Saved filters are tab-specific** - Each content type (blogs/gmb-posts/replies) has its own saved filters
6. **API route handles its own caching** - Don't add caching in hook; it's controlled by API response headers
7. **sanitizeBlogUrl only applies to blogs** - GMB posts and replies use raw URLs from sheets
8. **SavedFiltersBar only shows when needed** - Requires either existing saved filters OR selected practices to appear
9. **Error mode has no Replies tab** - Replies don't have error tracking, so error mode only shows blogs and GMB posts
10. **Error blogTitle is the error message** - For blog errors, the `blogTitle` field from the sheet contains the error message
11. **GMB error URL is the reason** - For GMB post errors, the `url` field contains the reason ("processing", account errors, etc.)
12. **HSID column is a clickable HubSpot link** - In tables, `companyId` renders as a link to `https://app.hubspot.com/contacts/22697387/record/0-2/{companyId}`. In CSV exports, it's the raw number only.
13. **CompanyID column header is lowercase** - The Google Sheets column is matched as `companyid` (case-insensitive). Empty values result in a blank table cell.
14. **ChatWidget uses dynamic import** - `@n8n/chat` uses DOM APIs so it must be dynamically imported inside `useEffect`, not at top level. The CSS (`@n8n/chat/style.css`) is imported statically at the top of the component.
15. **Chat widget CSS overrides live in globals.css** - Scoped under `#n8n-chat` selector to override the widget's CSS variables for indigo branding. Uses `!important` on markdown list styles to beat Tailwind's preflight reset.
16. **Chat widget streaming is disabled** - `enableStreaming: false` in `ChatWidget.tsx`. The n8n workflow does not use streaming, so the widget waits for the full response. If the n8n workflow is changed to stream, set `enableStreaming: true`.
17. **Chat widget is independent of dashboard state** - Mounted in `layout.tsx` after `{children}`, returns `null` (injects its own DOM into `document.body`). Does not load previous sessions (`loadPreviousSession: false`).
18. **Feature filter is blogs-only and independent** - `featureFilters: FeatureFilters` state lives in `page.tsx` and resets when switching away from the Blogs tab. It is applied as a final client-side pass after `filteredBlogs` from the hook.
19. **`features.tsx` must stay `.tsx`** - The file exports JSX icon elements; renaming to `.ts` will cause a build error.
20. **Enrichment boolean columns: empty = false** - Only a literal `"TRUE"` string (case-insensitive) activates a feature. Missing columns or empty cells default to `false` with no error.
21. **Feature filter uses AND logic across modes** - Each active feature filter must be satisfied (include = blog has it, exclude = blog doesn't). Mixed include/exclude filters work together.
22. **Blog rows with features are expandable; rows without are not** - The chevron and click handler only appear/activate when `blog.features.length > 0`. The detail panel always renders both feature cards if their boolean is true, even if the content column is empty.
23. **Feature filter pill click cycles 3 states** - Off → Include (✓ colored) → Exclude (✗ rose) → Off. Inline table icons are highlighted only in include mode (`featureFilters[f] === 'include'`). Key absence in `featureFilters` record means off.
24. **Neg. Keywords tab uses different date range pills** - 1d/3d/7d instead of 7d/30d/90d. Date range mapping by position happens in `handleTabChange` → `mapDateRangeForTab()`.
25. **Neg. Keywords has no error mode or URL validation** - Like replies, it has no error tracking. Unlike all other content types, it has no URL column, so no URL validation is applied.
26. **Neg. Keywords date column may be "Date and Time" or "Date Time"** - The parser checks for both header variants (case-insensitive).
27. **Summary card "Terms Reviewed" is a sum, not a count** - Unlike other summary cards which count records, this card sums the `termsReviewed` field across all neg keyword records in the last 7 days.
28. **G Ads Pacing source rows are campaign-level; the table groups them** - The parser produces one `GAdsPacingRecord` per `(runDate, googleAdsId)` with embedded `campaigns[]`. Account-level fields are taken from the first row in the group; if the first row has empty severity/approval/notes, later rows fill them in. Don't iterate raw rows in components — use the grouped record.
29. **G Ads Pacing feedback writes back via Make.com webhook** - On submit, the panel POSTs `{ run_date, google_ads_id, approval_status, reviewed_by, notes }` (exactly 5 snake_case keys) to `NEXT_PUBLIC_MAKE_FEEDBACK_WEBHOOK_URL`. The Make.com scenario is responsible for updating every campaign row of that account in the sheet. The portal optimistically updates local hook state on success so the row reflects the new status without a refetch.
30. **G Ads Pacing has no error mode and no URL validation** - Like Replies and Neg. Keywords, no error tracking. The tab is hidden in error mode (only Blogs and GMB posts show errors).
31. **`fetchSheet()` defaults to range `A:Z` but accepts a wider range** - G Ads Pacing has 40 columns and is fetched with `'A:AN'`. Other sheets (≤26 columns) keep the default. Pass an explicit range when adding sheets that extend past column Z.
32. **G Ads Pacing default sort is `runDate desc`** - Set in the tab-change effect in `DataTable.tsx`. The shared default `{ column: 'date', direction: 'desc' }` doesn't apply to this tab because the field is `runDate`, not `date`. Without this override, sorting silently degrades to source order.
33. **G Ads Pacing date column uses compact MM/DD format** - Via `fmtCompactDate()` in `src/lib/g-ads-pacing.ts`. Year is omitted because pacing is reviewed daily and the visible window is only 1d/3d/7d. If the tab ever spans years, revisit this format.
34. **G Ads Pacing booleans only treat literal "TRUE" as true** - The parser's `toBool()` is case-insensitive but compares against `'true'` only. Empty cells, "FALSE", and unexpected strings all become `false`. This applies to `chronic_demand_limited`, `account_on_track`, `all_demand_limited`, `any_budget_limited`, `conflicts_with_pacing`.
35. **G Ads Pacing `searchBudgetLostIs` and `sevenDayAvgUtilization` use `null` for missing data** - Distinguished from `0` via `toNumOrNull()`. Display rules check for `null` to hide the field entirely. Don't substitute `0` for empty cells — it would falsely show "0% IS lost" or a 0% utilization bar.
36. **G Ads Pacing classification badge "chronic" replaces "demand-limited"** - Don't render two badges. When `chronicDemandLimited && classification === 'DEMAND_LIMITED'`, swap in the orange "chronic" pill. Helper `classificationBadge(c)` returns the right one.
37. **G Ads Pacing INVESTIGATE banner only shows when `allDemandLimited` is true** - For `severity === 'Investigate' && !allDemandLimited`, a generic "No actionable changes identified" banner shows instead. The two paths are mutually exclusive — use `shouldShowInvestigateBanner()` and `shouldShowGenericInvestigateBanner()`.
38. **G Ads Pacing feedback form is hidden on on-track and grace accounts** - Per V3 display rules, there's nothing to approve in those states. The status chip in the table column still renders (so existing approvals stay visible), but the panel form is suppressed.
39. **G Ads Pacing severity filter is tab-scoped and additive** - `selectedSeverities: Severity[]` state lives in `page.tsx` and is reset when switching away from `g-ads-pacing` (alongside the `featureFilters` reset). Applied as a final client-side pass after `filteredGAdsPacing` from the hook, producing `severityFilteredGAdsPacing` — which feeds BOTH the `DataTable` and the CSV export. Empty array = show all severities. Filter UI (`MultiSelectDropdown` in `Filters.tsx`) is gated on `contentType === 'g-ads-pacing'`.
40. **Conflict warning ⚠ tooltip is rendered via React portal** - `ConflictIcon` in `GAdsPacingDetailPanel.tsx` uses `createPortal(..., document.body)` because the campaign breakdown table sits inside three nested `overflow` ancestors (the table's `overflow-x: auto` scroller, the data-table's `max-h-[640px] overflow-y-auto`, and the rounded outer `overflow-hidden` wrapper). A normal absolute-positioned tooltip would be clipped by any of them. Position is captured on `mouseenter` via `getBoundingClientRect()` and applied as `position: fixed`. Don't refactor it back to a CSS-only `group-hover` tooltip — it will appear to work in a snapshot/DOM check but render invisibly.
41. **`MultiSelectDropdown` accepts an optional `pluralLabel` prop** - Defaults to `${label}s` (correct for "Practice" → "Practices" and "Account" → "Accounts"). For irregular plurals like "Severity" → "Severities", pass `pluralLabel="Severities"` explicitly, otherwise the placeholder reads "All Severitys". Affects the trigger placeholder, search placeholder, "All …" quick action, and empty-state text.

## Environment Variables

Required for production Google Sheets integration (optional for development):
- `GOOGLE_SHEETS_ID` - Spreadsheet ID from Google Sheets URL
- `GOOGLE_API_KEY` - Google API key with Sheets API enabled

The app gracefully falls back to mock data if these are not set.

- `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` - n8n webhook URL for the chat widget (must be a `NEXT_PUBLIC_` var since it's used client-side)
- `NEXT_PUBLIC_MAKE_FEEDBACK_WEBHOOK_URL` - Make.com webhook URL that receives `{ run_date, google_ads_id, approval_status, reviewed_by, notes }` payloads from the G Ads Pacing review panel. The Make.com scenario writes the three feedback fields back to every matching row of the `G Ads Pacing` sheet. Without this var the submit button errors out. Must be `NEXT_PUBLIC_` since the POST is made from the browser.

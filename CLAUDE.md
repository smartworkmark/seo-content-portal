# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Troubleshooting Reference

Past debugging sessions, root causes, and lessons learned are documented in:
**[reference/lessons-learned.md](reference/lessons-learned.md)**

Key rules to know before touching related code:
- `.tsx` files must export at least one named React component (uppercase) — see lessons-learned.md for the Fast Refresh reload loop issue
- Google Sheets column names must match exactly — check `parseBlogs()` in `google-sheets.ts` if feature filters return 0 results

**When you discover a new bug, root cause, or non-obvious fix during any session, add an entry to `reference/lessons-learned.md`.** Include: symptoms, root cause, the fix, and a "rule to remember" so future sessions don't repeat the same diagnosis work.

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
- 29 columns; the source rows are **campaign-level** (one row per campaign per run date). Account-level fields repeat across all campaign rows of the same `(Run Date, google_ads_id)` account.
- Columns: Run Date, run_id, practice_name, google_ads_id, HS ID, campaign_id, campaign_name, account_monthly_budget, account_actual_spend_mtd, campaign_actual_spend_mtd, account_expected_spend_mtd, account_variance_percent, account_current_daily_budget, campaign_current_daily_budget, account_proposed_daily_budget, campaign_proposed_daily_budget, spend_share, yesterday_account_proposed, account_proposed_multiple, campaign_proposed_multiple, status, recommendation_type, applied, correction_percent, damped_from, severity, approval_status, reviewed_by, notes
- Required: Run Date, google_ads_id (used as group key)
- The parser groups rows into one `GAdsPacingRecord` per `(runDate, googleAdsId)` with a `campaigns[]` array. Each campaign carries its own `recommendation_type` and per-campaign budget/spend.
- Severity values: `OK`, `Auto`, `Alert`, `Underpace`, `Critical`, `Investigate` (read directly from `severity` column; empty = `OK`).
- Recommendation types per campaign (6 enums): `PAUSE_CAMPAIGN`, `BUDGET_DECREASE_APPROVAL`, `BUDGET_INCREASE_APPROVAL`, `BUDGET_DECREASE`, `BUDGET_INCREASE`, `NO_CHANGE`.
- Action dot color coding: red = pause; amber = approval-pending; blue = auto-applied; `NO_CHANGE` not shown.
- Fetched with range `A:AC` (extends past column Z); `fetchSheet()` accepts an optional range parameter for sheets wider than 26 columns.
- Sheet may not exist in older spreadsheets — fetch is wrapped in `.catch(() => [])` for graceful empty fallback.
- No URL validation, no error tracking.

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
3. Client applies user-selected filters (practice/account, date range) via `useContentData` hook → `filteredBlogs`
4. Client re-validates URLs as additional safety
5. `page.tsx` applies feature filter on top of `filteredBlogs` → `featureFilteredBlogs` (passed to `DataTable`)

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
31. **`fetchSheet()` defaults to range `A:Z` but accepts a wider range** - G Ads Pacing has 29 columns and is fetched with `'A:AC'`. Other sheets (≤26 columns) keep the default. Pass an explicit range when adding sheets that extend past column Z.
32. **G Ads Pacing default sort is `runDate desc`** - Set in the tab-change effect in `DataTable.tsx`. The shared default `{ column: 'date', direction: 'desc' }` doesn't apply to this tab because the field is `runDate`, not `date`. Without this override, sorting silently degrades to source order.
33. **G Ads Pacing date column uses compact MM/DD format** - Via `fmtCompactDate()` in `src/lib/g-ads-pacing.ts`. Year is omitted because pacing is reviewed daily and the visible window is only 1d/3d/7d. If the tab ever spans years, revisit this format.

## Environment Variables

Required for production Google Sheets integration (optional for development):
- `GOOGLE_SHEETS_ID` - Spreadsheet ID from Google Sheets URL
- `GOOGLE_API_KEY` - Google API key with Sheets API enabled

The app gracefully falls back to mock data if these are not set.

- `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` - n8n webhook URL for the chat widget (must be a `NEXT_PUBLIC_` var since it's used client-side)
- `NEXT_PUBLIC_MAKE_FEEDBACK_WEBHOOK_URL` - Make.com webhook URL that receives `{ run_date, google_ads_id, approval_status, reviewed_by, notes }` payloads from the G Ads Pacing review panel. The Make.com scenario writes the three feedback fields back to every matching row of the `G Ads Pacing` sheet. Without this var the submit button errors out. Must be `NEXT_PUBLIC_` since the POST is made from the browser.

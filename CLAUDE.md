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
- ~49 columns; the source rows are **campaign-level** (one row per campaign per run date). Account-level fields repeat across all campaign rows of the same `(Run Date, google_ads_id)` account. **The parser matches columns by header NAME (case-insensitive), not position** — so column order is irrelevant and over-fetching extra columns is harmless.
- Legacy columns: Run Date, run_id, practice_name, google_ads_id, HS ID, campaign_id, campaign_name, account_monthly_budget, account_actual_spend_mtd, campaign_actual_spend_mtd, account_expected_spend_mtd, account_variance_percent, account_current_daily_budget, campaign_current_daily_budget, account_proposed_daily_budget, campaign_proposed_daily_budget, spend_share, yesterday_account_proposed, account_proposed_multiple, campaign_proposed_multiple, status, recommendation_type, applied, correction_percent, damped_from, severity, approval_status, reviewed_by, notes
- V3 (explanatory signals): classification, search_budget_lost_is, yesterday_utilization, utilization_days, chronic_demand_limited, skip_reason, account_on_track, all_demand_limited, any_budget_limited, conflicts_with_pacing, seven_day_avg_utilization
- Client-facing status column (account-level): `display_status` — the label the client sees (parsed to `GAdsPacingRecord.displayStatus`, raw string, `''` when absent). n8n writes it; the portal treats it as read-only and falls back to computing a tier from variance when blank (see the display-status rule below).
- Shared-budget columns (present in sheet, **not yet parsed** — deferred): is_shared_budget, shared_budget_siblings, shared_budget_note, raw_budget_resource_amount
- Day-of-week shaping + auto-decrease (workflow v2, go-live 2026-06-12): `dow_multiplier` (account-level number), `final_daily_budget` (campaign-level — **the budget actually pushed to Google Ads** = base proposed × multiplier, clamped 0.55×–1.55×), `dow_flags` (account-level pipe-delimited: `CATCH_UP_HALVED`, `MONTH_END_SUPPRESSED`), `auto_decrease_promoted` (campaign boolean — Bill's June rule: decreases ≤30% auto-apply instead of routing to approval), `applied_decrease_percent` (campaign number 0–100).
- Required: Run Date, google_ads_id (used as group key)
- The parser groups rows into one `GAdsPacingRecord` per `(runDate, googleAdsId)` with a `campaigns[]` array. Each campaign carries its own `recommendation_type`, `classification`, `searchBudgetLostIs`, `sevenDayAvgUtilization`, `utilizationDays`, `chronicDemandLimited`, `skipReason`, `conflictsWithPacing`, `finalDailyBudget`, `autoDecreasePromoted`, `appliedDecreasePercent`. Account-level fields (`accountOnTrack`, `allDemandLimited`, `anyBudgetLimited`, `dowMultiplier`, `dowFlags`) live on the record.
- Severity values: `OK`, `Auto`, `Alert`, `Underpace`, `Critical`, `Investigate` (read directly from `severity` column; empty = `OK`; case-insensitive match). **`severity` is now an internal/ops signal only** — it no longer renders as a pill; it still drives the INVESTIGATE banner logic.
- **Client-facing pacing status (`DisplayStatus`, 5 tiers):** `On Track`, `Overpacing`, `Significantly Overpacing`, `Underpacing`, `Significantly Underpacing`. This **replaces the severity pill** in the table Status column, the detail-panel header, the filter dropdown, and CSV export. Helpers in `src/lib/g-ads-pacing.ts`:
  - `resolveDisplayStatus(record)` is the single source of truth. Precedence: **(0)** every campaign paused (`isAccountPaused`) → `'Paused'`, a neutral gray pill (`DISPLAY_STATUS_PAUSED_STYLE`); **(1)** month-start grace (`shouldShowGraceBanner`) → `null`, rendered as a neutral "New" pill (`DISPLAY_STATUS_NEW_STYLE`); **(2)** the `display_status` column via `normalizeDisplayStatus()` (case/trim tolerant); **(3)** fallback `displayStatusFromVariance(variancePercent)`. Return type is `DisplayStatus | 'Paused' | null`.
  - **Paused is an override, not a tier.** `'Paused'` never comes from `display_status` — it's derived from the per-campaign `paused_by_agent` flag and wins over grace/column/variance. `displayStatusPill(record)` resolves straight to the pill style (Paused / New / tier) so render sites don't re-implement the mapping.
  - `displayStatusFromVariance(v)` derives the tier from **signed month-to-date variance %** (`account_variance_percent` = `record.variancePercent`, positive = overspending). Bands: `|v| ≤ 10` → On Track; `+10 < v ≤ +20` → Overpacing; `v > +20` → Significantly Overpacing; `-20 ≤ v < -10` → Underpacing; `v < -20` → Significantly Underpacing. Boundary rule: `>` promotes to the higher tier.
  - **Colors by magnitude only** (`DISPLAY_STATUS_STYLES`): On Track = emerald; Overpacing/Underpacing = amber; Significantly Over/Under = rose. Direction is conveyed by the label text.
  - Filter is a static **Status** dropdown built from `STATUS_FILTER_OPTIONS` = the 5 tiers (`DISPLAY_STATUS_OPTIONS`) **+ `'Paused'`** (type `StatusFilter = DisplayStatus | 'Paused'`) — no severity/transition logic, because every row always resolves to a tier or the Paused override. Grace/"New" rows are NOT selectable and drop out when a specific status is chosen. Sort uses `displayStatusRank()` (special-cased on the `displayStatus` column since the value is derived, not a raw field; Paused sorts after New). The `display_status` **column wins** over the variance fallback when both are present.
- Recommendation types per campaign (7 enums): `PAUSE_CAMPAIGN`, `BUDGET_DECREASE_APPROVAL`, `BUDGET_INCREASE_APPROVAL`, `BUDGET_DECREASE`, `BUDGET_INCREASE`, `DOW_ADJUSTMENT` (a NO_CHANGE row the workflow flips when the day-of-week-shaped budget differs ≥$3/≥5% from live), `NO_CHANGE`.
- Classification (per campaign): `BUDGET_LIMITED` (sky/blue badge), `DEMAND_LIMITED` (slate badge), or null (no badge — month-start grace).
- Skip reason (per campaign, 9 enums): `ACCOUNT_ON_TRACK`, `DEMAND_SIDE_ISSUE`, `DEMAND_LIMITED_NO_CHANGE`, `BUDGET_LIMITED_BUT_CHANGE_TOO_SMALL`, `CHRONIC_DEMAND_LIMITED_DONOR`, `CHRONIC_BUT_NO_BUDGET_LIMITED_SIBLING`, `NO_MEANINGFUL_CHANGE`, `MONTH_START_GRACE`, `BUDGET_LIMITED_NO_DECREASE`. Friendly labels in `SKIP_REASON_LABELS` (`src/lib/g-ads-pacing.ts`); **shown only when a row applies NO real budget change** (see source-of-truth rule below).
- **SOURCE OF TRUTH = `current_daily_budget` → `final_daily_budget`.** `recommendation_type`/`skip_reason` describe the pacing engine's decision against a *de-normalized baseline* and frequently contradict the live budget (a "decrease" that raises the budget; a "no change" skip that applies a real cut). The portal leads with the actual applied delta and direction; `recommendation_type` is trusted ONLY to branch auto-vs-approval (`campaignBudgetView()` in `g-ads-pacing.ts`). Pre-go-live rows have a null `final_daily_budget` and fall back to the legacy proposed/recommendation rendering.
- Action dot color coding (`actionDotCounts(campaigns, approvalStatus)`): red = pending pause; amber = pending approval; **green = an approval/pause the operator already actioned** (`approvalStatus === 'Approved'`); blue = an auto change that actually moves the live budget (`direction !== 'flat'`); flat rows and **rejected** rows show nothing. **The Actions column renders dots ONLY** — when no campaign needs an action the cell is empty (no "On track" pill, no `—` dash). The account's state is already conveyed by the Status column, so duplicating it here was redundant. `hasAppliedChange()` is still used for row dimming (see below).
- Fetched with range `A:BH`; `fetchSheet()` accepts an optional range parameter for sheets wider than 26 columns.
- Sheet may not exist in older spreadsheets — fetch is wrapped in `.catch(() => [])` for graceful empty fallback.
- No URL validation, no error tracking.

**G Ads Pacing detail panel display rules** (driven by helpers in `src/lib/g-ads-pacing.ts`):
- **Banners** (priority order, only one at a time when multiple match): grace banner (every campaign has `skipReason === 'MONTH_START_GRACE'`); INVESTIGATE banner (`severity === 'Investigate' && allDemandLimited`); generic INVESTIGATE banner (`severity === 'Investigate' && !allDemandLimited`).
- **Mixed-account chip** "X of N campaigns budget-limited" — shown in panel header when both BUDGET_LIMITED and DEMAND_LIMITED campaigns exist on the same account.
- **Classification badge** — replaces with "chronic" (orange) variant when `chronicDemandLimited && classification === 'DEMAND_LIMITED'`. Hidden for null classification.
- **IS-lost text** — "X% IS lost" subtext under classification badge, only on BUDGET_LIMITED campaigns with `searchBudgetLostIs >= 1`.
- **7-day util bar** — shown when `sevenDayAvgUtilization` is non-null AND `skipReason !== 'MONTH_START_GRACE'`. Bar fill = `min(pct, 100)`. Color: <50% orange, 50–94% green, ≥95% blue.
- **Conflict icon ⚠** — only when `conflictsWithPacing && recommendationType !== 'NO_CHANGE' && skipReason === ''`.
- **Applied-budget rendering (rows with `finalDailyBudget`)** — the "Proposed /day" column becomes "Applied /day" (= `final`) and "Change" = `current → final` %; the "Recommendation" column becomes a derived **Status** pill from `appliedStatusLabel(view, approvalStatus)` (`Auto-applied` / `Needs approval` / `Pause (pending)` / `Approved` / `Rejected` / `No change`), replacing the raw recommendation badge. A muted "why" subtext is assembled from: `'if approved'` (un-actioned pending rows), `'day-of-week shaping'` (when `shouldShowDowBanner` and the row moved), `'auto-applied X% cut'` (when `autoDecreasePromoted`), and the skip-reason label **only when `direction === 'flat'` AND the row isn't pending**. Flat rows show `—` for Applied/Change.
- **Un-actioned approval/pause rows show the IF-APPROVED target, never `—`** — the workflow hasn't applied anything on those rows, so `final_daily_budget` still equals `current_daily_budget`, which would make `direction === 'flat'` and dash out the very change being approved. `campaignBudgetView()` exposes `ifApprovedTarget` (= `proposedDaily`) and `ifApprovedDeltaPct` for exactly this; the panel uses them whenever `mode` is `'approval'` or `'pause'`. **`target`/`deltaPct`/`direction` keep meaning *actually applied* movement** — don't repoint them at the proposal, because `hasAppliedChange()` (row dimming) depends on that meaning.
- **DOW banner** (teal) — shown when `shouldShowDowBanner(record)` (i.e. `dowMultiplier != null && != 1`): `"{Weekday} {±%} day-of-week budget shaping"` + a flag subtext from `DOW_FLAG_LABELS`. Auto-hidden while the multiplier is inert (1/empty), e.g. the current Edit-Fields pass-through bug.
- **Legacy skip-reason subtext** — pre-go-live rows (null `finalDailyBudget`) keep the old behavior: proposed/change with `—` for `NO_CHANGE` and italic skip subtext.
- **Proposed /day and Change cells** — replaced with a muted `—` on `NO_CHANGE` campaigns. The pre-decision proposed value would otherwise read as a contradicting recommendation; the "No Change" pill plus skip-reason subtext is the source of truth.
- **Feedback form** suppressed when grace banner shows OR `accountOnTrack === true`. The header chip in the table column ("Approved"/"Rejected"/"Needs review") still renders.
- **On-track / paused row dimming** — `opacity-60` on the table row when `!isExpanded` and either `accountOnTrack === true && !hasAppliedChange(record)` or `isAccountPaused(record)`. Both states are inert, so the row recedes.

**KW Buildout Proposals:**
- Source tab name in the spreadsheet is **`KW Buildout Proposals`** (23 columns, one row per proposed keyword). Like the other newer sheets, the fetch is wrapped in `.catch(() => [])` for graceful empty fallback. Parser matches columns by header NAME (case-insensitive), so column order is irrelevant.
- Columns: account_id, account_name, campaign_id, campaign_name, ad_group_id, ad_group_name, proposed_keyword, proposed_match_type, match_type_basis, source_search_term, search_term_status, served_by_keyword, conversions, cost, cpa, confidence, flags, needs_new_ad_group, status, logged_at, batch_id, approval, proposal_id, notes
- Required: proposed_keyword (rows without it are dropped). Group key = **`batch_id`** (= `kw-{account_id}-{date}`), falling back to `${logged_at}|${account_id}` if blank.
- `parseKwBuildout()` in `google-sheets.ts` groups rows into one `KwBuildoutRecord` per batch with a `keywords[]` array. Account-level fields (accountId, accountName, loggedAt, notes) come from the first row, filled from later rows if empty.
- `confidence` is normalized to lowercase `high`/`medium`/`low` (else `''`). `needs_new_ad_group` uses `toBool()` (only literal "TRUE"). `approval` uses `normalizeApprovalStatus()` (`''`/`Approved`/`Rejected`) — this is the **per-keyword write-back column**.
- `proposal_id` (parsed to `KwBuildoutKeyword.proposalId`) is the **unique per-proposal ID** and the intended write-back match key for the n8n scenario. It is included in each `approved[]` item of the feedback payload (see below). Older rows may have an empty `proposal_id`; the payload still carries the `campaign_id`/`ad_group_id`/`proposed_keyword` fields as a fallback match.
- **No error mode, no URL validation.** Practice filter keys on `accountName` (there is no companyId/HubSpot link; `account_id` is the Google Ads ID). Uses the **standard-range pills (7d/30d/90d)** — same as Blogs/GMB/Replies.
- Default table sort is `loggedAt desc` (set in the tab-change effect in `DataTable.tsx`; the shared `date` default doesn't apply since the field is `loggedAt`). Date column uses compact MM/DD via `fmtCompactDate()`.
- Helpers live in `src/lib/kw-buildout.ts` (plain `.ts`): `CONFIDENCE_STYLES`, `confidenceBadge()`, `flagsList()` (splits on comma), `reviewCounts()`, `confidenceMix()`, `pendingKeywordCount()`, `totalConversions()`, `keywordKey()`. It re-exports `fmtCompactDate`/`fmtMoney` from `g-ads-pacing.ts`.
- **Confidence filter** (page.tsx `selectedConfidences: string[]`, gated on the tab in `Filters.tsx`) is the additive final pass → `confidenceFilteredKwBuildout`, which feeds BOTH `DataTable` and CSV export. A batch is kept if ANY keyword matches a selected confidence. Reset when leaving the tab.
- Table columns: ▸ | Date | Practice | Keywords (count) | Conv (sum) | Confidence (high/med/low mini-counts) | Review (action dots: amber=pending, emerald=approved, rose=rejected; "Reviewed" pill + `opacity-60` dimming when `pending === 0`). Every batch row is expandable.

**KW Buildout detail panel + feedback** (`KwBuildoutDetailPanel.tsx`):
- Compact keyword table: `[checkbox]` | Keyword (+ match-type pill) | Ad group (+ amber `NEW` badge when `needsNewAdGroup`) | Currently serving (`servedByKeyword`) | Conv | CPA | Confidence pill; `flags` render as a `⚠ flag` subrow.
- **Approval is multi-select checkbox** — pending keywords get a checkbox (keyed by `keywordKey()` = `campaignId|adGroupId|proposedKeyword`), with a header "select all pending". Already-`Approved`/`Rejected` keywords show a pill instead of a checkbox (not re-submittable). One **"Approve selected (N)"** button submits.
- **Optional notes textarea** appears below the keyword table. Pre-populated from `record.notes` (the `notes` column on the sheet, written back by n8n after a prior submission). The submit button enables when **at least one keyword is checked OR notes text is present** (notes-only submission is valid — n8n handles it via a separate branch). Notes are cleared after successful submit.
- On submit, the panel calls `submitKwBuildoutFeedback(record, approvedKeys, notes)` (hook) which POSTs `{ batch_id, account_id, account_name, logged_at, approval_status: 'Approved', notes, approved: [{ proposal_id, campaign_id, ad_group_id, proposed_keyword, proposed_match_type }] }` to **`NEXT_PUBLIC_KW_FEEDBACK_WEBHOOK_URL`** (an n8n webhook). `approved` may be empty for notes-only submissions. Without the env var the submit errors out. Local hook state is optimistically updated (approved keywords flip to `Approved`).
- Unchecked keywords stay pending (no reject button — there is no explicit reject flow in the UI).

**Campaign Budget Allocation (G Ads Pacing):**
- Lets operators split an account's monthly budget across its campaigns in **dollars**, so the pacing engine can steer each campaign toward its own target instead of pacing the account as one pool. UI lives inside the G Ads Pacing detail panel (`BudgetAllocationCard` in `GAdsPacingDetailPanel.tsx`); the effective mode is also a list column + filter.
- **Two sheets** (both fetched with `.catch(() => [])` graceful-empty, matched by header name):
  - **`Campaign Budgets`** — config, **frontend-owned** (the webhook overwrites an account's rows). One row per campaign, account fields repeated: `google_ads_id, practice_name, campaign_id, campaign_name, budget_dollars, managed, updated_by, updated_at`. No rows for an account = unmanaged (account-level pacing). `account_monthly_budget` is NOT owned here — HubSpot owns it (rides on `GAdsPacingRecord.monthlyBudget`); the payload sends it only as a labeled non-authoritative snapshot.
  - **`Campaign Budget Status`** — runtime state, **backend-owned, READ-ONLY to the frontend**, keyed by `campaign_id`: `campaign_id, shared_budget, effective_mode, status_reason, last_evaluated, paused_by_agent`. Written each run by n8n (shared detection = GAQL `campaign_budget.explicitly_shared`). The portal never writes it. `paused_by_agent` (boolean, only literal `TRUE` = paused via `toBool()`) is joined onto `GAdsPacingCampaign.paused` and drives the **Paused** status override — see the display-status rule above.
- `parseBudgets()` (by `google_ads_id`) + `parseBudgetStatus()` (by `campaign_id`) + `applyBudgetConfigs()` in `google-sheets.ts` join both onto every pacing record: sets `record.budgetConfig`, each `campaign.budgetDollars/sharedBudget/effectiveMode/statusReason`, and the derived account rollup `record.effectiveMode` + `record.statusReason`.
- **Account effective-mode rollup**: `'campaign'` iff `budgetConfig.managed` AND every eligible (non-shared) campaign's status `effectiveMode === 'campaign'`; otherwise `'account'` with an explanatory `statusReason` (shared-budget revert, incomplete coverage, "Pending re-evaluation"). Backend `effective_mode` is authoritative; the rollup is display/filter only.
- **Model (locked, in `src/lib/budget-allocation.ts`)**: dollars are canonical, percent is a derived display (`dollars / monthlyBudget × 100`); the two inputs are tandem/one-at-a-time. **No 100% gate and no clamp** — Save is enabled when every eligible campaign has `budget_dollars > 0` (all-or-nothing), and over-allocation only raises a **soft, non-blocking** divergence warning (`allocationSummary`, tolerance `DIVERGENCE_TOLERANCE = 2%`). The frontend gate is **UX only**; the authoritative all-or-nothing / completeness check runs backend at runtime and can invalidate a saved config (drift), which the status banner then explains.
- **Shared campaigns** (`sharedBudget === true`) are ineligible: inputs disabled, and if any targeted campaign is shared the account reverts to account-level with a banner.
- On submit, `BudgetAllocationCard` calls `submitBudgetAllocation(record, payload)` (hook) POSTing `{ google_ads_id, practice_name, account_monthly_budget_snapshot, updated_by, managed, campaigns: [{ campaign_id, campaign_name, budget_dollars }] }` to **`NEXT_PUBLIC_BUDGET_WEBHOOK_URL`** (n8n). `managed: false` with `campaigns: []` clears back to account-level. The hook optimistically patches EVERY record with the matching `googleAdsId` (budgetConfig + campaign dollars); `effectiveMode`/`statusReason` are backend-owned and refresh on the next sync ("pending re-evaluation" note shown after save).
- **Clear** uses an inline two-step confirm (not `window.confirm`, which would block browser automation).

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
   - **G Ads Pacing**: status filter → `statusFilteredGAdsPacing` → mode filter → `modeFilteredGAdsPacing` → feedback filter → **`reviewFilteredGAdsPacing`** (the three compose in that order)
   - **Keyword Buildout**: confidence filter → `confidenceFilteredKwBuildout`
6. The most-derived variable is what flows to `DataTable` AND to CSV export (don't skip the final pass on either path). For G Ads Pacing that is now `reviewFilteredGAdsPacing` — adding another pass means repointing BOTH consumers.

### Date Handling
- Blogs/GMB Posts combine separate Date and Time columns into single datetime string
- Replies and Neg. Keywords use single "Date Time" / "Date and Time" column
- Date parsing is lenient (handles various formats)
- Date filtering uses threshold comparison (1d, 3d, 7d, 30d, 90d) — all options return a date threshold, there is no "all time"
- Standard tabs (Blogs, GMB Posts, Replies, Keyword Buildout) use 7d/30d/90d pills; **short-range tabs (Neg. Keywords, G Ads Pacing) use 1d/3d/7d pills**
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
31. **`fetchSheet()` defaults to range `A:Z` but accepts a wider range** - G Ads Pacing now has ~49 columns and is fetched with `'A:BH'` (the DOW/auto-decrease columns sit past `AN`; a too-narrow range silently drops them). Other sheets (≤26 columns) keep the default. The parser matches by header name so over-fetching is safe — prefer a generous range. Pass an explicit range when adding sheets that extend past column Z.
32. **G Ads Pacing default sort is `runDate desc`** - Set in the tab-change effect in `DataTable.tsx`. The shared default `{ column: 'date', direction: 'desc' }` doesn't apply to this tab because the field is `runDate`, not `date`. Without this override, sorting silently degrades to source order.
33. **G Ads Pacing date column uses compact MM/DD format** - Via `fmtCompactDate()` in `src/lib/g-ads-pacing.ts`. Year is omitted because pacing is reviewed daily and the visible window is only 1d/3d/7d. If the tab ever spans years, revisit this format.
34. **G Ads Pacing booleans only treat literal "TRUE" as true** - The parser's `toBool()` is case-insensitive but compares against `'true'` only. Empty cells, "FALSE", and unexpected strings all become `false`. This applies to `chronic_demand_limited`, `account_on_track`, `all_demand_limited`, `any_budget_limited`, `conflicts_with_pacing`.
35. **G Ads Pacing `searchBudgetLostIs` and `sevenDayAvgUtilization` use `null` for missing data** - Distinguished from `0` via `toNumOrNull()`. Display rules check for `null` to hide the field entirely. Don't substitute `0` for empty cells — it would falsely show "0% IS lost" or a 0% utilization bar.
36. **G Ads Pacing classification badge "chronic" replaces "demand-limited"** - Don't render two badges. When `chronicDemandLimited && classification === 'DEMAND_LIMITED'`, swap in the orange "chronic" pill. Helper `classificationBadge(c)` returns the right one.
37. **G Ads Pacing INVESTIGATE banner only shows when `allDemandLimited` is true** - For `severity === 'Investigate' && !allDemandLimited`, a generic "No actionable changes identified" banner shows instead. The two paths are mutually exclusive — use `shouldShowInvestigateBanner()` and `shouldShowGenericInvestigateBanner()`.
38. **G Ads Pacing feedback form is hidden on on-track and grace accounts** - Per V3 display rules, there's nothing to approve in those states. The status chip in the table column still renders (so existing approvals stay visible), but the panel form is suppressed.
39. **G Ads Pacing filters are tab-scoped and compose in order** - Three filter states live in `page.tsx` and are ALL reset when switching away from `g-ads-pacing`: `selectedStatuses: StatusFilter[]`, `selectedModes`, and `needsReviewOnly: boolean`. They chain as final client-side passes after `filteredGAdsPacing` from the hook: status → mode → feedback, ending at `reviewFilteredGAdsPacing`, which feeds BOTH the `DataTable` and the CSV export. Empty array / `false` = show all. Filter UI lives in `Filters.tsx`, gated on `contentType === 'g-ads-pacing'`.
40. **Conflict warning ⚠ tooltip is rendered via React portal** - `ConflictIcon` in `GAdsPacingDetailPanel.tsx` uses `createPortal(..., document.body)` because the campaign breakdown table sits inside three nested `overflow` ancestors (the table's `overflow-x: auto` scroller, the data-table's `max-h-[640px] overflow-y-auto`, and the rounded outer `overflow-hidden` wrapper). A normal absolute-positioned tooltip would be clipped by any of them. Position is captured on `mouseenter` via `getBoundingClientRect()` and applied as `position: fixed`. Don't refactor it back to a CSS-only `group-hover` tooltip — it will appear to work in a snapshot/DOM check but render invisibly.
41. **`MultiSelectDropdown` accepts an optional `pluralLabel` prop** - Defaults to `${label}s` (correct for "Practice" → "Practices" and "Account" → "Accounts"). For irregular plurals like "Status" → "Statuses", pass `pluralLabel="Statuses"` explicitly, otherwise the placeholder reads "All Statuss". Affects the trigger placeholder, search placeholder, "All …" quick action, and empty-state text.
42. **G Ads Pacing visible status is DERIVED, not the raw `severity` field** - The table Status column, panel header pill, filter, and CSV all key on `resolveDisplayStatus(record)` (paused → "Paused", grace → "New", else `display_status` column, else variance fallback) — never on `record.severity` or `record.displayStatus` directly. Because the value is derived, the Status column sort is special-cased in `DataTable.tsx` (`sort.column === 'displayStatus'` → `displayStatusRank`), and CSV export maps an augmented `status` field onto each row (`exportToCSV` only reads plain keys). If you add a new place that shows pacing status, call `resolveDisplayStatus` (or `displayStatusPill` for the style) — don't read a field.
43. **`display_status` fallback is variance-based, not a severity map** - When the `display_status` column is blank, the tier is computed from signed MTD variance (`displayStatusFromVariance`), so old rows and pre-n8n-change rows still show a correct client label. The column is authoritative when present.
44. **An account is "Paused" only when EVERY campaign is paused** - `isAccountPaused()` requires `campaigns.length > 0 && campaigns.every(c => c.paused)`. A partially-paused account keeps its normal pacing status (it's still spending on the live campaigns); the paused campaigns just show a `paused` tag in the detail-panel breakdown. Don't switch this to `.some()` — an account spending on 3 of 4 campaigns must not read as Paused. `paused` defaults to `false` everywhere (parser default, mock data, and when the campaign has no `Campaign Budget Status` row), so a missing sheet/column degrades to "nothing is paused".
45. **The "Needs review" filter must match the Feedback column's definition** - Both use `approvalStatus === '' && needsApproval(record)`. If you change one, change the other, or the toggle will hide rows that visibly say "Needs review". `needsApproval()` is recommendation-based (`BUDGET_INCREASE_APPROVAL`, `BUDGET_DECREASE_APPROVAL`, `PAUSE_CAMPAIGN`) — it is NOT derived from the applied-budget movement, so it can be true even on rows whose Actions column shows no dots.
46. **Campaign pills and action dots are APPROVAL-AWARE, keyed on account `approval_status`** - `recommendation_type` records what the engine decided on that run and is **never rewritten**, so an approval row would otherwise advertise "pending" forever — even though approving in the portal makes the Make.com workflow update the sheet AND action the Google Ads budget **immediately**. Both `appliedStatusLabel(view, approvalStatus)` and `actionDotCounts(campaigns, approvalStatus)` take the account-level status so approved rows flip to "Approved"/green. The approve/reject decision is account-wide, so all of an account's approval campaigns flip together — that matches the feedback flow (one decision per account). Both params default to `''`, so omitting them silently reverts to the old stale behavior — always pass `record.approvalStatus`.
47. **`direction` means APPLIED movement, not proposed** - `campaignBudgetView().direction`/`deltaPct`/`target` describe `current → final` (what actually got pushed). `hasAppliedChange()` — and therefore on-track row dimming — depends on that. When you need "what would happen if approved", use `ifApprovedTarget`/`ifApprovedDeltaPct`; do NOT repoint `direction` at the proposal, or pending approvals will start counting as applied changes and un-dim on-track rows.

## Environment Variables

Required for production Google Sheets integration (optional for development):
- `GOOGLE_SHEETS_ID` - Spreadsheet ID from Google Sheets URL
- `GOOGLE_API_KEY` - Google API key with Sheets API enabled

The app gracefully falls back to mock data if these are not set.

- `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` - n8n webhook URL for the chat widget (must be a `NEXT_PUBLIC_` var since it's used client-side)
- `NEXT_PUBLIC_MAKE_FEEDBACK_WEBHOOK_URL` - Make.com webhook URL that receives `{ run_date, google_ads_id, approval_status, reviewed_by, notes }` payloads from the G Ads Pacing review panel. The Make.com scenario writes the three feedback fields back to every matching row of the `G Ads Pacing` sheet. Without this var the submit button errors out. Must be `NEXT_PUBLIC_` since the POST is made from the browser.
- `NEXT_PUBLIC_KW_FEEDBACK_WEBHOOK_URL` - n8n webhook URL for the Keyword Buildout review panel (the webhook node must use HTTP method POST). Receives `{ batch_id, account_id, account_name, logged_at, approval_status: 'Approved', notes, approved: [{ proposal_id, campaign_id, ad_group_id, proposed_keyword, proposed_match_type }] }`. `approved` may be empty for notes-only submissions. The n8n workflow writes `notes` to all rows in the batch, and for each `approved[]` item writes `Approved` to that row's `approval` cell. Without this var the "Approve selected" button errors out. Must be `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_BUDGET_WEBHOOK_URL` - n8n webhook URL for the Campaign Budget Allocation card (G Ads Pacing). Receives `{ google_ads_id, practice_name, account_monthly_budget_snapshot, updated_by, managed, campaigns: [{ campaign_id, campaign_name, budget_dollars }] }`. `managed: false` with an empty `campaigns` array clears the account back to account-level pacing. The n8n scenario overwrites the account's rows in the **`Campaign Budgets`** sheet (and, at runtime, evaluates shared-budget/completeness and writes the read-only **`Campaign Budget Status`** sheet). Without this var the "Save budgets" button errors out. Must be `NEXT_PUBLIC_`.

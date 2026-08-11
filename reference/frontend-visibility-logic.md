# Frontend visibility logic — G Ads Pacing

**Date:** 2026-07-31
**Scope:** every rule in the portal that decides whether a pacing row, campaign, badge, banner,
or control is **shown, hidden, dimmed, or relabelled**. Companion to the backend change package —
that document owns what the agent *does*; this one owns what the operator *sees*.

**Rule of thumb:** the portal never mutates pacing data. Everything below is display-layer
derivation over the `G Ads Pacing`, `Campaign Budgets`, and `Campaign Budget Status` sheets. The
only thing the frontend writes is a webhook payload (feedback, budget allocation).

---

## 1. What reaches the browser at all

Server-side, in `fetchAllContent()` ([google-sheets.ts:879-891](../src/lib/google-sheets.ts#L879-L891)):

| Payload | Contents | Why |
|---|---|---|
| `gAdsPacing` | `filterGAdsPacing(all, [], '7d')` — last 7 days of run dates | The normal UI only offers 1d/3d/7d pills, so shipping more is dead weight |
| `pausedGAdsPacing` | `currentMonthPausedGAdsPacing(...)` — **one row per account** with a pause event this calendar month | Paused campaigns disappear from later pacing runs, so the current month's pause events can't be reconstructed from the 7-day window |
| `lastMonthGAdsPacing` | `lastMonthGAdsPacing(all)` — **one row per account**: its newest run whose `runDate` falls in the previous calendar month | The sheet has no month-close column (every spend field is `*_mtd` as of that run), so an account's last in-month run *is* its closing spend. The 7-day slice puts a closed month permanently out of reach otherwise |

Records are sorted `runDate desc` before slicing. **A pause event older than 7 days is visible
only in the paused view** — it has no row in normal history.

All three reducers run over the **full** parsed array, after `applyBudgetConfigs()`. The two
one-row-per-account snapshots are cheap (~330 rows each today) next to the 7-day slice.

The last-month row's own `runDate` is the honest **"as of"** date and is displayed as such: real
data has accounts whose last July run was the 13th or the 23rd, and those rows are genuinely
partial. Never extrapolate them or hide them.

`applyBudgetConfigs()` runs before all three, joining onto every record:
- `budgetConfig` (from `Campaign Budgets`, tombstoned `active=FALSE` rows skipped)
- per-campaign `budgetDollars`, `sharedBudget`, `effectiveMode`, `statusReason`, `paused`, `pausedDate`
- account rollup `effectiveMode` / `statusReason`
- `pauseDates[]` — the account's distinct pause event dates

---

## 2. Filter chain (order is load-bearing)

Five passes. Each consumes the previous one's output; the **last variable feeds both the table
and the CSV export**.

```
data.gAdsPacing
  └─ 1. useContentData    filterGAdsPacing(practices, dateRange)   → filteredGAdsPacing
      └─ 2. page.tsx      3-way view swap (daily/paused/last-month) → baseGAdsPacing
          └─ 3. page.tsx  status filter                             → statusFilteredGAdsPacing
              └─ 4.       mode filter                               → modeFilteredGAdsPacing
                  └─ 5.   "Needs review" toggle                     → reviewFilteredGAdsPacing ★
```

★ Adding a sixth pass means repointing **both** `DataTable` and `exportToCSV`.

**1. Practice + date** ([utils.ts:180](../src/lib/utils.ts#L180)) — practice matches on
`practiceName`; date on `runDate`. Empty practice array = all.

**2. View swap** — `pacingView: 'daily' | 'paused' | 'last-month'` selects the source array
(`filteredGAdsPacing` / `filteredPausedGAdsPacing` / `filteredLastMonthGAdsPacing`). A union rather
than a pair of booleans, so "paused AND last-month" isn't representable.

In **both** non-daily views, passes 3–5 are **bypassed, not cleared**: the operator's status /
mode / review selections survive and reapply on return to Daily. The Practice filter stays active
in all three. Neither alternate view honors the date pills — both are scoped server-side — so the
pills are replaced with a static period chip (`This Month` / `July 2026`) and `selectedDateRange`
is left untouched.

The last-month view also drops the Mode, Actions and Feedback **columns** and uses its own detail
panel; see §11.

**3. Status** — matches `resolveDisplayStatus(r)` against `selectedStatuses`. Only the five
variance tiers are selectable, so `null` ("New"), `Paused`, and `Paused (cap reached)` rows **drop
out the moment any specific tier is chosen**. Empty selection = show all, including those three.

**4. Mode** — matches the account rollup `r.effectiveMode` (`'account' | 'campaign'`).

**5. Needs review** — `approvalStatus === '' && needsApproval(record)`. This must stay identical
to the Feedback column's definition or the toggle hides rows that visibly say "Needs review".
Note `needsApproval()` is *recommendation-based*, so it can be true on a row whose Actions column
shows no dots.

---

## 3. Account status pill — the five-step resolver

`resolveDisplayStatus()` ([g-ads-pacing.ts:301](../src/lib/g-ads-pacing.ts#L301)) is the single
source of truth for the table Status column, the panel header, the filter, sorting, and CSV.
**Nothing reads `record.severity` for display** — severity is an internal ops signal that only
drives the INVESTIGATE banners.

Precedence, first match wins:

| # | Condition | Result | Pill |
|---|---|---|---|
| 0 | `allCampaignsPaused()` — every campaign's `campaign_status` is PAUSED | `Paused (cap reached)` | gray |
| 1 | `isPausedOnRunDate()` — `runDate` **exactly equals** one of `pauseDates[]` | `Paused` | gray |
| 2 | `shouldShowGraceBanner()` — every campaign is `MONTH_START_GRACE` | `null` → "New" | gray |
| 3 | `display_status` column parses to a known tier | that tier | by magnitude |
| 4 | fallback: `displayStatusFromVariance(variancePercent)` | derived tier | by magnitude |

**Step 1 is date-specific by design.** `paused_by_agent` is *current* state while each pacing row
is a *dated snapshot*, so a pause must never repaint earlier or later rows. Step 0 is the
exception — it keys on that row's own `campaign_status`, so it's already date-correct.

**Variance bands** (signed MTD %, positive = overspending, `>` promotes):

| Variance | Tier | Color |
|---|---|---|
| `\|v\| ≤ 10` | On Track | emerald |
| `+10 < v ≤ +20` | Overpacing | amber |
| `v > +20` | Significantly Overpacing | rose |
| `-20 ≤ v < -10` | Underpacing | amber |
| `v < -20` | Significantly Underpacing | rose |

**Color encodes magnitude only; direction lives in the label text.** Over- and underpacing at the
same severity are the same color on purpose.

Sorting is special-cased on `sort.column === 'displayStatus'` → `displayStatusRank()`, because the
value is derived rather than a raw field. New sorts second-to-last, Paused last, cap-paused after
that. CSV export augments each row with
`status: pacingView === 'paused' ? 'Paused' : (resolve(r) ?? 'New')` ([page.tsx](../src/app/page.tsx)).

---

## 4. Row dimming (`opacity-60`)

[DataTable.tsx:937](../src/components/DataTable.tsx#L937). Applied when **not expanded** and any of:

- `isPausedView` — every row in that view is a past event
- `isPausedOnRunDate(record)` — this row is the pause day
- `allCampaignsPaused(record)` — cap-paused, nothing running
- `record.accountOnTrack && !hasAppliedChange(record)` — on track **and** nothing actually moved

That last conjunct matters: an on-track account can still take a day-of-week budget move, and a
row where money moved should not recede. `hasAppliedChange()` keys on `direction !== 'flat'`,
which is why `direction` must keep meaning *applied* movement (see §6).

Expanding a row always removes the dimming.

---

## 5. Campaign-level visibility

**`isCampaignEnabled(c)`** — `campaign_status === 'ENABLED'`, with **blank treated as ENABLED** so
historical rows written before the column existed don't blank out.

Filter on this and never on `skip_reason` / `recommendation_type`.

| Surface | Filtered? | Reference |
|---|---|---|
| Detail-panel campaign breakdown | **yes** — `visibleCampaigns` | [panel:535](../src/components/GAdsPacingDetailPanel.tsx#L535) |
| Table action dots | **yes** — a hidden campaign must not produce a stale dot | [DataTable:933](../src/components/DataTable.tsx#L933) |
| Mixed-account chip, `anyFinal` | **yes** — derived from `visibleCampaigns` so the header reconciles with what's on screen | panel |
| Budget allocation editor | **NO — known gap, see §9** | [panel:194](../src/components/GAdsPacingDetailPanel.tsx#L194) |
| Account MTD spend | **N/A** — read from an account-level field, never summed from campaigns, so paused spend still counts | — |

Two different "paused" concepts coexist and are not interchangeable:

| Helper | Keys on | Source sheet | Used for |
|---|---|---|---|
| `allCampaignsPaused()` | `campaign_status` | G Ads Pacing | the "Paused (cap reached)" status + lines up exactly with the breakdown filter |
| `isAccountPaused()` | `paused_by_agent` | Campaign Budget Status | the dedicated paused-practices view |

---

## 6. Budget columns — what the operator is shown

**Source of truth is `current_daily_budget → final_daily_budget`.** `recommendation_type` and
`skip_reason` describe the engine's decision against a de-normalized baseline and routinely
contradict the live budget (a "decrease" that raises the budget, a "no change" that applies a real
cut). `recommendation_type` is trusted for **one thing only**: branching auto vs. approval vs.
pause in `campaignBudgetView()`.

| Row state | "Applied /day" | "Change" | Status pill |
|---|---|---|---|
| Auto, moved | `final` | `current → final` % | Auto-applied |
| Auto, flat | `—` | `—` | No change |
| Approval/pause, un-actioned | `ifApprovedTarget` | `ifApprovedDeltaPct` | Needs approval / Pause (pending) |
| Approval/pause, actioned | `final` | `current → final` % | Approved / Rejected |
| Pre-go-live (`finalDailyBudget === null`) | legacy proposed rendering | | raw recommendation badge |

**Un-actioned approvals show the if-approved target, never `—`.** The workflow hasn't applied
anything yet, so `final === current`, which would collapse `direction` to flat and dash out the
very change being approved. `ifApprovedTarget` / `ifApprovedDeltaPct` exist for exactly this.
Do **not** repoint `target`/`deltaPct`/`direction` at the proposal — row dimming depends on them
meaning applied movement.

Muted "why" subtext assembles from, in order: `if approved` (un-actioned pending) ·
`day-of-week shaping` (DOW banner showing and the row moved) · `auto-applied X% cut`
(`autoDecreasePromoted`) · the skip-reason label **only when `direction === 'flat'` and the row
isn't pending**.

`NO_CHANGE` rows blank the Proposed/Change cells to `—`; the pre-decision proposed value would
otherwise read as a contradicting recommendation.

### Action dots

`actionDotCounts(campaigns, approvalStatus)` — **dots only, no fallback pill**. When nothing needs
an action the cell is empty; the Status column already conveys account state.

| Dot | Meaning |
|---|---|
| red | pending pause |
| amber | pending approval |
| green | approval/pause the operator already actioned (`approvalStatus === 'Approved'`) |
| blue | auto change that actually moves the live budget (`direction !== 'flat'`) |
| *(nothing)* | flat rows, and **rejected** rows |

**Approval-awareness is the subtle part.** `recommendation_type` is never rewritten, so without
passing `record.approvalStatus` an approved row advertises "pending" forever — even though
approving in the portal makes the workflow action the Google Ads budget immediately. Both
`appliedStatusLabel()` and `actionDotCounts()` default that param to `''`, so **omitting it
silently reverts to the stale behavior**. Always pass it. The decision is account-wide, so all of
an account's approval campaigns flip together.

---

## 7. Conditional panel elements

**Banners** — priority order, one at a time:

1. Grace — every campaign is `MONTH_START_GRACE`
2. INVESTIGATE — `severity === 'Investigate' && allDemandLimited`
3. Generic INVESTIGATE — `severity === 'Investigate' && !allDemandLimited`

Plus the teal **DOW banner**, shown when `dowMultiplier != null && != 1` — auto-hiding while the
multiplier is inert (1 or empty) covers the known Edit-Fields pass-through bug.

**Per-element predicates:**

| Element | Shows when |
|---|---|
| Classification badge | `classification != null`; swaps to orange "chronic" when `chronicDemandLimited && DEMAND_LIMITED` — **one badge, never two** |
| IS-lost subtext | `BUDGET_LIMITED && searchBudgetLostIs !== null && >= 1` |
| 7-day util bar | `sevenDayAvgUtilization !== null && skipReason !== 'MONTH_START_GRACE'`; fill `min(pct,100)`; <50 orange, 50–94 green, ≥95 blue |
| Conflict ⚠ | `conflictsWithPacing && recommendationType` is not NO_CHANGE/blank `&& skipReason === ''` |
| Mixed-account chip | both BUDGET_LIMITED and DEMAND_LIMITED exist among `visibleCampaigns` |
| Feedback form | `!showGrace && !accountOnTrack && needsApproval(record)` |

`null` vs `0` matters: `searchBudgetLostIs` and `sevenDayAvgUtilization` use `toNumOrNull()`
specifically so an empty cell hides the element instead of rendering "0% IS lost" or a 0% bar.

The conflict tooltip is rendered through a **React portal** to `document.body`
([panel: `ConflictIcon`](../src/components/GAdsPacingDetailPanel.tsx)) because the breakdown table
sits inside three nested overflow ancestors. Position is captured on `mouseenter` via
`getBoundingClientRect()` and applied as `position: fixed`. A CSS-only `group-hover` tooltip
passes a DOM check and renders invisibly — don't refactor it back.

The feedback **chip** in the table's Feedback column always renders, even when the panel form is
suppressed, so existing approvals stay visible.

---

## 8. Account vs campaign mode display

The Mode column pill: violet **Campaign** when `record.effectiveMode === 'campaign'`, otherwise
slate **Account**.

The value is a rollup computed in `applyBudgetConfigs()`
([google-sheets.ts:620-639](../src/lib/google-sheets.ts#L620-L639)):

```
if (!budgetConfig.managed)                             → 'account', reason ''
else if every ALLOCATABLE campaign is effectiveMode 'campaign'
                                                       → 'campaign', reason ''
else                                                   → 'account', reason:
       if no allocatable campaigns:
           "Every targeted campaign is paused…"         (if any eligible)
           "Every campaign is on a shared budget…"      (if none eligible)
           "Pending re-evaluation."                     (no campaigns at all)
       else:
           first ALLOCATABLE campaign statusReason
           ?? "A targeted campaign is on a shared budget…"  (if any sharedBudget)
           ?? "Pending re-evaluation."
```

Backend `effective_mode` is authoritative; this rollup is display and filtering only. The
"Pending re-evaluation" branch is what the operator sees between saving an allocation and the
next 6 AM run.

Two things the rollup deliberately does, both added 2026-07-31:

- **It keys on `isAllocatable`, not `!sharedBudget`.** A PAUSED campaign whose Campaign Budget
  Status row never flipped to `'campaign'` would otherwise hold the whole account at
  account-level forever, even though it is not steering anything.
- **It prefers a reason from an allocatable campaign.** The previous version scanned *all*
  campaigns, so a paused campaign's stale reason outranked a live campaign's real one.

Raw backend tokens (`drift`, `shared_budget`, `blocked_by_sibling`, `sum_overshoot`, …) are
rendered through `statusReasonLabel()`, which maps known values to sentences and **passes unknown
values through unchanged** — the rollup writes full English sentences of its own, and an unmapped
future token should degrade to raw rather than to blank.

**Reverted-to-account banner** — shown when `managed && record.effectiveMode === 'account'`, i.e.
the operator declared intent but the runtime check overruled it. `statusReason` renders beneath.

### Allocation card states

1. **Unmanaged** — no config → offer to set
2. **Managed view** — read-only split, plus the revert banner above
3. **Edit** — tandem $/% inputs, soft divergence warning

Dollars are canonical; percent is derived (`dollars / monthlyBudget × 100`) and the two inputs are
one-at-a-time.

**Two predicates, deliberately distinct** (`budget-allocation.ts`):

| | Means | Drives |
|---|---|---|
| `isEligible` | not on a shared Google Ads budget | whether the campaign gets a **row** |
| `isAllocatable` | `isEligible` **and** ENABLED in Google Ads | draft seed, **save gate**, divergence summary, editable payload entries |

Filter on `campaign_status` (via `isCampaignEnabled`), **never on `c.paused`** — that is
`paused_by_agent` from a different sheet — and **never on spend**: an ENABLED campaign with $0
spend is fully allocatable.

- **Shared** campaigns: row shown, inputs disabled, omitted from the payload entirely. If any
  targeted campaign is shared the account reverts with a banner.
- **Paused** campaigns: row shown greyed at `opacity-60` with the held amount as **static text,
  not a disabled input** (an input carrying a value reads as "editable once I fix something").
  They **are** sent in the payload carrying their held amount, read-only, so the value is
  explicit on the wire and survives a backend rewrite of the account block.

**Held dollars are excluded from the allocation total** and named separately in the footer
(`· $1,000 held in 1 paused campaign`). A paused campaign spends $0, so an account with money
parked in one genuinely will underspend — reporting it as allocated would suppress the very
warning that catches it. The divergence warning is suppressed entirely when nothing is
allocatable, since "100% under" next to the no-active-campaigns banner is noise.

**Save gate:** `isSaveEnabled` requires every **allocatable** field to be finite and `>= 0`
(all-or-nothing) **and** a non-empty `updated_by`. **$0 is a valid deliberate allocation** —
backend B4 (deployed 2026-07-31) routes a $0 target to `NO_CHANGE / UNALLOCATED_TARGET` and
excludes it from day-of-week conversion, so it is inert rather than a compounding $50→$35→$25
decrease. **Blank is not valid.** Over-allocation is **not** blocked — it raises only the
non-blocking `allocationSummary` warning at `DIVERGENCE_TOLERANCE = 2%`. This gate is UX only; the
authoritative check runs backend and can invalidate a saved config later.

The `length > 0` guard inside `isSaveEnabled` is load-bearing: without it an all-paused managed
account would POST `managed: true, campaigns: []`, which the backend reads as "no campaigns
named" (it only tombstones via `removed_campaign_ids`), so the sheet keeps its old amounts while
the client wipes them. **Clear budgets remains reachable in that state** — it is gated on
`updated_by` only, never on the save gate.

**Editing is refused on a stale roster.** `record.campaigns` is that run date's snapshot, not live
Google Ads. The card always shows `Campaigns as of MM/DD`, and when
`runDate !== accountLatestRunDate` the Edit button is replaced by a note naming the latest run.
`accountLatestRunDate` is computed per account in `applyBudgetConfigs` over the full record set,
before the 7-day slice — so it is the true latest in both the normal and paused views. As of
2026-07-31 this affects 1,799 of 2,123 loaded rows.

**Clear** uses an inline two-step confirm, never `window.confirm` — the latter blocks browser
automation.

---

## 9. Known visibility gaps

**~~The allocation editor does not filter on `campaignStatus`.~~ CLOSED 2026-07-31.** Fixed via
the split-predicate change (see §8, "Two predicates"). Paused campaigns now render as a greyed,
read-only row showing the held amount ("paused — $1,000 held, not steering") rather than being
filtered out: once the backend's paused-benign gate (B4) retains allocations on paused campaigns,
hiding them would make stranded budget invisible *and* unclearable. Verified against live data —
293 records carry an eligible+PAUSED campaign, 45 of them holding real money.

**Shared-budget accounts report the wrong reason.** The portal excludes shared campaigns from the
payload, so they never get a config row, so the backend's coverage check fires first and reports
`incomplete` instead of `shared_budget`. Label-only; tracked separately.

**`effective_mode` precedence — LOCKED 2026-07-31, not yet implemented.** The B2 backend change
(held until the 8/1 month-rollover run is verified) will publish `effective_mode` / `status_reason`
onto `G Ads Pacing` log rows. The agreed precedence when it lands:

- **`effective_mode` on the log row is authoritative for the account-level display label.** Every
  account gets one, including unmanaged ones.
- **The `Campaign Budget Status` rollup stays authoritative for the per-campaign `status_reason`.**
  It only covers configured campaigns on managed accounts, which is why it can't drive the
  account label.

Swap procedure: add both to `parseGAdsPacing`'s header-name lookup (range is already `A:BH` and
the parser matches by name, so appending is safe), read them onto the record, then in
`applyBudgetConfigs` prefer the log-row value **only when it is a non-empty, whitelisted
`'account'|'campaign'`**. The fallback must survive *"column exists but is empty"*, not just
*"column missing"* — `idx()` returns `-1` for a missing column and the guarded `cell()` yields
`undefined`, while a blank cell yields `''`; **both must route to the rollup**, because the
columns will be blank for a run or two after they are added. Verify against a real run before
deleting the rollup.

`status_reason` gains **two** new values with B2: `paused` and `no_active_campaigns` (a fully
cap-paused account). Both are already in `STATUS_REASON_LABELS`
([g-ads-pacing.ts](../src/lib/g-ads-pacing.ts)); `no_active_campaigns` is also the signal backlog
#6 (grey out connected accounts with no spend) needs.

---

## 10. Cross-tab rules that also affect this tab

- **Date pills** — G Ads Pacing and Neg. Keywords use **1d/3d/7d**; all other tabs use 7d/30d/90d.
  Switching tabs maps **by pill position**, not value (`mapDateRangeForTab()`, `SHORT_RANGE_TABS`).
- **Default sort** is `runDate desc`, set in the tab-change effect in `DataTable.tsx`. The shared
  `{ column: 'date' }` default doesn't apply — the field is `runDate` — and without the override
  sorting silently degrades to source order.
- **Date format** is compact MM/DD; the year is dropped because the window is at most 7 days.
- **No error mode.** The tab is hidden entirely in error mode, and there's no URL validation.
- **Fetch range is `A:BH`.** The parser matches by header **name**, so column order is irrelevant
  and over-fetching is free — but a too-narrow range silently drops columns past the boundary.
- **Auto re-sync** every hour (3,600,000 ms), so any "pending re-evaluation" state clears without
  a manual refresh.

---

## 11. Last month view (closing spend)

Reached from the pacing-view segmented control (`Daily | Paused practices (N) | Last month (M)`).
Period is **always the previous calendar month** — no picker. Rolls the year back in January.

**What it shows.** One row per account, spend-focused:
`▸ | Practice | HSID | Budget | Spend | % of Budget | Variance % | Status at close | As of`.

- Mode, Actions and Feedback are **dropped**. Each describes a decision made on one specific day;
  on a closed month they are noise at best, actionable-looking at worst.
- **No row dimming.** The daily view's dim heuristic (on-track / paused) encodes decision-time
  state that no longer applies — every row here is equally a fact about closed spend.
- **Status at close** uses the ordinary `resolveDisplayStatus(record)`, no override. The resolver
  is already date-correct: `isPausedOnRunDate` matches that row's own run date.
- **Default sort is `spendMtd desc`**, not `runDate` — it's a spend review, and nearly every row
  shares the same closing date. `% of Budget` is derived, so like `displayStatus` it needs a
  special-cased comparator; `$0`-budget accounts park last in **both** directions.
- **`TOTAL — N accounts` footer** covers the **whole filtered set**, not a page. Budget and spend
  sum; % of budget is `totalSpend / totalBudget`; variance, status and as-of are left blank (an
  average of variances is not a number anyone should act on).
- **No pagination**, deliberately: ~330 rows today, and the point is scanning every account at
  once, which 14 pages of 25 would defeat. Virtualize before reintroducing pages.

**Detail panel is a separate component** (`GAdsPacingLastMonthPanel`), not a flag on
`GAdsPacingDetailPanel`. Two reasons:

1. **Safety.** The daily panel's feedback form is gated only on grace / `accountOnTrack` /
   `needsApproval` — *not* on the stale-roster check that guards the budget card. Reusing it would
   let an operator POST a closed month's `run_date` to the Make webhook, writing an approval onto
   every row of that month.
2. It shows **every campaign, including non-ENABLED ones** — the opposite of every other pacing
   surface. A paused campaign's spend still counted toward the account total, so filtering it out
   would break the reconciliation the panel exists to provide. When campaign spend doesn't sum to
   the account figure (campaign created/removed mid-month) it says so rather than implying a match.

**Never optimistically patch `lastMonthGAdsPacing`.** `submitBudgetAllocation`'s `updateRows`
matches on `googleAdsId` and *would* hit these rows, rewriting a closed month's roster and
allocations with today's config until the next sync. `pausedGAdsPacing` is safe to patch because it
holds each account's *latest* record; this array holds a *closed* one.

**CSV** exports the same nine columns minus the chevron and the TOTAL row (a totals row inside the
data breaks sorting and pivoting downstream), to
`g-ads-pacing-last-month-<YYYY-MM>-<export-date>.csv`. `% of Budget` is blank, not `Infinity%`,
when the account has no budget on file.

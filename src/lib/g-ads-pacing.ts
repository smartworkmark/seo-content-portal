import type {
  ApprovalStatus,
  Classification,
  DisplayStatus,
  GAdsPacingCampaign,
  GAdsPacingRecord,
  RecommendationType,
  Severity,
  SkipReason,
} from '@/types';

export const SEVERITY_STYLES: Record<
  Severity,
  { label: string; pill: string; text: string }
> = {
  Critical: {
    label: 'CRITICAL',
    pill: 'bg-rose-50 ring-1 ring-rose-200',
    text: 'text-rose-700',
  },
  Alert: {
    label: 'ALERT',
    pill: 'bg-amber-50 ring-1 ring-amber-200',
    text: 'text-amber-700',
  },
  Investigate: {
    label: 'INVESTIGATE',
    pill: 'bg-violet-50 ring-1 ring-violet-200',
    text: 'text-violet-700',
  },
  Underpace: {
    label: 'UNDERPACE',
    pill: 'bg-sky-50 ring-1 ring-sky-200',
    text: 'text-sky-700',
  },
  Auto: {
    label: 'AUTO',
    pill: 'bg-slate-100 ring-1 ring-slate-200',
    text: 'text-slate-600',
  },
  OK: {
    label: 'OK',
    pill: 'bg-emerald-50 ring-1 ring-emerald-200',
    text: 'text-emerald-700',
  },
};

// Client-facing pacing tiers. Colored by magnitude only: On Track = green, mild = amber,
// significant = red (direction is conveyed by the label text). "New" is the neutral state
// shown during month-start grace — it is NOT a DisplayStatus tier, so it lives outside this map.
export const DISPLAY_STATUS_STYLES: Record<
  DisplayStatus,
  { label: string; pill: string; text: string }
> = {
  'Significantly Overpacing': {
    label: 'Significantly Overpacing',
    pill: 'bg-rose-50 ring-1 ring-rose-200',
    text: 'text-rose-700',
  },
  Overpacing: {
    label: 'Overpacing',
    pill: 'bg-amber-50 ring-1 ring-amber-200',
    text: 'text-amber-700',
  },
  'On Track': {
    label: 'On Track',
    pill: 'bg-emerald-50 ring-1 ring-emerald-200',
    text: 'text-emerald-700',
  },
  Underpacing: {
    label: 'Underpacing',
    pill: 'bg-amber-50 ring-1 ring-amber-200',
    text: 'text-amber-700',
  },
  'Significantly Underpacing': {
    label: 'Significantly Underpacing',
    pill: 'bg-rose-50 ring-1 ring-rose-200',
    text: 'text-rose-700',
  },
};

// Neutral pill for the month-start grace state (resolver returns null).
export const DISPLAY_STATUS_NEW_STYLE = {
  label: 'New',
  pill: 'bg-slate-100 ring-1 ring-slate-200',
  text: 'text-slate-500',
} as const;

// Neutral pill for a fully-paused account (resolver returns 'Paused'). Same gray family as
// "New" — a paused account has no pacing signal to convey — but a distinct label.
export const DISPLAY_STATUS_PAUSED_STYLE = {
  label: 'Paused',
  pill: 'bg-slate-100 ring-1 ring-slate-200',
  text: 'text-slate-500',
} as const;

// An account whose every campaign is currently PAUSED (campaign_status), i.e. the pacing
// agent paused everything at the monthly budget cap. Its month-to-date pace is technically
// in-band, so without this it would read as "On Track" over an empty campaign list. Distinct
// label so it isn't confused with the event-based Paused pill above. Gray family (no live
// pacing signal). Label is client-facing — confirm wording with Bill before shipping.
export const DISPLAY_STATUS_CAP_PAUSED_STYLE = {
  label: 'Paused (cap reached)',
  pill: 'bg-slate-100 ring-1 ring-slate-200',
  text: 'text-slate-500',
} as const;

// The five tiers, ordered for the filter dropdown (worst-over → worst-under).
export const DISPLAY_STATUS_OPTIONS: DisplayStatus[] = [
  'Significantly Overpacing',
  'Overpacing',
  'On Track',
  'Underpacing',
  'Significantly Underpacing',
];

// Historical pacing statuses are the five daily tiers only. Current-month pause events use
// the dedicated Paused practices view and never enter the normal Status filter.
export type StatusFilter = DisplayStatus;
export const STATUS_FILTER_OPTIONS: StatusFilter[] = [...DISPLAY_STATUS_OPTIONS];

// The G Ads Pacing tab renders one of three mutually exclusive views. A union rather than a
// pair of booleans: {paused, lastMonth} both-true is not a state this tab has, and encoding it
// as booleans would force a precedence rule at every branch site. 'daily' is the normal
// 1/3/7-day history; 'paused' is the current-month pause-event snapshot; 'last-month' is the
// previous calendar month's closing spend. Only 'daily' honors the date pills and the
// Status/Mode/Feedback filters — the other two bypass (never clear) them.
export type PacingView = 'daily' | 'paused' | 'last-month';

// Case-insensitive match of a raw sheet value to a known tier. Returns null for blank/unknown
// so the caller can fall back to the variance-derived tier.
export function normalizeDisplayStatus(raw: string | undefined | null): DisplayStatus | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return null;
  const match = DISPLAY_STATUS_OPTIONS.find((t) => t.toLowerCase() === s);
  return match ?? null;
}

// Pure tier function: derive the client-facing tier from signed month-to-date variance %.
// Positive variance = overspending (overpacing); negative = underpacing. Boundary rule: `>`
// promotes to the higher tier — exactly ±10 stays On Track, exactly ±20 stays the mild tier.
export function displayStatusFromVariance(variancePercent: number): DisplayStatus {
  const v = Number.isFinite(variancePercent) ? variancePercent : 0;
  const mag = Math.abs(v);
  if (mag <= 10) return 'On Track';
  if (v > 0) return mag > 20 ? 'Significantly Overpacing' : 'Overpacing';
  return mag > 20 ? 'Significantly Underpacing' : 'Underpacing';
}

// A campaign is shown in the portal only when its live Google Ads state is ENABLED. Blank
// (historical rows written before the campaign_status column existed) defaults to ENABLED so
// old views don't blank out. Filter on this — never on skip_reason/recommendation_type.
export function isCampaignEnabled(campaign: Pick<GAdsPacingCampaign, 'campaignStatus'>): boolean {
  return String(campaign.campaignStatus || 'ENABLED').toUpperCase() === 'ENABLED';
}

// A campaign whose serving has permanently ended (its own end date lapsed), from the
// campaign_serving_status column on the G Ads Pacing sheet. Distinct from campaignStatus
// (Google Ads' own ENABLED/PAUSED), which won't reliably flip just because serving ended.
// Blank/missing (most rows, until the column is backfilled) defaults to "not ended" — treated
// as actively serving — same as isCampaignEnabled() defaults a blank campaignStatus to ENABLED.
// A campaign can be both paused AND ended at once; callers that render a single label should
// check this FIRST and only fall back to the plain-paused label when it's false (ended is the
// bigger-impact state — see heldReasonLabel() in budget-allocation.ts).
export function isCampaignEnded(
  campaign: Pick<GAdsPacingCampaign, 'campaignServingStatus'>,
): boolean {
  return campaign.campaignServingStatus === 'ENDED';
}

// An ended campaign with zero spend this month has nothing to show in the campaign breakdown
// table — its Applied/day and "Auto-applied" status describe a budget nothing can reach, which
// reads as active management of a campaign that isn't running. A PAUSED campaign doesn't need
// this: pausing already flips campaignStatus to PAUSED (see isCampaignEnabled), so it's excluded
// from the breakdown before spend is even considered — same outcome, no separate rule required.
// Ended is the one signal that doesn't flip campaignStatus along with it (confirmed against
// production data), so it needs this explicit check. Scoped to zero spend: an ended campaign
// that DID spend earlier this month stays visible, since that spend is real. The Budget
// Allocation card and the Last month panel intentionally keep showing $0 held/ended rows
// (accounting for stranded budget / reconciling total spend), so this is scoped to the
// breakdown table only.
export function isEndedWithNoSpend(
  campaign: Pick<GAdsPacingCampaign, 'campaignServingStatus' | 'spendMtd'>,
): boolean {
  return isCampaignEnded(campaign) && campaign.spendMtd <= 0;
}

// The backend writes status_reason as lowercase snake_case tokens (Campaign Budget Status
// sheet); parseBudgetStatus passes them through raw, so they'd otherwise render as-is in the
// amber "Running at the account level" banner. `paused` and `no_active_campaigns` arrive with
// the B2 log-column change — `no_active_campaigns` is also the signal backlog #6 (grey out
// connected accounts with no spend) needs, so it is wired once here.
export const STATUS_REASON_LABELS: Record<string, string> = {
  good: 'Campaign-level pacing is running as configured.',
  not_managed: 'No campaign budgets set — pacing runs at the account level.',
  incomplete: 'Not every active campaign has a budget — pacing runs at the account level until all of them do.',
  shared_budget: 'A targeted campaign is on a shared budget — pacing runs at the account level.',
  drift: 'The saved budgets no longer match the campaigns on this account — re-save the allocation.',
  sum_overshoot: 'The campaign budgets add up to more than the account budget — pacing runs at the account level.',
  blocked_by_sibling: 'Another campaign on this account is blocking campaign-level pacing.',
  paused: 'This campaign is paused — its budget is held and is not steering.',
  no_active_campaigns: 'Every campaign on this account is paused — nothing is steering right now.',
};

// Unknown values pass through UNCHANGED: the account rollup in google-sheets.ts writes full
// English sentences of its own, and an unmapped future backend token should degrade to raw
// rather than to blank.
export function statusReasonLabel(raw: string): string {
  if (!raw) return '';
  return STATUS_REASON_LABELS[raw.trim().toLowerCase()] ?? raw;
}

// An account reads as "Paused" only when it has campaigns and every one is paused
// (paused_by_agent from the Campaign Budget Status sheet). A partially-paused account keeps
// pacing on its live campaigns and retains its normal status.
export function isAccountPaused(record: Pick<GAdsPacingRecord, 'campaigns'>): boolean {
  return record.campaigns.length > 0 && record.campaigns.every((c) => c.paused);
}

// Every campaign is currently PAUSED in Google Ads (campaign_status), i.e. the agent hit the
// monthly cap and switched everything off. Distinct from isAccountPaused, which keys on the
// paused_by_agent flag (Campaign Budget Status) for the dedicated Paused-practices view. This
// one keys on campaign_status so it lines up exactly with the breakdown filter — an empty
// visible campaign list always coincides with this being true — and drives the client status.
export function allCampaignsPaused(record: Pick<GAdsPacingRecord, 'campaigns'>): boolean {
  return record.campaigns.length > 0 && record.campaigns.every((c) => !isCampaignEnabled(c));
}

// Dedicated paused-view snapshots carry the pause event at account level because paused
// campaigns can disappear from later pacing runs. Normal rows fall back to deriving the date
// from their fully-paused campaign set.
export function accountPausedDate(
  record: Pick<GAdsPacingRecord, 'campaigns' | 'pausedDate'>,
): string {
  if (record.pausedDate) return record.pausedDate;
  if (!isAccountPaused(record)) return '';

  return record.campaigns.reduce((latest, campaign) => {
    if (!campaign.pausedDate) return latest;
    if (!latest) return campaign.pausedDate;

    const campaignTime = new Date(campaign.pausedDate).getTime();
    const latestTime = new Date(latest).getTime();
    if (Number.isNaN(campaignTime)) return latest;
    if (Number.isNaN(latestTime)) return campaign.pausedDate;
    return campaignTime > latestTime ? campaign.pausedDate : latest;
  }, '');
}

function calendarMonth(dateValue: string): { year: number; month: number } | null {
  const trimmed = dateValue.trim();
  const yearFirst = trimmed.match(/^(\d{4})-(\d{1,2})-\d{1,2}/);
  if (yearFirst) {
    return { year: Number(yearFirst[1]), month: Number(yearFirst[2]) - 1 };
  }

  const monthFirst = trimmed.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})/);
  if (monthFirst) {
    return { year: Number(monthFirst[2]), month: Number(monthFirst[1]) - 1 };
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime())
    ? null
    : { year: parsed.getFullYear(), month: parsed.getMonth() };
}

function calendarDateKey(dateValue: string): string | null {
  const trimmed = dateValue.trim();
  const yearFirst = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yearFirst) {
    return `${yearFirst[1]}-${yearFirst[2].padStart(2, '0')}-${yearFirst[3].padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
}

// A pause is a dated event, not a current-state override. Only the historical row whose run date
// matches an account pause event may display the Paused status.
export function isPausedOnRunDate(
  record: Pick<GAdsPacingRecord, 'runDate' | 'pauseDates'>,
): boolean {
  const runDate = calendarDateKey(record.runDate);
  return runDate !== null
    && (record.pauseDates ?? []).some((pausedDate) => calendarDateKey(pausedDate) === runDate);
}

interface CampaignPauseStatus {
  campaignId: string;
  googleAdsId: string;
  paused: boolean;
  pausedDate: string;
}

// Produce one display snapshot per Google Ads account with a campaign pause recorded during the
// current calendar month. Campaign Budget Status is the membership source of truth: paused
// campaigns often disappear from later pacing runs, so the latest run cannot reliably reconstruct
// the month's pause events. Pacing records supply only the latest display details for each account.
export function currentMonthPausedGAdsPacing(
  records: GAdsPacingRecord[],
  statuses: CampaignPauseStatus[],
  now = new Date(),
): GAdsPacingRecord[] {
  const latestByAccount = new Map<string, GAdsPacingRecord>();
  const accountByCampaign = new Map<string, string>();

  records.forEach((record) => {
    record.campaigns.forEach((campaign) => {
      if (campaign.campaignId) accountByCampaign.set(campaign.campaignId, record.googleAdsId);
    });

    const existing = latestByAccount.get(record.googleAdsId);
    if (!existing) {
      latestByAccount.set(record.googleAdsId, record);
      return;
    }

    const recordTime = new Date(record.runDate).getTime();
    const existingTime = new Date(existing.runDate).getTime();
    if (
      (!Number.isNaN(recordTime) && Number.isNaN(existingTime))
      || (!Number.isNaN(recordTime) && recordTime > existingTime)
    ) {
      latestByAccount.set(record.googleAdsId, record);
    }
  });

  const pausedDateByAccount = new Map<string, string>();
  statuses.forEach((status) => {
    if (!status.paused || !status.pausedDate) return;
    const pausedMonth = calendarMonth(status.pausedDate);
    if (
      pausedMonth?.year !== now.getFullYear()
      || pausedMonth.month !== now.getMonth()
    ) return;

    const googleAdsId = status.googleAdsId || accountByCampaign.get(status.campaignId) || '';
    if (!googleAdsId) return;

    const existingDate = pausedDateByAccount.get(googleAdsId);
    if (
      !existingDate
      || new Date(status.pausedDate).getTime() > new Date(existingDate).getTime()
    ) {
      pausedDateByAccount.set(googleAdsId, status.pausedDate);
    }
  });

  return Array.from(pausedDateByAccount.entries()).flatMap(([googleAdsId, pausedDate]) => {
    const latest = latestByAccount.get(googleAdsId);
    return latest ? [{ ...latest, pausedDate }] : [];
  });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The calendar month immediately before `now`, rolling the year back in January.
export function previousCalendarMonth(now = new Date()): { year: number; month: number } {
  const year = now.getFullYear();
  const month = now.getMonth();
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

// "July 2026" — the period label for the Last month view's chip and empty state.
export function previousMonthLabel(now = new Date()): string {
  const { year, month } = previousCalendarMonth(now);
  return `${MONTH_NAMES[month]} ${year}`;
}

// "2026-07" — sortable period marker for the Last month CSV filename.
export function previousMonthSlug(now = new Date()): string {
  const { year, month } = previousCalendarMonth(now);
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// Label a run date's OWN month, e.g. '2026-07-31' -> 'July 2026'. Preferred over
// previousMonthLabel() wherever a row is in hand: the row came from the server, so a
// data-derived label can't disagree with the rows on screen the way a clock-derived one can
// when the server and browser sit on opposite sides of a month boundary.
export function monthLabelFromDate(dateValue: string): string {
  const m = calendarMonth(dateValue ?? '');
  return m ? `${MONTH_NAMES[m.month]} ${m.year}` : '';
}

// One closing snapshot per Google Ads account: the newest pacing run whose runDate falls in the
// previous calendar month. The sheet has no month-close column — every spend field is *_mtd as
// of that run — so an account's last in-month run IS its closing spend, and that row's own
// runDate is the honest "as of" date. Unlike currentMonthPausedGAdsPacing, which must synthesize
// pausedDate because the pause event lives in a different sheet, nothing is added here.
export function lastMonthGAdsPacing(
  records: GAdsPacingRecord[],
  now = new Date(),
): GAdsPacingRecord[] {
  const { year, month } = previousCalendarMonth(now);
  const newestByAccount = new Map<string, { record: GAdsPacingRecord; key: string }>();

  records.forEach((record) => {
    const recordMonth = calendarMonth(record.runDate);
    if (!recordMonth || recordMonth.year !== year || recordMonth.month !== month) return;

    // Lexical YYYY-MM-DD compare, NOT new Date().getTime(): '2026-07-31' parses as UTC midnight
    // while '7/31/2026' parses as LOCAL midnight, so a timestamp compare can invert two rows on
    // adjacent dates when the sheet's date format varies. calendarDateKey normalizes both.
    const key = calendarDateKey(record.runDate);
    if (!key) return;

    const existing = newestByAccount.get(record.googleAdsId);
    if (!existing || key > existing.key) {
      newestByAccount.set(record.googleAdsId, { record, key });
    }
  });

  return Array.from(newestByAccount.values()).map(({ record }) => ({ ...record }));
}

// Single source of truth for a historical pacing row's client status. A matching pause event
// overrides only that exact run date; all other rows retain their own daily status.
// Precedence: matching pause date → Paused, month-start grace → null ("New"), then the row's
// display_status column, then the variance-derived fallback.
export function resolveDisplayStatus(
  record: Pick<
    GAdsPacingRecord,
    'campaigns' | 'displayStatus' | 'variancePercent' | 'runDate' | 'pauseDates'
  >,
): DisplayStatus | 'Paused' | 'Paused (cap reached)' | null {
  // A live all-paused account has no pacing signal to show and would otherwise resolve to a
  // healthy tier over an empty campaign list — this override takes precedence over everything.
  if (allCampaignsPaused(record)) return 'Paused (cap reached)';
  if (isPausedOnRunDate(record)) return 'Paused';
  if (shouldShowGraceBanner(record)) return null;
  return normalizeDisplayStatus(record.displayStatus) ?? displayStatusFromVariance(record.variancePercent);
}

// Resolve a historical row straight to its date-specific Paused/New/tier pill style.
export function displayStatusPill(
  record: Pick<
    GAdsPacingRecord,
    'campaigns' | 'displayStatus' | 'variancePercent' | 'runDate' | 'pauseDates'
  >,
): { label: string; pill: string; text: string } {
  const tier = resolveDisplayStatus(record);
  if (tier === 'Paused (cap reached)') return DISPLAY_STATUS_CAP_PAUSED_STYLE;
  if (tier === 'Paused') return DISPLAY_STATUS_PAUSED_STYLE;
  if (tier === null) return DISPLAY_STATUS_NEW_STYLE;
  return DISPLAY_STATUS_STYLES[tier];
}

// Stable ordering for sorting the historical Status column. Grace/New and Paused sort last.
export function displayStatusRank(
  record: Pick<
    GAdsPacingRecord,
    'campaigns' | 'displayStatus' | 'variancePercent' | 'runDate' | 'pauseDates'
  >,
): number {
  const tier = resolveDisplayStatus(record);
  if (tier === 'Paused (cap reached)') return DISPLAY_STATUS_OPTIONS.length + 2;
  if (tier === 'Paused') return DISPLAY_STATUS_OPTIONS.length + 1;
  if (tier === null) return DISPLAY_STATUS_OPTIONS.length; // New → last
  return DISPLAY_STATUS_OPTIONS.indexOf(tier);
}

export const RECOMMENDATION_LABELS: Record<
  RecommendationType,
  { label: string; pill: string; text: string }
> = {
  PAUSE_CAMPAIGN: {
    label: 'Pause',
    pill: 'bg-rose-50 ring-1 ring-rose-200',
    text: 'text-rose-700',
  },
  BUDGET_DECREASE_APPROVAL: {
    label: 'Decrease (approval)',
    pill: 'bg-amber-50 ring-1 ring-amber-200',
    text: 'text-amber-700',
  },
  BUDGET_INCREASE_APPROVAL: {
    label: 'Increase (approval)',
    pill: 'bg-amber-50 ring-1 ring-amber-200',
    text: 'text-amber-700',
  },
  BUDGET_DECREASE: {
    label: 'Decrease (auto)',
    pill: 'bg-sky-50 ring-1 ring-sky-200',
    text: 'text-sky-700',
  },
  BUDGET_INCREASE: {
    label: 'Increase (auto)',
    pill: 'bg-sky-50 ring-1 ring-sky-200',
    text: 'text-sky-700',
  },
  DOW_ADJUSTMENT: {
    label: 'Day-of-week',
    pill: 'bg-teal-50 ring-1 ring-teal-200',
    text: 'text-teal-700',
  },
  NO_CHANGE: {
    label: 'No change',
    pill: 'bg-slate-100 ring-1 ring-slate-200',
    text: 'text-slate-600',
  },
};

// === Source of truth: what actually happens to the live budget ===
// The pacing recommendation_type/skip_reason describe the engine's decision against a
// de-normalized baseline and can contradict the live budget (a "decrease" that raises
// the budget, a "no change" skip that applies a real cut). The number actually pushed
// to Google Ads is final_daily_budget, so the UI must lead with current -> final.
// recommendation_type is trusted ONLY for whether a row needs approval, never for direction.
export type BudgetMode = 'auto' | 'approval' | 'pause';

export interface CampaignBudgetView {
  hasFinal: boolean;     // false on pre-go-live rows (no final_daily_budget) -> legacy render
  mode: BudgetMode;
  current: number;
  target: number;        // finalDailyBudget when present, else proposedDaily
  deltaPct: number;      // (target - current) / current * 100
  direction: 'up' | 'down' | 'flat';
  // What WOULD be pushed if a pending approval/pause row were approved. On those rows the
  // workflow hasn't applied anything yet, so final_daily_budget still equals current — which
  // would collapse target/deltaPct/direction to "flat" and hide the very change being approved.
  // These two carry the pre-approval intent so the UI can show it. NOTE: direction/deltaPct
  // must keep meaning *actually applied* movement — hasAppliedChange() depends on it.
  ifApprovedTarget: number;   // proposedDaily
  ifApprovedDeltaPct: number; // (proposedDaily - current) / current * 100
}

export function campaignBudgetView(
  campaign: Pick<
    GAdsPacingCampaign,
    'recommendationType' | 'currentDaily' | 'proposedDaily' | 'finalDailyBudget'
  >,
): CampaignBudgetView {
  const mode: BudgetMode =
    campaign.recommendationType === 'PAUSE_CAMPAIGN'
      ? 'pause'
      : campaign.recommendationType === 'BUDGET_DECREASE_APPROVAL' ||
          campaign.recommendationType === 'BUDGET_INCREASE_APPROVAL'
        ? 'approval'
        : 'auto';

  const hasFinal = campaign.finalDailyBudget !== null;
  const current = campaign.currentDaily;
  const target = campaign.finalDailyBudget ?? campaign.proposedDaily;
  const delta = target - current;
  const deltaPct = current > 0 ? (delta / current) * 100 : target > 0 ? 100 : 0;
  // "flat" when the move is negligible in both absolute and relative terms.
  const direction: CampaignBudgetView['direction'] =
    Math.abs(delta) < 1 && Math.abs(deltaPct) < 1 ? 'flat' : delta > 0 ? 'up' : 'down';

  // Same divide-by-zero guard as deltaPct, against the pre-approval proposal.
  const ifApprovedTarget = campaign.proposedDaily;
  const ifApprovedDelta = ifApprovedTarget - current;
  const ifApprovedDeltaPct =
    current > 0 ? (ifApprovedDelta / current) * 100 : ifApprovedTarget > 0 ? 100 : 0;

  return {
    hasFinal,
    mode,
    current,
    target,
    deltaPct,
    direction,
    ifApprovedTarget,
    ifApprovedDeltaPct,
  };
}

// Headline status pill — derived from the actual movement, not the raw label.
// Approval/pause rows are ALSO approval-aware: `recommendation_type` records what the engine
// decided on that run and is never rewritten, so once the operator approves (and the workflow
// actions the budget immediately) the row must stop advertising "pending". The account-level
// approval_status is the only signal for that.
export function appliedStatusLabel(
  view: CampaignBudgetView,
  approvalStatus: ApprovalStatus = '',
): string {
  if (view.mode === 'pause' || view.mode === 'approval') {
    if (approvalStatus === 'Approved') return 'Approved';
    if (approvalStatus === 'Rejected') return 'Rejected';
    return view.mode === 'pause' ? 'Pause (pending)' : 'Needs approval';
  }
  if (view.direction === 'flat') return 'No change';
  return 'Auto-applied';
}

export interface ActionDotCounts {
  red: number;
  amber: number;
  blue: number;
  green: number;
}

// Movement-based: red = pending pause, amber = pending approval, blue = an auto change
// that actually moves the live budget, green = an approval/pause the operator already actioned.
// Flat/no-change rows contribute nothing, and so do rejected rows (nothing outstanding, nothing
// applied). Approval/pause rows key off the account-level approval_status — see appliedStatusLabel.
export function actionDotCounts(
  campaigns: GAdsPacingCampaign[],
  approvalStatus: ApprovalStatus = '',
): ActionDotCounts {
  const counts: ActionDotCounts = { red: 0, amber: 0, blue: 0, green: 0 };
  for (const c of campaigns) {
    const view = campaignBudgetView(c);
    if (view.mode === 'pause' || view.mode === 'approval') {
      if (approvalStatus === 'Approved') counts.green += 1;
      else if (approvalStatus === 'Rejected') continue;
      else if (view.mode === 'pause') counts.red += 1;
      else counts.amber += 1;
    } else if (view.direction !== 'flat') counts.blue += 1;
  }
  return counts;
}

export function needsApproval(record: GAdsPacingRecord): boolean {
  return record.campaigns.some(
    (c) =>
      c.recommendationType === 'BUDGET_INCREASE_APPROVAL' ||
      c.recommendationType === 'BUDGET_DECREASE_APPROVAL' ||
      c.recommendationType === 'PAUSE_CAMPAIGN',
  );
}

// True when at least one campaign actually moves the live budget — used to decide
// whether an on-track account row should still be highlighted rather than dimmed.
export function hasAppliedChange(record: Pick<GAdsPacingRecord, 'campaigns'>): boolean {
  return record.campaigns.some((c) => campaignBudgetView(c).direction !== 'flat');
}

// Compact MM/DD for the G Ads Pacing date column. Pacing is reviewed daily and
// only ever spans a few days at a time, so the year is omitted to save column width.
export function fmtCompactDate(dateStr: string): string {
  if (!dateStr) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (m) return `${m[2]}/${m[3]}`;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

export function fmtSignedPercent(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n)}%`;
}

// Share of the month's total budget consumed as of this row's run date. Returns '' rather
// than a number so the caller can omit the bracket entirely when the budget is missing or
// zero — mirroring the Number.isFinite guards on fmtMoney/fmtSignedPercent, which degrade
// to a dash instead of rendering NaN. No live account has a $0 budget today, but mock data
// and future months can, and "[Infinity%]" would be worse than nothing.
export function fmtSpendShareOfBudget(spend: number, monthlyBudget: number): string {
  if (!Number.isFinite(spend) || !Number.isFinite(monthlyBudget) || monthlyBudget <= 0) return '';
  return `${Math.round((spend / monthlyBudget) * 100)}%`;
}

export function variancePercentTone(n: number): string {
  if (!Number.isFinite(n)) return 'text-slate-500';
  if (n >= 10) return 'text-rose-600';
  if (n >= 5) return 'text-amber-600';
  if (n <= -10) return 'text-amber-600';
  return 'text-slate-700';
}

export function changeTone(changePercent: number): string {
  if (!Number.isFinite(changePercent)) return 'text-slate-500';
  if (changePercent <= -50) return 'text-rose-600';
  if (changePercent < 0) return 'text-amber-600';
  if (changePercent > 0) return 'text-emerald-600';
  return 'text-slate-700';
}

// Classification badge styles. The "chronic" variant is a swap-in for DEMAND_LIMITED
// when chronicDemandLimited is true — show a single badge, not two stacked.
export const CLASSIFICATION_STYLES: Record<
  'BUDGET_LIMITED' | 'DEMAND_LIMITED' | 'CHRONIC',
  { label: string; pill: string; text: string }
> = {
  BUDGET_LIMITED: {
    label: 'budget-limited',
    pill: 'bg-sky-50 ring-1 ring-sky-200',
    text: 'text-sky-700',
  },
  DEMAND_LIMITED: {
    label: 'demand-limited',
    pill: 'bg-slate-100 ring-1 ring-slate-200',
    text: 'text-slate-600',
  },
  CHRONIC: {
    label: 'chronic',
    pill: 'bg-orange-50 ring-1 ring-orange-200',
    text: 'text-orange-700',
  },
};

export function classificationBadge(
  campaign: Pick<GAdsPacingCampaign, 'classification' | 'chronicDemandLimited'>,
): { label: string; pill: string; text: string } | null {
  if (campaign.classification === 'BUDGET_LIMITED') return CLASSIFICATION_STYLES.BUDGET_LIMITED;
  if (campaign.classification === 'DEMAND_LIMITED') {
    return campaign.chronicDemandLimited
      ? CLASSIFICATION_STYLES.CHRONIC
      : CLASSIFICATION_STYLES.DEMAND_LIMITED;
  }
  return null;
}

// Friendly skip-reason labels shown as italic subtext under NO_CHANGE recommendations.
export const SKIP_REASON_LABELS: Record<Exclude<SkipReason, ''>, string> = {
  ACCOUNT_ON_TRACK: 'Account pacing on track',
  DEMAND_SIDE_ISSUE: 'Demand-side issue',
  DEMAND_LIMITED_NO_CHANGE: 'Not budget-constrained',
  BUDGET_LIMITED_BUT_CHANGE_TOO_SMALL: 'Change below threshold',
  CHRONIC_DEMAND_LIMITED_DONOR: 'Chronic underperformer — donor',
  CHRONIC_BUT_NO_BUDGET_LIMITED_SIBLING: 'No budget-limited sibling to fund',
  NO_MEANINGFUL_CHANGE: 'No meaningful change',
  MONTH_START_GRACE: 'Month start — monitoring only',
  BUDGET_LIMITED_NO_DECREASE: 'Campaign is budget-capped',
  ENDED_EXPERIMENT: 'Campaign has ended',
};

// Color band for the 7-day utilization bar.
//   <50%  → orange (low utilization, not pushing budget)
//   50-94 → green  (healthy)
//   ≥95   → blue   (at or over capacity)
export function utilizationTone(pct: number): {
  bar: string;   // background of the filled portion
  track: string; // background of the empty portion
  text: string;
} {
  if (!Number.isFinite(pct)) return { bar: 'bg-slate-300', track: 'bg-slate-100', text: 'text-slate-500' };
  if (pct >= 95) return { bar: 'bg-sky-500', track: 'bg-sky-100', text: 'text-sky-700' };
  if (pct >= 50) return { bar: 'bg-emerald-500', track: 'bg-emerald-100', text: 'text-emerald-700' };
  return { bar: 'bg-orange-400', track: 'bg-orange-100', text: 'text-orange-700' };
}

// "1 of 3 campaigns budget-limited" — only meaningful when the account is mixed.
export function budgetLimitedCount(record: Pick<GAdsPacingRecord, 'campaigns'>): {
  limited: number;
  total: number;
  mixed: boolean;
} {
  const total = record.campaigns.length;
  const limited = record.campaigns.filter((c) => c.classification === 'BUDGET_LIMITED').length;
  const demand = record.campaigns.filter((c) => c.classification === 'DEMAND_LIMITED').length;
  return { limited, total, mixed: limited > 0 && demand > 0 };
}

// Banner predicates for the detail panel.
export function shouldShowGraceBanner(record: Pick<GAdsPacingRecord, 'campaigns'>): boolean {
  if (record.campaigns.length === 0) return false;
  return record.campaigns.every((c) => c.skipReason === 'MONTH_START_GRACE');
}

export function shouldShowInvestigateBanner(
  record: Pick<GAdsPacingRecord, 'severity' | 'allDemandLimited'>,
): boolean {
  return record.severity === 'Investigate' && record.allDemandLimited;
}

export function shouldShowGenericInvestigateBanner(
  record: Pick<GAdsPacingRecord, 'severity' | 'allDemandLimited'>,
): boolean {
  return record.severity === 'Investigate' && !record.allDemandLimited;
}

// Conflict warning fires only when the recommendation actually does something
// against the account direction. NO_CHANGE rows and skipped rows suppress it.
export function shouldShowConflictIcon(
  campaign: Pick<GAdsPacingCampaign, 'conflictsWithPacing' | 'recommendationType' | 'skipReason'>,
): boolean {
  if (!campaign.conflictsWithPacing) return false;
  if (campaign.recommendationType === 'NO_CHANGE' || campaign.recommendationType === '') return false;
  if (campaign.skipReason) return false;
  return true;
}

// Suppress IS-lost noise: only show on budget-limited campaigns with at least 1% lost.
export function shouldShowIsLost(
  campaign: Pick<GAdsPacingCampaign, 'classification' | 'searchBudgetLostIs'>,
): boolean {
  if (campaign.classification !== 'BUDGET_LIMITED') return false;
  if (campaign.searchBudgetLostIs === null) return false;
  return campaign.searchBudgetLostIs >= 1;
}

// Util bar hides on grace + when we have no historical data.
export function shouldShowUtilBar(
  campaign: Pick<GAdsPacingCampaign, 'sevenDayAvgUtilization' | 'skipReason'>,
): boolean {
  if (campaign.skipReason === 'MONTH_START_GRACE') return false;
  return campaign.sevenDayAvgUtilization !== null;
}

// === Day-of-week shaping (account-level) ===
// Friendly labels for the pipe-delimited dow_flags string.
export const DOW_FLAG_LABELS: Record<string, string> = {
  CATCH_UP_HALVED: 'catch-up: shaping halved',
  MONTH_END_SUPPRESSED: 'suppressed near month-end',
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dowWeekdayLabel(runDate: string): string {
  if (!runDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(runDate.trim());
  // Parse as a local date to avoid UTC off-by-one on the weekday.
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(runDate);
  if (Number.isNaN(d.getTime())) return '';
  return WEEKDAY_NAMES[d.getDay()];
}

// Signed percent lift from a multiplier, e.g. 1.2 -> "+20%", 0.74 -> "-26%".
export function dowPercentLabel(multiplier: number): string {
  return fmtSignedPercent((multiplier - 1) * 100);
}

export function dowFlagsList(flags: string): string[] {
  return (flags || '')
    .split('|')
    .map((f) => f.trim())
    .filter(Boolean);
}

// The DOW banner/chip only shows once shaping is actually moving budgets. A null or
// 1.0 multiplier (pre-go-live rows, or the known Edit-Fields pass-through bug) is inert.
export function shouldShowDowBanner(
  record: Pick<GAdsPacingRecord, 'dowMultiplier'>,
): boolean {
  return record.dowMultiplier !== null && record.dowMultiplier !== 1;
}

// Use just the unused Classification type to keep it exported and avoid lint dead-import warnings.
export type { Classification };

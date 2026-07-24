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

// The five tiers, ordered for the filter dropdown (worst-over → worst-under).
export const DISPLAY_STATUS_OPTIONS: DisplayStatus[] = [
  'Significantly Overpacing',
  'Overpacing',
  'On Track',
  'Underpacing',
  'Significantly Underpacing',
];

// Selectable Status-filter values. 'Paused' is a resolver override (not a variance tier), so it
// lives alongside the five tiers here rather than in DISPLAY_STATUS_OPTIONS.
export type StatusFilter = DisplayStatus | 'Paused';
export const STATUS_FILTER_OPTIONS: StatusFilter[] = [...DISPLAY_STATUS_OPTIONS, 'Paused'];

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

// An account reads as "Paused" only when it has campaigns and every one is paused
// (paused_by_agent from the Campaign Budget Status sheet). A partially-paused account keeps
// pacing on its live campaigns and retains its normal status.
export function isAccountPaused(record: Pick<GAdsPacingRecord, 'campaigns'>): boolean {
  return record.campaigns.length > 0 && record.campaigns.every((c) => c.paused);
}

// Single source of truth for the visible client status. Precedence:
//   0. every campaign paused → 'Paused' (overrides everything — no pacing signal applies)
//   1. month-start grace → null (renders as the neutral "New" pill)
//   2. the sheet's display_status column (authoritative when present)
//   3. fallback: tier derived from month-to-date variance %
export function resolveDisplayStatus(
  record: Pick<GAdsPacingRecord, 'campaigns' | 'displayStatus' | 'variancePercent'>,
): DisplayStatus | 'Paused' | null {
  if (isAccountPaused(record)) return 'Paused';
  if (shouldShowGraceBanner(record)) return null;
  return normalizeDisplayStatus(record.displayStatus) ?? displayStatusFromVariance(record.variancePercent);
}

// Resolve straight to the pill style, collapsing the Paused / New / tier branches so the
// render sites don't each re-implement the mapping.
export function displayStatusPill(
  record: Pick<GAdsPacingRecord, 'campaigns' | 'displayStatus' | 'variancePercent'>,
): { label: string; pill: string; text: string } {
  const tier = resolveDisplayStatus(record);
  if (tier === 'Paused') return DISPLAY_STATUS_PAUSED_STYLE;
  if (tier === null) return DISPLAY_STATUS_NEW_STYLE;
  return DISPLAY_STATUS_STYLES[tier];
}

// Stable ordering for sorting the Status column. Grace/New and Paused sort last.
export function displayStatusRank(
  record: Pick<GAdsPacingRecord, 'campaigns' | 'displayStatus' | 'variancePercent'>,
): number {
  const tier = resolveDisplayStatus(record);
  if (tier === 'Paused') return DISPLAY_STATUS_OPTIONS.length + 1; // Paused → after New
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

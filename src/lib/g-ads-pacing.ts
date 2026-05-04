import type {
  Classification,
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
  NO_CHANGE: {
    label: 'No change',
    pill: 'bg-slate-100 ring-1 ring-slate-200',
    text: 'text-slate-600',
  },
};

export interface ActionDotCounts {
  red: number;
  amber: number;
  blue: number;
}

export function actionDotCounts(
  campaigns: GAdsPacingCampaign[],
): ActionDotCounts {
  const counts: ActionDotCounts = { red: 0, amber: 0, blue: 0 };
  for (const c of campaigns) {
    switch (c.recommendationType) {
      case 'PAUSE_CAMPAIGN':
        counts.red += 1;
        break;
      case 'BUDGET_DECREASE_APPROVAL':
      case 'BUDGET_INCREASE_APPROVAL':
        counts.amber += 1;
        break;
      case 'BUDGET_DECREASE':
      case 'BUDGET_INCREASE':
        counts.blue += 1;
        break;
      default:
        break;
    }
  }
  return counts;
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
  BUDGET_LIMITED_NO_DECREASE: 'Campaign is budget-capped — not reducing',
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

// Use just the unused Classification type to keep it exported and avoid lint dead-import warnings.
export type { Classification };

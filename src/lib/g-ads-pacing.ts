import type {
  GAdsPacingCampaign,
  RecommendationType,
  Severity,
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

import type { Confidence, KwBuildoutKeyword, KwBuildoutRecord } from '@/types';

// Generic date/money formatters are shared with the pacing tab.
export { fmtCompactDate, fmtMoney } from './g-ads-pacing';

// Confidence badge styling. Mirrors the pill/text convention used by SEVERITY_STYLES.
export const CONFIDENCE_STYLES: Record<
  Exclude<Confidence, ''>,
  { label: string; pill: string; text: string; dot: string }
> = {
  high: {
    label: 'high',
    pill: 'bg-emerald-50 ring-1 ring-emerald-200',
    text: 'text-emerald-700',
    dot: '#059669',
  },
  medium: {
    label: 'medium',
    pill: 'bg-amber-50 ring-1 ring-amber-200',
    text: 'text-amber-700',
    dot: '#d97706',
  },
  low: {
    label: 'low',
    pill: 'bg-slate-100 ring-1 ring-slate-200',
    text: 'text-slate-600',
    dot: '#94a3b8',
  },
};

export function confidenceBadge(
  c: Confidence,
): { label: string; pill: string; text: string; dot: string } | null {
  if (c === '') return null;
  return CONFIDENCE_STYLES[c];
}

// flags is a free-text cell; split on comma (the agent emits e.g. "empty-ad-group-escalate").
export function flagsList(flags: string): string[] {
  return (flags || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
}

export interface ReviewCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export function reviewCounts(record: Pick<KwBuildoutRecord, 'keywords'>): ReviewCounts {
  const counts: ReviewCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const k of record.keywords) {
    if (k.approval === 'Approved') counts.approved += 1;
    else if (k.approval === 'Rejected') counts.rejected += 1;
    else counts.pending += 1;
  }
  return counts;
}

export interface ConfidenceMix {
  high: number;
  medium: number;
  low: number;
}

export function confidenceMix(record: Pick<KwBuildoutRecord, 'keywords'>): ConfidenceMix {
  const mix: ConfidenceMix = { high: 0, medium: 0, low: 0 };
  for (const k of record.keywords) {
    if (k.confidence === 'high') mix.high += 1;
    else if (k.confidence === 'medium') mix.medium += 1;
    else if (k.confidence === 'low') mix.low += 1;
  }
  return mix;
}

export function pendingKeywordCount(record: Pick<KwBuildoutRecord, 'keywords'>): number {
  return record.keywords.filter((k) => k.approval === '').length;
}

// Total conversions across the batch — the headline evidence number in the table row.
export function totalConversions(record: Pick<KwBuildoutRecord, 'keywords'>): number {
  return record.keywords.reduce((sum, k) => sum + (Number.isFinite(k.conversions) ? k.conversions : 0), 0);
}

// Stable identity for a single proposed keyword within a batch (checkbox key + write-back match).
export function keywordKey(k: Pick<KwBuildoutKeyword, 'campaignId' | 'adGroupId' | 'proposedKeyword'>): string {
  return `${k.campaignId}|${k.adGroupId}|${k.proposedKeyword}`;
}

'use client';

import type { CSSProperties } from 'react';
import type { GAdsPacingRecord } from '@/types';
import {
  displayStatusPill,
  fmtCompactDate,
  fmtMoney,
  fmtSpendShareOfBudget,
  isCampaignEnabled,
  isCampaignEnded,
} from '@/lib/g-ads-pacing';

interface GAdsPacingLastMonthPanelProps {
  record: GAdsPacingRecord;
  colSpan: number;
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 6,
};

const cardStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  padding: '14px 16px',
};

const sectionHeadingStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#475569',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

/**
 * Closed-month spend breakdown for the Last month view.
 *
 * A separate component from GAdsPacingDetailPanel rather than a flag on it. Two reasons:
 *
 * 1. Safety. The daily panel's feedback form is gated only on grace / accountOnTrack /
 *    needsApproval — NOT on the stale-roster check that guards the budget allocation card. Reusing
 *    it here would let an operator POST a closed month's run_date to the Make webhook, writing an
 *    approval onto every row of that month. Omitting the form entirely makes that impossible
 *    rather than relying on a guard someone could later loosen.
 * 2. Relevance. Recommendations, classifications, utilization bars, conflict icons and day-of-week
 *    shaping all describe a decision made on one specific day. On a closed month they are noise at
 *    best and actionable-looking at worst.
 */
export function GAdsPacingLastMonthPanel({ record, colSpan }: GAdsPacingLastMonthPanelProps) {
  const status = displayStatusPill(record);

  // Every campaign, including non-ENABLED ones — the opposite of the daily panel, which filters to
  // isCampaignEnabled. A paused campaign's spend still counted toward the account total, so hiding
  // it here would make the breakdown fail to reconcile with the account figure this view exists to
  // explain.
  const campaigns = [...record.campaigns].sort((a, b) => b.spendMtd - a.spendMtd);
  const campaignTotal = campaigns.reduce((sum, c) => sum + c.spendMtd, 0);
  const anyAllocated = campaigns.some((c) => c.budgetDollars !== null);
  // Campaigns created or removed mid-month leave a genuine gap against the account-level total,
  // which is read from its own field and never summed. Say so instead of implying they match.
  const reconciles = Math.abs(campaignTotal - record.spendMtd) <= 1;

  const share = fmtSpendShareOfBudget(record.spendMtd, record.monthlyBudget);

  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: 0,
          background: '#fafafe',
          borderBottom: '1px solid #e8e5f0',
        }}
      >
        <div style={{ padding: '14px 24px 18px 52px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header — the account's closing position, with the run date it was read from */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span style={{ ...labelStyle, marginBottom: 0 }}>Status at close</span>
              <span
                className={`${status.pill} ${status.text}`}
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {status.label}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Closing spend as of{' '}
              <span className="font-semibold text-slate-700">{fmtCompactDate(record.runDate)}</span>
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{fmtMoney(record.spendMtd)}</span>
              {' of '}
              <span className="font-semibold text-slate-700">{fmtMoney(record.monthlyBudget)}</span>
              {' budget'}
              {share && <span> ({share})</span>}
            </div>
          </div>

          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-2">
              <div style={sectionHeadingStyle}>Campaign Spend</div>
              {!reconciles && (
                <div className="text-xs text-slate-500">
                  Campaign spend sums to {fmtMoney(campaignTotal)} of the account&apos;s{' '}
                  {fmtMoney(record.spendMtd)}
                </div>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Campaign</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Spend</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>% of account</th>
                    {anyAllocated && (
                      <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Allocated</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 && (
                    <tr>
                      <td
                        colSpan={anyAllocated ? 4 : 3}
                        style={{ padding: '12px 8px', color: '#64748b', fontStyle: 'italic' }}
                      >
                        No campaigns recorded on this run.
                      </td>
                    </tr>
                  )}
                  {campaigns.map((c, i) => {
                    const pct = campaignTotal > 0
                      ? `${Math.round((c.spendMtd / campaignTotal) * 100)}%`
                      : '—';
                    return (
                      <tr key={c.campaignId || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>
                          <div className="flex items-center gap-1.5">
                            <span>{c.campaignName || '(unnamed)'}</span>
                            {isCampaignEnded(c) ? (
                              <span className="text-[11px] font-normal text-slate-400">ended</span>
                            ) : !isCampaignEnabled(c) ? (
                              <span className="text-[11px] font-normal text-slate-400">paused</span>
                            ) : null}
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                          {fmtMoney(c.spendMtd)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{pct}</td>
                        {anyAllocated && (
                          <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                            {c.budgetDollars !== null ? (
                              fmtMoney(c.budgetDollars)
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {campaigns.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>Total</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {fmtMoney(campaignTotal)}
                      </td>
                      <td style={{ padding: '8px' }} />
                      {anyAllocated && <td style={{ padding: '8px' }} />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

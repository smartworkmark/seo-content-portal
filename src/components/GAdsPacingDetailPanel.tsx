'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ApprovalStatus, GAdsPacingCampaign, GAdsPacingRecord } from '@/types';
import type { GAdsPacingFeedbackPayload } from '@/hooks/useContentData';
import {
  RECOMMENDATION_LABELS,
  SKIP_REASON_LABELS,
  budgetLimitedCount,
  changeTone,
  classificationBadge,
  fmtMoney,
  fmtSignedPercent,
  shouldShowConflictIcon,
  shouldShowGenericInvestigateBanner,
  shouldShowGraceBanner,
  shouldShowInvestigateBanner,
  shouldShowIsLost,
  shouldShowUtilBar,
  utilizationTone,
} from '@/lib/g-ads-pacing';

interface GAdsPacingDetailPanelProps {
  record: GAdsPacingRecord;
  colSpan: number;
  onSubmit: (record: GAdsPacingRecord, payload: GAdsPacingFeedbackPayload) => Promise<void>;
}

// Conflict warning icon. Renders the tooltip via portal because the campaign
// breakdown table sits inside three nested overflow ancestors (the table's
// horizontal scroller, the data-table's vertical scroller, and the rounded
// outer wrapper), all of which would clip an absolutely-positioned tooltip.
function ConflictIcon() {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  return (
    <>
      <span
        aria-label="Flagged: counter to account direction. For visibility — no action needed."
        className="text-amber-600 cursor-help"
        style={{ fontSize: 14, lineHeight: 1 }}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ left: r.left + r.width / 2, top: r.top - 6 });
        }}
        onMouseLeave={() => setPos(null)}
      >
        ⚠
      </span>
      {pos && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          className="rounded-md bg-slate-800 px-2.5 py-1.5 shadow-lg"
        >
          <div className="text-[11px] font-semibold text-white">Flagged: counter to account direction</div>
          <div className="text-[10px] text-slate-300">For visibility — no action needed</div>
        </div>,
        document.body,
      )}
    </>
  );
}

function UtilBar({ campaign }: { campaign: GAdsPacingCampaign }) {
  if (!shouldShowUtilBar(campaign)) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const pct = campaign.sevenDayAvgUtilization ?? 0;
  const tone = utilizationTone(pct);
  const fillPct = Math.max(0, Math.min(pct, 100));
  return (
    <div className="flex items-center gap-2">
      <div className={`relative h-1.5 w-20 rounded-full ${tone.track}`}>
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${tone.bar}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${tone.text}`}>{Math.round(pct)}%</span>
    </div>
  );
}

function Banner({
  tone,
  title,
  body,
}: {
  tone: 'violet' | 'slate' | 'amber';
  title: string;
  body?: string;
}) {
  const palette = {
    violet: 'bg-violet-50 ring-1 ring-violet-200 text-violet-900',
    slate: 'bg-slate-50 ring-1 ring-slate-200 text-slate-700',
    amber: 'bg-amber-50 ring-1 ring-amber-200 text-amber-900',
  }[tone];
  return (
    <div className={`rounded-lg px-4 py-3 ${palette}`}>
      <div className="text-sm font-semibold">{title}</div>
      {body && <div className="mt-1 text-xs leading-relaxed opacity-90">{body}</div>}
    </div>
  );
}

export function GAdsPacingDetailPanel({ record, colSpan, onSubmit }: GAdsPacingDetailPanelProps) {
  const [decision, setDecision] = useState<ApprovalStatus>(record.approvalStatus);
  const [reviewedBy, setReviewedBy] = useState(record.reviewedBy);
  const [notes, setNotes] = useState(record.notes);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = decision !== '' && reviewedBy.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(record, {
        approvalStatus: decision,
        reviewedBy: reviewedBy.trim(),
        notes: notes.trim(),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const showGrace = shouldShowGraceBanner(record);
  const showInvestigate = shouldShowInvestigateBanner(record);
  const showGenericInvestigate = shouldShowGenericInvestigateBanner(record);
  const mix = budgetLimitedCount(record);
  // Hide the feedback form when there's nothing actionable for Bill to approve.
  const showFeedbackForm = !showGrace && !record.accountOnTrack;

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
          {showGrace && (
            <Banner
              tone="slate"
              title="Month start — no actions taken."
              body="Day 1 data is insufficient for budget decisions. Monitoring resumes tomorrow."
            />
          )}
          {showInvestigate && (
            <Banner
              tone="violet"
              title="Demand-side issue — no budget changes needed."
              body="All campaigns are running below budget capacity. This isn't a budget problem. Recommend reviewing search volume, bid competitiveness, targeting, and ad quality."
            />
          )}
          {showGenericInvestigate && (
            <Banner tone="slate" title="No actionable changes identified." />
          )}

          {/* Campaign Breakdown */}
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
            }}
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Campaign Breakdown
              </div>
              {mix.mixed && (
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-sky-700">{mix.limited}</span>
                  <span> of </span>
                  <span className="font-semibold">{mix.total}</span>
                  <span> campaigns budget-limited</span>
                </div>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Campaign</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Classification</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>7-day util</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Spend MTD</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Current /day</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Proposed /day</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Change</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {record.campaigns.map((c, i) => {
                    const isNoChange = c.recommendationType === 'NO_CHANGE';
                    const change = c.currentDaily > 0
                      ? ((c.proposedDaily - c.currentDaily) / c.currentDaily) * 100
                      : c.proposedDaily > 0
                        ? 100
                        : 0;
                    const rec = c.recommendationType
                      ? RECOMMENDATION_LABELS[c.recommendationType]
                      : null;
                    const badge = classificationBadge(c);
                    const conflict = shouldShowConflictIcon(c);
                    const isLost = shouldShowIsLost(c);
                    const skipLabel =
                      c.recommendationType === 'NO_CHANGE' && c.skipReason
                        ? SKIP_REASON_LABELS[c.skipReason]
                        : null;
                    return (
                      <tr key={c.campaignId || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>
                          <div className="flex items-center gap-1.5">
                            <span>{c.campaignName || '(unnamed)'}</span>
                            {conflict && <ConflictIcon />}
                          </div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          {badge ? (
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`${badge.pill} ${badge.text} inline-flex w-fit`}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {badge.label}
                              </span>
                              {isLost && c.searchBudgetLostIs !== null && (
                                <span className="text-[11px] text-slate-500">
                                  {Math.round(c.searchBudgetLostIs)}% IS lost
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <UtilBar campaign={c} />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                          {fmtMoney(c.spendMtd)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                          {fmtMoney(c.currentDaily)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                          {isNoChange ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            fmtMoney(c.proposedDaily)
                          )}
                        </td>
                        <td
                          style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}
                          className={isNoChange ? undefined : changeTone(change)}
                        >
                          {isNoChange ? (
                            <span className="text-xs text-slate-400 font-normal">—</span>
                          ) : (
                            fmtSignedPercent(change)
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {rec && (
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`${rec.pill} ${rec.text} inline-flex w-fit`}
                                style={{
                                  padding: '2px 10px',
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {rec.label}
                              </span>
                              {skipLabel && (
                                <span className="text-[11px] italic text-slate-500">{skipLabel}</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Review & feedback */}
          {showFeedbackForm && (
            <div
              style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Review &amp; feedback
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 6,
                    }}
                  >
                    Decision
                  </label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as ApprovalStatus)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select…</option>
                    <option value="Approved">Approve</option>
                    <option value="Rejected">Reject</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 6,
                    }}
                  >
                    Reviewed by
                  </label>
                  <input
                    type="text"
                    value={reviewedBy}
                    onChange={(e) => setReviewedBy(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 6,
                  }}
                >
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Don't pause Emergency — it's our top converter."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                {submitError && (
                  <span style={{ fontSize: 12, color: '#dc2626' }}>{submitError}</span>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    canSubmit
                      ? 'bg-indigo-900 hover:bg-indigo-950'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Submitting…' : 'Submit feedback'}
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

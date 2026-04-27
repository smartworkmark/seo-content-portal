'use client';

import { useState } from 'react';
import type { ApprovalStatus, GAdsPacingRecord } from '@/types';
import type { GAdsPacingFeedbackPayload } from '@/hooks/useContentData';
import {
  RECOMMENDATION_LABELS,
  changeTone,
  fmtMoney,
  fmtSignedPercent,
} from '@/lib/g-ads-pacing';

interface GAdsPacingDetailPanelProps {
  record: GAdsPacingRecord;
  colSpan: number;
  onSubmit: (record: GAdsPacingRecord, payload: GAdsPacingFeedbackPayload) => Promise<void>;
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
          {/* Campaign Breakdown */}
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
                marginBottom: 10,
              }}
            >
              Campaign Breakdown
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Campaign</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Spend MTD</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Current /day</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Proposed /day</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Change</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {record.campaigns.map((c, i) => {
                    const change = c.currentDaily > 0
                      ? ((c.proposedDaily - c.currentDaily) / c.currentDaily) * 100
                      : c.proposedDaily > 0
                        ? 100
                        : 0;
                    const rec = c.recommendationType
                      ? RECOMMENDATION_LABELS[c.recommendationType]
                      : null;
                    return (
                      <tr key={c.campaignId || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>
                          {c.campaignName || '(unnamed)'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                          {fmtMoney(c.spendMtd)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                          {fmtMoney(c.currentDaily)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                          {fmtMoney(c.proposedDaily)}
                        </td>
                        <td
                          style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}
                          className={changeTone(change)}
                        >
                          {fmtSignedPercent(change)}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {rec && (
                            <span
                              className={`${rec.pill} ${rec.text}`}
                              style={{
                                display: 'inline-block',
                                padding: '2px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {rec.label}
                            </span>
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
        </div>
      </td>
    </tr>
  );
}

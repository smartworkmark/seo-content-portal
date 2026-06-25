'use client';

import { useState } from 'react';
import type { KwBuildoutApprovedKey, KwBuildoutKeyword, KwBuildoutRecord } from '@/types';
import {
  confidenceBadge,
  confidenceMix,
  flagsList,
  fmtMoney,
  keywordKey,
} from '@/lib/kw-buildout';

interface KwBuildoutDetailPanelProps {
  record: KwBuildoutRecord;
  colSpan: number;
  onSubmit: (record: KwBuildoutRecord, approvedKeys: KwBuildoutApprovedKey[]) => Promise<void>;
}

function MatchTypePill({ matchType }: { matchType: string }) {
  if (!matchType) return null;
  return (
    <span
      className="bg-slate-100 ring-1 ring-slate-200 text-slate-600 inline-flex w-fit"
      style={{ padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}
    >
      {matchType.toUpperCase()}
    </span>
  );
}

function ConfidenceCell({ keyword }: { keyword: KwBuildoutKeyword }) {
  const badge = confidenceBadge(keyword.confidence);
  if (!badge) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`${badge.pill} ${badge.text} inline-flex items-center gap-1 w-fit`} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.dot, display: 'inline-block' }} />
      {badge.label}
    </span>
  );
}

export function KwBuildoutDetailPanel({ record, colSpan, onSubmit }: KwBuildoutDetailPanelProps) {
  // Checkbox selection of pending keywords, keyed by their stable identity.
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mix = confidenceMix(record);
  const pendingKeywords = record.keywords.filter((k) => k.approval === '');

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allPendingChecked = pendingKeywords.length > 0 && pendingKeywords.every((k) => checked.has(keywordKey(k)));
  const toggleAll = () => {
    setChecked(allPendingChecked ? new Set() : new Set(pendingKeywords.map((k) => keywordKey(k))));
  };

  const canSubmit = checked.size > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const approvedKeys: KwBuildoutApprovedKey[] = record.keywords
        .filter((k) => checked.has(keywordKey(k)))
        .map((k) => ({
          proposal_id: k.proposalId,
          campaign_id: k.campaignId,
          ad_group_id: k.adGroupId,
          proposed_keyword: k.proposedKeyword,
          proposed_match_type: k.proposedMatchType,
        }));
      await onSubmit(record, approvedKeys);
      setChecked(new Set());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const mixParts: string[] = [];
  if (mix.high) mixParts.push(`${mix.high} high`);
  if (mix.medium) mixParts.push(`${mix.medium} med`);
  if (mix.low) mixParts.push(`${mix.low} low`);

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, background: '#fafafe', borderBottom: '1px solid #e8e5f0' }}>
        <div style={{ padding: '14px 24px 18px 52px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Keyword breakdown */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 16px' }}>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {record.keywords.length} proposed keyword{record.keywords.length === 1 ? '' : 's'}
              </div>
              {mixParts.length > 0 && (
                <div className="text-xs text-slate-500">{mixParts.join(' · ')}</div>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600, width: 32 }}>
                      {pendingKeywords.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allPendingChecked}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          aria-label="Select all pending keywords"
                        />
                      )}
                    </th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Keyword</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Ad group</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Currently serving</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Conv</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>CPA</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {record.keywords.map((k, i) => {
                    const key = keywordKey(k);
                    const flags = flagsList(k.flags);
                    const isApproved = k.approval === 'Approved';
                    const isRejected = k.approval === 'Rejected';
                    const isPending = k.approval === '';
                    return (
                      <tr key={key || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', verticalAlign: 'top' }}>
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={checked.has(key)}
                              onChange={() => toggle(key)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                              aria-label={`Approve ${k.proposedKeyword}`}
                            />
                          ) : null}
                        </td>
                        <td style={{ padding: '8px', verticalAlign: 'top' }}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{k.proposedKeyword}</span>
                              <MatchTypePill matchType={k.proposedMatchType} />
                            </div>
                            {flags.length > 0 && (
                              <span className="text-[11px] text-amber-700">
                                ⚠ {flags.join(', ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px', verticalAlign: 'top', color: '#334155' }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{k.adGroupName || '(unnamed)'}</span>
                            {k.needsNewAdGroup && (
                              <span
                                className="bg-amber-50 ring-1 ring-amber-200 text-amber-700 inline-flex w-fit"
                                style={{ padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}
                              >
                                NEW
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px', verticalAlign: 'top', color: '#64748b' }}>
                          {k.servedByKeyword || <span className="text-slate-400">—</span>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', verticalAlign: 'top', color: '#334155' }}>
                          {k.conversions}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', verticalAlign: 'top', color: '#334155' }}>
                          {fmtMoney(k.cpa)}
                        </td>
                        <td style={{ padding: '8px', verticalAlign: 'top' }}>
                          <div className="flex flex-col gap-1">
                            <ConfidenceCell keyword={k} />
                            {isApproved && (
                              <span className="bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 inline-flex w-fit" style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                                Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="bg-rose-50 ring-1 ring-rose-200 text-rose-700 inline-flex w-fit" style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                                Rejected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Approve action */}
            {pendingKeywords.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 14 }}>
                {submitError && <span style={{ fontSize: 12, color: '#dc2626' }}>{submitError}</span>}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    canSubmit ? 'bg-indigo-900 hover:bg-indigo-950' : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Submitting…' : `Approve selected (${checked.size})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

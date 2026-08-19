'use client';

import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { ApprovalStatus, GAdsPacingCampaign, GAdsPacingRecord } from '@/types';
import type { GAdsPacingFeedbackPayload, BudgetAllocationPayload } from '@/hooks/useContentData';
import {
  allocatableCampaigns,
  allocationSummary,
  derivePercent,
  dollarsFromPercent,
  eligibleCampaigns,
  heldBudget,
  heldReasonLabel,
  isHeld,
  isSaveEnabled,
} from '@/lib/budget-allocation';
import {
  DOW_FLAG_LABELS,
  DISPLAY_STATUS_PAUSED_STYLE,
  RECOMMENDATION_LABELS,
  SKIP_REASON_LABELS,
  allCampaignsPaused,
  appliedStatusLabel,
  displayStatusPill,
  isCampaignEnabled,
  isCampaignEnded,
  isEndedWithNoSpend,
  budgetLimitedCount,
  campaignBudgetView,
  changeTone,
  classificationBadge,
  dowFlagsList,
  dowPercentLabel,
  dowWeekdayLabel,
  fmtCompactDate,
  fmtMoney,
  fmtSignedPercent,
  needsApproval,
  statusReasonLabel,
  shouldShowConflictIcon,
  shouldShowDowBanner,
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
  isPausedView?: boolean;
  onSubmit: (record: GAdsPacingRecord, payload: GAdsPacingFeedbackPayload) => Promise<void>;
  onSubmitBudget: (record: GAdsPacingRecord, payload: BudgetAllocationPayload) => Promise<void>;
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
  tone: 'violet' | 'slate' | 'amber' | 'teal';
  title: string;
  body?: string;
}) {
  const palette = {
    violet: 'bg-violet-50 ring-1 ring-violet-200 text-violet-900',
    slate: 'bg-slate-50 ring-1 ring-slate-200 text-slate-700',
    amber: 'bg-amber-50 ring-1 ring-amber-200 text-amber-900',
    teal: 'bg-teal-50 ring-1 ring-teal-200 text-teal-900',
  }[tone];
  return (
    <div className={`rounded-lg px-4 py-3 ${palette}`}>
      <div className="text-sm font-semibold">{title}</div>
      {body && <div className="mt-1 text-xs leading-relaxed opacity-90">{body}</div>}
    </div>
  );
}

// Pill styling for the derived applied-status label (not the raw recommendation_type).
function statusPillStyle(label: string): { pill: string; text: string } {
  switch (label) {
    case 'Pause (pending)':
    case 'Rejected':
      return { pill: 'bg-rose-50 ring-1 ring-rose-200', text: 'text-rose-700' };
    case 'Needs approval':
      return { pill: 'bg-amber-50 ring-1 ring-amber-200', text: 'text-amber-700' };
    case 'Approved':
      return { pill: 'bg-emerald-50 ring-1 ring-emerald-200', text: 'text-emerald-700' };
    case 'No change':
      return { pill: 'bg-slate-100 ring-1 ring-slate-200', text: 'text-slate-600' };
    default: // Auto-applied
      return { pill: 'bg-sky-50 ring-1 ring-sky-200', text: 'text-sky-700' };
  }
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

function fmtPercentDisplay(pct: number): string {
  if (!Number.isFinite(pct)) return '';
  return String(Math.round(pct * 10) / 10);
}

// Campaign-level budget allocation card. Three states: unmanaged (offer to set),
// managed view (read-only split, with a revert banner when the runtime effective mode
// fell back to account-level), and edit (tandem $/% inputs, soft divergence warning).
function BudgetAllocationCard({
  record,
  onSubmitBudget,
}: {
  record: GAdsPacingRecord;
  onSubmitBudget: (record: GAdsPacingRecord, payload: BudgetAllocationPayload) => Promise<void>;
}) {
  const accountBudget = record.monthlyBudget;
  // eligible = gets a row (not shared). allocatable = can be given a new amount (also ENABLED).
  const eligible = eligibleCampaigns(record.campaigns);
  const allocatable = allocatableCampaigns(record.campaigns);
  const held = heldBudget(record.campaigns);
  const managed = record.budgetConfig?.managed ?? false;
  // `campaigns` is this run date's roster, not live Google Ads. Editing an older row would
  // save against a stale campaign list, so allocation is offered only on the latest run.
  const isLatestRun = record.runDate === record.accountLatestRunDate;
  const staleEditNote = `Editing is available on this account's latest run (${fmtCompactDate(record.accountLatestRunDate)}).`;

  const [editing, setEditing] = useState(false);
  // Draft dollar amounts keyed by campaignId (raw string so the field can be cleared).
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [updatedBy, setUpdatedBy] = useState(record.budgetConfig?.updatedBy ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const startEditing = () => {
    // Seed only allocatable ids: keeping the draft keyed strictly to editable rows guarantees
    // setDollars can never mutate a paused row.
    const seed: Record<string, string> = {};
    allocatable.forEach((c) => {
      seed[c.campaignId] = c.budgetDollars != null ? String(Math.round(c.budgetDollars)) : '';
    });
    setDraft(seed);
    setUpdatedBy(record.budgetConfig?.updatedBy ?? '');
    setError(null);
    setSavedNote(false);
    setConfirmingClear(false);
    setEditing(true);
  };

  const setDollars = (campaignId: string, raw: string) => {
    setDraft((prev) => ({ ...prev, [campaignId]: raw }));
  };
  const setFromPercent = (campaignId: string, raw: string) => {
    const pct = parseFloat(raw);
    const dollars = Number.isFinite(pct) ? dollarsFromPercent(pct, accountBudget) : NaN;
    setDraft((prev) => ({ ...prev, [campaignId]: Number.isFinite(dollars) ? String(dollars) : '' }));
  };

  // Held dollars are deliberately NOT in the total: a paused campaign spends $0, so an account
  // with money parked in one really will underspend. Surfaced separately below instead.
  const allocatableDollars = allocatable.map((c) => parseFloat(draft[c.campaignId] ?? ''));
  const summary = allocationSummary(allocatableDollars, accountBudget);
  const canSave = isSaveEnabled(allocatableDollars) && updatedBy.trim().length > 0 && !submitting;

  // Discriminate the reasons Save is dead — a single catch-all string leaves the operator at a
  // dead end when every field looks filled in.
  const saveHint = (() => {
    if (allocatable.length === 0) {
      return 'No active campaigns to allocate — you can still clear budgets below.';
    }
    // Reachable: `min={0}` is not enforced on typed input, only on the spinner.
    if (allocatableDollars.some((d) => Number.isFinite(d) && d < 0)) {
      return 'Budgets can’t be negative.';
    }
    const blank = allocatableDollars.some((d) => !Number.isFinite(d));
    const noName = updatedBy.trim().length === 0;
    if (blank && noName) {
      return 'Give every active campaign an amount ($0 is allowed) and add your name to save.';
    }
    if (blank) return 'Give every active campaign an amount — $0 is allowed, blank is not.';
    return 'Add your name to save.';
  })();

  const submit = async (isManaged: boolean) => {
    if (isManaged && !isSaveEnabled(allocatableDollars)) {
      setError('Every active campaign needs a budget amount ($0 is allowed).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const campaigns = isManaged
        ? [
            ...allocatable.map((c, i) => ({
              campaign_id: c.campaignId,
              campaign_name: c.campaignName,
              // No `|| 0` coercion — the guard above already proved these finite and >= 0, so
              // the gate and the wire read the same numbers and a blank can't become a $0.
              budget_dollars: allocatableDollars[i],
            })),
            // Paused campaigns ride along read-only carrying their held amount, so the value is
            // explicit on the wire and survives even if the backend rewrites the account block.
            // Shared-budget campaigns stay omitted (they have no dollars to hold).
            ...record.campaigns.filter(isHeld).map((c) => ({
              campaign_id: c.campaignId,
              campaign_name: c.campaignName,
              budget_dollars: c.budgetDollars ?? 0,
            })),
          ]
        : [];
      await onSubmitBudget(record, { managed: isManaged, updatedBy: updatedBy.trim(), campaigns });
      setEditing(false);
      setConfirmingClear(false);
      setSavedNote(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budgets');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <div style={sectionHeadingStyle}>Budget Allocation</div>
          <span className="text-[11px] text-slate-400">
            Campaigns as of {fmtCompactDate(record.runDate)}
          </span>
        </div>
        {accountBudget > 0 && (
          <div className="text-xs text-slate-500">
            Account budget <span className="font-semibold text-slate-700">{fmtMoney(accountBudget)}/mo</span>
          </div>
        )}
      </div>

      {/* Reverted-to-account-level banner (managed intent, runtime fell back). */}
      {!editing && managed && record.effectiveMode === 'account' && (
        <div className="mb-3 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <div className="text-sm font-semibold text-amber-900">Running at the account level</div>
          {record.statusReason && (
            <div className="mt-1 text-xs leading-relaxed text-amber-900/90">
              {statusReasonLabel(record.statusReason)}
            </div>
          )}
        </div>
      )}

      {savedNote && !editing && (
        <div className="mb-3 rounded-lg bg-sky-50 px-4 py-3 ring-1 ring-sky-200">
          <div className="text-xs text-sky-800">Saved — the pacing engine will re-evaluate on its next run.</div>
        </div>
      )}

      {!editing ? (
        managed ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Campaign</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Budget /mo</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>% of account</th>
                  </tr>
                </thead>
                <tbody>
                  {record.campaigns.map((c, i) => (
                    <tr
                      key={c.campaignId || i}
                      style={{ borderTop: '1px solid #f1f5f9', opacity: isHeld(c) ? 0.6 : 1 }}
                    >
                      <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>
                        {c.campaignName || '(unnamed)'}
                        {c.sharedBudget && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">shared budget</span>
                        )}
                        {isHeld(c) && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">
                            {heldReasonLabel(c)} — held, not steering
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                        {c.sharedBudget || c.budgetDollars == null ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          fmtMoney(c.budgetDollars)
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>
                        {c.sharedBudget || c.budgetDollars == null || !(accountBudget > 0) ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          `${fmtPercentDisplay(derivePercent(c.budgetDollars, accountBudget))}%`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              {isLatestRun ? (
                <button
                  onClick={startEditing}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit allocation
                </button>
              ) : (
                <span className="text-xs text-slate-400">{staleEditNote}</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              No campaign budgets set — pacing runs at the account level.
            </span>
            {!isLatestRun ? (
              <span className="text-xs text-slate-400">{staleEditNote}</span>
            ) : allocatable.length > 0 ? (
              <button
                onClick={startEditing}
                className="rounded-md bg-indigo-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-950"
              >
                Set campaign budgets
              </button>
            ) : (
              // Distinct causes get distinct messages: collapsing "all paused" into "all shared"
              // would send the operator to Google Ads to fix a budget structure that isn't the
              // problem, and "re-enabled" doesn't apply to a campaign that has permanently ended.
              <span className="text-xs text-slate-400">
                {record.campaigns.length === 0
                  ? 'No campaigns on this account.'
                  : eligible.length === 0
                    ? 'All campaigns are on shared budgets — not eligible.'
                    : held.endedCount > 0 && held.pausedCount === 0
                      ? 'All campaigns have ended — there’s nothing to allocate to right now.'
                      : held.endedCount > 0
                        ? 'Every campaign is paused or has ended — allocation is available once one is re-enabled.'
                        : 'All campaigns are paused — allocation is available once one is re-enabled.'}
              </span>
            )}
          </div>
        )
      ) : (
        // Edit mode
        <>
          {!(accountBudget > 0) && (
            <div className="mb-3 text-xs text-amber-700">
              Account budget unavailable from HubSpot — percentages can&apos;t be shown. You can still set dollar amounts.
            </div>
          )}
          {allocatable.length === 0 && (
            <div className="mb-3 rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-700">No active campaigns</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-600">
                Every campaign on this account is paused, ended, or on a shared budget, so
                there&apos;s nothing to allocate right now
                {held.dollars > 0 && (
                  <>
                    {' '}— {fmtMoney(held.dollars)} stays held against the{' '}
                    {held.pausedCount > 0 && held.endedCount > 0
                      ? 'paused and ended campaigns'
                      : held.endedCount > 0
                        ? 'ended campaigns'
                        : 'paused campaigns'}
                  </>
                )}
                . Saved budgets are preserved; you can clear them back to account-level pacing
                below.
              </div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Campaign</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Budget /mo ($)</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>% of account</th>
                </tr>
              </thead>
              <tbody>
                {record.campaigns.map((c, i) => {
                  const shared = c.sharedBudget;
                  // Key on campaign_status/campaign_serving_status via isHeld — never on
                  // c.paused (that's paused_by_agent from a different sheet) and never on spend
                  // (an ENABLED, still-serving campaign with $0 spend is fully allocatable).
                  const paused = isHeld(c);
                  const dollarsStr = draft[c.campaignId] ?? '';
                  const dollarsNum = parseFloat(dollarsStr);
                  const pctVal = Number.isFinite(dollarsNum) ? derivePercent(dollarsNum, accountBudget) : NaN;
                  return (
                    <tr
                      key={c.campaignId || i}
                      style={{ borderTop: '1px solid #f1f5f9', opacity: paused ? 0.6 : 1 }}
                    >
                      <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>
                        {c.campaignName || '(unnamed)'}
                        {shared && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">
                            shared budget — set at the Google Ads budget level
                          </span>
                        )}
                        {paused && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">
                            {c.budgetDollars != null
                              ? `${heldReasonLabel(c)} — ${fmtMoney(c.budgetDollars)} held, not steering`
                              : `${heldReasonLabel(c)} — not steering`}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {/* Static text, not a disabled input: an input carrying a value reads
                            as "editable once I fix something" and asserts the draft holds that
                            number when it doesn't. */}
                        {paused ? (
                          <span className="inline-block w-28 pr-2 text-sm text-slate-400">
                            {c.budgetDollars != null ? fmtMoney(c.budgetDollars) : '—'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            disabled={shared}
                            value={shared ? '' : dollarsStr}
                            onChange={(e) => setDollars(c.campaignId, e.target.value)}
                            placeholder={shared ? '—' : '0'}
                            className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {paused ? (
                          <span className="inline-block w-20 pr-2 text-sm text-slate-400">
                            {c.budgetDollars != null && accountBudget > 0
                              ? `${fmtPercentDisplay(derivePercent(c.budgetDollars, accountBudget))}%`
                              : '—'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            disabled={shared || !(accountBudget > 0)}
                            // derivePercent returns 0 when the account budget is unknown and
                            // Number.isFinite(0) is true, so without the budget check this
                            // renders a misleading 0 — which now reads as a real $0 allocation.
                            value={
                              shared || !(accountBudget > 0) || !Number.isFinite(pctVal)
                                ? ''
                                : fmtPercentDisplay(pctVal)
                            }
                            onChange={(e) => setFromPercent(c.campaignId, e.target.value)}
                            placeholder={shared ? '—' : '0'}
                            className="w-20 px-2 py-1.5 text-sm text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Allocation total + soft divergence warning */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              Allocated <span className="font-semibold text-slate-800">{fmtMoney(summary.totalDollars)}</span>
              {accountBudget > 0 && (
                <>
                  {' '}of {fmtMoney(accountBudget)} ({fmtPercentDisplay(summary.totalPercent)}%)
                </>
              )}
              {/* Names the excluded dollars so the arithmetic explains itself — otherwise the
                  footer looks wrong next to a visible held amount in the table. Paused and
                  ended are counted separately so the denotation carries through here too. */}
              {held.dollars > 0 && (
                <span className="text-slate-400">
                  {' '}· {fmtMoney(held.dollars)} held in{' '}
                  {[
                    held.pausedCount > 0 && `${held.pausedCount} paused ${held.pausedCount === 1 ? 'campaign' : 'campaigns'}`,
                    held.endedCount > 0 && `${held.endedCount} ended ${held.endedCount === 1 ? 'campaign' : 'campaigns'}`,
                  ].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            {/* With nothing allocatable the summary would read "100% under" next to the
                dedicated no-active-campaigns banner. */}
            {allocatable.length > 0 && summary.warning && (
              <div className="text-xs font-medium text-amber-700">⚠ {summary.warning}</div>
            )}
          </div>

          <div className="mt-3" style={{ maxWidth: 260 }}>
            <label style={labelStyle}>Updated by</label>
            <input
              type="text"
              value={updatedBy}
              onChange={(e) => setUpdatedBy(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {error && <span className="mr-auto text-xs text-red-600">{error}</span>}
            {!canSave && !error && !submitting && (
              <span className="mr-auto text-xs text-slate-400">{saveHint}</span>
            )}
            {managed &&
              (confirmingClear ? (
                <>
                  <span className="text-xs text-slate-500">Clear all budgets?</span>
                  <button
                    onClick={() => submit(false)}
                    disabled={submitting || updatedBy.trim().length === 0}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Confirm clear
                  </button>
                  <button
                    onClick={() => setConfirmingClear(false)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Keep
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmingClear(true)}
                  className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Clear budgets
                </button>
              ))}
            <button
              onClick={() => {
                setEditing(false);
                setConfirmingClear(false);
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => submit(true)}
              disabled={!canSave}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
                canSave ? 'bg-indigo-900 hover:bg-indigo-950' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Saving…' : 'Save budgets'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function GAdsPacingDetailPanel({
  record,
  colSpan,
  isPausedView = false,
  onSubmit,
  onSubmitBudget,
}: GAdsPacingDetailPanelProps) {
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
  const showDow = shouldShowDowBanner(record);
  const dowMult = record.dowMultiplier ?? 1;
  const dowFlags = dowFlagsList(record.dowFlags);
  // Only ENABLED campaigns are shown. PAUSED campaigns stay in the data (their spend still
  // counts toward the account total, which is read from an account-level field, not summed
  // here) but must not appear as rows. An ended campaign is still ENABLED in Ads, so it isn't
  // caught by that filter — it DOES appear (with its tag), but only if it has spend this month;
  // a $0 ended row adds noise without anything to show (see isEndedWithNoSpend). Campaign-derived
  // panel values use the visible subset so the mix chip and header labels reconcile with what's
  // on screen.
  const visibleCampaigns = record.campaigns.filter(
    (c) => isCampaignEnabled(c) && !isEndedWithNoSpend(c),
  );
  const capPaused = allCampaignsPaused(record);
  const mix = budgetLimitedCount({ campaigns: visibleCampaigns });
  // Once any row carries a final_daily_budget, the table leads with the actually-applied
  // budget (current -> final). Pre-go-live rows (no final) keep the legacy proposed view.
  const anyFinal = visibleCampaigns.some((c) => c.finalDailyBudget !== null);
  // Hide the feedback form when there's nothing actionable to approve.
  const showFeedbackForm = !showGrace && !record.accountOnTrack && needsApproval(record);

  // Historical rows retain their daily pacing tier. The dedicated pause-event view forces the
  // neutral Paused pill without projecting today's pause state onto normal historical rows.
  const status = isPausedView ? DISPLAY_STATUS_PAUSED_STYLE : displayStatusPill(record);

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
          {/* Client-facing pacing status (mirrors the collapsed row's Status pill) */}
          <div className="flex items-center gap-2">
            <span style={{ ...labelStyle, marginBottom: 0 }}>Pacing status</span>
            <span className={`${status.pill} ${status.text}`} style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}>
              {status.label}
            </span>
          </div>
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
          {showDow && (
            <Banner
              tone="teal"
              title={`${dowWeekdayLabel(record.runDate)} ${dowPercentLabel(dowMult)} day-of-week budget shaping`}
              body={
                dowFlags.length > 0
                  ? dowFlags.map((f) => DOW_FLAG_LABELS[f] ?? f).join(' · ')
                  : 'Daily budgets are scaled by day-of-week performance. The applied budget below reflects this shaping.'
              }
            />
          )}

          {/* Budget Allocation (campaign-level split) */}
          <BudgetAllocationCard record={record} onSubmitBudget={onSubmitBudget} />

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
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>{anyFinal ? 'Applied /day' : 'Proposed /day'}</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Change</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>{anyFinal ? 'Status' : 'Recommendation'}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '12px 8px', color: '#64748b', fontStyle: 'italic' }}>
                        {capPaused
                          ? 'All campaigns paused (cap reached).'
                          : 'No active campaigns.'}
                      </td>
                    </tr>
                  )}
                  {visibleCampaigns.map((c, i) => {
                    const view = campaignBudgetView(c);
                    const badge = classificationBadge(c);
                    const conflict = shouldShowConflictIcon(c);
                    const isLost = shouldShowIsLost(c);

                    // Legacy (pre-go-live, no final_daily_budget): old proposed/recommendation view.
                    const legacyNoChange = c.recommendationType === 'NO_CHANGE';
                    const legacyChange = c.currentDaily > 0
                      ? ((c.proposedDaily - c.currentDaily) / c.currentDaily) * 100
                      : c.proposedDaily > 0
                        ? 100
                        : 0;
                    const rec = c.recommendationType
                      ? RECOMMENDATION_LABELS[c.recommendationType]
                      : null;
                    const legacySkipLabel =
                      legacyNoChange && c.skipReason ? SKIP_REASON_LABELS[c.skipReason] : null;

                    // New model: status pill + why-line driven by the actual applied movement.
                    // Approval/pause rows are approval-aware (see appliedStatusLabel).
                    const pending = view.mode === 'approval' || view.mode === 'pause';
                    const statusLabel = appliedStatusLabel(view, record.approvalStatus);
                    const statusStyle = statusPillStyle(statusLabel);
                    const whyParts: string[] = [];
                    // An un-actioned pending row shows the if-approved target, so mark it hypothetical.
                    if (pending && record.approvalStatus === '') whyParts.push('if approved');
                    if (view.direction !== 'flat' && showDow) whyParts.push('day-of-week shaping');
                    if (c.autoDecreasePromoted) {
                      whyParts.push(
                        c.appliedDecreasePercent !== null
                          ? `auto-applied ${Math.round(c.appliedDecreasePercent)}% cut`
                          : 'auto-applied decrease',
                      );
                    }
                    // Skip reason explains genuine no-movement rows only — never shown beside a real
                    // change, nor beside a pending row (whose number is the pre-approval proposal).
                    if (!pending && view.direction === 'flat' && c.skipReason) {
                      const s = SKIP_REASON_LABELS[c.skipReason];
                      if (s) whyParts.push(s);
                    }

                    // Applied/proposed amount + change %, branching on whether we have a final budget.
                    // Pending approval/pause rows have no applied movement yet (final == current), which
                    // would dash out the very change being approved — show the if-approved target instead.
                    const showDash = pending
                      ? false
                      : view.hasFinal
                        ? view.direction === 'flat'
                        : legacyNoChange;
                    const amount = pending
                      ? view.ifApprovedTarget
                      : view.hasFinal
                        ? view.target
                        : c.proposedDaily;
                    const changePct = pending
                      ? view.ifApprovedDeltaPct
                      : view.hasFinal
                        ? view.deltaPct
                        : legacyChange;
                    return (
                      <tr key={c.campaignId || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>
                          <div className="flex items-center gap-1.5">
                            <span>{c.campaignName || '(unnamed)'}</span>
                            {isCampaignEnded(c) ? (
                              <span className="text-[11px] font-normal text-slate-400">ended</span>
                            ) : c.paused ? (
                              <span className="text-[11px] font-normal text-slate-400">paused</span>
                            ) : null}
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
                          {showDash ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            fmtMoney(amount)
                          )}
                        </td>
                        <td
                          style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}
                          className={showDash ? undefined : changeTone(changePct)}
                        >
                          {showDash ? (
                            <span className="text-xs text-slate-400 font-normal">—</span>
                          ) : (
                            fmtSignedPercent(changePct)
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {view.hasFinal ? (
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`${statusStyle.pill} ${statusStyle.text} inline-flex w-fit`}
                                style={{
                                  padding: '2px 10px',
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {statusLabel}
                              </span>
                              {whyParts.length > 0 && (
                                <span className="text-[11px] italic text-slate-500">
                                  {whyParts.join(' · ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            rec && (
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
                                {legacySkipLabel && (
                                  <span className="text-[11px] italic text-slate-500">{legacySkipLabel}</span>
                                )}
                              </div>
                            )
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

// Pure helpers for the campaign-level budget allocation UI (G Ads Pacing).
//
// Model (locked with the user):
//   - Dollars are canonical; percent is a derived display (dollars / accountBudget * 100).
//   - No hard 100% gate and no clamp-to-remaining. Save is enabled when every eligible
//     campaign has a positive dollar amount (all-or-nothing). Over-allocation is allowed
//     but surfaces a soft, non-blocking divergence warning against the account budget.
//   - The account monthly budget is read-only (HubSpot-sourced, rides on the pacing
//     record); it is used only to derive percentages and the sanity-check warning.
//
// The frontend save-gate here is UX only. The authoritative all-or-nothing / completeness
// check runs backend at runtime and can invalidate a saved config (drift) — surfaced via
// the "Campaign Budget Status" sheet (effective_mode / status_reason).

import type { GAdsPacingCampaign } from '@/types';
import { fmtMoney } from './g-ads-pacing';

// Divergence beyond this fraction of the account budget triggers the soft warning.
export const DIVERGENCE_TOLERANCE = 0.02; // 2%

// A campaign can be budgeted independently only when it is not on a shared Google Ads
// budget. (Paused vs enabled is a backend-authoritative signal not yet in the feed; the
// runtime check is authoritative, so the UI scopes to shared-budget eligibility.)
export function isEligible(campaign: GAdsPacingCampaign): boolean {
  return !campaign.sharedBudget;
}

export function eligibleCampaigns(campaigns: GAdsPacingCampaign[]): GAdsPacingCampaign[] {
  return campaigns.filter(isEligible);
}

// Derived percent for display. Returns 0 when the account budget is unknown/zero.
export function derivePercent(dollars: number, accountBudget: number): number {
  if (!Number.isFinite(dollars) || !(accountBudget > 0)) return 0;
  return (dollars / accountBudget) * 100;
}

// Convert an edited percent back to canonical dollars (rounded to whole dollars).
export function dollarsFromPercent(percent: number, accountBudget: number): number {
  if (!Number.isFinite(percent) || !(accountBudget > 0)) return 0;
  return Math.round((percent / 100) * accountBudget);
}

export interface AllocationSummary {
  totalDollars: number;
  totalPercent: number;
  divergence: number; // totalDollars - accountBudget (positive = over)
  warning: string | null; // non-blocking sanity check
}

// Summarize a draft allocation (dollars for each eligible campaign) against the account
// budget. `warning` is populated only when the totals diverge beyond DIVERGENCE_TOLERANCE.
export function allocationSummary(
  draftDollars: number[],
  accountBudget: number,
): AllocationSummary {
  const totalDollars = draftDollars.reduce((sum, d) => sum + (Number.isFinite(d) ? d : 0), 0);
  const totalPercent = derivePercent(totalDollars, accountBudget);
  const divergence = totalDollars - accountBudget;

  let warning: string | null = null;
  if (accountBudget > 0 && Math.abs(divergence) > accountBudget * DIVERGENCE_TOLERANCE) {
    const pct = Math.round(Math.abs(divergence / accountBudget) * 100);
    const dir = divergence > 0 ? 'over' : 'under';
    warning = `Allocated ${fmtMoney(totalDollars)} of ${fmtMoney(accountBudget)} account budget (${pct}% ${dir}).`;
  }

  return { totalDollars, totalPercent, divergence, warning };
}

// All-or-nothing UX gate: every eligible campaign must carry a positive dollar amount.
// (An empty list is not saveable — that is the "unmanaged" state, cleared via managed:false.)
export function isSaveEnabled(draftDollars: number[]): boolean {
  return draftDollars.length > 0 && draftDollars.every((d) => Number.isFinite(d) && d > 0);
}

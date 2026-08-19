// Pure helpers for the campaign-level budget allocation UI (G Ads Pacing).
//
// Model (locked with the user):
//   - Dollars are canonical; percent is a derived display (dollars / accountBudget * 100).
//   - No hard 100% gate and no clamp-to-remaining. Save is enabled when every allocatable
//     campaign carries a dollar amount (all-or-nothing). $0 is a valid, deliberate allocation
//     (backend B4 routes it to NO_CHANGE / UNALLOCATED_TARGET); blank is not. Over-allocation
//     is allowed but surfaces a soft, non-blocking divergence warning against the account
//     budget.
//   - The account monthly budget is read-only (HubSpot-sourced, rides on the pacing
//     record); it is used only to derive percentages and the sanity-check warning.
//
// The frontend save-gate here is UX only. The authoritative all-or-nothing / completeness
// check runs backend at runtime and can invalidate a saved config (drift) — surfaced via
// the "Campaign Budget Status" sheet (effective_mode / status_reason).

import type { GAdsPacingCampaign } from '@/types';
import { fmtMoney, isCampaignEnabled, isCampaignEnded } from './g-ads-pacing';

// Divergence beyond this fraction of the account budget triggers the soft warning.
export const DIVERGENCE_TOLERANCE = 0.02; // 2%

// Two predicates, deliberately distinct:
//   isEligible    — "does this campaign get a row in the allocation table?" (not on a shared
//                   Google Ads budget; shared budgets are set at the Google Ads budget level
//                   and can never be steered from here).
//   isAllocatable — "can this campaign be given a NEW amount right now?" (eligible AND ENABLED
//                   in Google Ads AND not ended). A PAUSED or ENDED campaign still holds its
//                   saved dollars — they just aren't steering anything — so it stays visible and
//                   read-only rather than disappearing. Hiding it would strand the money
//                   invisibly.
// Rendering keys off isEligible. The save gate, draft seed and divergence summary all key off
// isAllocatable. Filter on campaign_status/campaign_serving_status, never on spend: an ENABLED,
// still-serving campaign with $0 spend is fully allocatable.
export function isEligible(campaign: GAdsPacingCampaign): boolean {
  return !campaign.sharedBudget;
}

export function eligibleCampaigns(campaigns: GAdsPacingCampaign[]): GAdsPacingCampaign[] {
  return campaigns.filter(isEligible);
}

// isCampaignEnded() is checked in addition to campaignStatus because a lapsed end date won't
// reliably flip Google Ads' own campaign_status — an ended campaign can stay campaignStatus =
// ENABLED indefinitely, so without this it would wrongly stay allocatable.
export function isAllocatable(campaign: GAdsPacingCampaign): boolean {
  return isEligible(campaign) && isCampaignEnabled(campaign) && !isCampaignEnded(campaign);
}

export function allocatableCampaigns(campaigns: GAdsPacingCampaign[]): GAdsPacingCampaign[] {
  return campaigns.filter(isAllocatable);
}

// Eligible-but-PAUSED-or-ENDED: the row is shown but not editable.
export function isHeld(campaign: GAdsPacingCampaign): boolean {
  return isEligible(campaign) && (!isCampaignEnabled(campaign) || isCampaignEnded(campaign));
}

// Which held-reason label to show for a campaign, if any. Ended takes precedence over paused
// when both are true — it's the bigger-impact state — even though both are held identically.
export function heldReasonLabel(campaign: GAdsPacingCampaign): 'paused' | 'ended' | null {
  if (isCampaignEnded(campaign)) return 'ended';
  if (!isCampaignEnabled(campaign)) return 'paused';
  return null;
}

export interface HeldBudget {
  dollars: number;
  count: number;
  pausedCount: number;
  endedCount: number;
}

// Dollars saved against eligible-but-held (paused or ended) campaigns. Held, not steering:
// excluded from the allocation total (so the summary reads as a stranded-budget detector — a
// held campaign spends $0, so those dollars really will go unspent) and surfaced separately in
// the UI so the arithmetic explains itself.
export function heldBudget(campaigns: GAdsPacingCampaign[]): HeldBudget {
  const held = campaigns.filter(isHeld);
  return {
    count: held.length,
    dollars: held.reduce((sum, c) => sum + (c.budgetDollars ?? 0), 0),
    pausedCount: held.filter((c) => !isCampaignEnded(c)).length,
    endedCount: held.filter((c) => isCampaignEnded(c)).length,
  };
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

// All-or-nothing UX gate: every allocatable campaign must carry a dollar amount. $0 is allowed
// (a deliberate "not allocated yet"); blank/NaN is not.
//
// The `length > 0` guard is load-bearing, not defensive. Without it an all-paused managed
// account would POST `managed: true` with an empty `campaigns` array — which the backend reads
// as "no campaigns named" (it only tombstones via `removed_campaign_ids`), so the sheet keeps
// its old amounts while the client optimistically wipes them. Silent client/server divergence.
// The escape hatch for that state is Clear budgets (`managed: false`), which is gated
// separately and stays reachable.
export function isSaveEnabled(draftDollars: number[]): boolean {
  return draftDollars.length > 0 && draftDollars.every((d) => Number.isFinite(d) && d >= 0);
}

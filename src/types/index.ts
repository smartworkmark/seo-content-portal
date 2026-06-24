// Content Types
export type ContentType = 'blogs' | 'gmb-posts' | 'replies' | 'neg-keywords' | 'g-ads-pacing' | 'kw-buildout';

// Feature filter mode: 'include' = show only blogs WITH feature, 'exclude' = show only blogs WITHOUT
export type FeatureFilterMode = 'include' | 'exclude';
export type FeatureFilters = Record<string, FeatureFilterMode>;

// Error content type (no replies in error mode)
export type ErrorContentType = 'blogs' | 'gmb-posts';

export type DateRange = '1d' | '3d' | '7d' | '30d' | '90d';

// Blog Post
export interface BlogPost {
  id: string;
  date: string;
  practiceName: string;
  companyId: string;
  blogTitle: string;
  keyword: string;
  url: string;
  // Enrichment feature flags (from Google Sheets boolean columns)
  hyperlocalEnabled: boolean;
  reviewsEnabled: boolean;
  // Enrichment content (from Google Sheets text columns; null if cell is empty)
  hyperlocalContent: string | null;
  reviewContent: string | null;
  // Derived from boolean flags: e.g. ["hyperlocal", "reviews"]
  features: string[];
}

// GMB Post
export interface GmbPost {
  id: string;
  date: string;
  practiceName: string;
  companyId: string;
  postTitle: string;
  keyword: string;
  url: string;
}

// Negative Keyword Review
export interface NegKeywordReview {
  id: string;
  dateTime: string;
  practiceName: string;
  companyId: string;
  campaignName: string;
  termsReviewed: number;
}

// G Ads Pacing
export type Severity = 'OK' | 'Auto' | 'Alert' | 'Underpace' | 'Critical' | 'Investigate';

export type RecommendationType =
  | 'PAUSE_CAMPAIGN'
  | 'BUDGET_DECREASE_APPROVAL'
  | 'BUDGET_INCREASE_APPROVAL'
  | 'BUDGET_DECREASE'
  | 'BUDGET_INCREASE'
  | 'DOW_ADJUSTMENT'
  | 'NO_CHANGE';

export type ApprovalStatus = '' | 'Approved' | 'Rejected';

export type Classification = 'BUDGET_LIMITED' | 'DEMAND_LIMITED' | null;

export type SkipReason =
  | ''
  | 'ACCOUNT_ON_TRACK'
  | 'DEMAND_SIDE_ISSUE'
  | 'DEMAND_LIMITED_NO_CHANGE'
  | 'BUDGET_LIMITED_BUT_CHANGE_TOO_SMALL'
  | 'CHRONIC_DEMAND_LIMITED_DONOR'
  | 'CHRONIC_BUT_NO_BUDGET_LIMITED_SIBLING'
  | 'NO_MEANINGFUL_CHANGE'
  | 'MONTH_START_GRACE'
  | 'BUDGET_LIMITED_NO_DECREASE';

export interface GAdsPacingCampaign {
  campaignId: string;
  campaignName: string;
  spendMtd: number;
  currentDaily: number;
  proposedDaily: number;
  recommendationType: RecommendationType | '';
  classification: Classification;
  searchBudgetLostIs: number | null;
  yesterdayUtilization: number | null;
  sevenDayAvgUtilization: number | null;
  utilizationDays: number;
  chronicDemandLimited: boolean;
  skipReason: SkipReason;
  conflictsWithPacing: boolean;
  // Day-of-week shaping + auto-decrease (workflow v2, go-live 2026-06-12).
  // finalDailyBudget is the value actually pushed to Google Ads (base x dow_multiplier,
  // clamped). null on pre-go-live rows that have no value.
  finalDailyBudget: number | null;
  autoDecreasePromoted: boolean;
  appliedDecreasePercent: number | null;
}

export interface GAdsPacingRecord {
  id: string;
  runDate: string;
  runId: string;
  practiceName: string;
  googleAdsId: string;
  companyId: string;
  monthlyBudget: number;
  spendMtd: number;
  expectedSpendMtd: number;
  variancePercent: number;
  currentDailyBudget: number;
  proposedDailyBudget: number;
  severity: Severity;
  approvalStatus: ApprovalStatus;
  reviewedBy: string;
  notes: string;
  accountOnTrack: boolean;
  allDemandLimited: boolean;
  anyBudgetLimited: boolean;
  // Account-level day-of-week shaping. dowMultiplier is null/1 when shaping is
  // inert (pre-go-live rows or the known Edit-Fields multiplier bug).
  dowMultiplier: number | null;
  dowFlags: string;
  campaigns: GAdsPacingCampaign[];
}

// Keyword Build-Out (proposed keywords for review)
export type Confidence = 'high' | 'medium' | 'low' | '';

export interface KwBuildoutKeyword {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  proposedKeyword: string;
  proposedMatchType: string;   // PHRASE / EXACT / BROAD
  matchTypeBasis: string;
  sourceSearchTerm: string;
  searchTermStatus: string;
  servedByKeyword: string;     // existing keyword currently catching this traffic (the gap)
  conversions: number;
  cost: number;
  cpa: number;
  confidence: Confidence;
  flags: string;               // raw; split on comma for display
  needsNewAdGroup: boolean;
  status: string;
  approval: ApprovalStatus;    // '' | 'Approved' | 'Rejected'
  proposalId: string;          // unique per-proposal ID (sheet column proposal_id); write-back match key
}

export interface KwBuildoutRecord {
  id: string;          // = batchId
  batchId: string;
  loggedAt: string;    // date (YYYY-MM-DD)
  accountId: string;   // Google Ads account ID
  accountName: string; // practice
  keywords: KwBuildoutKeyword[];
}

// One approved keyword's identity, sent to the write-back webhook.
export interface KwBuildoutApprovedKey {
  proposal_id: string;
  campaign_id: string;
  ad_group_id: string;
  proposed_keyword: string;
  proposed_match_type: string;
}

// GMB Reply
export interface GmbReply {
  id: string;
  dateTime: string;
  accountName: string;
  reply: string;
  url: string;
}

// Blog Error (filtered out records)
export interface BlogError {
  id: string;
  date: string;
  practiceName: string;
  companyId: string;
  errorMessage: string;  // The blogTitle field contains the error
}

// GMB Post Error
export interface GmbPostError {
  id: string;
  date: string;
  practiceName: string;
  companyId: string;
  postTitle: string;     // Only displayed if reason is "processing"
  keyword: string;       // Only displayed if reason is "processing"
  reason: string;        // The URL field value ("processing" or "no account found" etc.)
}

// Error summary for dashboard
export interface ErrorSummaryData {
  blogErrors: number;
  gmbPostErrors: number;
}

// Union type for all content
export type ContentItem = BlogPost | GmbPost | GmbReply;

// Summary counts for dashboard cards
export interface SummaryData {
  blogs7d: number;
  gmbPosts7d: number;
  replies7d: number;
  negKeywordsTerms7d: number;
  gAdsPacingPending7d: number;
  kwBuildoutPending7d: number;
}

// API Response structure
export interface ContentResponse {
  blogs: BlogPost[];
  gmbPosts: GmbPost[];
  replies: GmbReply[];
  negKeywordReviews: NegKeywordReview[];
  gAdsPacing: GAdsPacingRecord[];
  kwBuildout: KwBuildoutRecord[];
  summary: SummaryData;
  practices: string[];
  accounts: string[];
  blogErrors: BlogError[];
  gmbPostErrors: GmbPostError[];
  errorSummary: ErrorSummaryData;
}

// Filter state
export interface FilterState {
  practice: string;
  dateRange: DateRange;
}

// Saved filter configuration
export interface SavedFilter {
  id: string;
  name: string;
  contentType: ContentType;
  practices: string[];  // Empty array = "all"
  dateRange: DateRange;
  createdAt: string;
}

// Saved filters collection (stored in localStorage)
export interface SavedFiltersStore {
  version: number;
  filters: SavedFilter[];
}

// Sort state
export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

// Tab configuration
export interface TabConfig {
  id: ContentType;
  label: string;
  columns: ColumnConfig[];
}

// Column configuration for tables
export interface ColumnConfig {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  truncate?: boolean;
}

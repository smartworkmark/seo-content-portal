import { BlogPost, GmbPost, GmbReply, NegKeywordReview, BlogError, GmbPostError, ContentResponse, ErrorSummaryData, GAdsPacingRecord, GAdsPacingCampaign, Severity, ApprovalStatus, RecommendationType, Classification, SkipReason } from '@/types';
import { getMockData, resetMockData } from './mock-data';
import { isValidUrl } from '@/lib/utils';

// Check if Google Sheets credentials are configured
function isConfigured(): boolean {
  return !!(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_API_KEY);
}

// Fetch data from a specific sheet using public API
async function fetchSheet(sheetName: string, range = 'A:Z'): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;
  const encodedSheetName = encodeURIComponent(sheetName);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!${range}?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store', // Disable caching for fresh data
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    throw error;
  }
}

// Sanitize blog URL by removing localhost prefixes
function sanitizeBlogUrl(url: string): string {
  if (!url) return '';

  // Remove localhost prefixes including the protocol and port
  // Examples:
  // - http://localhost:3000/example.com/path -> example.com/path
  // - https://localhost/example.com/path -> example.com/path
  // - localhost:3000/example.com/path -> example.com/path
  const localhostPattern = /^(https?:\/\/)?localhost(:\d+)?\//i;

  const sanitized = url.replace(localhostPattern, '');

  // If the URL doesn't start with http:// or https://, add https://
  if (sanitized && !sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    return `https://${sanitized}`;
  }

  return sanitized;
}

// Parse blogs from sheet data
// Actual columns: Date, Time, Practice Name, Practice URL, Blog Title, Post URL, Webflow Item ID, Webflow Collection ID, Keyword, Make Execution, companyId, rejected_keyword, keyword_notes, Hyperlocal Used, EEAT Included, Word Count, Hyperlocal Content, Reviews Content
function parseBlogs(rows: string[][]): { valid: BlogPost[]; errors: BlogError[] } {
  if (rows.length <= 1) return { valid: [], errors: [] }; // Skip if only header or empty

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dateIndex = headers.findIndex((h) => h === 'date');
  const timeIndex = headers.findIndex((h) => h === 'time');
  const practiceIndex = headers.findIndex((h) => h === 'practice name');
  const titleIndex = headers.findIndex((h) => h === 'blog title');
  const keywordIndex = headers.findIndex((h) => h === 'keyword');
  const urlIndex = headers.findIndex((h) => h === 'post url');
  const companyIdIndex = headers.findIndex((h) => h === 'companyid');
  // Enrichment feature columns — match actual sheet column names
  const hyperlocalBoolIndex = headers.findIndex((h) => h === 'hyperlocal used');
  const reviewsBoolIndex = headers.findIndex((h) => h === 'eeat included');
  const hyperlocalContentIndex = headers.findIndex((h) => h === 'hyperlocal content');
  const reviewContentIndex = headers.findIndex((h) => h === 'reviews content');

  const valid: BlogPost[] = [];
  const errors: BlogError[] = [];

  rows.slice(1).forEach((row, index) => {
    const date = row[dateIndex] || '';
    const time = row[timeIndex] || '';
    const dateTime = time ? `${date} ${time}` : date;
    const practiceName = row[practiceIndex] || '';
    const blogTitle = row[titleIndex] || '';
    const keyword = row[keywordIndex] || '';
    const url = sanitizeBlogUrl(row[urlIndex] || '');
    const companyId = companyIdIndex >= 0 ? (row[companyIdIndex] || '') : '';
    // Empty cell or absent column → false; only literal "TRUE" activates the feature
    const hyperlocalEnabled = hyperlocalBoolIndex >= 0
      ? row[hyperlocalBoolIndex]?.toString().toLowerCase() === 'true'
      : false;
    const reviewsEnabled = reviewsBoolIndex >= 0
      ? row[reviewsBoolIndex]?.toString().toLowerCase() === 'true'
      : false;
    const hyperlocalContent = hyperlocalContentIndex >= 0 ? (row[hyperlocalContentIndex] || null) : null;
    const reviewContent = reviewContentIndex >= 0 ? (row[reviewContentIndex] || null) : null;
    const features: string[] = [];
    if (hyperlocalEnabled) features.push('hyperlocal');
    if (reviewsEnabled) features.push('reviews');

    // Check if this is a valid record
    if (date && practiceName && blogTitle && isValidUrl(url)) {
      valid.push({
        id: `blog-${index + 1}`,
        date: dateTime,
        practiceName,
        companyId,
        blogTitle,
        keyword,
        url,
        hyperlocalEnabled,
        reviewsEnabled,
        hyperlocalContent,
        reviewContent,
        features,
      });
    } else if (date && practiceName) {
      // Error record: has date and practice but invalid/missing URL or title
      errors.push({
        id: `blog-error-${index + 1}`,
        date: dateTime,
        practiceName,
        companyId,
        errorMessage: blogTitle || 'Missing blog title or invalid URL',
      });
    }
  });

  return { valid, errors };
}

// Parse GMB posts from sheet data
// Actual columns: Date, Time, Practice Name, Practice URL, Post Title, Post URL, Make Execution, Keyword, CompanyID
function parseGmbPosts(rows: string[][]): { valid: GmbPost[]; errors: GmbPostError[] } {
  if (rows.length <= 1) return { valid: [], errors: [] };

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dateIndex = headers.findIndex((h) => h === 'date');
  const timeIndex = headers.findIndex((h) => h === 'time');
  const practiceIndex = headers.findIndex((h) => h === 'practice name');
  const titleIndex = headers.findIndex((h) => h === 'post title');
  const keywordIndex = headers.findIndex((h) => h === 'keyword');
  const urlIndex = headers.findIndex((h) => h === 'post url');
  const companyIdIndex = headers.findIndex((h) => h === 'companyid');

  const valid: GmbPost[] = [];
  const errors: GmbPostError[] = [];

  rows.slice(1).forEach((row, index) => {
    const date = row[dateIndex] || '';
    const time = row[timeIndex] || '';
    const dateTime = time ? `${date} ${time}` : date;
    const practiceName = row[practiceIndex] || '';
    const postTitle = row[titleIndex] || '';
    const keyword = row[keywordIndex] || '';
    const url = row[urlIndex] || '';
    const companyId = companyIdIndex >= 0 ? (row[companyIdIndex] || '') : '';

    // Check if this is a valid record
    if (date && practiceName && postTitle && isValidUrl(url)) {
      valid.push({
        id: `gmb-${index + 1}`,
        date: dateTime,
        practiceName,
        companyId,
        postTitle,
        keyword,
        url,
      });
    } else if (date && practiceName) {
      // Error record: has date and practice but invalid/missing URL
      // The URL field value IS the reason (e.g., "processing" or account error)
      errors.push({
        id: `gmb-error-${index + 1}`,
        date: dateTime,
        practiceName,
        companyId,
        postTitle,
        keyword,
        reason: url || 'Missing or invalid URL',
      });
    }
  });

  return { valid, errors };
}

// Parse replies from sheet data
// Actual columns: Account Name, Date Time, Reply, Reviews URL, Make Execution, Review ID, Location ID
function parseReplies(rows: string[][]): GmbReply[] {
  if (rows.length <= 1) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const accountIndex = headers.findIndex((h) => h === 'account name');
  const dateIndex = headers.findIndex((h) => h === 'date time');
  const replyIndex = headers.findIndex((h) => h === 'reply');
  const urlIndex = headers.findIndex((h) => h === 'reviews url');

  return rows.slice(1).map((row, index) => ({
    id: `reply-${index + 1}`,
    dateTime: row[dateIndex] || '',
    accountName: row[accountIndex] || '',
    reply: row[replyIndex] || '',
    url: row[urlIndex] || '',
  })).filter((reply) => reply.dateTime && reply.accountName && reply.reply && isValidUrl(reply.url));
}

// Parse negative keyword reviews from sheet data
// Actual columns: Practice, Campaign Name, Ad Channel Type, Report Start Date, Report End Date, Terms Reviewed, [Company ID if present]
function parseNegKeywordReviews(rows: string[][]): NegKeywordReview[] {
  if (rows.length <= 1) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const practiceIndex = headers.findIndex((h) => h === 'practice' || h === 'practice name');
  const campaignIndex = headers.findIndex((h) => h === 'campaign name');
  const termsIndex = headers.findIndex((h) => h.startsWith('terms review'));
  const dateIndex = headers.findIndex((h) => h === 'date time of review');
  const companyIdIndex = headers.findIndex((h) => h === 'company id' || h === 'companyid');

  return rows.slice(1).map((row, index) => ({
    id: `neg-kw-${index + 1}`,
    dateTime: row[dateIndex] || '',
    practiceName: row[practiceIndex] || '',
    companyId: companyIdIndex >= 0 ? (row[companyIdIndex] || '') : '',
    campaignName: row[campaignIndex] || '',
    termsReviewed: parseInt(row[termsIndex], 10) || 0,
  })).filter((review) => review.dateTime && review.practiceName);
}

// Parse G Ads Pacing rows (campaign-level) and group into per-account records keyed by (run_date, google_ads_id).
// Sheet columns: Run Date, run_id, practice_name, google_ads_id, HS ID, campaign_id, campaign_name,
// account_monthly_budget, account_actual_spend_mtd, campaign_actual_spend_mtd, account_expected_spend_mtd,
// account_variance_percent, account_current_daily_budget, campaign_current_daily_budget,
// account_proposed_daily_budget, campaign_proposed_daily_budget, spend_share, yesterday_account_proposed,
// account_proposed_multiple, campaign_proposed_multiple, status, recommendation_type, applied,
// correction_percent, damped_from, severity, approval_status, reviewed_by, notes
const VALID_SEVERITIES: readonly Severity[] = ['OK', 'Auto', 'Alert', 'Underpace', 'Critical', 'Investigate'] as const;
const VALID_RECOMMENDATIONS: readonly RecommendationType[] = [
  'PAUSE_CAMPAIGN',
  'BUDGET_DECREASE_APPROVAL',
  'BUDGET_INCREASE_APPROVAL',
  'BUDGET_DECREASE',
  'BUDGET_INCREASE',
  'NO_CHANGE',
] as const;

function toNum(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Returns null when the cell is empty/missing — distinguishes "no data" from 0.
function toNumOrNull(s: string | undefined): number | null {
  if (s === undefined || s === null) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function toBool(s: string | undefined): boolean {
  if (!s) return false;
  return String(s).trim().toLowerCase() === 'true';
}

const VALID_SKIP_REASONS: readonly SkipReason[] = [
  '',
  'ACCOUNT_ON_TRACK',
  'DEMAND_SIDE_ISSUE',
  'DEMAND_LIMITED_NO_CHANGE',
  'BUDGET_LIMITED_BUT_CHANGE_TOO_SMALL',
  'CHRONIC_DEMAND_LIMITED_DONOR',
  'CHRONIC_BUT_NO_BUDGET_LIMITED_SIBLING',
  'NO_MEANINGFUL_CHANGE',
  'MONTH_START_GRACE',
] as const;

function normalizeClassification(raw: string | undefined): Classification {
  const trimmed = (raw || '').trim().toUpperCase();
  if (trimmed === 'BUDGET_LIMITED') return 'BUDGET_LIMITED';
  if (trimmed === 'DEMAND_LIMITED') return 'DEMAND_LIMITED';
  return null;
}

function normalizeSkipReason(raw: string | undefined): SkipReason {
  const trimmed = (raw || '').trim().toUpperCase();
  if (!trimmed) return '';
  const found = VALID_SKIP_REASONS.find((r) => r === trimmed);
  return found ?? '';
}

function normalizeSeverity(raw: string): Severity {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'OK';
  // Match case-insensitively, return canonical capitalization
  const found = VALID_SEVERITIES.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  return found ?? 'OK';
}

function normalizeRecommendation(raw: string): RecommendationType | '' {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const found = VALID_RECOMMENDATIONS.find((r) => r === trimmed);
  return found ?? '';
}

function normalizeApprovalStatus(raw: string): ApprovalStatus {
  const trimmed = (raw || '').trim().toLowerCase();
  if (trimmed === 'approved') return 'Approved';
  if (trimmed === 'rejected') return 'Rejected';
  return '';
}

function parseGAdsPacing(rows: string[][]): GAdsPacingRecord[] {
  if (rows.length <= 1) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const idx = (name: string) => headers.findIndex((h) => h === name);

  const runDateIdx = idx('run date');
  const runIdIdx = idx('run_id');
  const practiceIdx = idx('practice_name');
  const googleAdsIdx = idx('google_ads_id');
  const hsIdIdx = idx('hs id');
  const campaignIdIdx = idx('campaign_id');
  const campaignNameIdx = idx('campaign_name');
  const monthlyBudgetIdx = idx('account_monthly_budget');
  const accountSpendIdx = idx('account_actual_spend_mtd');
  const campaignSpendIdx = idx('campaign_actual_spend_mtd');
  const expectedSpendIdx = idx('account_expected_spend_mtd');
  const varianceIdx = idx('account_variance_percent');
  const accountCurrentDailyIdx = idx('account_current_daily_budget');
  const campaignCurrentDailyIdx = idx('campaign_current_daily_budget');
  const accountProposedDailyIdx = idx('account_proposed_daily_budget');
  const campaignProposedDailyIdx = idx('campaign_proposed_daily_budget');
  const recommendationIdx = idx('recommendation_type');
  const severityIdx = idx('severity');
  const approvalIdx = idx('approval_status');
  const reviewedByIdx = idx('reviewed_by');
  const notesIdx = idx('notes');
  // V3 columns
  const classificationIdx = idx('classification');
  const isLostIdx = idx('search_budget_lost_is');
  const yesterdayUtilIdx = idx('yesterday_utilization');
  const utilDaysIdx = idx('utilization_days');
  const chronicIdx = idx('chronic_demand_limited');
  const skipReasonIdx = idx('skip_reason');
  const accountOnTrackIdx = idx('account_on_track');
  const allDemandLimitedIdx = idx('all_demand_limited');
  const anyBudgetLimitedIdx = idx('any_budget_limited');
  const conflictsIdx = idx('conflicts_with_pacing');
  const sevenDayUtilIdx = idx('seven_day_avg_utilization');

  const cell = (row: string[], i: number): string | undefined => (i >= 0 ? row[i] : undefined);

  const groups = new Map<string, GAdsPacingRecord>();

  rows.slice(1).forEach((row) => {
    const runDate = row[runDateIdx] || '';
    const googleAdsId = googleAdsIdx >= 0 ? (row[googleAdsIdx] || '') : '';
    if (!runDate || !googleAdsId) return;

    const key = `${runDate}|${googleAdsId}`;
    const campaign: GAdsPacingCampaign = {
      campaignId: campaignIdIdx >= 0 ? (row[campaignIdIdx] || '') : '',
      campaignName: campaignNameIdx >= 0 ? (row[campaignNameIdx] || '') : '',
      spendMtd: toNum(row[campaignSpendIdx]),
      currentDaily: toNum(row[campaignCurrentDailyIdx]),
      proposedDaily: toNum(row[campaignProposedDailyIdx]),
      recommendationType: normalizeRecommendation(row[recommendationIdx] || ''),
      classification: normalizeClassification(cell(row, classificationIdx)),
      searchBudgetLostIs: toNumOrNull(cell(row, isLostIdx)),
      yesterdayUtilization: toNumOrNull(cell(row, yesterdayUtilIdx)),
      sevenDayAvgUtilization: toNumOrNull(cell(row, sevenDayUtilIdx)),
      utilizationDays: Math.round(toNum(cell(row, utilDaysIdx))),
      chronicDemandLimited: toBool(cell(row, chronicIdx)),
      skipReason: normalizeSkipReason(cell(row, skipReasonIdx)),
      conflictsWithPacing: toBool(cell(row, conflictsIdx)),
    };

    const existing = groups.get(key);
    if (existing) {
      existing.campaigns.push(campaign);
      // Fill in account-level fields if a later row has values where the first didn't
      if (!existing.severity || existing.severity === 'OK') {
        const sev = normalizeSeverity(row[severityIdx] || '');
        if (sev !== 'OK') existing.severity = sev;
      }
      if (!existing.approvalStatus) {
        existing.approvalStatus = normalizeApprovalStatus(row[approvalIdx] || '');
      }
      if (!existing.reviewedBy && reviewedByIdx >= 0) {
        existing.reviewedBy = row[reviewedByIdx] || '';
      }
      if (!existing.notes && notesIdx >= 0) {
        existing.notes = row[notesIdx] || '';
      }
      // Account-level booleans: any TRUE wins (they should be uniform across campaign rows
      // of an account, but defend against partial fills the same way severity/notes do).
      if (!existing.accountOnTrack) existing.accountOnTrack = toBool(cell(row, accountOnTrackIdx));
      if (!existing.allDemandLimited) existing.allDemandLimited = toBool(cell(row, allDemandLimitedIdx));
      if (!existing.anyBudgetLimited) existing.anyBudgetLimited = toBool(cell(row, anyBudgetLimitedIdx));
    } else {
      groups.set(key, {
        id: key,
        runDate,
        runId: runIdIdx >= 0 ? (row[runIdIdx] || '') : '',
        practiceName: practiceIdx >= 0 ? (row[practiceIdx] || '') : '',
        googleAdsId,
        companyId: hsIdIdx >= 0 ? (row[hsIdIdx] || '') : '',
        monthlyBudget: toNum(row[monthlyBudgetIdx]),
        spendMtd: toNum(row[accountSpendIdx]),
        expectedSpendMtd: toNum(row[expectedSpendIdx]),
        variancePercent: toNum(row[varianceIdx]),
        currentDailyBudget: toNum(row[accountCurrentDailyIdx]),
        proposedDailyBudget: toNum(row[accountProposedDailyIdx]),
        severity: normalizeSeverity(row[severityIdx] || ''),
        approvalStatus: normalizeApprovalStatus(row[approvalIdx] || ''),
        reviewedBy: reviewedByIdx >= 0 ? (row[reviewedByIdx] || '') : '',
        notes: notesIdx >= 0 ? (row[notesIdx] || '') : '',
        accountOnTrack: toBool(cell(row, accountOnTrackIdx)),
        allDemandLimited: toBool(cell(row, allDemandLimitedIdx)),
        anyBudgetLimited: toBool(cell(row, anyBudgetLimitedIdx)),
        campaigns: [campaign],
      });
    }
  });

  return Array.from(groups.values());
}

// Helper to parse date strings
function parseDate(dateStr: string): Date {
  // Try to parse date string (handles formats like "2025-09-15" or "2025-09-15 15:12" or "2025-11-20 17:44")
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date(0) : date;
}

// Calculate summary statistics
function calculateSummary(
  blogs: BlogPost[],
  gmbPosts: GmbPost[],
  replies: GmbReply[],
  negKeywordReviews: NegKeywordReview[],
  gAdsPacing: GAdsPacingRecord[]
) {
  // Use 6 days ago to get a 7-day window inclusive of today (matches client-side '7d' filter)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const blogs7d = blogs.filter((b) => parseDate(b.date) >= sevenDaysAgo).length;
  const gmbPosts7d = gmbPosts.filter((p) => parseDate(p.date) >= sevenDaysAgo).length;
  const replies7d = replies.filter((r) => parseDate(r.dateTime) >= sevenDaysAgo).length;
  const negKeywordsTerms7d = negKeywordReviews
    .filter((n) => parseDate(n.dateTime) >= sevenDaysAgo)
    .reduce((sum, n) => sum + n.termsReviewed, 0);
  const gAdsPacingPending7d = gAdsPacing.filter(
    (g) => parseDate(g.runDate) >= sevenDaysAgo && g.approvalStatus === ''
  ).length;

  return {
    blogs7d,
    gmbPosts7d,
    replies7d,
    negKeywordsTerms7d,
    gAdsPacingPending7d,
  };
}

// Calculate error summary statistics (last 7 days only)
function calculateErrorSummary(
  blogErrors: BlogError[],
  gmbPostErrors: GmbPostError[]
): ErrorSummaryData {
  // Use 6 days ago to get a 7-day window inclusive of today (matches client-side '7d' filter)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return {
    blogErrors: blogErrors.filter((e) => parseDate(e.date) >= sevenDaysAgo).length,
    gmbPostErrors: gmbPostErrors.filter((e) => parseDate(e.date) >= sevenDaysAgo).length,
  };
}

// Main function to fetch all content
export async function fetchAllContent(forceRefresh = false): Promise<ContentResponse> {
  // Use mock data if Google Sheets is not configured
  if (!isConfigured()) {
    console.log('Google Sheets not configured, using mock data');
    return forceRefresh ? resetMockData() : getMockData();
  }

  try {
    // Fetch all sheets in parallel (newer sheets may not exist yet — gracefully return empty)
    const [blogsData, gmbPostsData, repliesData, negKeywordsData, gAdsPacingData] = await Promise.all([
      fetchSheet('Blogs'),
      fetchSheet('GMB Posts'),
      fetchSheet('GMB Replies'),
      fetchSheet('Negative Keywords').catch(() => [] as string[][]),
      fetchSheet('G Ads Pacing', 'A:AN').catch(() => [] as string[][]),
    ]);

    const { valid: blogs, errors: blogErrors } = parseBlogs(blogsData);
    const { valid: gmbPosts, errors: gmbPostErrors } = parseGmbPosts(gmbPostsData);
    const replies = parseReplies(repliesData);
    const negKeywordReviews = parseNegKeywordReviews(negKeywordsData);
    const gAdsPacing = parseGAdsPacing(gAdsPacingData);

    // Sort by date descending
    blogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    gmbPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    replies.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    negKeywordReviews.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    gAdsPacing.sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime());
    blogErrors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    gmbPostErrors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Extract unique practices and accounts (include practices from errors, neg keywords, and pacing too)
    const practices = [...new Set([
      ...blogs.map((b) => b.practiceName),
      ...gmbPosts.map((p) => p.practiceName),
      ...negKeywordReviews.map((n) => n.practiceName),
      ...gAdsPacing.map((g) => g.practiceName),
      ...blogErrors.map((e) => e.practiceName),
      ...gmbPostErrors.map((e) => e.practiceName),
    ].filter(Boolean))].sort();

    const accounts = [...new Set(replies.map((r) => r.accountName))].sort();

    return {
      blogs,
      gmbPosts,
      replies,
      negKeywordReviews,
      gAdsPacing,
      summary: calculateSummary(blogs, gmbPosts, replies, negKeywordReviews, gAdsPacing),
      practices,
      accounts,
      blogErrors,
      gmbPostErrors,
      errorSummary: calculateErrorSummary(blogErrors, gmbPostErrors),
    };
  } catch (error) {
    console.error('Error fetching from Google Sheets, falling back to mock data:', error);
    return forceRefresh ? resetMockData() : getMockData();
  }
}

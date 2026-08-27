import { BlogPost, GmbPost, GmbReply, NegKeywordReview, BlogError, GmbPostError, ContentResponse, ErrorSummaryData, GAdsPacingRecord, GAdsPacingCampaign, RecommendationType, Severity, Classification, SkipReason } from '@/types';
import { currentMonthPausedGAdsPacing, displayStatusFromVariance, lastMonthGAdsPacing } from '@/lib/g-ads-pacing';

// Sample practice names
const practices = [
  'Smile Dental Care',
  'Family Dentistry',
  'Bright Smiles Clinic',
  'Downtown Dental',
  'Riverside Dental Group',
  'Premier Dental Associates',
  'Gentle Care Dentistry',
  'Modern Dental Studio',
];

// Sample keywords
const keywords = [
  'dental implants',
  'teeth whitening',
  'invisalign',
  'root canal',
  'dental cleaning',
  'cosmetic dentistry',
  'emergency dental',
  'pediatric dentistry',
  'dental crowns',
  'gum disease',
];

// Sample HubSpot company IDs (some empty to simulate missing data)
const companyIds = ['22697001', '22697002', '22697003', '22697004', '22697005', '', '', ''];

// Sample blog titles
const blogTitles = [
  '5 Signs You Need a Dental Checkup',
  'The Benefits of Regular Dental Cleanings',
  'Understanding Dental Implants: A Complete Guide',
  'How to Maintain Your Smile After Whitening',
  'Invisalign vs Traditional Braces: Which is Right for You?',
  'Tips for Overcoming Dental Anxiety',
  'The Connection Between Oral Health and Overall Health',
  'What to Expect During a Root Canal Procedure',
  'Choosing the Right Toothbrush for Your Needs',
  'Foods That Are Good (and Bad) for Your Teeth',
];

// Sample GMB post titles
const gmbPostTitles = [
  'New Patient Special: 50% Off First Visit!',
  'Meet Our New Dental Hygienist',
  'Extended Hours Now Available',
  'Thank You for 5-Star Reviews!',
  'Holiday Hours Update',
  'New Teeth Whitening Technology',
  'Join Us for Community Dental Day',
  'Insurance Accepted - Check Your Coverage',
  'Patient Testimonial Spotlight',
  'Now Offering Same-Day Appointments',
];

// Sample replies
const sampleReplies = [
  'Thank you so much for your kind words! We are delighted to hear about your positive experience with our team. We look forward to seeing you at your next appointment!',
  'We appreciate you taking the time to share your feedback. Our team works hard to provide excellent care, and reviews like yours motivate us to keep improving.',
  'Thank you for your review! We are sorry to hear your experience was not perfect. Please contact our office so we can address your concerns directly.',
  'We are thrilled you had a great visit! Dr. Smith and the entire team appreciate your trust in us for your dental care needs.',
  'Thank you for the 5-star review! We are committed to making every visit comfortable and enjoyable for our patients.',
];

// Generate random date within range
function randomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  date.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM - 8 PM
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

// Enrichment patterns for mock data (cycles through to give a mix of feature combinations)
const enrichmentPatterns = [
  { hyperlocalEnabled: true, reviewsEnabled: true,
    hyperlocalContent: 'Yucaipa Boulevard, Chapman Heights, Wildwood Canyon State Park',
    reviewContent: 'Dr. Patel and the team made my first visit so comfortable. The office is easy to find and the staff is incredibly welcoming. Five stars all around!' },
  { hyperlocalEnabled: true, reviewsEnabled: false,
    hyperlocalContent: 'Sunnymead Ranch, TownGate, Moreno Valley Mall area',
    reviewContent: null },
  { hyperlocalEnabled: false, reviewsEnabled: true,
    hyperlocalContent: null,
    reviewContent: 'Had a cracked tooth on a Saturday and they got me in same day. Truly grateful for the emergency availability.' },
  { hyperlocalEnabled: false, reviewsEnabled: false, hyperlocalContent: null, reviewContent: null },
];

// Generate mock blogs
function generateBlogs(count: number): BlogPost[] {
  const blogs: BlogPost[] = [];
  for (let i = 0; i < count; i++) {
    const pattern = enrichmentPatterns[i % enrichmentPatterns.length];
    const features: string[] = [];
    if (pattern.hyperlocalEnabled) features.push('hyperlocal');
    if (pattern.reviewsEnabled) features.push('reviews');
    blogs.push({
      id: `blog-${i + 1}`,
      date: randomDate(90),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      companyId: companyIds[Math.floor(Math.random() * companyIds.length)],
      blogTitle: blogTitles[Math.floor(Math.random() * blogTitles.length)],
      keyword: keywords[Math.floor(Math.random() * keywords.length)],
      url: `https://example.com/blog/${i + 1}`,
      ...pattern,
      features,
    });
  }
  return blogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Generate mock GMB posts
function generateGmbPosts(count: number): GmbPost[] {
  const posts: GmbPost[] = [];
  for (let i = 0; i < count; i++) {
    posts.push({
      id: `gmb-${i + 1}`,
      date: randomDate(90),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      companyId: companyIds[Math.floor(Math.random() * companyIds.length)],
      postTitle: gmbPostTitles[Math.floor(Math.random() * gmbPostTitles.length)],
      keyword: keywords[Math.floor(Math.random() * keywords.length)],
      url: `https://business.google.com/posts/${i + 1}`,
    });
  }
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Generate mock replies
function generateReplies(count: number): GmbReply[] {
  const replies: GmbReply[] = [];
  for (let i = 0; i < count; i++) {
    replies.push({
      id: `reply-${i + 1}`,
      dateTime: randomDate(90),
      accountName: practices[Math.floor(Math.random() * practices.length)],
      reply: sampleReplies[Math.floor(Math.random() * sampleReplies.length)],
      url: `https://business.google.com/reviews/${i + 1}`,
    });
  }
  return replies.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

// Sample campaign names for negative keywords
const campaignNames = [
  'Brand Campaign',
  'Implants - Broad Match',
  'Emergency Dental',
  'Cosmetic Dentistry',
  'Invisalign Campaign',
  'General Dentistry - Local',
  'Teeth Whitening Ads',
  'New Patient Campaign',
];

// Generate mock negative keyword reviews
const AD_CHANNEL_TYPES = ['Search', 'PMAX'] as const;

function generateNegKeywordReviews(count: number): NegKeywordReview[] {
  const reviews: NegKeywordReview[] = [];
  for (let i = 0; i < count; i++) {
    reviews.push({
      id: `neg-kw-${i + 1}`,
      dateTime: randomDate(14),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      companyId: companyIds[Math.floor(Math.random() * companyIds.length)],
      campaignName: campaignNames[Math.floor(Math.random() * campaignNames.length)],
      adChannelType: AD_CHANNEL_TYPES[Math.floor(Math.random() * AD_CHANNEL_TYPES.length)],
      termsReviewed: Math.floor(Math.random() * 50) + 1,
    });
  }
  return reviews.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

// Sample error messages for blogs
const blogErrorMessages = [
  'Error: Unable to publish to Webflow',
  'Error: Duplicate content detected',
  'Error: API rate limit exceeded',
  'Error: Invalid Webflow collection ID',
  'Error: Image upload failed',
];

// Sample GMB error reasons
const gmbErrorReasons = [
  'processing',
  'No GMB account found for this practice',
  'GMB API authentication failed',
  'processing',
  'Account suspended - manual review required',
  'processing',
];

// Generate mock blog errors
function generateBlogErrors(count: number): BlogError[] {
  const errors: BlogError[] = [];
  for (let i = 0; i < count; i++) {
    errors.push({
      id: `blog-error-${i + 1}`,
      date: randomDate(90),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      companyId: companyIds[Math.floor(Math.random() * companyIds.length)],
      errorMessage: blogErrorMessages[Math.floor(Math.random() * blogErrorMessages.length)],
    });
  }
  return errors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Generate mock GMB post errors
function generateGmbPostErrors(count: number): GmbPostError[] {
  const errors: GmbPostError[] = [];
  for (let i = 0; i < count; i++) {
    const reason = gmbErrorReasons[Math.floor(Math.random() * gmbErrorReasons.length)];
    const isProcessing = reason.toLowerCase() === 'processing';
    errors.push({
      id: `gmb-error-${i + 1}`,
      date: randomDate(90),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      companyId: companyIds[Math.floor(Math.random() * companyIds.length)],
      postTitle: isProcessing ? gmbPostTitles[Math.floor(Math.random() * gmbPostTitles.length)] : '',
      keyword: isProcessing ? keywords[Math.floor(Math.random() * keywords.length)] : '',
      reason,
    });
  }
  return errors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Calculate error summary (last 7 days only)
function calculateErrorSummary(blogErrors: BlogError[], gmbPostErrors: GmbPostError[]): ErrorSummaryData {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return {
    blogErrors: blogErrors.filter((e) => new Date(e.date) >= sevenDaysAgo).length,
    gmbPostErrors: gmbPostErrors.filter((e) => new Date(e.date) >= sevenDaysAgo).length,
  };
}

// Calculate summary data
function calculateSummary(
  blogs: BlogPost[],
  gmbPosts: GmbPost[],
  replies: GmbReply[],
  negKeywordReviews: NegKeywordReview[],
  gAdsPacing: GAdsPacingRecord[]
): { blogs7d: number; gmbPosts7d: number; replies7d: number; negKeywordsTerms7d: number; gAdsPacingPending7d: number; kwBuildoutPending7d: number } {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const blogs7d = blogs.filter((b) => new Date(b.date) >= sevenDaysAgo).length;
  const gmbPosts7d = gmbPosts.filter((p) => new Date(p.date) >= sevenDaysAgo).length;
  const replies7d = replies.filter((r) => new Date(r.dateTime) >= sevenDaysAgo).length;
  const negKeywordsTerms7d = negKeywordReviews
    .filter((n) => new Date(n.dateTime) >= sevenDaysAgo)
    .reduce((sum, n) => sum + n.termsReviewed, 0);
  const gAdsPacingPending7d = gAdsPacing.filter(
    (g) => new Date(g.runDate) >= sevenDaysAgo && g.approvalStatus === ''
  ).length;

  return {
    blogs7d,
    gmbPosts7d,
    replies7d,
    negKeywordsTerms7d,
    gAdsPacingPending7d,
    kwBuildoutPending7d: 0,
  };
}

// Generate g-ads pacing mock records.
// Distributes scenarios so dev/no-API mode exercises every UI path:
//   on-track, budget-limited, all-demand-limited, chronic, mixed, month-start grace, conflict.
type Scenario =
  | 'on-track'
  | 'budget-limited'
  | 'all-demand'
  | 'chronic'
  | 'mixed'
  | 'grace'
  | 'conflict'
  | 'dow';

function pickScenario(i: number): Scenario {
  // Deterministic distribution. 'dow' exercises day-of-week shaping (multiplier != 1,
  // DOW_ADJUSTMENT rows, an auto-promoted decrease).
  const m = i % 20;
  if (m < 5) return 'on-track';
  if (m < 10) return 'budget-limited';
  if (m < 14) return 'all-demand';
  if (m < 16) return 'chronic';
  if (m === 16) return 'mixed';
  if (m === 17) return 'grace';
  if (m === 18) return 'conflict';
  return 'dow';
}

function buildCampaign(
  i: number,
  j: number,
  base: number,
  spendShare: number,
  scenario: Scenario,
  dowMultiplier: number,
): GAdsPacingCampaign {
  const campaignNames = ['General Dentistry', 'Implants', 'Emergency', 'Cosmetic'];
  const currentDaily = Math.round(base / 30);
  const spendMtd = Math.round(base * spendShare);
  let recommendationType: RecommendationType | '' = 'NO_CHANGE';
  let classification: Classification = null;
  let searchBudgetLostIs: number | null = 0;
  let yesterdayUtilization: number | null = null;
  let sevenDayAvgUtilization: number | null = null;
  let utilizationDays = 0;
  let chronicDemandLimited = false;
  let skipReason: SkipReason = '';
  let conflictsWithPacing = false;
  let proposedDaily = currentDaily;
  let autoDecreasePromoted = false;
  let appliedDecreasePercent: number | null = null;

  switch (scenario) {
    case 'on-track':
      classification = j % 2 === 0 ? 'BUDGET_LIMITED' : 'DEMAND_LIMITED';
      sevenDayAvgUtilization = 60 + ((i + j) % 30);
      yesterdayUtilization = sevenDayAvgUtilization;
      utilizationDays = 6;
      recommendationType = 'NO_CHANGE';
      skipReason = 'ACCOUNT_ON_TRACK';
      searchBudgetLostIs = classification === 'BUDGET_LIMITED' ? 5 + ((i + j) % 10) : 0;
      break;
    case 'budget-limited':
      classification = 'BUDGET_LIMITED';
      sevenDayAvgUtilization = 95 + ((i + j) % 60);
      yesterdayUtilization = sevenDayAvgUtilization;
      utilizationDays = 7;
      searchBudgetLostIs = 15 + ((i + j * 7) % 50);
      recommendationType = j === 0 ? 'BUDGET_INCREASE_APPROVAL' : 'BUDGET_INCREASE';
      proposedDaily = Math.round(currentDaily * 1.2);
      break;
    case 'all-demand':
      classification = 'DEMAND_LIMITED';
      sevenDayAvgUtilization = 15 + ((i + j) % 35);
      yesterdayUtilization = sevenDayAvgUtilization;
      utilizationDays = 4;
      recommendationType = 'NO_CHANGE';
      skipReason = 'DEMAND_SIDE_ISSUE';
      break;
    case 'chronic':
      classification = 'DEMAND_LIMITED';
      chronicDemandLimited = j === 0; // one campaign chronic
      sevenDayAvgUtilization = 20 + ((i + j) % 25);
      yesterdayUtilization = sevenDayAvgUtilization;
      utilizationDays = 7;
      recommendationType = 'NO_CHANGE';
      skipReason = chronicDemandLimited ? 'CHRONIC_DEMAND_LIMITED_DONOR' : 'DEMAND_LIMITED_NO_CHANGE';
      break;
    case 'mixed':
      // Half the campaigns budget-limited, half demand-limited.
      classification = j % 2 === 0 ? 'BUDGET_LIMITED' : 'DEMAND_LIMITED';
      sevenDayAvgUtilization = classification === 'BUDGET_LIMITED' ? 110 + (j * 5) : 35 + (j * 4);
      yesterdayUtilization = sevenDayAvgUtilization;
      utilizationDays = 6;
      if (classification === 'BUDGET_LIMITED') {
        recommendationType = 'BUDGET_INCREASE';
        proposedDaily = Math.round(currentDaily * 1.15);
        searchBudgetLostIs = 25 + (j * 3);
      } else {
        recommendationType = 'NO_CHANGE';
        skipReason = 'DEMAND_LIMITED_NO_CHANGE';
      }
      break;
    case 'grace':
      classification = null;
      sevenDayAvgUtilization = null;
      yesterdayUtilization = null;
      utilizationDays = 0;
      recommendationType = 'NO_CHANGE';
      skipReason = 'MONTH_START_GRACE';
      break;
    case 'conflict':
      classification = 'BUDGET_LIMITED';
      sevenDayAvgUtilization = 130 + (j * 10);
      yesterdayUtilization = sevenDayAvgUtilization;
      utilizationDays = 7;
      // Account is overpacing but this campaign wants more budget — conflict.
      recommendationType = j === 0 ? 'BUDGET_INCREASE_APPROVAL' : 'BUDGET_DECREASE_APPROVAL';
      conflictsWithPacing = j === 0;
      proposedDaily = Math.round(currentDaily * (j === 0 ? 1.25 : 0.7));
      searchBudgetLostIs = 30 + (j * 5);
      break;
    case 'dow':
      // Day-of-week shaping is live (multiplier != 1). Pacing mostly says "hold",
      // but the shaped budget moves the live number, so rows become DOW_ADJUSTMENT.
      classification = j % 2 === 0 ? 'BUDGET_LIMITED' : 'DEMAND_LIMITED';
      sevenDayAvgUtilization = classification === 'BUDGET_LIMITED' ? 92 + (j * 4) : 45 + (j * 4);
      yesterdayUtilization = sevenDayAvgUtilization;
      utilizationDays = 7;
      if (j === 0) {
        // An auto-promoted decrease (Bill's June rule).
        recommendationType = 'BUDGET_DECREASE';
        proposedDaily = Math.round(currentDaily * 0.78);
        autoDecreasePromoted = true;
        appliedDecreasePercent = 22;
      } else {
        // Pacing held, but day-of-week shaping nudges the budget → DOW_ADJUSTMENT.
        recommendationType = 'DOW_ADJUSTMENT';
        proposedDaily = currentDaily;
        skipReason = classification === 'BUDGET_LIMITED' ? 'BUDGET_LIMITED_NO_DECREASE' : 'DEMAND_LIMITED_NO_CHANGE';
        searchBudgetLostIs = classification === 'BUDGET_LIMITED' ? 12 + (j * 3) : 0;
      }
      break;
  }

  return {
    campaignId: `${20000000 + i * 10 + j}`,
    campaignName: campaignNames[j % campaignNames.length],
    spendMtd,
    currentDaily,
    proposedDaily,
    recommendationType,
    classification,
    searchBudgetLostIs,
    yesterdayUtilization,
    sevenDayAvgUtilization,
    utilizationDays,
    chronicDemandLimited,
    skipReason,
    conflictsWithPacing,
    // final = base proposed x day-of-week multiplier (clamped is handled upstream;
    // mock keeps it simple). With multiplier 1 this equals proposedDaily, matching
    // the current inert real-world data.
    finalDailyBudget: Math.round(proposedDaily * dowMultiplier),
    autoDecreasePromoted,
    appliedDecreasePercent,
    // Budget allocation defaults — some accounts are seeded as "managed" in generateGAdsPacing.
    budgetDollars: null,
    sharedBudget: false,
    effectiveMode: null,
    statusReason: '',
    paused: false,
    pausedDate: '',
    // Live Google Ads state. Default ENABLED; the paused-seeding block below flips the
    // campaigns it pauses to 'PAUSED' so campaign_status tracks paused_by_agent in mock.
    campaignStatus: 'ENABLED',
    // New serving-status column. Default SERVING; the ended-seeding block below flips some
    // campaigns to 'ENDED' while leaving campaignStatus at 'ENABLED' — matching the real-world
    // case where Google Ads doesn't flip campaign_status just because serving ended.
    campaignServingStatus: 'SERVING',
  };
}

function generateGAdsPacing(count: number): GAdsPacingRecord[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (i % 7));
    const runDate = d.toISOString().slice(0, 10);
    const practice = practices[i % practices.length];
    const googleAdsId = `${1000000000 + i}`;
    const monthlyBudget = 2000 + (i % 5) * 500;
    const scenario = pickScenario(i);

    let severity: Severity = 'OK';
    let variance = 0;
    let accountOnTrack = false;
    let allDemandLimited = false;
    let anyBudgetLimited = false;

    switch (scenario) {
      case 'on-track':
        severity = 'OK';
        variance = -3 + ((i % 5) - 2);
        accountOnTrack = true;
        anyBudgetLimited = true; // mixed but on-track
        break;
      case 'budget-limited':
        severity = i % 3 === 0 ? 'Underpace' : 'Alert';
        variance = -25 + ((i * 5) % 15);
        anyBudgetLimited = true;
        break;
      case 'all-demand':
        severity = 'Investigate';
        variance = -45 + ((i * 3) % 20);
        allDemandLimited = true;
        break;
      case 'chronic':
        severity = 'Investigate';
        variance = -40 + ((i * 4) % 15);
        allDemandLimited = true;
        break;
      case 'mixed':
        severity = 'Alert';
        variance = -10;
        anyBudgetLimited = true;
        break;
      case 'grace':
        severity = 'OK';
        variance = 0;
        break;
      case 'conflict':
        severity = 'Critical';
        variance = 22 + (i % 10);
        anyBudgetLimited = true;
        break;
      case 'dow':
        severity = 'Auto';
        variance = -6 + (i % 8);
        anyBudgetLimited = true;
        break;
    }

    // Client-facing display_status column. Seed it on ~half the rows (even i) so the column
    // path is exercised, leave it blank on odd i so the variance fallback fires, and give
    // i % 10 === 7 an intentionally divergent value to prove the column wins over variance.
    const displayStatus =
      i % 10 === 7 ? 'On Track'
      : i % 2 === 0 ? displayStatusFromVariance(variance)
      : '';

    // Day-of-week multiplier is inert (1) for every scenario except 'dow', mirroring
    // current production data where the shaping isn't applied yet.
    const dowMultiplier = scenario === 'dow' ? 1.2 : 1;
    const dowFlags = scenario === 'dow' && i % 2 === 0 ? 'CATCH_UP_HALVED' : '';

    const expected = monthlyBudget * 0.7;
    const spend = Math.round(expected * (1 + variance / 100));
    const numCampaigns = scenario === 'mixed' || scenario === 'dow' ? 4 : 2 + (i % 3);
    const campaigns: GAdsPacingCampaign[] = Array.from({ length: numCampaigns }, (_, j) =>
      buildCampaign(i, j, monthlyBudget, 1 / numCampaigns, scenario, dowMultiplier),
    );

    // Seed campaign-level budget allocation on a subset of accounts so the feature is
    // demoable against mock data:
    //   i % 6 === 0 -> fully managed, campaign-level (budgets ~= monthly budget)
    //   i % 6 === 3 -> managed intent but reverted to account-level (one shared campaign)
    let budgetConfig: GAdsPacingRecord['budgetConfig'] = null;
    let effectiveMode: GAdsPacingRecord['effectiveMode'] = 'account';
    let statusReason = '';
    if (scenario !== 'grace' && i % 6 === 0) {
      budgetConfig = { googleAdsId, managed: true, updatedBy: 'Mark', updatedAt: runDate };
      effectiveMode = 'campaign';
      campaigns.forEach((c, j) => {
        c.budgetDollars = Math.round(monthlyBudget / campaigns.length) + (j === 0 ? monthlyBudget % campaigns.length : 0);
        c.sharedBudget = false;
        c.effectiveMode = 'campaign';
        c.statusReason = '';
      });
    } else if (scenario !== 'grace' && i % 6 === 3 && campaigns.length > 1) {
      budgetConfig = { googleAdsId, managed: true, updatedBy: 'Mark', updatedAt: runDate };
      effectiveMode = 'account';
      statusReason = 'A targeted campaign is on a shared budget — pacing runs at the account level.';
      campaigns.forEach((c, j) => {
        c.budgetDollars = j === 0 ? null : Math.round(monthlyBudget / (campaigns.length - 1));
        c.sharedBudget = j === 0; // first campaign is on a shared budget (ineligible)
        c.effectiveMode = 'account';
        c.statusReason = j === 0 ? 'On a shared Google Ads budget.' : '';
      });
    }

    // Seed paused campaigns so the "Paused" status is demoable against mock data:
    //   i % 6 === 4 -> every campaign paused (account reads as "Paused", row dimmed)
    //   i % 6 === 1 with >1 campaign -> only the first campaign paused (account keeps its
    //     pacing status; the campaign shows a "paused" tag on expand)
    //   i % 6 === 0 with >1 campaign -> managed account whose LAST campaign is paused while
    //     still holding its allocation. This is the stranded-budget case the allocation editor
    //     greys out ("paused — $X held, not steering"); without it the held-amount path and the
    //     under-allocation warning it produces aren't reachable from mock data.
    if (scenario !== 'grace' && i % 6 === 4) {
      campaigns.forEach((c) => {
        c.paused = true;
        c.pausedDate = runDate;
        c.campaignStatus = 'PAUSED';
      });
    } else if (i % 6 === 1 && campaigns.length > 1) {
      campaigns[0].paused = true;
      campaigns[0].pausedDate = runDate;
      campaigns[0].campaignStatus = 'PAUSED';
    } else if (scenario !== 'grace' && i % 6 === 0 && campaigns.length > 1) {
      // Paused in Google Ads but NOT paused_by_agent — the two signals are distinct, and the
      // allocation editor must key on campaignStatus.
      campaigns[campaigns.length - 1].campaignStatus = 'PAUSED';
      // A second, distinct held campaign on the same managed account: ended (not paused),
      // still campaignStatus ENABLED. Exercises the mixed "N paused, M ended" held summary and
      // the "ended" denotation in the Budget Allocation card's held-row tag.
      if (campaigns.length > 2) {
        campaigns[0].campaignServingStatus = 'ENDED';
      }
    } else if (scenario !== 'grace' && i % 6 === 2) {
      // Every campaign has ended (serving lapsed) while staying campaignStatus ENABLED, so they
      // remain visible in the campaign breakdown table with the "ended" tag — unlike an
      // all-paused account (i % 6 === 4), whose campaigns are PAUSED in Google Ads and so are
      // filtered out of that same table. Also exercises the unmanaged account's "All campaigns
      // have ended" message.
      campaigns.forEach((c) => {
        c.campaignServingStatus = 'ENDED';
      });
    }

    return {
      id: `${runDate}|${googleAdsId}`,
      runDate,
      pauseDates: campaigns
        .filter((campaign) => campaign.paused && campaign.pausedDate)
        .map((campaign) => campaign.pausedDate),
      runId: `mock-run-${i}`,
      practiceName: practice,
      googleAdsId,
      companyId: companyIds[i % companyIds.length] || '',
      monthlyBudget,
      spendMtd: spend,
      expectedSpendMtd: Math.round(expected),
      variancePercent: variance,
      currentDailyBudget: Math.round(monthlyBudget / 30),
      proposedDailyBudget: Math.round(monthlyBudget / 30),
      severity,
      displayStatus,
      approvalStatus: !accountOnTrack && scenario !== 'grace' && i % 5 === 0 ? 'Approved' : '',
      reviewedBy: !accountOnTrack && scenario !== 'grace' && i % 5 === 0 ? 'Mark' : '',
      notes: '',
      accountOnTrack,
      allDemandLimited,
      anyBudgetLimited,
      dowMultiplier,
      dowFlags,
      campaigns,
      budgetConfig,
      effectiveMode,
      statusReason,
      // Each mock account gets exactly one record (googleAdsId is derived from i), so every
      // row is its own latest and the allocation editor is never stale-gated here. The stale
      // path needs real multi-day history to exercise.
      accountLatestRunDate: runDate,
    };
  });
}

// Prior-month pacing history, so the Last month view is exercisable on the mock fallback path
// (which is what runs whenever Sheets is unconfigured OR rate-limited — i.e. most local testing).
// generateGAdsPacing only ever emits rows inside the last 7 days, so without this the view is
// empty. Real history comes from the append-only sheet.
function generatePriorMonthGAdsPacing(current: GAdsPacingRecord[]): GAdsPacingRecord[] {
  const today = new Date();
  // Day 0 of the current month is the last day of the previous month — correct across the
  // January boundary, where it yields December 31 of the prior year.
  const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
  const prevYear = lastDayPrev.getFullYear();
  const prevMonth = lastDayPrev.getMonth();
  const daysInPrev = lastDayPrev.getDate();
  const dateKey = (day: number) =>
    `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const buildRow = (
    source: GAdsPacingRecord,
    i: number,
    day: number,
    monthlyBudget: number,
    spend: number,
    dropLastCampaign: boolean,
  ): GAdsPacingRecord => {
    const runDate = dateKey(day);
    const expected = monthlyBudget * (day / daysInPrev);
    const variance = expected > 0 ? Math.round(((spend - expected) / expected) * 100) : 0;

    // Deep-clone: sharing campaign objects with the current-month rows would let a mutation in
    // one view surface in the other.
    const campaigns = source.campaigns.map((c) => ({
      ...c,
      // Pause state is current-month runtime state and must not be projected onto a closed
      // month. campaignStatus is kept on the trailing campaign of some accounts so the panel's
      // "paused" tag (and the all-campaigns-shown rule) stays exercised.
      paused: false,
      pausedDate: '',
    }));
    if (dropLastCampaign && campaigns.length > 1) campaigns.pop();
    if (i % 6 === 0 && campaigns.length > 1) {
      campaigns[campaigns.length - 1].campaignStatus = 'PAUSED';
    }

    const sourceTotal = campaigns.reduce((sum, c) => sum + c.spendMtd, 0);
    campaigns.forEach((c) => {
      c.spendMtd = sourceTotal > 0
        ? Math.round(spend * (c.spendMtd / sourceTotal))
        : Math.round(spend / campaigns.length);
      // A closed month has no pending decision to describe.
      c.recommendationType = 'NO_CHANGE';
      c.skipReason = '';
      c.finalDailyBudget = null;
    });

    return {
      ...source,
      id: `${runDate}|${source.googleAdsId}`,
      runDate,
      pauseDates: [],
      runId: `mock-prior-${i}-${day}`,
      monthlyBudget,
      spendMtd: spend,
      expectedSpendMtd: Math.round(expected),
      variancePercent: variance,
      severity: 'OK',
      // Seed the column on even accounts, blank on odd, so both the column path and the
      // variance fallback are exercised in this view too.
      displayStatus: i % 2 === 0 ? displayStatusFromVariance(variance) : '',
      approvalStatus: '',
      reviewedBy: '',
      notes: '',
      campaigns,
      // The account's CURRENT run date, so a last-month row is correctly stale-gated — the one
      // path mock data could never reach before (every mock account had a single record).
      accountLatestRunDate: source.runDate,
    };
  };

  const rows: GAdsPacingRecord[] = [];

  current.forEach((source, i) => {
    // A few accounts started this month and have no prior-month history at all.
    if (i % 17 === 3) return;

    // One $0-budget account: exercises fmtSpendShareOfBudget returning '' (renders as a dash,
    // sorts last, and must not poison the TOTAL denominator).
    const monthlyBudget = i === 4 ? 0 : source.monthlyBudget;
    // Closing spend spans roughly 62%–127% of budget so every status tier appears.
    const closingSpend = Math.round(monthlyBudget * (0.62 + ((i * 7) % 66) / 100));
    // Campaign spend that doesn't reconcile with the account total (campaign removed mid-month)
    // — the detail panel's reconciliation note exists for exactly this.
    const dropLastCampaign = i % 11 === 2;

    if (i % 13 === 5) {
      // Data gap: the agent stopped running mid-month. The row is genuinely partial, and the
      // "as of 07/15" column is what makes that visible instead of silently under-reporting.
      rows.push(buildRow(source, i, 15, monthlyBudget, Math.round(closingSpend * 0.5), dropLastCampaign));
      return;
    }

    // Two rows per account proves the builder picks the NEWEST in-month run, not the first.
    rows.push(buildRow(source, i, 15, monthlyBudget, Math.round(closingSpend * 0.48), dropLastCampaign));
    rows.push(buildRow(source, i, daysInPrev, monthlyBudget, closingSpend, dropLastCampaign));
  });

  // Accounts that existed last month but not this one — they must still appear in the view.
  current.slice(0, 3).forEach((source, k) => {
    const googleAdsId = `${2000000000 + k}`;
    const closed: GAdsPacingRecord = { ...source, googleAdsId };
    rows.push(buildRow(closed, 100 + k, daysInPrev, source.monthlyBudget, Math.round(source.monthlyBudget * 0.91), false));
  });

  return rows;
}

// Generate complete mock data
export function generateMockData(): ContentResponse {
  const blogs = generateBlogs(250);
  const gmbPosts = generateGmbPosts(350);
  const replies = generateReplies(180);
  const negKeywordReviews = generateNegKeywordReviews(400);
  const currentGAdsPacing = generateGAdsPacing(40);
  const gAdsPacing = [...currentGAdsPacing, ...generatePriorMonthGAdsPacing(currentGAdsPacing)];
  // Built from the current-month rows only. currentMonthPausedGAdsPacing would filter prior-month
  // pause dates out by its own month predicate anyway, but sourcing narrowly keeps the paused
  // view's membership provably unchanged by this addition.
  const pauseStatuses = currentGAdsPacing.flatMap((record) =>
    record.campaigns.map((campaign) => ({
      campaignId: campaign.campaignId,
      googleAdsId: record.googleAdsId,
      paused: campaign.paused,
      pausedDate: campaign.pausedDate,
    })),
  );
  const blogErrors = generateBlogErrors(15);
  const gmbPostErrors = generateGmbPostErrors(25);

  return {
    blogs,
    gmbPosts,
    replies,
    negKeywordReviews,
    gAdsPacing,
    pausedGAdsPacing: currentMonthPausedGAdsPacing(gAdsPacing, pauseStatuses),
    lastMonthGAdsPacing: lastMonthGAdsPacing(gAdsPacing),
    kwBuildout: [],
    summary: calculateSummary(blogs, gmbPosts, replies, negKeywordReviews, gAdsPacing),
    practices: [...new Set([
      ...blogs.map((b) => b.practiceName),
      ...gmbPosts.map((p) => p.practiceName),
      ...negKeywordReviews.map((n) => n.practiceName),
      ...gAdsPacing.map((g) => g.practiceName),
      ...blogErrors.map((e) => e.practiceName),
      ...gmbPostErrors.map((e) => e.practiceName),
    ])].sort(),
    accounts: [...new Set(replies.map((r) => r.accountName))].sort(),
    blogErrors,
    gmbPostErrors,
    errorSummary: calculateErrorSummary(blogErrors, gmbPostErrors),
  };
}

// Singleton mock data to maintain consistency during session
let cachedMockData: ContentResponse | null = null;

export function getMockData(): ContentResponse {
  if (!cachedMockData) {
    cachedMockData = generateMockData();
  }
  return cachedMockData;
}

// Reset mock data (for refresh functionality)
export function resetMockData(): ContentResponse {
  cachedMockData = generateMockData();
  return cachedMockData;
}

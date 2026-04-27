import { BlogPost, GmbPost, GmbReply, NegKeywordReview, BlogError, GmbPostError, ContentResponse, ErrorSummaryData, GAdsPacingRecord, RecommendationType, Severity } from '@/types';

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
function generateNegKeywordReviews(count: number): NegKeywordReview[] {
  const reviews: NegKeywordReview[] = [];
  for (let i = 0; i < count; i++) {
    reviews.push({
      id: `neg-kw-${i + 1}`,
      dateTime: randomDate(14),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      companyId: companyIds[Math.floor(Math.random() * companyIds.length)],
      campaignName: campaignNames[Math.floor(Math.random() * campaignNames.length)],
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
): { blogs7d: number; gmbPosts7d: number; replies7d: number; negKeywordsTerms7d: number; gAdsPacingPending7d: number } {
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
  };
}

// Generate g-ads pacing mock records
function generateGAdsPacing(count: number): GAdsPacingRecord[] {
  const severities: Severity[] = ['OK', 'Auto', 'Alert', 'Underpace', 'Critical', 'Investigate'];
  const recs: RecommendationType[] = [
    'PAUSE_CAMPAIGN',
    'BUDGET_DECREASE_APPROVAL',
    'BUDGET_INCREASE_APPROVAL',
    'BUDGET_DECREASE',
    'BUDGET_INCREASE',
    'NO_CHANGE',
  ];
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (i % 7));
    const runDate = d.toISOString().slice(0, 10);
    const practice = practices[i % practices.length];
    const googleAdsId = `${1000000000 + i}`;
    const monthlyBudget = 2000 + (i % 5) * 500;
    const variance = -50 + ((i * 17) % 100);
    const expected = monthlyBudget * 0.7;
    const spend = Math.round(expected * (1 + variance / 100));
    return {
      id: `${runDate}|${googleAdsId}`,
      runDate,
      runId: `mock-run-${i}`,
      practiceName: practice,
      googleAdsId,
      companyId: companyIds[i % companyIds.length] || '',
      monthlyBudget,
      spendMtd: spend,
      expectedSpendMtd: Math.round(expected),
      variancePercent: variance,
      currentDailyBudget: Math.round(monthlyBudget / 30),
      proposedDailyBudget: Math.round((monthlyBudget / 30) * 0.8),
      severity: severities[i % severities.length],
      approvalStatus: i % 4 === 0 ? 'Approved' : '',
      reviewedBy: i % 4 === 0 ? 'Mark' : '',
      notes: '',
      campaigns: Array.from({ length: 2 + (i % 3) }, (_, j) => ({
        campaignId: `${20000000 + i * 10 + j}`,
        campaignName: ['General Dentistry', 'Implants', 'Emergency', 'Cosmetic'][j % 4],
        spendMtd: Math.round(spend / (2 + (i % 3))),
        currentDaily: Math.round(monthlyBudget / 30 / (2 + (i % 3))),
        proposedDaily: Math.round((monthlyBudget / 30 / (2 + (i % 3))) * 0.7),
        recommendationType: recs[(i + j) % recs.length],
      })),
    };
  });
}

// Generate complete mock data
export function generateMockData(): ContentResponse {
  const blogs = generateBlogs(250);
  const gmbPosts = generateGmbPosts(350);
  const replies = generateReplies(180);
  const negKeywordReviews = generateNegKeywordReviews(400);
  const gAdsPacing = generateGAdsPacing(40);
  const blogErrors = generateBlogErrors(15);
  const gmbPostErrors = generateGmbPostErrors(25);

  return {
    blogs,
    gmbPosts,
    replies,
    negKeywordReviews,
    gAdsPacing,
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

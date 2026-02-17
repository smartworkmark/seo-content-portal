import { BlogPost, GmbPost, GmbReply, BlogError, GmbPostError, ContentResponse, ErrorSummaryData } from '@/types';
import { getMockData, resetMockData } from './mock-data';
import { isValidUrl } from '@/lib/utils';

// Check if Google Sheets credentials are configured
function isConfigured(): boolean {
  return !!(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_API_KEY);
}

// Fetch data from a specific sheet using public API
async function fetchSheet(sheetName: string): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_API_KEY;
  const encodedSheetName = encodeURIComponent(sheetName);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A:Z?key=${apiKey}`;

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
// Actual columns: Date, Time, Practice Name, Practice URL, Blog Title, Post URL, Webflow Item ID, Webflow Collection ID, Keyword, Make Execution, Notes, CompanyID
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
  replies: GmbReply[]
) {
  // Use 6 days ago to get a 7-day window inclusive of today (matches client-side '7d' filter)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const blogs7d = blogs.filter((b) => parseDate(b.date) >= sevenDaysAgo).length;
  const gmbPosts7d = gmbPosts.filter((p) => parseDate(p.date) >= sevenDaysAgo).length;
  const replies7d = replies.filter((r) => parseDate(r.dateTime) >= sevenDaysAgo).length;

  const todayBlogs = blogs.filter((b) => parseDate(b.date) >= today).length;
  const todayPosts = gmbPosts.filter((p) => parseDate(p.date) >= today).length;
  const todayReplies = replies.filter((r) => parseDate(r.dateTime) >= today).length;

  return {
    blogs7d,
    gmbPosts7d,
    replies7d,
    todayActivity: todayBlogs + todayPosts + todayReplies,
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
    // Fetch all three sheets in parallel
    const [blogsData, gmbPostsData, repliesData] = await Promise.all([
      fetchSheet('Blogs'),
      fetchSheet('GMB Posts'),
      fetchSheet('GMB Replies'),
    ]);

    const { valid: blogs, errors: blogErrors } = parseBlogs(blogsData);
    const { valid: gmbPosts, errors: gmbPostErrors } = parseGmbPosts(gmbPostsData);
    const replies = parseReplies(repliesData);

    // Sort by date descending
    blogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    gmbPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    replies.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    blogErrors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    gmbPostErrors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Extract unique practices and accounts (include practices from errors too)
    const practices = [...new Set([
      ...blogs.map((b) => b.practiceName),
      ...gmbPosts.map((p) => p.practiceName),
      ...blogErrors.map((e) => e.practiceName),
      ...gmbPostErrors.map((e) => e.practiceName),
    ])].sort();

    const accounts = [...new Set(replies.map((r) => r.accountName))].sort();

    return {
      blogs,
      gmbPosts,
      replies,
      summary: calculateSummary(blogs, gmbPosts, replies),
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

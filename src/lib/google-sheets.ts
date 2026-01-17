import { BlogPost, GmbPost, GmbReply, ContentResponse } from '@/types';
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
// Actual columns: Date, Time, Practice Name, Practice URL, Blog Title, Post URL, Webflow Item ID, Webflow Collection ID, Keyword, Make Execution, Notes
function parseBlogs(rows: string[][]): BlogPost[] {
  if (rows.length <= 1) return []; // Skip if only header or empty

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dateIndex = headers.findIndex((h) => h === 'date');
  const timeIndex = headers.findIndex((h) => h === 'time');
  const practiceIndex = headers.findIndex((h) => h === 'practice name');
  const titleIndex = headers.findIndex((h) => h === 'blog title');
  const keywordIndex = headers.findIndex((h) => h === 'keyword');
  const urlIndex = headers.findIndex((h) => h === 'post url');

  return rows.slice(1).map((row, index) => {
    const date = row[dateIndex] || '';
    const time = row[timeIndex] || '';
    const dateTime = time ? `${date} ${time}` : date;

    return {
      id: `blog-${index + 1}`,
      date: dateTime,
      practiceName: row[practiceIndex] || '',
      blogTitle: row[titleIndex] || '',
      keyword: row[keywordIndex] || '',
      url: sanitizeBlogUrl(row[urlIndex] || ''),
    };
  }).filter((blog) => blog.date && blog.practiceName && blog.blogTitle && isValidUrl(blog.url));
}

// Parse GMB posts from sheet data
// Actual columns: Date, Time, Practice Name, Practice URL, Post Title, Post URL, Make Execution, Keyword
function parseGmbPosts(rows: string[][]): GmbPost[] {
  if (rows.length <= 1) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dateIndex = headers.findIndex((h) => h === 'date');
  const timeIndex = headers.findIndex((h) => h === 'time');
  const practiceIndex = headers.findIndex((h) => h === 'practice name');
  const titleIndex = headers.findIndex((h) => h === 'post title');
  const keywordIndex = headers.findIndex((h) => h === 'keyword');
  const urlIndex = headers.findIndex((h) => h === 'post url');

  return rows.slice(1).map((row, index) => {
    const date = row[dateIndex] || '';
    const time = row[timeIndex] || '';
    const dateTime = time ? `${date} ${time}` : date;

    return {
      id: `gmb-${index + 1}`,
      date: dateTime,
      practiceName: row[practiceIndex] || '',
      postTitle: row[titleIndex] || '',
      keyword: row[keywordIndex] || '',
      url: row[urlIndex] || '',
    };
  }).filter((post) => post.date && post.practiceName && post.postTitle && isValidUrl(post.url));
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

// Calculate summary statistics
function calculateSummary(
  blogs: BlogPost[],
  gmbPosts: GmbPost[],
  replies: GmbReply[]
) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (dateStr: string): Date => {
    // Try to parse date string (handles formats like "2025-09-15" or "2025-09-15 15:12" or "2025-11-20 17:44")
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date(0) : date;
  };

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

    const blogs = parseBlogs(blogsData);
    const gmbPosts = parseGmbPosts(gmbPostsData);
    const replies = parseReplies(repliesData);

    // Sort by date descending
    blogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    gmbPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    replies.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    // Extract unique practices and accounts
    const practices = [...new Set([
      ...blogs.map((b) => b.practiceName),
      ...gmbPosts.map((p) => p.practiceName),
    ])].sort();

    const accounts = [...new Set(replies.map((r) => r.accountName))].sort();

    return {
      blogs,
      gmbPosts,
      replies,
      summary: calculateSummary(blogs, gmbPosts, replies),
      practices,
      accounts,
    };
  } catch (error) {
    console.error('Error fetching from Google Sheets, falling back to mock data:', error);
    return forceRefresh ? resetMockData() : getMockData();
  }
}

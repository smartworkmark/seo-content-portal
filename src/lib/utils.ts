import { BlogPost, GmbPost, GmbReply, BlogError, GmbPostError, DateRange } from '@/types';

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format date with time for replies
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Get date threshold based on range (inclusive of today)
export function getDateThreshold(range: DateRange): Date {
  const now = new Date();
  const days = range === '7d' ? 6 : range === '30d' ? 29 : 89;
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - days);
  threshold.setHours(0, 0, 0, 0);
  return threshold;
}

// Check if date is within range
export function isWithinDateRange(dateString: string, range: DateRange): boolean {
  const date = new Date(dateString);
  const threshold = getDateThreshold(range);
  return date >= threshold;
}

// Check if date is today
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Validate if a string is a legitimate URL
export function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  const trimmedUrl = url.trim();

  // Reject common placeholder text
  const placeholders = ['tbd', 'pending', 'n/a', 'na', 'none', 'coming soon', 'todo'];
  if (placeholders.includes(trimmedUrl.toLowerCase())) {
    return false;
  }

  // Prepare URL for validation - add https:// if no protocol
  let urlToValidate = trimmedUrl;
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    urlToValidate = `https://${trimmedUrl}`;
  }

  // Validate using URL constructor
  try {
    const urlObj = new URL(urlToValidate);
    // Ensure it has a valid hostname with at least one dot (TLD requirement)
    // This ensures "localhost" or "pending" won't pass, but "example.com" will
    return urlObj.hostname.includes('.');
  } catch {
    return false;
  }
}

// Filter blogs by practices and date range
export function filterBlogs(
  blogs: BlogPost[],
  practices: string[],
  dateRange: DateRange
): BlogPost[] {
  return blogs.filter((blog) => {
    // Empty array means "all"
    const practiceMatch = practices.length === 0 || practices.includes(blog.practiceName);
    const dateMatch = isWithinDateRange(blog.date, dateRange);
    const hasUrl = isValidUrl(blog.url);
    return practiceMatch && dateMatch && hasUrl;
  });
}

// Filter GMB posts by practices and date range
export function filterGmbPosts(
  posts: GmbPost[],
  practices: string[],
  dateRange: DateRange
): GmbPost[] {
  return posts.filter((post) => {
    // Empty array means "all"
    const practiceMatch = practices.length === 0 || practices.includes(post.practiceName);
    const dateMatch = isWithinDateRange(post.date, dateRange);
    const hasUrl = isValidUrl(post.url);
    return practiceMatch && dateMatch && hasUrl;
  });
}

// Filter replies by accounts and date range
export function filterReplies(
  replies: GmbReply[],
  accounts: string[],
  dateRange: DateRange
): GmbReply[] {
  return replies.filter((reply) => {
    // Empty array means "all"
    const accountMatch = accounts.length === 0 || accounts.includes(reply.accountName);
    const dateMatch = isWithinDateRange(reply.dateTime, dateRange);
    const hasUrl = isValidUrl(reply.url);
    return accountMatch && dateMatch && hasUrl;
  });
}

// Filter blog errors by practices and date range
export function filterBlogErrors(
  errors: BlogError[],
  practices: string[],
  dateRange: DateRange
): BlogError[] {
  return errors.filter((error) => {
    const practiceMatch = practices.length === 0 || practices.includes(error.practiceName);
    const dateMatch = isWithinDateRange(error.date, dateRange);
    return practiceMatch && dateMatch;
  });
}

// Filter GMB post errors by practices and date range
export function filterGmbPostErrors(
  errors: GmbPostError[],
  practices: string[],
  dateRange: DateRange
): GmbPostError[] {
  return errors.filter((error) => {
    const practiceMatch = practices.length === 0 || practices.includes(error.practiceName);
    const dateMatch = isWithinDateRange(error.date, dateRange);
    return practiceMatch && dateMatch;
  });
}

// Sort function for any array
export function sortData<T>(
  data: T[],
  column: keyof T,
  direction: 'asc' | 'desc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];

    if (aVal === bVal) return 0;

    // Handle date sorting
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      // Try to parse as date
      const aDate = new Date(aVal);
      const bDate = new Date(bVal);

      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return direction === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      // String comparison
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    // Number comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });
}

// Export to CSV
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columns: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) return;

  const headers = columns.map((col) => col.label).join(',');
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = (item as Record<string, unknown>)[col.key as string];
        // Escape quotes and wrap in quotes if contains comma or newline
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

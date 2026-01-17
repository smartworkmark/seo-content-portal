// Content Types
export type ContentType = 'blogs' | 'gmb-posts' | 'replies';

export type DateRange = '7d' | '30d' | 'all';

// Blog Post
export interface BlogPost {
  id: string;
  date: string;
  practiceName: string;
  blogTitle: string;
  keyword: string;
  url: string;
}

// GMB Post
export interface GmbPost {
  id: string;
  date: string;
  practiceName: string;
  postTitle: string;
  keyword: string;
  url: string;
}

// GMB Reply
export interface GmbReply {
  id: string;
  dateTime: string;
  accountName: string;
  reply: string;
  url: string;
}

// Union type for all content
export type ContentItem = BlogPost | GmbPost | GmbReply;

// Summary counts for dashboard cards
export interface SummaryData {
  blogs7d: number;
  gmbPosts7d: number;
  replies7d: number;
  todayActivity: number;
}

// API Response structure
export interface ContentResponse {
  blogs: BlogPost[];
  gmbPosts: GmbPost[];
  replies: GmbReply[];
  summary: SummaryData;
  practices: string[];
  accounts: string[];
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

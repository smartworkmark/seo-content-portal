'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContentResponse, DateRange, BlogPost, GmbPost, GmbReply, NegKeywordReview, BlogError, GmbPostError, ErrorSummaryData } from '@/types';
import { filterBlogs, filterGmbPosts, filterReplies, filterNegKeywordReviews, filterBlogErrors, filterGmbPostErrors } from '@/lib/utils';
import { SummaryData } from '@/types';

interface UseContentDataReturn {
  data: ContentResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  filteredBlogs: BlogPost[];
  filteredGmbPosts: GmbPost[];
  filteredReplies: GmbReply[];
  filteredNegKeywords: NegKeywordReview[];
  filterCounts: { blogs: number; gmbPosts: number; replies: number; negKeywords: number };
  clientSummary: SummaryData | null;
  // Error data
  blogErrors: BlogError[];
  gmbPostErrors: GmbPostError[];
  filteredBlogErrors: BlogError[];
  filteredGmbPostErrors: GmbPostError[];
  errorFilterCounts: { blogs: number; gmbPosts: number };
  errorSummary: ErrorSummaryData | null;
}

export function useContentData(
  selectedPractices: string[],
  selectedDateRange: DateRange
): UseContentDataReturn {
  const [data, setData] = useState<ContentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = forceRefresh ? '/api/content?refresh=true' : '/api/content';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const result: ContentResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Re-sync every hour
    const interval = setInterval(() => {
      fetchData();
    }, 3600000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Apply filters to data
  const filteredBlogs = data
    ? filterBlogs(data.blogs, selectedPractices, selectedDateRange)
    : [];

  const filteredGmbPosts = data
    ? filterGmbPosts(data.gmbPosts, selectedPractices, selectedDateRange)
    : [];

  const filteredReplies = data
    ? filterReplies(data.replies, selectedPractices, selectedDateRange)
    : [];

  const filteredNegKeywords = data
    ? filterNegKeywordReviews(data.negKeywordReviews, selectedPractices, selectedDateRange)
    : [];

  // Calculate filtered counts for tab badges
  const filterCounts = {
    blogs: filteredBlogs.length,
    gmbPosts: filteredGmbPosts.length,
    replies: filteredReplies.length,
    negKeywords: filteredNegKeywords.length,
  };

  // Compute summary counts client-side (same date parsing as filters, avoids server timezone issues)
  const clientSummary: SummaryData | null = data ? (() => {
    const blogs7d = filterBlogs(data.blogs, [], '7d');
    const gmbPosts7d = filterGmbPosts(data.gmbPosts, [], '7d');
    const replies7d = filterReplies(data.replies, [], '7d');
    const negKeywords7d = filterNegKeywordReviews(data.negKeywordReviews, [], '7d');
    const negKeywordsTerms7d = negKeywords7d.reduce((sum, n) => sum + n.termsReviewed, 0);
    return {
      blogs7d: blogs7d.length,
      gmbPosts7d: gmbPosts7d.length,
      replies7d: replies7d.length,
      negKeywordsTerms7d,
    };
  })() : null;

  // Error data
  const blogErrors = data?.blogErrors ?? [];
  const gmbPostErrors = data?.gmbPostErrors ?? [];

  // Apply filters to error data
  const filteredBlogErrors = data
    ? filterBlogErrors(data.blogErrors, selectedPractices, selectedDateRange)
    : [];

  const filteredGmbPostErrors = data
    ? filterGmbPostErrors(data.gmbPostErrors, selectedPractices, selectedDateRange)
    : [];

  // Calculate filtered counts for error tab badges
  const errorFilterCounts = {
    blogs: filteredBlogErrors.length,
    gmbPosts: filteredGmbPostErrors.length,
  };

  return {
    data,
    isLoading,
    error,
    refresh,
    filteredBlogs,
    filteredGmbPosts,
    filteredReplies,
    filteredNegKeywords,
    filterCounts,
    clientSummary,
    // Error data
    blogErrors,
    gmbPostErrors,
    filteredBlogErrors,
    filteredGmbPostErrors,
    errorFilterCounts,
    errorSummary: data?.errorSummary ?? null,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContentResponse, DateRange, BlogPost, GmbPost, GmbReply, NegKeywordReview, GAdsPacingRecord, ApprovalStatus, BlogError, GmbPostError, ErrorSummaryData } from '@/types';
import { filterBlogs, filterGmbPosts, filterReplies, filterNegKeywordReviews, filterGAdsPacing, filterBlogErrors, filterGmbPostErrors } from '@/lib/utils';
import { SummaryData } from '@/types';

export interface GAdsPacingFeedbackPayload {
  approvalStatus: ApprovalStatus;
  reviewedBy: string;
  notes: string;
}

interface UseContentDataReturn {
  data: ContentResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  filteredBlogs: BlogPost[];
  filteredGmbPosts: GmbPost[];
  filteredReplies: GmbReply[];
  filteredNegKeywords: NegKeywordReview[];
  filteredGAdsPacing: GAdsPacingRecord[];
  filterCounts: { blogs: number; gmbPosts: number; replies: number; negKeywords: number; gAdsPacing: number };
  clientSummary: SummaryData | null;
  submitGAdsPacingFeedback: (record: GAdsPacingRecord, payload: GAdsPacingFeedbackPayload) => Promise<void>;
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

  const filteredGAdsPacing = data
    ? filterGAdsPacing(data.gAdsPacing, selectedPractices, selectedDateRange)
    : [];

  // Calculate filtered counts for tab badges
  const filterCounts = {
    blogs: filteredBlogs.length,
    gmbPosts: filteredGmbPosts.length,
    replies: filteredReplies.length,
    negKeywords: filteredNegKeywords.length,
    gAdsPacing: filteredGAdsPacing.length,
  };

  // Compute summary counts client-side (same date parsing as filters, avoids server timezone issues)
  const clientSummary: SummaryData | null = data ? (() => {
    const blogs7d = filterBlogs(data.blogs, [], '7d');
    const gmbPosts7d = filterGmbPosts(data.gmbPosts, [], '7d');
    const replies7d = filterReplies(data.replies, [], '7d');
    const negKeywords7d = filterNegKeywordReviews(data.negKeywordReviews, [], '7d');
    const negKeywordsTerms7d = negKeywords7d.reduce((sum, n) => sum + n.termsReviewed, 0);
    const pacing7d = filterGAdsPacing(data.gAdsPacing, [], '7d');
    const gAdsPacingPending7d = pacing7d.filter((g) => g.approvalStatus === '').length;
    return {
      blogs7d: blogs7d.length,
      gmbPosts7d: gmbPosts7d.length,
      replies7d: replies7d.length,
      negKeywordsTerms7d,
      gAdsPacingPending7d,
    };
  })() : null;

  const submitGAdsPacingFeedback = useCallback(async (
    record: GAdsPacingRecord,
    payload: GAdsPacingFeedbackPayload,
  ) => {
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('NEXT_PUBLIC_MAKE_FEEDBACK_WEBHOOK_URL is not configured');
    }

    const body = {
      run_date: record.runDate,
      google_ads_id: record.googleAdsId,
      approval_status: payload.approvalStatus,
      reviewed_by: payload.reviewedBy,
      notes: payload.notes,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Webhook failed with ${response.status}`);
    }

    // Optimistically update local state so the row reflects the new status without waiting for re-fetch
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        gAdsPacing: prev.gAdsPacing.map((r) =>
          r.id === record.id
            ? { ...r, approvalStatus: payload.approvalStatus, reviewedBy: payload.reviewedBy, notes: payload.notes }
            : r
        ),
      };
    });
  }, []);

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
    filteredGAdsPacing,
    filterCounts,
    clientSummary,
    submitGAdsPacingFeedback,
    // Error data
    blogErrors,
    gmbPostErrors,
    filteredBlogErrors,
    filteredGmbPostErrors,
    errorFilterCounts,
    errorSummary: data?.errorSummary ?? null,
  };
}

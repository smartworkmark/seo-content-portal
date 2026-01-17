'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContentResponse, ContentType, DateRange, BlogPost, GmbPost, GmbReply } from '@/types';
import { filterBlogs, filterGmbPosts, filterReplies } from '@/lib/utils';

interface UseContentDataReturn {
  data: ContentResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  filteredBlogs: BlogPost[];
  filteredGmbPosts: GmbPost[];
  filteredReplies: GmbReply[];
  filterCounts: { blogs: number; gmbPosts: number; replies: number };
}

export function useContentData(
  selectedPractice: string,
  selectedDateRange: DateRange,
  contentType: ContentType
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
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Apply filters to data
  const filteredBlogs = data
    ? filterBlogs(data.blogs, selectedPractice, selectedDateRange)
    : [];

  const filteredGmbPosts = data
    ? filterGmbPosts(data.gmbPosts, selectedPractice, selectedDateRange)
    : [];

  const filteredReplies = data
    ? filterReplies(data.replies, selectedPractice, selectedDateRange)
    : [];

  // Calculate filtered counts for tab badges
  const filterCounts = {
    blogs: filteredBlogs.length,
    gmbPosts: filteredGmbPosts.length,
    replies: filteredReplies.length,
  };

  return {
    data,
    isLoading,
    error,
    refresh,
    filteredBlogs,
    filteredGmbPosts,
    filteredReplies,
    filterCounts,
  };
}

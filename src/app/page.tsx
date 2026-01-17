'use client';

import { useState, useEffect } from 'react';
import { ContentType, DateRange } from '@/types';
import { useContentData } from '@/hooks/useContentData';
import { useTableHeaderObserver } from '@/hooks/useTableHeaderObserver';
import { exportToCSV } from '@/lib/utils';
import { SummaryCards } from '@/components/SummaryCards';
import { ContentTabs } from '@/components/ContentTabs';
import { Filters } from '@/components/Filters';
import { DataTable } from '@/components/DataTable';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ContentType>('blogs');
  const [selectedPractice, setSelectedPractice] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const { targetRef: tableHeaderRef, isIntersecting } = useTableHeaderObserver();

  // Update visibility based on intersection
  useEffect(() => {
    setHeaderVisible(isIntersecting);
  }, [isIntersecting]);

  const {
    data,
    isLoading,
    error,
    refresh,
    filteredBlogs,
    filteredGmbPosts,
    filteredReplies,
    filterCounts,
  } = useContentData(selectedPractice, selectedDateRange, activeTab);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    if (activeTab === 'blogs') {
      exportToCSV(filteredBlogs, 'blogs', [
        { key: 'date', label: 'Date' },
        { key: 'practiceName', label: 'Practice Name' },
        { key: 'blogTitle', label: 'Blog Title' },
        { key: 'keyword', label: 'Keyword' },
        { key: 'url', label: 'URL' },
      ]);
    } else if (activeTab === 'gmb-posts') {
      exportToCSV(filteredGmbPosts, 'gmb-posts', [
        { key: 'date', label: 'Date' },
        { key: 'practiceName', label: 'Practice Name' },
        { key: 'postTitle', label: 'Post Title' },
        { key: 'keyword', label: 'Keyword' },
        { key: 'url', label: 'URL' },
      ]);
    } else {
      exportToCSV(filteredReplies, 'replies', [
        { key: 'dateTime', label: 'Date/Time' },
        { key: 'accountName', label: 'Account Name' },
        { key: 'reply', label: 'Reply' },
        { key: 'url', label: 'URL' },
      ]);
    }
  };

  // Reset practice filter when switching tabs (practice vs account)
  const handleTabChange = (tab: ContentType) => {
    setActiveTab(tab);
    setSelectedPractice('all');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`
        bg-white border-b border-gray-200
        sticky top-0 z-50
        transition-transform duration-300 ease-in-out
        ${headerVisible ? 'translate-y-0' : '-translate-y-full'}
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">Content Portal</h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
              <button
                onClick={handleRefresh}
                className="ml-auto text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <section className="mb-8">
          <SummaryCards data={data?.summary ?? null} isLoading={isLoading} />
        </section>

        {/* Content Section */}
        <section ref={tableHeaderRef} className="bg-white rounded-lg border border-gray-200">
          {/* Tabs */}
          <ContentTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            counts={filterCounts}
          />

          {/* Filters */}
          <div className="px-4 border-b border-gray-200 overflow-visible">
            <Filters
              contentType={activeTab}
              practices={data?.practices ?? []}
              accounts={data?.accounts ?? []}
              selectedPractice={selectedPractice}
              selectedDateRange={selectedDateRange}
              onPracticeChange={setSelectedPractice}
              onDateRangeChange={setSelectedDateRange}
              onExport={handleExport}
            />
          </div>

          {/* Data Table */}
          <DataTable
            contentType={activeTab}
            blogs={filteredBlogs}
            gmbPosts={filteredGmbPosts}
            replies={filteredReplies}
            isLoading={isLoading}
          />
        </section>
      </main>
    </div>
  );
}

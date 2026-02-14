'use client';

import { SummaryCard } from './SummaryCard';
import { SummarySkeleton } from './SkeletonLoader';
import { SummaryData, ErrorSummaryData } from '@/types';

// Icons as simple SVG components
const BlogIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
  </svg>
);

const GmbIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ReplyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

interface SummaryCardsProps {
  data: SummaryData | null;
  isLoading: boolean;
  isErrorMode?: boolean;
  errorSummary?: ErrorSummaryData | null;
}

export function SummaryCards({ data, isLoading, isErrorMode = false, errorSummary }: SummaryCardsProps) {
  if (isLoading || (!isErrorMode && !data) || (isErrorMode && !errorSummary)) {
    return <SummarySkeleton />;
  }

  // Error mode: show error counts (no Replies card)
  if (isErrorMode && errorSummary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          title="Blog Errors"
          count={errorSummary.blogErrors}
          icon={<BlogIcon />}
          subtitle="Last 7 days"
          isErrorMode={true}
        />
        <SummaryCard
          title="GMB Errors"
          count={errorSummary.gmbPostErrors}
          icon={<GmbIcon />}
          subtitle="Last 7 days"
          isErrorMode={true}
        />
      </div>
    );
  }

  // Normal mode
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Blogs"
        count={data.blogs7d}
        icon={<BlogIcon />}
        subtitle="Last 7 days"
      />
      <SummaryCard
        title="GMB Posts"
        count={data.gmbPosts7d}
        icon={<GmbIcon />}
        subtitle="Last 7 days"
      />
      <SummaryCard
        title="Replies"
        count={data.replies7d}
        icon={<ReplyIcon />}
        subtitle="Last 7 days"
      />
      <SummaryCard
        title="Today"
        count={data.todayActivity}
        icon={<ActivityIcon />}
        subtitle="Total activity"
      />
    </div>
  );
}

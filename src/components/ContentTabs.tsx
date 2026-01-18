'use client';

import { ContentType, ErrorContentType } from '@/types';

interface ContentTabsProps {
  activeTab: ContentType | ErrorContentType;
  onTabChange: (tab: ContentType | ErrorContentType) => void;
  counts: {
    blogs: number;
    gmbPosts: number;
    replies: number;
  };
  isErrorMode?: boolean;
  errorCounts?: {
    blogs: number;
    gmbPosts: number;
  };
}

export function ContentTabs({
  activeTab,
  onTabChange,
  counts,
  isErrorMode = false,
  errorCounts,
}: ContentTabsProps) {
  // In error mode, only show blogs and gmb-posts (no replies)
  const tabs = isErrorMode
    ? [
        { id: 'blogs' as const, label: 'Blog Errors', count: errorCounts?.blogs ?? 0 },
        { id: 'gmb-posts' as const, label: 'GMB Errors', count: errorCounts?.gmbPosts ?? 0 },
      ]
    : [
        { id: 'blogs' as const, label: 'Blogs', count: counts.blogs },
        { id: 'gmb-posts' as const, label: 'GMB Posts', count: counts.gmbPosts },
        { id: 'replies' as const, label: 'Replies', count: counts.replies },
      ];

  return (
    <div className="bg-gray-50 border-b border-gray-200 rounded-t-lg">
      <nav className="flex gap-0 px-4 py-2" aria-label="Content tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                ? isErrorMode
                  ? 'border-amber-500 text-amber-700'
                  : 'border-indigo-900 text-indigo-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
            <span
              className={`
                ml-2 px-2 py-0.5 text-xs rounded-full
                ${activeTab === tab.id
                  ? isErrorMode
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-indigo-100 text-indigo-900'
                  : 'bg-gray-100 text-gray-500'
                }
              `}
            >
              {tab.count.toLocaleString()}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

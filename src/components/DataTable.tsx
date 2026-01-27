'use client';

import { useState, useEffect } from 'react';
import { BlogPost, GmbPost, GmbReply, BlogError, GmbPostError, ContentType, ErrorContentType, SortState } from '@/types';
import { formatDate, formatDateTime, truncateText, sortData } from '@/lib/utils';
import { TableSkeleton } from './SkeletonLoader';

const HUBSPOT_URL = 'https://app.hubspot.com/contacts/22697387/record/0-2/';

interface DataTableProps {
  contentType: ContentType | ErrorContentType;
  blogs: BlogPost[];
  gmbPosts: GmbPost[];
  replies: GmbReply[];
  isLoading: boolean;
  isErrorMode?: boolean;
  blogErrors?: BlogError[];
  gmbPostErrors?: GmbPostError[];
}

const ITEMS_PER_PAGE = 25;

export function DataTable({
  contentType,
  blogs,
  gmbPosts,
  replies,
  isLoading,
  isErrorMode = false,
  blogErrors = [],
  gmbPostErrors = [],
}: DataTableProps) {
  const [sort, setSort] = useState<SortState>({ column: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReply, setExpandedReply] = useState<string | null>(null);

  // Reset page when content type or error mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [contentType, isErrorMode]);

  const handleSort = (column: string) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sort.column !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sort.direction === 'asc' ? (
      <svg className="w-4 h-4 text-indigo-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const ExternalLinkIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );

  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  // ERROR MODE: Render Blog Errors Table
  if (isErrorMode && contentType === 'blogs') {
    const sortedData = sortData(blogErrors, sort.column as keyof BlogError, sort.direction);
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = sortedData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return (
      <div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[512px] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-gray-900">
                      Date <SortIcon column="date" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('practiceName')} className="flex items-center gap-1 hover:text-gray-900">
                      Practice <SortIcon column="practiceName" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('companyId')} className="flex items-center gap-1 hover:text-gray-900">
                      HSID <SortIcon column="companyId" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('errorMessage')} className="flex items-center gap-1 hover:text-gray-900">
                      Error <SortIcon column="errorMessage" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center text-sm text-gray-500">
                      No blog errors found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(error.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {error.practiceName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {error.companyId && (
                          <a
                            href={`${HUBSPOT_URL}${error.companyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-900 hover:text-indigo-950 hover:underline"
                          >
                            {error.companyId}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-700">
                        {error.errorMessage}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          onPageChange={setCurrentPage}
        />
      </div>
    );
  }

  // ERROR MODE: Render GMB Post Errors Table
  if (isErrorMode && contentType === 'gmb-posts') {
    const sortedData = sortData(gmbPostErrors, sort.column as keyof GmbPostError, sort.direction);
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = sortedData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return (
      <div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[512px] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-gray-900">
                      Date <SortIcon column="date" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('practiceName')} className="flex items-center gap-1 hover:text-gray-900">
                      Practice <SortIcon column="practiceName" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('companyId')} className="flex items-center gap-1 hover:text-gray-900">
                      HSID <SortIcon column="companyId" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('postTitle')} className="flex items-center gap-1 hover:text-gray-900">
                      Post Title <SortIcon column="postTitle" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('keyword')} className="flex items-center gap-1 hover:text-gray-900">
                      Keyword <SortIcon column="keyword" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('reason')} className="flex items-center gap-1 hover:text-gray-900">
                      Reason <SortIcon column="reason" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-500">
                      No GMB post errors found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((error) => {
                    const isProcessing = error.reason.toLowerCase().includes('processing');
                    return (
                      <tr key={error.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(error.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {error.practiceName}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {error.companyId && (
                            <a
                              href={`${HUBSPOT_URL}${error.companyId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-900 hover:text-indigo-950 hover:underline"
                            >
                              {error.companyId}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {isProcessing ? truncateText(error.postTitle, 50) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {isProcessing ? error.keyword : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-700">
                          {error.reason}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          onPageChange={setCurrentPage}
        />
      </div>
    );
  }

  // Render Blogs Table
  if (contentType === 'blogs') {
    const sortedData = sortData(blogs, sort.column as keyof BlogPost, sort.direction);
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = sortedData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return (
      <div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[512px] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-gray-900">
                    Date <SortIcon column="date" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('practiceName')} className="flex items-center gap-1 hover:text-gray-900">
                    Practice <SortIcon column="practiceName" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('companyId')} className="flex items-center gap-1 hover:text-gray-900">
                    HSID <SortIcon column="companyId" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('blogTitle')} className="flex items-center gap-1 hover:text-gray-900">
                    Blog Title <SortIcon column="blogTitle" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('keyword')} className="flex items-center gap-1 hover:text-gray-900">
                    Keyword <SortIcon column="keyword" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  URL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-500">
                    No blogs found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((blog) => (
                  <tr key={blog.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(blog.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {blog.practiceName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {blog.companyId && (
                        <a
                          href={`${HUBSPOT_URL}${blog.companyId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-900 hover:text-indigo-950 hover:underline"
                        >
                          {blog.companyId}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {truncateText(blog.blogTitle, 50)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {blog.keyword}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {blog.url && (
                        <a
                          href={blog.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-900 hover:text-indigo-950"
                          aria-label={`View blog: ${blog.blogTitle}`}
                        >
                          <ExternalLinkIcon />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        onPageChange={setCurrentPage}
      />
    </div>
    );
  }

  // Render GMB Posts Table
  if (contentType === 'gmb-posts') {
    const sortedData = sortData(gmbPosts, sort.column as keyof GmbPost, sort.direction);
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = sortedData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return (
      <div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[512px] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-gray-900">
                    Date <SortIcon column="date" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('practiceName')} className="flex items-center gap-1 hover:text-gray-900">
                    Practice <SortIcon column="practiceName" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('companyId')} className="flex items-center gap-1 hover:text-gray-900">
                    HSID <SortIcon column="companyId" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('postTitle')} className="flex items-center gap-1 hover:text-gray-900">
                    Post Title <SortIcon column="postTitle" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('keyword')} className="flex items-center gap-1 hover:text-gray-900">
                    Keyword <SortIcon column="keyword" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  URL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-500">
                    No GMB posts found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(post.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {post.practiceName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {post.companyId && (
                        <a
                          href={`${HUBSPOT_URL}${post.companyId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-900 hover:text-indigo-950 hover:underline"
                        >
                          {post.companyId}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {truncateText(post.postTitle, 50)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {post.keyword}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-900 hover:text-indigo-950"
                          aria-label={`View post: ${post.postTitle}`}
                        >
                          <ExternalLinkIcon />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        onPageChange={setCurrentPage}
      />
    </div>
    );
  }

  // Render Replies Table
  const sortedReplies = sortData(replies, sort.column as keyof GmbReply, sort.direction);
  const totalPages = Math.ceil(sortedReplies.length / ITEMS_PER_PAGE);
  const paginatedReplies = sortedReplies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-[640px] overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => handleSort('dateTime')} className="flex items-center gap-1 hover:text-gray-900">
                  Date/Time <SortIcon column="dateTime" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => handleSort('accountName')} className="flex items-center gap-1 hover:text-gray-900">
                  Account <SortIcon column="accountName" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reply
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                URL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedReplies.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center text-sm text-gray-500">
                  No replies found for the selected filters.
                </td>
              </tr>
            ) : (
              paginatedReplies.map((reply) => (
                <tr key={reply.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {formatDateTime(reply.dateTime)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {reply.accountName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {expandedReply === reply.id ? (
                      <div>
                        <p>{reply.reply}</p>
                        <button
                          onClick={() => setExpandedReply(null)}
                          className="text-indigo-900 text-xs mt-1 hover:underline"
                        >
                          Show less
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p>{truncateText(reply.reply, 80)}</p>
                        {reply.reply.length > 80 && (
                          <button
                            onClick={() => setExpandedReply(reply.id)}
                            className="text-indigo-900 text-xs mt-1 hover:underline"
                          >
                            Show more
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {reply.url && (
                      <a
                        href={reply.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-900 hover:text-indigo-950"
                        aria-label="View review"
                      >
                        <ExternalLinkIcon />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={sortedReplies.length}
      onPageChange={setCurrentPage}
    />
  </div>
  );
}

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {totalItems.toLocaleString()} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          Next
        </button>
      </div>
    </div>
  );
}

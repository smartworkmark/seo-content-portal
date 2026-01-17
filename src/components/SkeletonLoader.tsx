'use client';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 w-24 bg-gray-200 rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-4 w-48 bg-gray-200 rounded flex-1"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-4 border-b border-gray-100">
          <div className="h-4 w-24 bg-gray-100 rounded"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
          <div className="h-4 bg-gray-100 rounded flex-1"></div>
          <div className="h-4 w-24 bg-gray-100 rounded"></div>
          <div className="h-4 w-16 bg-gray-100 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

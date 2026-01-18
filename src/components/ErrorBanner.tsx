'use client';

export function ErrorBanner() {
  return (
    <div className="bg-amber-100 border border-amber-300 rounded-lg px-4 py-3 mb-6">
      <div className="flex items-center gap-2 text-amber-800">
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-sm font-medium">
          Viewing error log — these records failed to process and are kept for reference
        </span>
      </div>
    </div>
  );
}

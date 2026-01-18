'use client';

interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  subtitle?: string;
  isErrorMode?: boolean;
}

export function SummaryCard({ title, count, icon, subtitle, isErrorMode = false }: SummaryCardProps) {
  return (
    <div className={`
      bg-white rounded-lg border p-6 hover:shadow-md transition-shadow
      ${isErrorMode ? 'border-amber-300' : 'border-gray-200'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className={`
          text-sm font-medium uppercase tracking-wide
          ${isErrorMode ? 'text-amber-700' : 'text-gray-500'}
        `}>
          {title}
        </span>
        <div className={isErrorMode ? 'text-amber-400' : 'text-gray-400'}>{icon}</div>
      </div>
      <div className={`
        text-3xl font-semibold mb-1
        ${isErrorMode ? 'text-amber-700' : 'text-gray-900'}
      `}>
        {count.toLocaleString()}
      </div>
      {subtitle && (
        <p className={`text-sm ${isErrorMode ? 'text-amber-600' : 'text-gray-500'}`}>{subtitle}</p>
      )}
    </div>
  );
}

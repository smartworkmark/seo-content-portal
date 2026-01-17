'use client';

interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  subtitle?: string;
}

export function SummaryCard({ title, count, icon, subtitle }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="text-3xl font-semibold text-gray-900 mb-1">
        {count.toLocaleString()}
      </div>
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

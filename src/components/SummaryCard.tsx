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
      rounded-lg p-6
      transition-all duration-200
      hover:-translate-y-0.5
      ${isErrorMode
        ? 'bg-white border border-amber-300 shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:shadow-[0_20px_40px_-20px_rgba(217,119,6,0.25),0_8px_20px_-10px_rgba(217,119,6,0.15)]'
        : 'bg-[#050941] border border-white/5 shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:shadow-[0_20px_40px_-20px_rgba(96,165,250,0.35),0_8px_20px_-10px_rgba(96,165,250,0.2)]'
      }
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className={`
          text-xs font-semibold uppercase tracking-[0.14em]
          ${isErrorMode ? 'text-amber-700' : 'text-blue-400'}
        `}>
          {title}
        </span>
        <div className={isErrorMode ? 'text-amber-400' : 'text-blue-400/70'}>{icon}</div>
      </div>
      <div className={`
        text-3xl font-semibold mb-1
        ${isErrorMode ? 'text-amber-700' : 'text-white'}
      `}>
        {count.toLocaleString()}
      </div>
      {subtitle && (
        <p className={`text-sm ${isErrorMode ? 'text-amber-600' : 'text-slate-300'}`}>{subtitle}</p>
      )}
    </div>
  );
}

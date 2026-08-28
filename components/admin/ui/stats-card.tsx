import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({ title, value, change, icon, className }: StatsCardProps) {
  return (
    <div className={cn('bg-surface border border-border rounded-xl p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] text-textDark font-semibold uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-textDark">
            {icon}
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={cn(
              'text-[11px] font-semibold',
              change >= 0 ? 'text-green' : 'text-red'
            )}
          >
            {change >= 0 ? '+' : ''}{change}%
          </span>
          <span className="text-[10px] text-textDark">vs last month</span>
        </div>
      )}
    </div>
  );
}

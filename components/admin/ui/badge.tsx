import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
        {
          'bg-green/10 text-green': variant === 'success',
          'bg-orange/10 text-orange': variant === 'warning',
          'bg-red/10 text-red': variant === 'danger',
          'bg-blue/10 text-blue': variant === 'info',
          'bg-surface text-textDark': variant === 'neutral',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

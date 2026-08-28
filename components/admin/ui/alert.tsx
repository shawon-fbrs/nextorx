import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Alert({ variant, title, children, icon, className }: AlertProps) {
  const variants = {
    info: {
      bg: 'bg-blue/10',
      border: 'border-blue/30',
      text: 'text-blue',
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    success: {
      bg: 'bg-green/10',
      border: 'border-green/30',
      text: 'text-green',
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-orange/10',
      border: 'border-orange/30',
      text: 'text-orange',
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    danger: {
      bg: 'bg-red/10',
      border: 'border-red/30',
      text: 'text-red',
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  };

  const style = variants[variant];

  return (
    <div className={cn('border rounded-lg p-3 flex gap-3', style.bg, style.border, className)}>
      <div className={cn('flex-shrink-0 mt-0.5', style.text)}>
        {icon || style.icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className={cn('text-sm font-semibold mb-0.5', style.text)}>{title}</p>}
        <div className={cn('text-sm', variant === 'info' ? 'text-white' : style.text)}>{children}</div>
      </div>
    </div>
  );
}

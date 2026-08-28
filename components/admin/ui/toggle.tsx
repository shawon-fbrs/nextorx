'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, size = 'md', checked, ...props }, ref) => {
    const sizes = {
      sm: { track: 'w-8 h-4', dot: 'w-3 h-3', translate: 'translate-x-4' },
      md: { track: 'w-10 h-5', dot: 'w-4 h-4', translate: 'translate-x-5' },
      lg: { track: 'w-12 h-6', dot: 'w-5 h-5', translate: 'translate-x-6' },
    };

    return (
      <label className={cn('flex items-center gap-3 cursor-pointer', className)}>
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only"
            checked={checked}
            {...props}
          />
          <div
            className={cn(
              'rounded-full transition-colors duration-200',
              sizes[size].track,
              checked ? 'bg-blue' : 'bg-border'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 left-0.5 bg-white rounded-full transition-transform duration-200',
                sizes[size].dot,
                checked && sizes[size].translate
              )}
            />
          </div>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && <p className="text-sm font-medium text-white">{label}</p>}
            {description && <p className="text-[11px] text-textDark">{description}</p>}
          </div>
        )}
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
export type { ToggleProps };

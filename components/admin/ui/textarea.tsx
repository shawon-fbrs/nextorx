'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-[11px] font-semibold text-textDark uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full bg-background border border-border rounded-lg text-white text-sm px-4 py-2.5 resize-y min-h-[80px]',
            'placeholder:text-textDark focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue',
            'transition-colors duration-200',
            error && 'border-red focus:border-red focus:ring-red',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-textDark">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
export type { TextareaProps };

'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch?: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  debounceMs?: number;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onChange, debounceMs = 300, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      if (onSearch) {
        const value = e.target.value;
        const timeoutId = setTimeout(() => {
          onSearch(value);
        }, debounceMs);
        return () => clearTimeout(timeoutId);
      }
    };

    return (
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textDark"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <input
          ref={ref}
          type="text"
          className={cn(
            'w-full bg-surface border border-border rounded-lg text-white text-sm pl-10 pr-4 py-2',
            'placeholder:text-textDark focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue',
            'transition-colors duration-200',
            className
          )}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };

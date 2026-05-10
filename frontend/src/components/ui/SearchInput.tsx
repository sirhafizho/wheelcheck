'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <MagnifyingGlassIcon 
            className="w-5 h-5 text-gray-400" 
            aria-hidden="true"
          />
        </div>
        <input
          ref={ref}
          type="search"
          className={`
            w-full pl-10 pr-4 py-3
            text-base
            border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
            placeholder-gray-400
            min-h-[48px]
            ${className}
          `}
          aria-label={props['aria-label'] || 'Search'}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

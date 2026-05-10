'use client';

import { useTranslations } from 'next-intl';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const t = useTranslations('accessibility');

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`} role="status">
      <div
        className={`${sizes[size]} border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin`}
        aria-label={t('loading')}
      />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}

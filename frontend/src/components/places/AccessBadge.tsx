'use client';

import { useTranslations } from 'next-intl';
import type { AccessLevel } from '@/lib/types';
import { ACCESSIBILITY_COLORS } from '@/lib/constants';

interface AccessBadgeProps {
  level: AccessLevel;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const icons = {
  FULL: '✅',
  PARTIAL: '⚠️',
  NOT_ACCESSIBLE: '❌',
  UNKNOWN: '❓',
};

export function AccessBadge({ level, showText = true, size = 'md' }: AccessBadgeProps) {
  const t = useTranslations('access');

  const labels: Record<AccessLevel, string> = {
    FULL: t('full'),
    PARTIAL: t('partial'),
    NOT_ACCESSIBLE: t('notAccessible'),
    UNKNOWN: t('unknown'),
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
      `}
      style={{
        backgroundColor: `${ACCESSIBILITY_COLORS[level]}20`,
        color: ACCESSIBILITY_COLORS[level],
        border: `2px solid ${ACCESSIBILITY_COLORS[level]}`,
      }}
      role="status"
      aria-label={`Accessibility: ${labels[level]}`}
    >
      <span className={iconSizes[size]} aria-hidden="true">
        {icons[level]}
      </span>
      {showText && <span>{labels[level]}</span>}
    </span>
  );
}

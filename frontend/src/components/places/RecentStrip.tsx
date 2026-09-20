'use client';

import Link from 'next/link';
import { ClockIcon } from '@heroicons/react/24/outline';
import type { RecentPlace } from '@/hooks/useRecentPlaces';

const ACCESS_DOT: Record<string, string> = {
  FULL: 'bg-emerald-500',
  PARTIAL: 'bg-amber-500',
  NOT_ACCESSIBLE: 'bg-red-500',
};

interface RecentStripProps {
  recent: RecentPlace[];
  locale: string;
}

export function RecentStrip({ recent, locale }: RecentStripProps) {
  if (recent.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
        <ClockIcon className="h-3.5 w-3.5" />
        <span>Recent</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {recent.map((place) => (
          <Link
            key={place.id}
            href={`/${locale}/places/${place.id}`}
            className="
              flex-shrink-0 inline-flex items-center gap-2 rounded-full
              bg-white ring-1 ring-black/5 px-3.5 py-2 text-sm
              text-gray-700 hover:bg-gray-50 hover:shadow-sm
              transition-all duration-150
            "
          >
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${
                place.accessibilityLevel ? (ACCESS_DOT[place.accessibilityLevel] ?? 'bg-gray-300') : 'bg-gray-300'
              }`}
            />
            <span className="truncate max-w-[140px]">{place.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

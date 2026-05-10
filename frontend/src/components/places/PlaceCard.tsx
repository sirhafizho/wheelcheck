'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { Place } from '@/lib/types';
import { AccessBadge } from './AccessBadge';

interface PlaceCardProps {
  place: Place;
  locale: string;
}

export function PlaceCard({ place, locale }: PlaceCardProps) {
  const t = useTranslations('places');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <Link
      href={`/${locale}/places/${place.id}`}
      className="
        block bg-white rounded-lg shadow-md
        hover:shadow-lg transition-shadow duration-200
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
        overflow-hidden
      "
    >
      <article className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {place.name}
          </h3>
          <AccessBadge level={place.accessLevel} showText={false} size="sm" />
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
          <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{place.address}</p>
        </div>

        {place.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {place.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {place.reportCount} {place.reportCount === 1 ? 'report' : 'reports'}
          </span>
          {place.lastReportedAt && (
            <div className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" aria-hidden="true" />
              <time dateTime={place.lastReportedAt}>
                {formatDate(place.lastReportedAt)}
              </time>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import type { Place } from '@/lib/types';
import { formatDistance, formatWheelchairDistance } from '@/lib/utils';
import { AccessBadge } from './AccessBadge';

interface PlaceCardProps {
  place: Place;
  locale: string;
}

function getDistanceSummary(distance?: number | null) {
  if (distance == null) {
    return null;
  }

  return `${formatDistance(distance)} away • ${formatWheelchairDistance(distance)}`;
}

export function PlaceCard({ place, locale }: PlaceCardProps) {
  const t = useTranslations('places');

  const addressDisplay =
    !place.address || place.address === 'Address not available'
      ? t('addressNotAvailable')
      : place.address;
  return (
    <Link
      href={`/${locale}/places/${place.id}`}
      className="
        block overflow-hidden rounded-lg bg-white shadow-md
        transition-shadow duration-200 hover:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
      "
    >
      <article className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="flex-1 text-lg font-semibold text-gray-900">
            {place.name}
          </h3>
          <AccessBadge level={place.accessibilityLevel} showText={false} size="sm" />
        </div>

        <div className="mb-3 flex items-start gap-2 text-sm text-gray-600">
          <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{addressDisplay}</p>
        </div>

        {(place.city || place.state) && (
          <p className="mb-3 line-clamp-1 text-sm text-gray-500" aria-label="Location">
            {[place.city, place.state].filter(Boolean).join(', ')}
          </p>
        )}

        {getDistanceSummary(place.distance) && (
          <div className="mb-3 flex items-center gap-2 text-sm text-emerald-700">
            <ClockIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{getDistanceSummary(place.distance)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {t('reviewCount', { count: place.reviewCount ?? 0 })}
          </span>
        </div>
      </article>
    </Link>
  );
}

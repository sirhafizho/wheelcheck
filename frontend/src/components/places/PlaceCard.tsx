'use client';

import Link from 'next/link';
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import type { Place } from '@/lib/types';
import { formatDistance, formatWheelchairDistance } from '@/lib/utils';
import { AccessBadge } from './AccessBadge';

interface PlaceCardProps {
  place: Place;
  locale: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  RESTAURANT: '\uD83C\uDF7D\uFE0F',
  CAFE: '\u2615',
  SHOP: '\uD83C\uDFEA',
  MALL: '\uD83D\uDECD\uFE0F',
  HOSPITAL: '\uD83C\uDFE5',
  CLINIC: '\uD83E\uDE7A',
  MOSQUE: '\uD83D\uDD4C',
  PLACE_OF_WORSHIP: '\u26EA',
  TRANSPORT: '\uD83D\uDE87',
  GOVERNMENT: '\uD83C\uDFDB\uFE0F',
  EDUCATION: '\uD83C\uDF93',
  PARK: '\uD83C\uDF33',
  HOTEL: '\uD83C\uDFE8',
  OTHER: '\uD83D\uDCCD',
};

function getDistanceSummary(distance?: number | null) {
  if (distance == null) return null;
  return `${formatDistance(distance)} away \u2022 ${formatWheelchairDistance(distance)}`;
}

export function PlaceCard({ place, locale }: PlaceCardProps) {
  const t = useTranslations('places');
  const tCat = useTranslations('addPlace.categories');

  const addressDisplay =
    !place.address || place.address === 'Address not available'
      ? t('addressNotAvailable')
      : place.address;

  const emoji = place.category ? CATEGORY_EMOJI[place.category] ?? '\uD83D\uDCCD' : null;
  const categoryLabel = place.category ? (tCat as (key: string) => string)(place.category) : null;
  const distanceSummary = getDistanceSummary(place.distance);

  return (
    <Link
      href={`/${locale}/places/${place.id}`}
      className="
        group block overflow-hidden rounded-2xl bg-white
        ring-1 ring-black/5 shadow-sm
        transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
      "
    >
      <article className="p-4">
        {/* Top row: category pill + access badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {emoji && categoryLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              <span aria-hidden="true">{emoji}</span>
              {categoryLabel}
            </span>
          ) : (
            <span />
          )}
          <AccessBadge level={place.accessibilityLevel} showText={false} size="sm" />
        </div>

        {/* Place name */}
        <h3 className="text-base font-semibold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {place.name}
        </h3>

        {/* Address */}
        <div className="flex items-start gap-1.5 text-sm text-gray-500 mb-2">
          <MapPinIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1 line-clamp-1">{addressDisplay}</p>
        </div>

        {/* Distance (if available) */}
        {distanceSummary && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-2">
            <ClockIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{distanceSummary}</span>
          </div>
        )}

        {/* Footer: review count + location */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
          <span>{t('reviewCount', { count: place.reviewCount ?? 0 })}</span>
          {(place.city || place.state) && (
            <span className="truncate ml-2">{[place.city, place.state].filter(Boolean).join(', ')}</span>
          )}
        </div>
      </article>
    </Link>
  );
}

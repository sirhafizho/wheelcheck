'use client';

import { useTranslations } from 'next-intl';
import { MapPinIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Place } from '@/lib/types';
import { AccessBadge } from './AccessBadge';
import { Button } from '../ui/Button';

const DATA_SOURCE_TRANSLATION_KEYS: Record<string, string> = {
  OSM: 'dataSources.OSM',
  PRASARANA_GTFS: 'dataSources.PRASARANA_GTFS',
  DATA_GOV_MY: 'dataSources.DATA_GOV_MY',
  ACCESSIBILITY_CLOUD: 'dataSources.ACCESSIBILITY_CLOUD',
  WIKIDATA: 'dataSources.WIKIDATA',
  GEOAPIFY: 'dataSources.GEOAPIFY',
  COMMUNITY: 'dataSources.COMMUNITY',
  SEED: 'dataSources.SEED',
};

const KNOWN_CATEGORIES = [
  'MALL',
  'SHOP',
  'RESTAURANT',
  'HOSPITAL',
  'MOSQUE',
  'TRANSPORT',
  'GOVERNMENT',
  'EDUCATION',
  'PARK',
  'HOTEL',
  'CAFE',
  'OTHER',
] as const;

type KnownCategory = (typeof KNOWN_CATEGORIES)[number];

function formatFallbackCategory(category: string) {
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

interface PlaceDetailProps {
  place: Place;
  locale: string;
  onReportClick?: () => void;
  onShowOnMapClick?: () => void;
}

export function PlaceDetail({ place, locale, onReportClick, onShowOnMapClick }: PlaceDetailProps) {
  const tCommon = useTranslations('common');
  const tPlaces = useTranslations('places');
  const tCategories = useTranslations('addPlace.categories');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDataSource = (source: string | undefined) => {
    if (!source) {
      return tPlaces('dataSources.COMMUNITY');
    }

    const translationKey = DATA_SOURCE_TRANSLATION_KEYS[source];
    return translationKey ? tPlaces(translationKey as never) : source;
  };

  const formatCategory = (category?: string) => {
    if (!category) {
      return null;
    }

    return KNOWN_CATEGORIES.includes(category as KnownCategory)
      ? tCategories(category as KnownCategory)
      : formatFallbackCategory(category);
  };

  const locationLine = [place.city, place.state].filter(Boolean).join(', ');
  const formattedCategory = formatCategory(place.category);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {place.name}
          </h1>
          <AccessBadge level={place.accessibilityLevel} size="lg" />
        </div>

        <div className="flex items-start gap-2 text-gray-700 mb-1">
          <MapPinIcon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{place.address}</p>
        </div>

        {locationLine && (
          <p className="text-sm text-gray-500 pl-7 mb-4">
            {locationLine}
          </p>
        )}

        {place.description && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <InformationCircleIcon
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-sm text-gray-700">{place.description}</p>
            </div>
          </div>
        )}

        {formattedCategory && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500">{tPlaces('category')}</span>
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              {formattedCategory}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mb-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500 mb-1">{tPlaces('reports')}</dt>
              <dd className="text-gray-900">{place.reviewCount}</dd>
            </div>
            {place.lastReportedAt && (
              <div>
                <dt className="font-medium text-gray-500 mb-1">{tPlaces('lastUpdated')}</dt>
                <dd className="text-gray-900">
                  <time dateTime={place.lastReportedAt}>
                    {formatDate(place.lastReportedAt)}
                  </time>
                </dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="font-medium text-gray-500 mb-1">
                {tPlaces('dataSource')}
              </dt>
              <dd
                className="text-gray-700 text-xs"
                data-testid="data-source-label"
              >
                {formatDataSource(place.dataSource)}
              </dd>
            </div>
          </dl>
        </div>

        <div className={`grid gap-3 ${onShowOnMapClick ? 'sm:grid-cols-2' : ''}`}>
          {onShowOnMapClick && (
            <Button
              variant="outline"
              fullWidth
              onClick={onShowOnMapClick}
              className="min-h-[48px] gap-2"
            >
              <MapPinIcon className="h-5 w-5" aria-hidden="true" />
              {tPlaces('showOnMap')}
            </Button>
          )}
          <Button
            variant="primary"
            fullWidth
            onClick={onReportClick}
            className="min-h-[48px]"
          >
            {tCommon('report')}
          </Button>
        </div>
      </div>
    </div>
  );
}

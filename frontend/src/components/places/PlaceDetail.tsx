'use client';

import { useTranslations } from 'next-intl';
import { MapPinIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Place } from '@/lib/types';
import { AccessBadge } from './AccessBadge';
import { Button } from '../ui/Button';

interface PlaceDetailProps {
  place: Place;
  locale: string;
  onReportClick?: () => void;
}

export function PlaceDetail({ place, locale, onReportClick }: PlaceDetailProps) {
  const t = useTranslations();

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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {place.name}
          </h1>
          <AccessBadge level={place.accessibilityLevel} size="lg" />
        </div>

        <div className="flex items-start gap-2 text-gray-700 mb-4">
          <MapPinIcon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1">{place.address}</p>
        </div>

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

        {place.category && (
          <div className="mb-4">
            <span className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
              {place.category}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mb-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500 mb-1">Reports</dt>
              <dd className="text-gray-900">{place.reviewCount}</dd>
            </div>
            {place.lastReportedAt && (
              <div>
                <dt className="font-medium text-gray-500 mb-1">Last Updated</dt>
                <dd className="text-gray-900">
                  <time dateTime={place.lastReportedAt}>
                    {formatDate(place.lastReportedAt)}
                  </time>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={onReportClick}
          className="min-h-[48px]"
        >
          {t('common.report')}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { Marker, Popup } from 'react-leaflet';
import { useTranslations } from 'next-intl';
import type { Place } from '@/lib/types';
import { AccessBadge } from '../places/AccessBadge';

interface PlaceMarkerProps {
  place: Place;
  onClick?: (place: Place) => void;
}

export function PlaceMarker({ place, onClick }: PlaceMarkerProps) {
  const t = useTranslations('places');
  const addressDisplay = (!place.address || place.address === 'Address not available')
    ? t('addressNotAvailable')
    : place.address;

  return (
    <Marker
      position={[place.latitude, place.longitude]}
      eventHandlers={{
        click: () => onClick?.(place),
      }}
    >
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-semibold text-gray-900 mb-2">
            {place.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <AccessBadge level={place.accessibilityLevel} size="sm" />
            {place.aiAccessible !== null && place.aiAccessible !== undefined && (
              <span
                data-testid="marker-ai-verdict-badge"
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  place.aiAccessible ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {place.aiAccessible ? '✦ AI Accessible' : '✦ AI Inaccessible'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {addressDisplay}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

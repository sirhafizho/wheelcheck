'use client';

import { Marker, Popup } from 'react-leaflet';
import type { Place } from '@/lib/types';
import { AccessBadge } from '../places/AccessBadge';

interface PlaceMarkerProps {
  place: Place;
  onClick?: (place: Place) => void;
}

export function PlaceMarker({ place, onClick }: PlaceMarkerProps) {
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
          <AccessBadge level={place.accessibilityLevel} size="sm" />
          <p className="text-sm text-gray-600 mt-2">
            {place.address}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

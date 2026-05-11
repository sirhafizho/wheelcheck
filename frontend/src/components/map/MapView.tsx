'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '@/lib/types';
import { MAP_CONFIG, ACCESSIBILITY_COLORS } from '@/lib/constants';
import { AccessBadge } from '../places/AccessBadge';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  places: Place[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onPlaceClick?: (place: Place) => void;
  locale?: string;
  className?: string;
}

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [center, map]);
  
  return null;
}

export function MapView({ 
  places, 
  center = MAP_CONFIG.defaultCenter, 
  zoom = MAP_CONFIG.defaultZoom,
  onPlaceClick,
  locale = 'en',
  className = ''
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={className}
      style={{ height: '100%', width: '100%', minHeight: '400px' }}
    >
      <MapUpdater center={center} />
      <TileLayer
        attribution={MAP_CONFIG.attribution}
        url={MAP_CONFIG.tileUrl}
      />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          eventHandlers={{
            click: () => onPlaceClick?.(place),
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
              <p className="text-sm text-gray-600 mt-1">
                {place.reviewCount} {place.reviewCount === 1 ? 'review' : 'reviews'}
              </p>
              <a
                href={`/${locale}/places/${place.id}`}
                className="mt-3 inline-flex min-h-[48px] items-center text-sm font-medium text-emerald-600 hover:underline"
              >
                View Details →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

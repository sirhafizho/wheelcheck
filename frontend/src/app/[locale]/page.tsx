'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { SearchInput } from '@/components/ui/SearchInput';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePlaces } from '@/hooks/usePlaces';
import { MAP_CONFIG } from '@/lib/constants';
import type { Place } from '@/lib/types';

const MapView = dynamic(() => import('@/components/map/MapView').then(mod => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

export default function HomePage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.defaultCenter);
  const { latitude, longitude, getCurrentPosition, loading: geoLoading } = useGeolocation();
  const { places, loading: placesLoading, refetch } = usePlaces({
    lat: mapCenter.lat,
    lng: mapCenter.lng,
    radius: 5000,
  });

  useEffect(() => {
    if (latitude && longitude) {
      setMapCenter({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  const handlePlaceClick = (place: Place) => {
    console.log('Place clicked:', place);
  };

  const handleMyLocation = () => {
    getCurrentPosition();
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // Implement debounced search
    // This is a placeholder - in production, use proper debouncing
  };

  return (
    <div className="h-full">
      {/* Search bar */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('home.title')}
          </h1>
          <p className="text-gray-600 mb-4">
            {t('home.subtitle')}
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchInput
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                aria-label={t('common.search')}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleMyLocation}
              disabled={geoLoading}
              className="whitespace-nowrap"
            >
              {geoLoading ? <LoadingSpinner size="sm" /> : '📍 ' + t('home.myLocation')}
            </Button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-[calc(100vh-280px)]">
        <MapView
          places={places}
          center={mapCenter}
          onPlaceClick={handlePlaceClick}
          className="w-full h-full"
        />
      </div>

      {/* Places count */}
      {!placesLoading && (
        <div className="bg-white border-t border-gray-200 p-3 text-center">
          <p className="text-sm text-gray-600">
            {places.length} {places.length === 1 ? 'place' : 'places'} nearby
          </p>
        </div>
      )}
    </div>
  );
}

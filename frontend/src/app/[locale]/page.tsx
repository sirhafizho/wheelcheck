'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { PlusIcon } from '@heroicons/react/24/outline';
import { SearchInput } from '@/components/ui/SearchInput';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
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
  const locale = useLocale();
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const { latitude, longitude, getCurrentPosition, loading: geoLoading } = useGeolocation();
  const mapCenter = latitude !== null && longitude !== null
    ? { lat: latitude, lng: longitude }
    : MAP_CONFIG.defaultCenter;
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);
  const searchParams = debouncedSearch
    ? { query: debouncedSearch }
    : {
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        radius: 5000,
      };
  const { places, loading: placesLoading } = usePlaces(searchParams);
  const isSearching = debouncedSearch.length > 0;

  const handlePlaceClick = (place: Place) => {
    console.log('Place clicked:', place);
  };

  const handleMyLocation = () => {
    getCurrentPosition();
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
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
          locale={locale}
          onPlaceClick={handlePlaceClick}
          className="w-full h-full"
        />
      </div>

      {/* Floating Add Place button */}
      <Link
        href={`/${locale}/add-place`}
        className="fixed bottom-20 right-4 z-40 bg-emerald-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label={t('home.addPlace')}
      >
        <PlusIcon className="w-8 h-8" />
      </Link>

      {/* Places count */}
      {!placesLoading && (
        <div className="bg-white border-t border-gray-200 p-3 text-center">
          <p className="text-sm text-gray-600">
            {places.length}{' '}
            {places.length === 1 ? (isSearching ? 'result' : 'place') : (isSearching ? 'results' : 'places')}{' '}
            {isSearching ? 'found' : 'nearby'}
          </p>
        </div>
      )}
    </div>
  );
}

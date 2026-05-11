'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useDebounce } from '@/hooks/useDebounce';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePlaces } from '@/hooks/usePlaces';
import { MAP_CONFIG } from '@/lib/constants';
import type { Place } from '@/lib/types';

const MapView = dynamic(() => import('@/components/map/MapView').then(mod => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
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

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <MapView
          places={places}
          center={mapCenter}
          locale={locale}
          onPlaceClick={handlePlaceClick}
          className="w-full h-full"
        />
      </div>

      {/* Floating search bar overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000]">
        <div className={`
          bg-white/95 backdrop-blur-md rounded-2xl shadow-lg
          transition-all duration-200
          ${searchFocused ? 'ring-2 ring-emerald-500 shadow-xl' : 'ring-1 ring-black/5'}
        `}>
          <div className="flex items-center gap-2 px-4 py-3">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="search"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              aria-label={t('common.search')}
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-base outline-none min-h-[28px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* My Location button */}
      <button
        onClick={handleMyLocation}
        disabled={geoLoading}
        className="absolute top-20 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 ring-1 ring-black/5 hover:bg-white transition-colors disabled:opacity-50"
        aria-label={t('home.myLocation')}
      >
        {geoLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <MapPinIcon className="w-5 h-5 text-emerald-600" />
        )}
      </button>

      {/* Places count pill */}
      {!placesLoading && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-gray-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            {places.length}{' '}
            {places.length === 1
              ? (isSearching ? 'result' : 'place')
              : (isSearching ? 'results' : 'places')
            }{' '}
            {isSearching ? 'found' : 'nearby'}
          </div>
        </div>
      )}

      {/* FAB - Add Place */}
      <Link
        href={`/${locale}/add-place`}
        className="absolute bottom-24 right-4 z-[1000] bg-emerald-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label={t('home.addPlace')}
      >
        <PlusIcon className="w-7 h-7" />
      </Link>
    </div>
  );
}

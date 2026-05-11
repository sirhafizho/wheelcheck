'use client';

import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
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

const MAX_SUGGESTIONS = 8;
const SEARCH_FLY_TO_ZOOM = 16;

type FlyToCoordinates = {
  lat: number;
  lng: number;
  zoom?: number;
};

const MapView = dynamic(() => import('@/components/map/MapView').then(mod => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

function formatCategory(category?: string) {
  if (!category) {
    return null;
  }

  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<FlyToCoordinates>();
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { latitude, longitude, getCurrentPosition, loading: geoLoading } = useGeolocation();

  const mapCenter = useMemo(
    () => (latitude !== null && longitude !== null
      ? { lat: latitude, lng: longitude }
      : MAP_CONFIG.defaultCenter),
    [latitude, longitude],
  );

  const normalizedQuery = searchQuery.trim();
  const debouncedSearch = useDebounce(normalizedQuery, 300);
  const searchParams = debouncedSearch
    ? { query: debouncedSearch }
    : { lat: mapCenter.lat, lng: mapCenter.lng, radius: 5000 };
  const { places, loading: placesLoading } = usePlaces(searchParams);
  const isSearching = debouncedSearch.length > 0;
  const suggestions = debouncedSearch.length >= 2 ? places.slice(0, MAX_SUGGESTIONS) : [];
  const suggestionsPending = normalizedQuery.length >= 2 && (debouncedSearch !== normalizedQuery || placesLoading);
  const shouldShowSuggestionPanel = searchFocused && showSuggestions && normalizedQuery.length >= 2;

  useEffect(() => () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  }, []);

  const closeSuggestions = () => {
    setShowSuggestions(false);
  };

  const focusSuggestions = () => {
    if (normalizedQuery.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const flyToPlace = (place: Place) => {
    setSelectedPlace(place);
    setFlyToCoords({
      lat: place.latitude,
      lng: place.longitude,
      zoom: SEARCH_FLY_TO_ZOOM,
    });
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleSuggestionSelect = (place: Place) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    setSearchQuery(place.name);
    setSearchFocused(false);
    closeSuggestions();
    flyToPlace(place);
  };

  const handleMyLocation = () => {
    getCurrentPosition();
  };

  const handleSearchBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setSearchFocused(false);
      closeSuggestions();
    }, 150);
  };

  const handleSearchFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    setSearchFocused(true);
    focusSuggestions();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      closeSuggestions();
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'Enter' && normalizedQuery.length > 0 && !suggestionsPending && places.length > 0) {
      event.preventDefault();
      handleSuggestionSelect(places[0]);
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;

    setSearchQuery(nextQuery);

    if (selectedPlace && nextQuery.trim() !== selectedPlace.name) {
      setSelectedPlace(null);
    }

    if (nextQuery.trim().length >= 2) {
      setShowSuggestions(true);
      return;
    }

    closeSuggestions();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedPlace(null);
    closeSuggestions();
  };

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0">
        <MapView
          places={places}
          center={mapCenter}
          flyTo={flyToCoords}
          locale={locale}
          onPlaceClick={handlePlaceClick}
          className="w-full h-full"
        />
      </div>

      <div className="absolute top-3 left-3 right-3 z-[1000]">
        <div
          className={`bg-white/95 backdrop-blur-md rounded-xl shadow-lg transition-all duration-200 ${
            searchFocused ? 'ring-2 ring-emerald-500 shadow-xl' : 'ring-1 ring-black/5'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="search"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onKeyDown={handleSearchKeyDown}
              aria-label={t('common.search')}
              aria-expanded={shouldShowSuggestionPanel}
              aria-controls="search-suggestions"
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm outline-none min-h-[24px]"
            />
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleClearSearch}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {shouldShowSuggestionPanel && (
          <div
            id="search-suggestions"
            data-testid="search-suggestions"
            className="mt-2 overflow-hidden rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5"
          >
            {suggestionsPending ? (
              <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600">
                <LoadingSpinner size="sm" />
                <span>{t('common.loading')}</span>
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="divide-y divide-black/5" role="listbox">
                {suggestions.map((place) => {
                  const category = formatCategory(place.category);
                  const isActive = selectedPlace?.id === place.id;

                  return (
                    <li key={place.id}>
                      <button
                        type="button"
                        role="option"
                        data-testid="search-suggestion"
                        data-lat={place.latitude}
                        data-lng={place.longitude}
                        aria-selected={isActive}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSelect(place)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          isActive ? 'bg-emerald-50/90' : 'hover:bg-white/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{place.name}</p>
                            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{place.address}</p>
                          </div>
                          {category && (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                              {category}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-600">{t('places.noResults')}</div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleMyLocation}
        disabled={geoLoading}
        className="absolute top-16 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 ring-1 ring-black/5 hover:bg-white transition-colors disabled:opacity-50"
        aria-label={t('home.myLocation')}
      >
        {geoLoading ? <LoadingSpinner size="sm" /> : <MapPinIcon className="w-5 h-5 text-emerald-600" />}
      </button>

      {!placesLoading && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-gray-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            {places.length} {places.length === 1 ? (isSearching ? 'result' : 'place') : (isSearching ? 'results' : 'places')} {isSearching ? 'found' : 'nearby'}
          </div>
        </div>
      )}

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

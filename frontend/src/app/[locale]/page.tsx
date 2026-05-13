'use client';

import { type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { AccessBadge } from '@/components/places/AccessBadge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useDebounce } from '@/hooks/useDebounce';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePlaces } from '@/hooks/usePlaces';
import { MAP_CONFIG } from '@/lib/constants';
import type { AccessibilityFeature, Place } from '@/lib/types';
import { formatDistance, formatWheelchairDistance } from '@/lib/utils';

const MAX_SUGGESTIONS = 8;
const SEARCH_FLY_TO_ZOOM = 16;
const MAP_VIEWPORT_KEY = 'wheelcheck_map_viewport';
const DATA_SOURCE_SHORT_LABELS: Record<string, string> = {
  OSM: 'OpenStreetMap',
  PRASARANA_GTFS: 'Prasarana GTFS',
  DATA_GOV_MY: 'data.gov.my',
  ACCESSIBILITY_CLOUD: 'accessibility.cloud',
  WIKIDATA: 'Wikidata',
  GEOAPIFY: 'Geoapify',
  COMMUNITY: 'Community',
  SEED: 'Seed data',
};
const ACCESSIBILITY_FILTERS: Array<{ id: AccessibilityFeature; label: string }> = [
  { id: 'wheelchairAccessible', label: '♿ Wheelchair Accessible' },
  { id: 'accessibleToilet', label: '🚻 Accessible Toilet' },
  { id: 'accessibleParking', label: '🅿️ Accessible Parking' },
  { id: 'wideEntrance', label: '🚪 Wide Entrance' },
];

type FlyToCoordinates = {
  lat: number;
  lng: number;
  zoom?: number;
};

type MapViewport = {
  lat: number;
  lng: number;
  zoom: number;
};

const MapView = dynamic(() => import('@/components/map/MapView').then(mod => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

function getRadiusForZoom(zoom: number): number {
  if (zoom >= 18) return 500;
  if (zoom >= 16) return 1000;
  if (zoom >= 14) return 2500;
  if (zoom >= 12) return 5000;
  if (zoom >= 10) return 15000;
  return 30000;
}

function formatCategory(category?: string) {
  if (!category) {
    return null;
  }

  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDataSourceShort(source?: string | null) {
  if (!source) {
    return 'Community';
  }

  return DATA_SOURCE_SHORT_LABELS[source] ?? source;
}

function matchesAccessibilityFilters(place: Place, activeFilters: AccessibilityFeature[]) {
  if (activeFilters.length === 0) {
    return true;
  }

  if (place.accessibilityLevel === 'FULL') {
    return true;
  }

  if (place.accessibilityLevel === 'PARTIAL') {
    return activeFilters.length === 1;
  }

  return false;
}

function getDistanceSummary(distance?: number | null) {
  if (distance == null) {
    return null;
  }

  const standardDistance = formatDistance(distance);
  const wheelchairDistance = formatWheelchairDistance(distance);

  if (!standardDistance || !wheelchairDistance) {
    return null;
  }

  return `${standardDistance} away • ${wheelchairDistance}`;
}

function getStoredViewport(): FlyToCoordinates | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const saved = sessionStorage.getItem(MAP_VIEWPORT_KEY);
    if (!saved) {
      return undefined;
    }

    const viewport = JSON.parse(saved) as Partial<MapViewport>;
    if (
      typeof viewport.lat === 'number'
      && typeof viewport.lng === 'number'
      && typeof viewport.zoom === 'number'
    ) {
      return {
        lat: viewport.lat,
        lng: viewport.lng,
        zoom: viewport.zoom,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<AccessibilityFeature[]>([]);
  const [flyToCoords, setFlyToCoords] = useState<FlyToCoordinates | undefined>(() => getStoredViewport());
  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null);
  const [zoomInCount, setZoomInCount] = useState(0);
  const [zoomOutCount, setZoomOutCount] = useState(0);
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
  const debouncedViewport = useDebounce(mapViewport, 500);

  const searchParams = useMemo(() => {
    if (debouncedSearch) {
      return {
        query: debouncedSearch,
        accessibilityFeatures: activeFilters,
      };
    }

    if (debouncedViewport) {
      return {
        lat: debouncedViewport.lat,
        lng: debouncedViewport.lng,
        radius: getRadiusForZoom(debouncedViewport.zoom),
        accessibilityFeatures: activeFilters,
      };
    }

    return {
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      radius: 5000,
      accessibilityFeatures: activeFilters,
    };
  }, [activeFilters, debouncedSearch, debouncedViewport, mapCenter]);

  const { places: fetchedPlaces, loading: placesLoading } = usePlaces(searchParams);
  const places = useMemo(
    () => fetchedPlaces.filter((place) => matchesAccessibilityFilters(place, activeFilters)),
    [activeFilters, fetchedPlaces],
  );
  const selectedPlaceData = useMemo(() => {
    if (!selectedPlace) {
      return null;
    }

    return places.find((place) => place.id === selectedPlace.id) ?? null;
  }, [places, selectedPlace]);
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
    setFlyToCoords({
      lat: place.latitude,
      lng: place.longitude,
      zoom: SEARCH_FLY_TO_ZOOM,
    });
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setActivePlaceId(place.id);
  };

  const handleSuggestionSelect = (place: Place) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    setSearchQuery(place.name);
    setSearchFocused(false);
    setSelectedPlace(null);
    setActivePlaceId(place.id);
    closeSuggestions();
    flyToPlace(place);
  };

  const handleMyLocation = () => {
    getCurrentPosition();
  };

  const handleViewportChange = useCallback((viewport: MapViewport) => {
    try {
      sessionStorage.setItem(MAP_VIEWPORT_KEY, JSON.stringify(viewport));
    } catch {
      // ignore
    }

    if (!debouncedSearch) {
      setMapViewport(viewport);
    }
  }, [debouncedSearch]);

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

    if (event.key === 'Enter' && normalizedQuery.length > 0) {
      event.preventDefault();
      if (places.length > 0) {
        handleSuggestionSelect(places[0]);
      }
      closeSuggestions();
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;

    setSearchQuery(nextQuery);
    setActivePlaceId(null);

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
    setActivePlaceId(null);
    closeSuggestions();
  };

  const toggleFilter = (filterId: AccessibilityFeature) => {
    setActiveFilters((currentFilters) => {
      const nextFilters = currentFilters.includes(filterId)
        ? currentFilters.filter((currentFilter) => currentFilter !== filterId)
        : [...currentFilters, filterId];

      return ACCESSIBILITY_FILTERS
        .map((filter) => filter.id)
        .filter((filter) => nextFilters.includes(filter));
    });
  };

  const selectedPlaceDistanceSummary = selectedPlaceData
    ? getDistanceSummary(selectedPlaceData.distance)
    : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          places={places}
          center={mapCenter}
          flyTo={flyToCoords}
          zoomIn={zoomInCount}
          zoomOut={zoomOutCount}
          onPlaceClick={handlePlaceClick}
          onViewportChange={handleViewportChange}
          className="w-full h-full"
        />
      </div>

      <div className="absolute top-3 left-3 right-3 z-[1000] space-y-2">
        <div
          className={`rounded-xl bg-white/95 shadow-lg backdrop-blur-md transition-all duration-200 ${
            searchFocused ? 'ring-2 ring-emerald-500 shadow-xl' : 'ring-1 ring-black/5'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <input
              type="search"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onKeyDown={handleSearchKeyDown}
              aria-label={t('common.search')}
              className="min-h-[24px] flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleClearSearch}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-full bg-white/70 shadow-lg ring-1 ring-white/60 backdrop-blur-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2 px-2 py-2">
            {ACCESSIBILITY_FILTERS.map((filter) => {
              const isActive = activeFilters.includes(filter.id);

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => toggleFilter(filter.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200/90'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {shouldShowSuggestionPanel && (
          <div
            id="search-suggestions"
            data-testid="search-suggestions"
            className="overflow-hidden rounded-2xl bg-white/85 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
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
                  const isActive = activePlaceId === place.id;

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
                            <p className="truncate text-sm font-semibold text-gray-900">{place.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{place.address}</p>
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

      <div className="absolute right-3 top-[120px] z-[1000] flex flex-col items-center gap-2">
        <button
          onClick={handleMyLocation}
          disabled={geoLoading}
          className="rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-colors hover:bg-white disabled:opacity-50"
          aria-label={t('home.myLocation')}
        >
          {geoLoading ? <LoadingSpinner size="sm" /> : <MapPinIcon className="h-5 w-5 text-emerald-600" />}
        </button>
        <div className="flex flex-col overflow-hidden rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
          <button
            onClick={() => setZoomInCount((count) => count + 1)}
            className="p-2.5 transition-colors hover:bg-gray-100"
            aria-label="Zoom in"
          >
            <span className="block text-lg font-bold leading-none text-gray-700">+</span>
          </button>
          <div className="h-px bg-gray-200" />
          <button
            onClick={() => setZoomOutCount((count) => count + 1)}
            className="p-2.5 transition-colors hover:bg-gray-100"
            aria-label="Zoom out"
          >
            <span className="block text-lg font-bold leading-none text-gray-700">−</span>
          </button>
        </div>
      </div>

      {!placesLoading && (
        <div className="absolute bottom-24 left-1/2 z-[1000] -translate-x-1/2">
          <div className="rounded-full bg-gray-900/80 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md">
            {places.length} {places.length === 1 ? (isSearching ? 'result' : 'place') : (isSearching ? 'results' : 'places')} {isSearching ? 'found' : 'nearby'}
          </div>
        </div>
      )}

      <Link
        href={`/${locale}/add-place`}
        className="absolute bottom-24 right-4 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl transition-all hover:scale-105 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-95"
        aria-label={t('home.addPlace')}
      >
        <PlusIcon className="h-7 w-7" />
      </Link>

      {selectedPlaceData && (
        <BottomSheet
          key={selectedPlaceData.id}
          open
          initialState="half"
          ariaLabel={`${selectedPlaceData.name} details`}
          onClose={() => {
            const closingPlaceId = selectedPlaceData.id;
            setSelectedPlace((currentPlace) => (currentPlace?.id === closingPlaceId ? null : currentPlace));
          }}
        >
          <div className="space-y-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{selectedPlaceData.name}</h2>
                {selectedPlaceData.category && (
                  <p className="mt-1 text-sm text-gray-500">{formatCategory(selectedPlaceData.category)}</p>
                )}
              </div>
              <AccessBadge level={selectedPlaceData.accessibilityLevel} size="sm" />
            </div>

            <p className="text-sm leading-6 text-gray-600">{selectedPlaceData.address}</p>

            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">
                {selectedPlaceData.reviewCount} {selectedPlaceData.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
              {selectedPlaceDistanceSummary && (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  {selectedPlaceDistanceSummary}
                </span>
              )}
              {selectedPlaceData.dataSource && (
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                  📊 {formatDataSourceShort(selectedPlaceData.dataSource)}
                </span>
              )}
            </div>

            {(selectedPlaceData.osmWheelchairTag || selectedPlaceData.osmToiletAccessible != null || selectedPlaceData.osmTactilePaving != null) && (
              <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                <p className="font-medium text-gray-700">Accessibility Evidence:</p>
                {selectedPlaceData.osmWheelchairTag && <p>♿ Wheelchair: {selectedPlaceData.osmWheelchairTag}</p>}
                {selectedPlaceData.osmToiletAccessible != null && (
                  <p>🚻 Accessible toilet: {selectedPlaceData.osmToiletAccessible ? 'Yes' : 'No'}</p>
                )}
                {selectedPlaceData.osmTactilePaving != null && (
                  <p>🔲 Tactile paving: {selectedPlaceData.osmTactilePaving ? 'Yes' : 'No'}</p>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/${locale}/places/${selectedPlaceData.id}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                View Details
              </Link>
              <Link
                href={`/${locale}/report/${selectedPlaceData.id}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                Report
              </Link>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

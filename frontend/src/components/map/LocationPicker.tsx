'use client';

import { MapPinIcon } from '@heroicons/react/24/solid';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useDebounce } from '@/hooks/useDebounce';
import { DEBOUNCE_DELAY, MAP_CONFIG } from '@/lib/constants';

type LocationPickerProps = {
  onLocationChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
};

type MapTarget = {
  lat: number;
  lng: number;
  zoom?: number;
};

type NominatimSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

function MapCenterReporter({ onCenterChange }: { onCenterChange: (lat: number, lng: number) => void }) {
  const map = useMap();

  const updateCenter = useCallback(() => {
    const center = map.getCenter();
    onCenterChange(Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6)));
  }, [map, onCenterChange]);

  useMapEvents({
    moveend: updateCenter,
  });

  useEffect(() => {
    updateCenter();
  }, [updateCenter]);

  return null;
}

function MapFlyTo({ target }: { target: MapTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 1.2,
    });
  }, [target, map]);

  return null;
}

export function LocationPicker({ onLocationChange, onAddressChange }: LocationPickerProps) {
  const locale = useLocale();
  const t = useTranslations('addPlace');
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.defaultCenter);
  const [flyToTarget, setFlyToTarget] = useState<MapTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery.trim(), DEBOUNCE_DELAY);

  useEffect(() => {
    onLocationChange(mapCenter.lat, mapCenter.lng);
  }, [mapCenter, onLocationChange]);

  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng });
  }, []);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t('locationUnsupported'));
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };

        setMapCenter(nextCenter);
        setFlyToTarget({ ...nextCenter, zoom: 17 });
        setLocationLoading(false);
      },
      (error) => {
        const message = (() => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              return t('locationPermissionDenied');
            case error.POSITION_UNAVAILABLE:
              return t('locationUnavailable');
            case error.TIMEOUT:
              return t('locationTimedOut');
            default:
              return t('locationUnavailable');
          }
        })();

        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  }, [t]);

  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    if (debouncedSearch === selectedSearch) {
      setSuggestions([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    const searchAddresses = async () => {
      setSearching(true);
      setSearchError(null);

      try {
        const response = await fetch(
          `/api/nominatim/search?q=${encodeURIComponent(debouncedSearch)}&locale=${encodeURIComponent(locale)}`,
          {
            signal: controller.signal,
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error('Failed to search addresses');
        }

        const data = (await response.json()) as NominatimSuggestion[];
        if (active) {
          setSuggestions(data);
        }
      } catch (error) {
        if (controller.signal.aborted || !active) {
          return;
        }

        console.error('Failed to search addresses', error);
        setSuggestions([]);
        setSearchError(t('searchFailed'));
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    };

    void searchAddresses();

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedSearch, locale, selectedSearch, t]);

  const handleSuggestionSelect = (suggestion: NominatimSuggestion) => {
    const nextCenter = {
      lat: Number(Number.parseFloat(suggestion.lat).toFixed(6)),
      lng: Number(Number.parseFloat(suggestion.lon).toFixed(6)),
    };

    setMapCenter(nextCenter);
    setFlyToTarget({ ...nextCenter, zoom: 17 });
    setSearchQuery(suggestion.display_name);
    setSelectedSearch(suggestion.display_name);
    setSuggestions([]);
    setSearchError(null);
    onAddressChange?.(suggestion.display_name);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="location-search" className="block text-sm font-medium text-gray-700 mb-1">
          {t('searchAddress')}
        </label>
        <input
          id="location-search"
          type="text"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSelectedSearch('');
          }}
          placeholder={t('searchAddressPlaceholder')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
        />
        {searching && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <LoadingSpinner size="sm" />
            <span>{t('searchingAddresses')}</span>
          </div>
        )}
        {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}
        {!searching && debouncedSearch.length >= 2 && debouncedSearch !== selectedSearch && suggestions.length === 0 && !searchError && (
          <p className="mt-2 text-sm text-gray-500">{t('noAddressesFound')}</p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                onClick={() => handleSuggestionSelect(suggestion)}
                className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 last:border-b-0"
              >
                {suggestion.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={requestCurrentLocation} disabled={locationLoading}>
          {locationLoading ? <LoadingSpinner size="sm" /> : t('useCurrentLocation')}
        </Button>
      </div>

      {locationError && <p className="text-sm text-amber-700">{locationError}</p>}

      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={16}
          zoomControl={false}
          className="h-[360px] w-full"
          style={{ height: '360px', width: '100%' }}
        >
          <MapFlyTo target={flyToTarget} />
          <MapCenterReporter onCenterChange={handleCenterChange} />
          <ZoomControl position="topright" />
          <TileLayer attribution={MAP_CONFIG.attribution} url={MAP_CONFIG.tileUrl} />
        </MapContainer>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full text-emerald-600 drop-shadow-md">
          <MapPinIcon className="h-10 w-10" />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[499] -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-10 w-10 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-emerald-500/50" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-500/50" />
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">{t('moveMapHint')}</p>

      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900">{t('currentCoordinates')}</p>
        <p>
          {t('latitude')}: {mapCenter.lat.toFixed(6)}
        </p>
        <p>
          {t('longitude')}: {mapCenter.lng.toFixed(6)}
        </p>
      </div>
    </div>
  );
}

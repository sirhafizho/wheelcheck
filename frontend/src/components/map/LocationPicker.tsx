'use client';

import { MapPinIcon } from '@heroicons/react/24/solid';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MAP_CONFIG } from '@/lib/constants';

type LocationPickerProps = {
  onLocationChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string, city?: string) => void;
  initialCenter?: { lat: number; lng: number };
};

type MapTarget = {
  lat: number;
  lng: number;
  zoom?: number;
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
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 1.2,
    });
  }, [target, map]);

  return null;
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return await res.json() as { displayName: string; road: string; city: string; postcode: string; state: string };
  } catch {
    return null;
  }
}

export function LocationPicker({ onLocationChange, onAddressChange, initialCenter }: LocationPickerProps) {
  const locale = useLocale();
  const t = useTranslations('addPlace');
  const startCenter = initialCenter || MAP_CONFIG.defaultCenter;
  const [mapCenter, setMapCenter] = useState(startCenter);
  const [flyToTarget, setFlyToTarget] = useState<MapTarget | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const reverseTimer = useRef<NodeJS.Timeout | null>(null);

  // Report location changes, but only after user has interacted
  useEffect(() => {
    if (hasUserInteracted) {
      onLocationChange(mapCenter.lat, mapCenter.lng);
    }
  }, [mapCenter, onLocationChange, hasUserInteracted]);

  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setHasUserInteracted(true);

    // Debounced reverse geocode on map move
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(async () => {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        const addr = result.road || result.displayName.split(',')[0] || '';
        onAddressChange?.(addr, result.city);
      }
    }, 600);
  }, [onAddressChange]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t('locationUnsupported'));
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextCenter = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setMapCenter(nextCenter);
        setFlyToTarget({ ...nextCenter, zoom: 17 });
        setHasUserInteracted(true);
        onLocationChange(nextCenter.lat, nextCenter.lng);

        // Reverse geocode the GPS position
        const result = await reverseGeocode(nextCenter.lat, nextCenter.lng);
        if (result) {
          const addr = result.road || result.displayName.split(',')[0] || '';
          onAddressChange?.(addr, result.city);
        }
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [t, onLocationChange, onAddressChange]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={requestCurrentLocation} disabled={locationLoading} className="flex-1 min-h-[48px]">
          {locationLoading ? <LoadingSpinner size="sm" /> : (
            <>📍 {t('useCurrentLocation')}</>
          )}
        </Button>
      </div>

      {locationError && <p className="text-sm text-amber-700">{locationError}</p>}

      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <MapContainer
          center={[startCenter.lat, startCenter.lng]}
          zoom={16}
          zoomControl={false}
          className="h-[300px] w-full"
          style={{ height: '300px', width: '100%' }}
        >
          <MapFlyTo target={flyToTarget} />
          <MapCenterReporter onCenterChange={handleCenterChange} />
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={MAP_CONFIG.maxZoom}
            maxNativeZoom={19}
          />
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

      <p className="text-xs text-gray-500">{t('moveMapHint')}</p>

      {hasUserInteracted && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✅ {t('latitude')}: {mapCenter.lat.toFixed(6)}, {t('longitude')}: {mapCenter.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}

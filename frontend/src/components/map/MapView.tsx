'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import type { Place } from '@/lib/types';
import { MAP_CONFIG } from '@/lib/constants';
import { AccessBadge } from '../places/AccessBadge';

// Fix for default marker icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface FlyToCoordinates {
  lat: number;
  lng: number;
  zoom?: number;
}

interface MapViewport {
  lat: number;
  lng: number;
  zoom: number;
}

interface MapViewProps {
  places: Place[];
  center?: { lat: number; lng: number };
  zoom?: number;
  flyTo?: FlyToCoordinates;
  onPlaceClick?: (place: Place) => void;
  locale?: string;
  className?: string;
}

function MapUpdater({
  center,
  flyTo,
}: {
  center: { lat: number; lng: number };
  flyTo?: FlyToCoordinates;
}) {
  const map = useMap();
  const previousCenterRef = useRef(center);

  useEffect(() => {
    const previousCenter = previousCenterRef.current;

    if (previousCenter.lat !== center.lat || previousCenter.lng !== center.lng) {
      map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
      previousCenterRef.current = center;
    }
  }, [center, map]);

  useEffect(() => {
    if (!flyTo) {
      return;
    }

    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? map.getZoom(), {
      animate: true,
      duration: 1.5,
    });
  }, [flyTo, map]);

  return null;
}

function MapViewportReporter({ onChange }: { onChange: (viewport: MapViewport) => void }) {
  const map = useMap();
  const updateViewport = useCallback(() => {
    const currentCenter = map.getCenter();

    onChange({
      lat: Number(currentCenter.lat.toFixed(5)),
      lng: Number(currentCenter.lng.toFixed(5)),
      zoom: map.getZoom(),
    });
  }, [map, onChange]);

  useMapEvents({
    moveend: updateViewport,
    zoomend: updateViewport,
  });

  useEffect(() => {
    updateViewport();
  }, [updateViewport]);

  return null;
}

export function MapView({
  places,
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  flyTo,
  onPlaceClick,
  locale = 'en',
  className = '',
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState<MapViewport>({
    lat: Number(center.lat.toFixed(5)),
    lng: Number(center.lng.toFixed(5)),
    zoom,
  });

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
    <div className={`relative ${className}`} data-testid="map-view">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <MapUpdater center={center} flyTo={flyTo} />
        <MapViewportReporter onChange={setViewport} />
        <ZoomControl position="topright" />
        <TileLayer attribution={MAP_CONFIG.attribution} url={MAP_CONFIG.tileUrl} />
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
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
                  <h3 className="font-semibold text-gray-900 mb-2">{place.name}</h3>
                  <AccessBadge level={place.accessibilityLevel} size="sm" />
                  <p className="text-sm text-gray-600 mt-2">{place.address}</p>
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
        </MarkerClusterGroup>
      </MapContainer>

      <div
        aria-hidden="true"
        className="sr-only"
        data-testid="map-viewport"
        data-lat={viewport.lat}
        data-lng={viewport.lng}
        data-zoom={viewport.zoom}
      />
    </div>
  );
}

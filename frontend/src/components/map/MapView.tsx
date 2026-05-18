'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
// MarkerCluster.Default.css intentionally excluded — custom styles in globals.css
import type { Place, AccessLevel } from '@/lib/types';
import { MAP_CONFIG } from '@/lib/constants';

// CartoDB tile layers — free, no API key, modern design
const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>' +
      ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>' +
      ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
  },
} as const;

/** Watch the <html> element's class list for the app's custom dark mode toggle. */
function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Accessibility-colour-coded pin markers
const MARKER_COLORS: Record<string, string> = {
  FULL: '#10b981',          // emerald — fully accessible
  PARTIAL: '#f59e0b',       // amber   — partially accessible
  NOT_ACCESSIBLE: '#ef4444', // red     — not accessible
  UNKNOWN: '#6b7280',       // gray    — unknown
};

function createAccessibilityIcon(level: AccessLevel | null): L.DivIcon {
  const color = (level && MARKER_COLORS[level]) ?? MARKER_COLORS.UNKNOWN;
  return L.divIcon({
    className: '',
    html: `<div data-testid="map-marker" style="
      width:24px;height:24px;
      background:${color};
      border:2.5px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -26],
    tooltipAnchor: [0, -26],
  });
}

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
  zoomIn?: number;
  zoomOut?: number;
  onPlaceClick?: (place: Place) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onDragStart?: () => void;
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

function MapViewportReporter({
  onChange,
  onDragStart,
}: {
  onChange: (viewport: MapViewport) => void;
  onDragStart?: () => void;
}) {
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
    dragstart: () => onDragStart?.(),
  });

  useEffect(() => {
    updateViewport();
  }, [updateViewport]);

  return null;
}

function MapZoomExecutor({ zoomIn, zoomOut }: { zoomIn: number; zoomOut: number }) {
  const map = useMap();
  const prevIn = useRef(zoomIn);
  const prevOut = useRef(zoomOut);

  useEffect(() => {
    if (zoomIn > prevIn.current) {
      map.zoomIn();
    }
    prevIn.current = zoomIn;
  }, [zoomIn, map]);

  useEffect(() => {
    if (zoomOut > prevOut.current) {
      map.zoomOut();
    }
    prevOut.current = zoomOut;
  }, [zoomOut, map]);

  return null;
}

export function MapView({
  places,
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  flyTo,
  zoomIn,
  zoomOut,
  onPlaceClick,
  onViewportChange,
  onDragStart,
  className = '',
}: MapViewProps) {
  const isDark = useDarkMode();
  const tiles = isDark ? TILES.dark : TILES.light;

  const [viewport, setViewport] = useState<MapViewport>({
    lat: Number(center.lat.toFixed(5)),
    lng: Number(center.lng.toFixed(5)),
    zoom,
  });

  const handleViewportChange = useCallback((newViewport: MapViewport) => {
    setViewport(newViewport);
    onViewportChange?.(newViewport);
  }, [onViewportChange]);

  return (
    <div className={`relative ${className}`} data-testid="map-view">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        zoomControl={false}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <MapUpdater center={center} flyTo={flyTo} />
        <MapViewportReporter onChange={handleViewportChange} onDragStart={onDragStart} />
        <MapZoomExecutor zoomIn={zoomIn ?? 0} zoomOut={zoomOut ?? 0} />
        {/* key forces tile layer to remount when theme changes */}
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          attribution={tiles.attribution}
          url={tiles.url}
          maxZoom={MAP_CONFIG.maxZoom}
          maxNativeZoom={19}
          subdomains="abcd"
        />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          zoomToBoundsOnClick
          maxClusterRadius={50}
          disableClusteringAtZoom={18}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={createAccessibilityIcon(place.accessibilityLevel)}
              eventHandlers={{
                click: () => onPlaceClick?.(place),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <span className="text-xs font-medium">{place.name}</span>
              </Tooltip>
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

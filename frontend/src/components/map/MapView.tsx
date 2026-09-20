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
import type { Place } from '@/lib/types';
import { MAP_CONFIG } from '@/lib/constants';

// OpenStreetMap tiles — free, no API key required
const OSM_TILE = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
} as const;

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

/** Resolve effective color: use community level, fall back to AI prediction */
function resolveMarkerColor(place: Place): string {
  if (place.accessibilityLevel && place.accessibilityLevel !== 'UNKNOWN') {
    return MARKER_COLORS[place.accessibilityLevel] ?? MARKER_COLORS.UNKNOWN;
  }
  if (place.aiAccessible === true) return MARKER_COLORS.FULL;
  if (place.aiAccessible === false) return MARKER_COLORS.NOT_ACCESSIBLE;
  return MARKER_COLORS.UNKNOWN;
}

function createAccessibilityIcon(place: Place, highlighted = false): L.DivIcon {
  const color = resolveMarkerColor(place);
  const glow = highlighted ? `; filter: drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})` : '';
  return L.divIcon({
    className: '',
    html: `<div data-testid="map-marker" style="
      width:24px;height:24px;
      background:${color};
      border:2.5px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,0.35)${glow};
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -26],
    tooltipAnchor: [0, -26],
  });
}

function createSelectedIcon(place: Place): L.DivIcon {
  const color = resolveMarkerColor(place);
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div class="marker-pulse-ring" style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          opacity:0.6;
        "></div>
        <div data-testid="map-marker-selected" style="
          position:absolute;
          top:6px;left:6px;
          width:24px;height:24px;
          background:${color};
          border:3px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 3px 10px rgba(0,0,0,0.5);
        "></div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
    popupAnchor: [0, -36],
    tooltipAnchor: [0, -36],
  });
}

/** Custom cluster icon colored by count size */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const total: number = cluster.getChildCount();

  // Color based on cluster size
  let bgColor: string;
  if (total < 20) {
    bgColor = '#10b981'; // emerald — small cluster
  } else if (total < 100) {
    bgColor = '#f59e0b'; // amber — medium
  } else {
    bgColor = '#6b7280'; // gray — large
  }

  const size = total < 10 ? 36 : total < 100 ? 42 : 48;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bgColor};
      color:white;
      border:3px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${size < 42 ? 12 : 13}px;font-weight:700;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${total}</div>`,
    className: '',
    iconSize: [size, size],
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
  selectedPlaceId?: string | null;
  highlightedPlaceIds?: Set<string>;
  onPlaceClick?: (place: Place) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onDragStart?: () => void;
  className?: string;
  minimal?: boolean;
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

    // Never zoom out: use whichever is greater — requested zoom or current zoom
    const targetZoom = Math.max(flyTo.zoom ?? map.getZoom(), map.getZoom());

    // Offset the target upward so the marker lands in the upper third of the viewport,
    // above the bottom sheet which covers the lower ~40% of the screen.
    const mapHeight = map.getSize().y;
    const offsetPx = mapHeight * 0.25; // shift marker 25% up from center
    const targetPoint = map.project([flyTo.lat, flyTo.lng], targetZoom);
    const offsetTarget = map.unproject(
      [targetPoint.x, targetPoint.y + offsetPx],
      targetZoom
    );

    map.flyTo([offsetTarget.lat, offsetTarget.lng], targetZoom, {
      animate: true,
      duration: 1.2,
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

/** Map style toggle button */
function MapStyleToggle({ minimal, onToggle }: { minimal: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-3 right-3 z-[1000] rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-md ring-1 ring-black/5 backdrop-blur-sm hover:bg-white transition-colors"
      aria-label={minimal ? 'Switch to standard map' : 'Switch to minimal map'}
      title={minimal ? 'Standard view' : 'Minimal view'}
    >
      {minimal ? '\uD83C\uDF0D Standard' : '\uD83E\uDDFC Minimal'}
    </button>
  );
}

export function MapView({
  places,
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  flyTo,
  zoomIn,
  zoomOut,
  selectedPlaceId,
  highlightedPlaceIds,
  onPlaceClick,
  onViewportChange,
  onDragStart,
  className = '',
}: MapViewProps) {
  const [viewport, setViewport] = useState<MapViewport>({
    lat: Number(center.lat.toFixed(5)),
    lng: Number(center.lng.toFixed(5)),
    zoom,
  });
  const [minimalStyle, setMinimalStyle] = useState(true);

  const handleViewportChange = useCallback((newViewport: MapViewport) => {
    setViewport(newViewport);
    onViewportChange?.(newViewport);
  }, [onViewportChange]);

  return (
    <div className={`relative ${className}`} data-testid="map-view">
      <MapStyleToggle minimal={minimalStyle} onToggle={() => setMinimalStyle(!minimalStyle)} />
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        zoomControl={false}
        className={`h-full w-full ${minimalStyle ? 'map-minimal' : 'map-standard'}`}
        style={{ height: '100%', width: '100%' }}
      >
        <MapUpdater center={center} flyTo={flyTo} />
        <MapViewportReporter onChange={handleViewportChange} onDragStart={onDragStart} />
        <MapZoomExecutor zoomIn={zoomIn ?? 0} zoomOut={zoomOut ?? 0} />
        <TileLayer
          attribution={OSM_TILE.attribution}
          url={OSM_TILE.url}
          maxZoom={MAP_CONFIG.maxZoom}
          maxNativeZoom={19}
        />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          zoomToBoundsOnClick
          maxClusterRadius={50}
          disableClusteringAtZoom={18}
          iconCreateFunction={createClusterIcon}
        >
          {places.map((place) => {
            const isSelected = place.id === selectedPlaceId;
            const isHighlighted = highlightedPlaceIds?.has(place.id) ?? false;
            return (
              <Marker
                key={place.id}
                position={[place.latitude, place.longitude]}
                icon={isSelected
                  ? createSelectedIcon(place)
                  : createAccessibilityIcon(place, isHighlighted)}
                zIndexOffset={isSelected ? 1000 : isHighlighted ? 500 : 0}
                eventHandlers={{
                  click: () => onPlaceClick?.(place),
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1} permanent={isSelected}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium">{place.name}</span>
                    {place.aiAccessible !== null && place.aiAccessible !== undefined && (
                      <span className={`text-[10px] font-semibold ${place.aiAccessible ? 'text-sky-600' : 'text-red-500'}`}>
                        {place.aiAccessible ? '\u2726 AI Accessible' : '\u2726 AI Inaccessible'}
                      </span>
                    )}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
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

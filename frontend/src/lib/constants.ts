export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const MAP_CONFIG = {
  tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  defaultCenter: {
    lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || '3.139'),
    lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || '101.6869'),
  },
  defaultZoom: parseInt(process.env.NEXT_PUBLIC_DEFAULT_ZOOM || '13', 10),
  minZoom: 5,
  maxZoom: 19,
};

export const ACCESSIBILITY_COLORS = {
  FULL: '#10b981', // green-500
  PARTIAL: '#f59e0b', // amber-500
  NOT_ACCESSIBLE: '#ef4444', // red-500
  UNKNOWN: '#6b7280', // gray-500
};

export const TOUCH_TARGET_SIZE = 48; // WCAG minimum touch target size in pixels

export const DEBOUNCE_DELAY = 300; // milliseconds for search debounce

export const DEFAULT_SEARCH_RADIUS = 5000; // meters

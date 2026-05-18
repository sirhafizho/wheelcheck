'use client';

import { useState } from 'react';
import { XMarkIcon, ListBulletIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Place, AccessLevel } from '@/lib/types';

const ACCESS_BADGE: Record<string, { label: string; cls: string }> = {
  FULL:           { label: '♿ Accessible',     cls: 'bg-emerald-100 text-emerald-700' },
  PARTIAL:        { label: '⚠️ Partial',        cls: 'bg-amber-100 text-amber-700'    },
  NOT_ACCESSIBLE: { label: '✗ Not Accessible',  cls: 'bg-red-100 text-red-700'         },
  UNKNOWN:        { label: '? Unknown',          cls: 'bg-gray-100 text-gray-500'       },
};

function AccessPill({ level }: { level: AccessLevel | null }) {
  const b = level ? (ACCESS_BADGE[level] ?? ACCESS_BADGE.UNKNOWN) : ACCESS_BADGE.UNKNOWN;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}>
      {b.label}
    </span>
  );
}

function AiPill({ accessible, tier }: { accessible?: boolean | null; tier?: string | null }) {
  if (accessible === null || accessible === undefined) return null;
  return (
    <span
      className={`shrink-0 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        accessible ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-600'
      }`}
      title={`AI ${tier?.toLowerCase() ?? 'assessment'}`}
    >
      <SparklesIcon className="h-2.5 w-2.5" />
      {accessible ? 'AI ✓' : 'AI ✗'}
    </span>
  );
}

function formatCategory(cat?: string | null) {
  if (!cat) return null;
  return cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

interface PlacesListPanelProps {
  places: Place[];
  onPlaceClick: (place: Place) => void;
  selectedPlaceId?: string | null;
  loading?: boolean;
}

export function PlacesListPanel({ places, onPlaceClick, selectedPlaceId, loading }: PlacesListPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const list = (
    <ul className="divide-y divide-gray-100">
      {places.length === 0 && !loading && (
        <li className="px-4 py-8 text-center text-sm text-gray-400">No places in view</li>
      )}
      {loading && places.length === 0 && (
        <li className="px-4 py-8 text-center text-sm text-gray-400">Loading…</li>
      )}
      {places.map(place => {
        const cat = formatCategory(place.category);
        const isSelected = place.id === selectedPlaceId;
        return (
          <li key={place.id}>
            <button
              type="button"
              data-testid="sidebar-place-item"
              onClick={() => { onPlaceClick(place); setMobileOpen(false); }}
              className={`w-full px-3 py-3 text-left transition-colors hover:bg-emerald-50 focus:outline-none focus:bg-emerald-50 ${
                isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''
              }`}
            >
              <p className="truncate text-sm font-semibold text-gray-900 leading-tight">{place.name}</p>
              {place.city && (
                <p className="mt-0.5 truncate text-xs text-gray-400">{[place.city, place.state].filter(Boolean).join(', ')}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <AccessPill level={place.accessibilityLevel} />
                <AiPill accessible={place.aiAccessible} tier={place.aiConfidenceTier} />
                {cat && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {cat}
                  </span>
                )}
                {place.distance != null && (
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    {place.distance < 1000
                      ? `${Math.round(place.distance)}m`
                      : `${(place.distance / 1000).toFixed(1)}km`}
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* ── Desktop sidebar (lg+): fixed left panel overlaying the map ── */}
      <div
        data-testid="places-sidebar"
        className="hidden lg:flex absolute left-3 top-[130px] bottom-[100px] z-[990] w-72 flex-col rounded-2xl bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="text-sm font-semibold text-gray-700">
            {places.length} {places.length === 1 ? 'place' : 'places'}
          </span>
          {loading && (
            <span className="text-xs text-gray-400 animate-pulse">updating…</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          {list}
        </div>
      </div>

      {/* ── Mobile toggle button (below lg) ── */}
      <button
        type="button"
        data-testid="places-list-toggle"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden absolute bottom-[100px] left-3 z-[990] flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg ring-1 ring-black/5 backdrop-blur-md"
      >
        <ListBulletIcon className="h-4 w-4 text-emerald-600" />
        <span>{places.length} {places.length === 1 ? 'place' : 'places'}</span>
      </button>

      {/* ── Mobile bottom drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden absolute inset-0 z-[1080] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            data-testid="places-drawer"
            className="relative z-10 flex flex-col bg-white rounded-t-2xl shadow-2xl max-h-[70vh]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-sm font-semibold text-gray-700">
                {places.length} {places.length === 1 ? 'place' : 'places'} nearby
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
                aria-label="Close list"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {list}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

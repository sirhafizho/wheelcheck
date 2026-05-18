'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MapPinIcon, InformationCircleIcon, HeartIcon, ArrowTopRightOnSquareIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import type { Place } from '@/lib/types';
import { AccessBadge } from './AccessBadge';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { useFavorite } from '@/hooks/useFavorite';
import { API_URL } from '@/lib/constants';

interface AiSource {
  url: string;
  title: string;
  snippet?: string;
}

interface AiEnrichmentData {
  placeId: string;
  confidenceTier: 'VERIFIED' | 'INFERRED' | 'ASSUMPTION';
  aiSummary: string | null;
  aiReasoning: string | null;
  isAccessible: boolean | null;
  disclaimer: string | null;
  photoUrl: string | null;
  sources: AiSource[];
  modelUsed: string | null;
  enrichedAt: string;
}

const CONFIDENCE_COLORS = {
  VERIFIED: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  INFERRED: 'bg-sky-50 border-sky-200 text-sky-800',
  ASSUMPTION: 'bg-gray-50 border-gray-200 text-gray-700',
} as const;

const CONFIDENCE_BADGE = {
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  INFERRED: 'bg-sky-100 text-sky-700',
  ASSUMPTION: 'bg-gray-100 text-gray-600',
} as const;

const DATA_SOURCE_TRANSLATION_KEYS: Record<string, string> = {
  OSM: 'dataSources.OSM',
  PRASARANA_GTFS: 'dataSources.PRASARANA_GTFS',
  DATA_GOV_MY: 'dataSources.DATA_GOV_MY',
  ACCESSIBILITY_CLOUD: 'dataSources.ACCESSIBILITY_CLOUD',
  WIKIDATA: 'dataSources.WIKIDATA',
  GEOAPIFY: 'dataSources.GEOAPIFY',
  COMMUNITY: 'dataSources.COMMUNITY',
  SEED: 'dataSources.SEED',
};

const KNOWN_CATEGORIES = [
  'MALL',
  'SHOP',
  'RESTAURANT',
  'HOSPITAL',
  'CLINIC',
  'MOSQUE',
  'PLACE_OF_WORSHIP',
  'TRANSPORT',
  'GOVERNMENT',
  'EDUCATION',
  'PARK',
  'HOTEL',
  'CAFE',
  'OTHER',
] as const;

type KnownCategory = (typeof KNOWN_CATEGORIES)[number];

function formatFallbackCategory(category: string) {
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

interface PlaceDetailProps {
  place: Place;
  locale: string;
  onReportClick?: () => void;
  onShowOnMapClick?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  flat?: boolean;
  detailsHref?: string;
}

export function PlaceDetail({ place, locale, onReportClick, onShowOnMapClick, onDelete, onEdit, flat, detailsHref }: PlaceDetailProps) {
  const tCommon = useTranslations('common');
  const tPlaces = useTranslations('places');
  const tCategories = useTranslations('addPlace.categories');
  const tFav = useTranslations('favorites');
  const { favorited, toggle, loading: favLoading } = useFavorite(place.id);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [enrichment, setEnrichment] = useState<AiEnrichmentData | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setCurrentUserId(localStorage.getItem('wheelcheck_user_id'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/places/${place.id}/enrichment`)
      .then(r => r.ok ? r.json() as Promise<AiEnrichmentData> : null)
      .then(data => { if (!cancelled && data) setEnrichment(data); })
      .catch(() => { /* silently skip if no enrichment */ });
    return () => { cancelled = true; };
  }, [place.id]);

  const handleFavoriteToggle = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wheelcheck_token') : null;
    if (!token) {
      setToast({ message: tFav('loginToSave'), type: 'info' });
      return;
    }
    const wasFavorited = favorited;
    await toggle();
    setToast({
      message: wasFavorited ? tFav('removedFromFavorites') : tFav('savedToFavorites'),
      type: 'success',
    });
  }, [favorited, toggle, tFav]);

  const handleDelete = useCallback(async () => {
    const token = localStorage.getItem('wheelcheck_token');
    if (!token) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/places/${place.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setToast({ message: tPlaces('placeDeleted'), type: 'success' });
        setTimeout(() => onDelete?.(), 1200);
      } else {
        setToast({ message: tPlaces('deleteFailed'), type: 'error' });
      }
    } catch {
      setToast({ message: tPlaces('deleteFailed'), type: 'error' });
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [place.id, onDelete, tPlaces]);

  const directionsUrl = `https://maps.google.com/maps?q=${place.latitude},${place.longitude}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDataSource = (source: string | undefined) => {
    if (!source) {
      return tPlaces('dataSources.COMMUNITY');
    }

    const translationKey = DATA_SOURCE_TRANSLATION_KEYS[source];
    return translationKey ? tPlaces(translationKey as never) : source;
  };

  const formatCategory = (category?: string) => {
    if (!category) {
      return null;
    }

    return KNOWN_CATEGORIES.includes(category as KnownCategory)
      ? tCategories(category as KnownCategory)
      : formatFallbackCategory(category);
  };

  const locationLine = [place.city, place.state].filter(Boolean).join(', ');
  const formattedCategory = formatCategory(place.category);

  return (
    <div className={flat ? undefined : 'bg-white rounded-lg shadow-lg overflow-hidden'}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className={flat ? 'px-4 pt-2 pb-4' : 'p-6'}>
        {/* ── Header: name + icons + badge ── */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className={`font-bold text-gray-900 leading-tight ${flat ? 'text-xl' : 'text-2xl'}`}>
            {place.name}
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleFavoriteToggle()}
              disabled={favLoading}
              aria-label={favorited ? tFav('remove') : tFav('save')}
              data-testid="favorite-toggle"
              className="rounded-full p-1.5 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {favorited
                ? <HeartSolidIcon className="h-5 w-5 text-red-500" />
                : <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-400" />
              }
            </button>
            {currentUserId && place.createdBy && currentUserId === place.createdBy && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  data-testid="edit-place-btn"
                  className="rounded-full p-1.5 transition-colors hover:bg-blue-50"
                  aria-label={tPlaces('editPlace')}
                >
                  <PencilIcon className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  data-testid="delete-place-btn"
                  className="rounded-full p-1.5 transition-colors hover:bg-red-50"
                  aria-label={tPlaces('deletePlace')}
                >
                  <TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-600" />
                </button>
              </>
            )}
            <AccessBadge level={place.accessibilityLevel} size={flat ? 'sm' : 'lg'} />
          </div>
        </div>

        {/* ── Address ── */}
        <div className="flex items-start gap-2 text-gray-700 mb-0.5">
          <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="flex-1 text-sm">
            {!place.address || place.address === 'Address not available'
              ? tPlaces('addressNotAvailable')
              : place.address}
          </p>
        </div>
        {locationLine && (
          <p className="text-xs text-gray-500 pl-6 mb-3">
            {locationLine}
          </p>
        )}

        {/* ── Category ── */}
        {formattedCategory && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {formattedCategory}
            </span>
          </div>
        )}

        {/* ── Action buttons — always visible at half state ── */}
        <div className="grid gap-2 mb-4">
          <div className="grid gap-2 grid-cols-2">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="get-directions-btn"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[44px]"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tPlaces('getDirections')}
            </a>
            {detailsHref ? (
              <a
                href={detailsHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[44px]"
              >
                {tPlaces('details')}
              </a>
            ) : onShowOnMapClick ? (
              <Button variant="outline" fullWidth onClick={onShowOnMapClick} className="min-h-[44px] gap-1.5">
                <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                {tPlaces('showOnMap')}
              </Button>
            ) : null}
          </div>
          <Button variant="primary" fullWidth onClick={onReportClick} className="min-h-[44px]">
            {tCommon('report')}
          </Button>
        </div>

        {/* ── Below fold: description, AI panel, metadata ── */}
        {place.description && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-gray-700">{place.description}</p>
            </div>
          </div>
        )}

        {/* AI Reasoning Panel */}
        {enrichment && (
          <div className={`mb-4 rounded-lg border p-3 ${CONFIDENCE_COLORS[enrichment.confidenceTier]}`}
               data-testid="ai-enrichment-panel">
            <button
              type="button"
              onClick={() => setShowReasoning(v => !v)}
              className="w-full flex items-center justify-between gap-2 text-left"
              data-testid="ai-enrichment-toggle"
              aria-expanded={showReasoning}
            >
              <div className="flex items-center gap-2 min-w-0">
                <SparklesIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium truncate">
                  {tPlaces('aiReasoning.title')}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${CONFIDENCE_BADGE[enrichment.confidenceTier]}`}>
                  {tPlaces(`aiReasoning.tier.${enrichment.confidenceTier}`)}
                </span>
                {enrichment.isAccessible !== null && (
                  <span
                    data-testid="ai-verdict-badge"
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      enrichment.isAccessible
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {enrichment.isAccessible ? '✓ Likely Accessible' : '✗ Likely Not Accessible'}
                  </span>
                )}
              </div>
              {showReasoning
                ? <ChevronUpIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                : <ChevronDownIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              }
            </button>

            {enrichment.aiSummary && (
              <p className="mt-2 text-sm leading-relaxed">{enrichment.aiSummary}</p>
            )}

            {showReasoning && (
              <div className="mt-3 space-y-3">
                {enrichment.aiReasoning && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">
                      {tPlaces('aiReasoning.reasoning')}
                    </p>
                    <p className="text-sm leading-relaxed">{enrichment.aiReasoning}</p>
                  </div>
                )}
                {enrichment.disclaimer && (
                  <div className="p-2 rounded bg-white/60 border border-current/20 text-xs">
                    ⚠️ {enrichment.disclaimer}
                  </div>
                )}
                {enrichment.photoUrl && (
                  <img
                    src={enrichment.photoUrl}
                    alt={`${place.name} photo`}
                    className="w-full rounded-lg object-cover max-h-40"
                    loading="lazy"
                  />
                )}
                {enrichment.sources.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">
                      {tPlaces('aiReasoning.sources')}
                    </p>
                    <ul className="space-y-1">
                      {enrichment.sources.map((src, i) => (
                        <li key={i}>
                          <a href={src.url} target="_blank" rel="noopener noreferrer"
                             className="text-xs underline underline-offset-2 break-all hover:opacity-80">
                            {src.title}
                          </a>
                          {src.snippet && <p className="text-xs opacity-70 mt-0.5">{src.snippet}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs opacity-60 pt-1">
                  {tPlaces('aiReasoning.poweredBy', { model: enrichment.modelUsed ?? 'AI' })}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500 mb-1">{tPlaces('reports')}</dt>
              <dd className="text-gray-900">{place.reviewCount}</dd>
            </div>
            {place.lastReportedAt && (
              <div>
                <dt className="font-medium text-gray-500 mb-1">{tPlaces('lastUpdated')}</dt>
                <dd className="text-gray-900">
                  <time dateTime={place.lastReportedAt}>{formatDate(place.lastReportedAt)}</time>
                </dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="font-medium text-gray-500 mb-1">{tPlaces('dataSource')}</dt>
              <dd className="text-gray-700 text-xs" data-testid="data-source-label">
                {formatDataSource(place.dataSource)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{tPlaces('confirmDeleteTitle')}</h3>
            <p className="text-sm text-gray-600 mb-6">{tPlaces('confirmDeleteBody')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {deleteLoading ? '...' : tPlaces('deletePlace')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { HeartIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { api } from '@/lib/api';
import type { Favorite } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ACCESS_BADGE: Record<string, { label: string; className: string }> = {
  FULL:           { label: '✅ Accessible',       className: 'bg-emerald-50 text-emerald-700' },
  PARTIAL:        { label: '⚠️ Partially',         className: 'bg-amber-50 text-amber-700' },
  NOT_ACCESSIBLE: { label: '❌ Not Accessible',    className: 'bg-red-50 text-red-700' },
};

export default function FavoritesPage() {
  const locale = useLocale();
  const t = useTranslations('favorites');

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadFavorites = useCallback((token: string) => {
    setLoading(true);
    api.getUserFavorites(token)
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wheelcheck_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoggedIn(true);
    loadFavorites(token);
  }, [loadFavorites]);

  const handleRemove = async (placeId: string) => {
    const token = localStorage.getItem('wheelcheck_token');
    if (!token) return;
    setRemoving(placeId);
    try {
      await api.toggleFavorite(placeId, token);
      setFavorites(prev => prev.filter(f => f.placeId !== placeId));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-16">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <HeartIcon className="h-7 w-7 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !loggedIn ? (
          <div className="rounded-2xl bg-gray-50 p-8 text-center">
            <HeartIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium mb-4">{t('loginToSave')}</p>
            <Link
              href={`/${locale}/profile`}
              className="inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Log In
            </Link>
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-8 text-center">
            <HeartIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-900 font-semibold mb-1">{t('empty')}</p>
            <p className="text-sm text-gray-500 mb-4">{t('emptySubtext')}</p>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <MapPinIcon className="h-4 w-4" />
              Explore Map
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="favorites-list">
            <p className="text-sm text-gray-500 mb-4">{t('count', { count: favorites.length })}</p>
            {favorites.map((fav) => {
              const badge = fav.accessibilityLevel ? ACCESS_BADGE[fav.accessibilityLevel] : null;
              return (
                <div
                  key={fav.id}
                  data-testid="favorite-item"
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow"
                >
                  {/* Heart icon */}
                  <div className="flex-shrink-0 rounded-full bg-red-50 p-2">
                    <HeartIcon className="h-4 w-4 text-red-500" />
                  </div>

                  {/* Place info — clickable */}
                  <Link
                    href={`/${locale}/places/${fav.placeId}`}
                    className="flex-1 min-w-0"
                    data-testid="favorite-place-link"
                  >
                    <p className="font-semibold text-gray-900 truncate">
                      {fav.placeName ?? 'Unknown Place'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {fav.placeCategory && (
                        <span className="text-xs text-gray-400">{fav.placeCategory}</span>
                      )}
                      {badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('savedOn')} {new Date(fav.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(fav.placeId)}
                    disabled={removing === fav.placeId}
                    aria-label={t('remove')}
                    data-testid="remove-favorite"
                    className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {removing === fav.placeId
                      ? <LoadingSpinner size="sm" />
                      : <XMarkIcon className="h-5 w-5" />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

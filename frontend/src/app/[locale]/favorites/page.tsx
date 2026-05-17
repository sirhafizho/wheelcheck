'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { HeartIcon } from '@heroicons/react/24/solid';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import type { Favorite } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function FavoritesPage() {
  const locale = useLocale();
  const t = useTranslations('favorites');
  const tCommon = useTranslations('common');

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wheelcheck_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoggedIn(true);
    api.getUserFavorites(token)
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

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
            <p className="text-gray-600 font-medium">{t('loginToSave')}</p>
            <Link
              href={`/${locale}/profile`}
              className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {tCommon('report')}
            </Link>
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-8 text-center">
            <HeartIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-900 font-semibold mb-1">{t('empty')}</p>
            <p className="text-sm text-gray-500">{t('emptySubtext')}</p>
            <Link
              href={`/${locale}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <MapPinIcon className="h-4 w-4" />
              Explore Map
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">{t('count', { count: favorites.length })}</p>
            {favorites.map((fav) => (
              <Link
                key={fav.id}
                href={`/${locale}/places/${fav.placeId}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 rounded-full bg-red-50 p-2">
                    <HeartIcon className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{fav.placeName ?? 'Place'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(fav.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <MapPinIcon className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

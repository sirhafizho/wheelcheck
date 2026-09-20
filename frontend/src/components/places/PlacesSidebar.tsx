'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HeartIcon, ClockIcon } from '@heroicons/react/24/solid';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import type { Favorite } from '@/lib/types';
import type { RecentPlace } from '@/hooks/useRecentPlaces';

const ACCESS_DOT: Record<string, string> = {
  FULL: 'bg-emerald-500',
  PARTIAL: 'bg-amber-500',
  NOT_ACCESSIBLE: 'bg-red-500',
};

interface PlacesSidebarProps {
  locale: string;
  recent: RecentPlace[];
}

export function PlacesSidebar({ locale, recent }: PlacesSidebarProps) {
  const t = useTranslations('favorites');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token;
      if (!token) {
        setLoadingFavs(false);
        return;
      }
      api.getUserFavorites(token)
        .then((favs) => setFavorites(favs.slice(0, 5)))
        .catch(() => {})
        .finally(() => setLoadingFavs(false));
    });
  }, []);

  return (
    <aside className="space-y-6">
      {/* Recently Viewed */}
      {recent.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <ClockIcon className="h-4 w-4" />
            Recently Viewed
          </h2>
          <div className="space-y-1.5">
            {recent.slice(0, 5).map((place) => (
              <Link
                key={place.id}
                href={`/${locale}/places/${place.id}`}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-gray-100 transition-colors group"
              >
                <span
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    place.accessibilityLevel ? (ACCESS_DOT[place.accessibilityLevel] ?? 'bg-gray-300') : 'bg-gray-300'
                  }`}
                />
                <span className="flex-1 truncate text-gray-700 group-hover:text-gray-900">
                  {place.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Saved Places */}
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <HeartIcon className="h-4 w-4 text-red-400" />
          {t('title')}
        </h2>
        {loadingFavs ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <p className="text-xs text-gray-400 px-3">{t('empty')}</p>
        ) : (
          <div className="space-y-1.5">
            {favorites.map((fav) => (
              <Link
                key={fav.id}
                href={`/${locale}/places/${fav.placeId}`}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-red-50 transition-colors group"
              >
                <HeartIcon className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700 group-hover:text-gray-900">
                  {fav.placeName ?? 'Unknown Place'}
                </span>
              </Link>
            ))}
            <Link
              href={`/${locale}/favorites`}
              className="block text-center text-xs text-emerald-600 hover:text-emerald-700 font-medium py-2"
            >
              View all saved places
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HeartIcon, ClockIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
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
  onClearRecent?: () => void;
}

export function PlacesSidebar({ locale, recent, onClearRecent }: PlacesSidebarProps) {
  const t = useTranslations('favorites');
  const tRecent = useTranslations('recent');
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
    <aside className="space-y-5">
      {/* Recently Viewed — max 3, with clear button */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <ClockIcon className="h-3.5 w-3.5" />
              {tRecent('title')}
            </h2>
            {onClearRecent && (
              <button
                type="button"
                onClick={onClearRecent}
                className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
              >
                <XMarkIcon className="h-3 w-3" />
                {tRecent('clear')}
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {recent.slice(0, 3).map((place) => (
              <Link
                key={place.id}
                href={`/${locale}/places/${place.id}`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-gray-100 transition-colors group"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    place.accessibilityLevel ? (ACCESS_DOT[place.accessibilityLevel] ?? 'bg-gray-300') : 'bg-gray-300'
                  }`}
                />
                <span className="flex-1 truncate text-gray-700 group-hover:text-gray-900 text-xs">
                  {place.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Saved Places — max 3 */}
      <div>
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <HeartIcon className="h-3.5 w-3.5 text-red-400" />
          {t('title')}
        </h2>
        {loadingFavs ? (
          <div className="space-y-1.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <p className="text-[10px] text-gray-400 px-2.5">{t('empty')}</p>
        ) : (
          <div className="space-y-0.5">
            {favorites.slice(0, 3).map((fav) => (
              <Link
                key={fav.id}
                href={`/${locale}/places/${fav.placeId}`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-red-50 transition-colors group"
              >
                <HeartIcon className="h-3 w-3 text-red-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700 group-hover:text-gray-900 text-xs">
                  {fav.placeName ?? 'Unknown Place'}
                </span>
              </Link>
            ))}
            {favorites.length > 3 && (
              <Link
                href={`/${locale}/favorites`}
                className="block text-center text-[10px] text-emerald-600 hover:text-emerald-700 font-medium py-1.5"
              >
                +{favorites.length - 3} more
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
